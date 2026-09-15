import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// Configure PDF.js worker client-side safely
if (typeof window !== 'undefined') {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    }
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export type SupportedDocFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'text' | 'unknown';

export type PdfParserEngine = 'fast' | 'gemini' | 'ollama';

export interface PdfConversionOptions {
  engine?: PdfParserEngine;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  geminiApiKey?: string;
  onStatusUpdate?: (status: string) => void;
  onProgress?: (percent: number, status: string) => void;
  onFallback?: (reason: string) => void;
}

export interface ConversionStats {
  format: SupportedDocFormat;
  originalFileName: string;
  originalFileSize: number;
  pageCount?: number;
  sheetCount?: number;
  slideCount?: number;
  wordCount?: number;
  lineCount?: number;
  convertedAt: string;
}

export interface DocumentConversionResult {
  markdown: string;
  suggestedFileName: string;
  stats: ConversionStats;
  warnings: string[];
  parserEngine?: PdfParserEngine;
  ollamaModel?: string;
  originalFile?: File;
}

/**
 * Fetch installed models from local Ollama endpoint (/api/tags)
 * Supports browser direct fetch with intelligent fallback to server proxy to bypass CORS / Mixed Content
 */
export async function fetchOllamaInstalledModels(endpoint: string = 'http://localhost:11434'): Promise<string[]> {
  const cleanEp = endpoint.trim().replace(/\/+$/, '');

  // 1. Direct browser fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${cleanEp}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.models)) {
        return data.models.map((m: any) => m.name || m.model).filter(Boolean);
      }
    }
  } catch {
    // Fallthrough to server proxy if CORS or Mixed Content blocked direct access
  }

  // 2. Server Proxy fetch fallback (bypasses browser CORS & Mixed Content constraints)
  try {
    const proxyRes = await fetch('/api/ollama/proxy-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: cleanEp })
    });
    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      if (Array.isArray(proxyData?.models)) {
        return proxyData.models.map((m: any) => m.name || m.model).filter(Boolean);
      }
    }
  } catch {
    // Network or proxy failure
  }

  return [];
}

/**
 * Detect format from file name or MIME type
 */
export function detectDocumentFormat(fileName: string, mimeType?: string): SupportedDocFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
  if (
    lower.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.csv') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return 'xlsx';
  }
  if (
    lower.endsWith('.pptx') ||
    lower.endsWith('.ppt') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx';
  }
  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.markdown') ||
    lower.endsWith('.json') ||
    lower.endsWith('.tsv')
  ) {
    return 'text';
  }
  return 'unknown';
}

/**
 * Convert PDF file into structured Markdown client-side
 * Supports Fast Text Parser (pdfjs-dist) and Local AI Parser (Ollama /api/generate)
 */
export async function convertPdfToMarkdown(
  file: File | Blob | ArrayBuffer | Uint8Array | string,
  fileName: string,
  options?: PdfConversionOptions
): Promise<{
  markdown: string;
  pageCount: number;
  warnings: string[];
  parserEngine: PdfParserEngine;
  ollamaModel?: string;
}> {
  const warnings: string[] = [];
  let uint8Data: Uint8Array;

  if (typeof file === 'string') {
    let b64 = file;
    if (file.startsWith('data:')) {
      b64 = file.split(',')[1] || '';
    }
    try {
      const binary = atob(b64);
      uint8Data = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        uint8Data[i] = binary.charCodeAt(i);
      }
    } catch {
      uint8Data = new Uint8Array(0);
    }
  } else if (file instanceof Uint8Array) {
    uint8Data = file;
  } else if (file instanceof ArrayBuffer) {
    uint8Data = new Uint8Array(file);
  } else {
    try {
      const arrayBuffer = await file.arrayBuffer();
      uint8Data = new Uint8Array(arrayBuffer);
    } catch {
      uint8Data = new Uint8Array(0);
    }
  }

  const cleanTitle = fileName.replace(/\.[^/.]+$/, '');

  // Guard against 0-byte or empty PDF files
  if (!uint8Data || uint8Data.byteLength === 0) {
    return {
      markdown: `# 📕 ${cleanTitle}\n\n*(PDF 파일의 크기가 0 바이트이거나 비어 있어 내용을 추출할 수 없습니다.)*\n`,
      pageCount: 0,
      warnings: ['PDF 파일이 비어 있습니다 (0 바이트).'],
      parserEngine: 'fast',
    };
  }

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Data,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  // 1. Extract raw text stream with concurrent chunking and memory cleanup
  // Concurrency: 5 pages per chunk for high throughput without main thread blocking
  const CHUNK_SIZE = 5;
  const pageResults: Array<{ pageNum: number; mdSnippet: string; rawText: string }> = new Array(numPages);

  options?.onStatusUpdate?.(`PDF 문서 분석 시작 (총 ${numPages}페이지)...`);
  options?.onProgress?.(5, `PDF 문서 분석 시작 (총 ${numPages}페이지)`);

  for (let chunkStart = 1; chunkStart <= numPages; chunkStart += CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, numPages);
    const chunkPromises = [];

    for (let pageNum = chunkStart; pageNum <= chunkEnd; pageNum++) {
      chunkPromises.push(
        (async (pNum: number) => {
          try {
            const page = await pdfDoc.getPage(pNum);
            const textContent = await page.getTextContent();
            const items = textContent.items as Array<{
              str: string;
              transform: number[];
              width: number;
              height: number;
            }>;

            let snippet = '';
            let pageText = '';

            if (!items || items.length === 0) {
              snippet = `## [페이지 ${pNum}]\n\n*(텍스트가 없거나 스캔 이미지 형태의 페이지입니다.)*\n\n---\n\n`;
              pageText = `[페이지 ${pNum}]\n(텍스트 없음)`;
            } else {
              const validItems = items.filter((it) => it.str && it.str.trim().length > 0);
              if (validItems.length === 0) {
                snippet = `## [페이지 ${pNum}]\n\n*(공백 또는 그래픽 요소 전용 페이지입니다.)*\n\n---\n\n`;
                pageText = `[페이지 ${pNum}]\n(공백 페이지)`;
              } else {
                const lineTolerance = 4;
                const lines: Array<{ y: number; text: string; fontSize: number }> = [];
                let currentLine: { y: number; items: typeof items; fontSize: number } | null = null;

                validItems.forEach((item) => {
                  const y = item.transform[5];
                  const fontSize = Math.abs(item.transform[0] || item.height || 12);

                  if (!currentLine || Math.abs(currentLine.y - y) > lineTolerance) {
                    if (currentLine) {
                      currentLine.items.sort((a, b) => a.transform[4] - b.transform[4]);
                      lines.push({
                        y: currentLine.y,
                        text: currentLine.items.map((i) => i.str).join(' ').trim(),
                        fontSize: currentLine.fontSize,
                      });
                    }
                    currentLine = { y, items: [item], fontSize };
                  } else {
                    currentLine.items.push(item);
                    if (fontSize > currentLine.fontSize) {
                      currentLine.fontSize = fontSize;
                    }
                  }
                });

                if (currentLine) {
                  (currentLine as any).items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
                  lines.push({
                    y: (currentLine as any).y,
                    text: (currentLine as any).items.map((i: any) => i.str).join(' ').trim(),
                    fontSize: (currentLine as any).fontSize,
                  });
                }

                // Sort lines top-to-bottom (Y descending)
                lines.sort((a, b) => b.y - a.y);

                let pageMd = `## [페이지 ${pNum}]\n\n`;
                const pageLines: string[] = [];

                for (const line of lines) {
                  const trimmed = line.text.trim();
                  if (!trimmed) continue;
                  pageLines.push(trimmed);

                  if (line.fontSize >= 16 && trimmed.length < 80) {
                    pageMd += `### ${trimmed}\n\n`;
                  } else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('·')) {
                    pageMd += `- ${trimmed.replace(/^[•\-·]\s*/, '')}\n`;
                  } else if (/^\d+[\.\)]\s/.test(trimmed)) {
                    pageMd += `${trimmed}\n`;
                  } else {
                    pageMd += `${trimmed}\n\n`;
                  }
                }

                pageMd += `\n---\n\n`;
                snippet = pageMd;
                pageText = `[페이지 ${pNum}]\n` + pageLines.join('\n');
              }
            }

            // Immediately cleanup page rendering cache to prevent memory explosion
            try {
              if (typeof (page as any).cleanup === 'function') {
                (page as any).cleanup();
              }
            } catch {
              // Ignore cleanup error
            }

            return { pageNum: pNum, mdSnippet: snippet, rawText: pageText };
          } catch {
            return {
              pageNum: pNum,
              mdSnippet: `## [페이지 ${pNum}]\n\n*(페이지 파싱 중 경고 발생)*\n\n---\n\n`,
              rawText: `[페이지 ${pNum}]\n(파싱 경고)`,
            };
          }
        })(pageNum)
      );
    }

    const chunkResolved = await Promise.all(chunkPromises);
    for (const res of chunkResolved) {
      pageResults[res.pageNum - 1] = res;
    }

    const currentProcessed = Math.min(chunkEnd, numPages);
    const progressPercent = Math.round((currentProcessed / numPages) * 75);
    options?.onProgress?.(progressPercent, `${currentProcessed}/${numPages} 페이지 분석 완료`);
    options?.onStatusUpdate?.(`${currentProcessed}/${numPages} 페이지 고속 추출 중 (${progressPercent}%)`);

    // Non-blocking UI tick to prevent browser frame drop
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Assemble full Fast Text Markdown
  let fastMd = `# 📕 ${cleanTitle}\n\n`;
  fastMd += `> **문서 출처**: \`${fileName}\` | 총 ${numPages} 페이지 | 순수 브라우저 고속 엔진 변환\n\n---\n\n`;

  const pageTexts: string[] = [];
  for (let i = 0; i < numPages; i++) {
    const res = pageResults[i];
    if (res) {
      fastMd += res.mdSnippet;
      pageTexts.push(res.rawText);
    }
  }

  // If Fast Text Parser is selected, return immediately
  if (options?.engine === 'fast' || !options?.engine) {
    options?.onProgress?.(100, '변환 완료');
    return {
      markdown: fastMd.trim(),
      pageCount: numPages,
      warnings,
      parserEngine: 'fast',
    };
  }

  // 2. Server-Side Google Gemini AI Parser Pipeline
  if (options.engine === 'gemini') {
    options.onStatusUpdate?.('Google Gemini Flash AI가 문서 구조 및 서식을 정밀 분석 중...');
    options.onProgress?.(85, '클라우드 AI 구조화 분석 중...');

    try {
      const rawPdfText = pageTexts.join('\n\n---\n\n');
      const res = await fetch('/api/pdf/parse-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: rawPdfText,
          fileName,
          apiKey: options.geminiApiKey,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Gemini 서버 오류 (HTTP ${res.status})`);
      }

      const data = await res.json();
      const generatedMd = (data.markdown || '').trim();

      if (!generatedMd) {
        throw new Error('Gemini로부터 생성된 마크다운 내용이 비어 있습니다.');
      }

      const formattedHeader = `# 📕 ${cleanTitle}\n\n> **문서 출처**: \`${fileName}\` | 총 ${numPages} 페이지 | ⚡ Google Gemini Flash 정밀 마크다운 변환\n\n---\n\n`;

      options.onProgress?.(100, '변환 완료');

      return {
        markdown: (formattedHeader + generatedMd).trim(),
        pageCount: numPages,
        warnings: [],
        parserEngine: 'gemini',
      };
    } catch (err: any) {
      const fallbackReason = 'Gemini AI 변환 실패로 인해 고속 텍스트 추출 결과로 자동 전환되었습니다.';
      if (options.onFallback) {
        options.onFallback(fallbackReason);
      }
      warnings.push(`${fallbackReason} (${err?.message || '알 수 없는 오류'})`);

      return {
        markdown: fastMd.trim(),
        pageCount: numPages,
        warnings,
        parserEngine: 'fast',
      };
    }
  }

  // 3. Ollama Local AI Parser Pipeline (with Smart CORS & Mixed Content Failover)
  const rawPdfText = pageTexts.join('\n\n---\n\n');
  const targetEndpoint = (options.ollamaEndpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  let targetModel = (options.ollamaModel || 'llama3.2-vision').trim();
  if (targetModel.startsWith('ollama/')) {
    targetModel = targetModel.replace(/^ollama\//, '');
  }

  options.onStatusUpdate?.('Local AI가 PDF 양식을 분석하여 마크다운으로 변환 중...');
  options.onProgress?.(80, 'Local AI 모델 추론 중...');

  const systemPrompt = '너는 전문 마크다운 문서 가공기이다. 전달받은 PDF 텍스트의 제목(Heading), 표(Table), 목록(List), 단락(Paragraph)을 완벽한 마크다운 양식으로 재구성하라. 오직 마크다운 텍스트만 출력하라.';
  const userPrompt = `[문서 제목: ${cleanTitle}] (총 ${numPages}페이지)\n\n다음은 PDF에서 1차 추출된 원본 텍스트 스트림입니다. 상기 규칙에 따라 제목(Heading), 표(Table), 목록(List), 단락(Paragraph)을 완벽한 마크다운 양식으로 재구성해 주세요:\n\n${rawPdfText}`;

  let generatedMarkdown = '';
  let usedProxy = false;

  // Attempt 1: Direct browser fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const directResponse = await fetch(`${targetEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: targetModel,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        options: { temperature: 0.2 },
      }),
    });

    clearTimeout(timeoutId);

    if (directResponse.ok) {
      const data = await directResponse.json();
      generatedMarkdown = data?.response || '';
    } else {
      throw new Error(`Direct fetch status: ${directResponse.status}`);
    }
  } catch (directErr: any) {
    // Attempt 2: Auto Failover to Server Proxy (Bypasses browser CORS & Mixed Content)
    options.onStatusUpdate?.('CORS 제약 우회를 위해 서버 프록시로 안전하게 전환하여 재시도 중...');
    try {
      const proxyRes = await fetch('/api/ollama/proxy-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: targetEndpoint,
          model: targetModel,
          prompt: userPrompt,
          system: systemPrompt,
        }),
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        generatedMarkdown = proxyData?.response || '';
        usedProxy = true;
      } else {
        const pErr = await proxyRes.json().catch(() => ({}));
        throw new Error(pErr?.error || `Proxy error ${proxyRes.status}`);
      }
    } catch (proxyErr: any) {
      const fallbackReason = 'Local AI(Ollama)에 연결할 수 없어 고속 텍스트 추출 방식으로 전환합니다.';
      if (options.onFallback) {
        options.onFallback(fallbackReason);
      }
      warnings.push(`${fallbackReason} (${proxyErr?.message || directErr?.message || '포트 11434 접근 실패'})`);

      return {
        markdown: fastMd.trim(),
        pageCount: numPages,
        warnings,
        parserEngine: 'fast',
      };
    }
  }

  if (!generatedMarkdown.trim()) {
    return {
      markdown: fastMd.trim(),
      pageCount: numPages,
      warnings: ['Ollama 응답이 비어 있어 고속 추출 결과로 표시합니다.'],
      parserEngine: 'fast',
    };
  }

  // Strip wrapping markdown code fences if generated by the model
  if (generatedMarkdown.startsWith('```markdown')) {
    generatedMarkdown = generatedMarkdown.replace(/^```markdown\s*/i, '').replace(/```\s*$/, '');
  } else if (generatedMarkdown.startsWith('```')) {
    generatedMarkdown = generatedMarkdown.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
  }
  generatedMarkdown = generatedMarkdown.trim();

  const formattedHeader = `# 📕 ${cleanTitle}\n\n> **문서 출처**: \`${fileName}\` | 총 ${numPages} 페이지 | 🦙 Local AI (Ollama: \`${targetModel}\`${usedProxy ? ' / 프록시 우회' : ''}) 정밀 마크다운 변환\n\n---\n\n`;

  options.onProgress?.(100, '변환 완료');

  return {
    markdown: (formattedHeader + generatedMarkdown).trim(),
    pageCount: numPages,
    warnings: [],
    parserEngine: 'ollama',
    ollamaModel: targetModel,
  };
}

/**
 * Convert DOCX file into structured Markdown client-side using mammoth + turndown
 */
export async function convertDocxToMarkdown(
  file: File | Blob,
  fileName: string
): Promise<{ markdown: string; wordCount: number; warnings: string[] }> {
  const warnings: string[] = [];
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    arrayBuffer = new ArrayBuffer(0);
  }

  const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      markdown: `# 📄 ${cleanTitle}\n\n*(문서 파일의 크기가 0 바이트이거나 비어 있어 내용을 추출할 수 없습니다.)*\n`,
      wordCount: 0,
      warnings: ['문서 파일이 비어 있습니다 (0 바이트).'],
    };
  }

  const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
  if (mammothResult.messages && mammothResult.messages.length > 0) {
    mammothResult.messages.forEach((msg) => warnings.push(msg.message));
  }

  const html = mammothResult.value;

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  // Table support rule
  turndownService.addRule('table', {
    filter: 'table',
    replacement: function (_content, node) {
      const table = node as HTMLTableElement;
      const rows = Array.from(table.querySelectorAll('tr'));
      if (!rows.length) return '';

      const matrix = rows.map((tr) =>
        Array.from(tr.querySelectorAll('th, td')).map((td) =>
          (td.textContent || '').trim().replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
        )
      );

      const maxCols = Math.max(...matrix.map((r) => r.length), 0);
      if (maxCols <= 0) return '';

      const norm = matrix.map((row) => {
        const copy = [...row];
        while (copy.length < maxCols) copy.push('');
        return copy;
      });

      const header = norm[0];
      const headerRow = '| ' + header.map((c, i) => c || `항목 ${i + 1}`).join(' | ') + ' |';
      const sepRow = '| ' + header.map(() => '---').join(' | ') + ' |';
      const bodyRows = norm.slice(1).map((r) => '| ' + r.join(' | ') + ' |').join('\n');

      return '\n\n' + headerRow + '\n' + sepRow + (bodyRows ? '\n' + bodyRows : '') + '\n\n';
    },
  });

  let md = turndownService.turndown(html);

  if (!md.startsWith('# ')) {
    md = `# 📄 ${cleanTitle}\n\n` + md;
  }

  const wordCount = md.trim().split(/\s+/).filter(Boolean).length;
  return { markdown: md.trim(), wordCount, warnings };
}

/**
 * Convert XLSX / XLS spreadsheet file into structured Markdown client-side using SheetJS
 */
export async function convertXlsxToMarkdown(
  file: File | Blob,
  fileName: string
): Promise<{ markdown: string; sheetCount: number; rowCount: number; warnings: string[] }> {
  const warnings: string[] = [];
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    arrayBuffer = new ArrayBuffer(0);
  }

  const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      markdown: `# 📊 ${cleanTitle}\n\n*(스프레드시트 파일의 크기가 0 바이트이거나 비어 있어 내용을 추출할 수 없습니다.)*\n`,
      sheetCount: 0,
      rowCount: 0,
      warnings: ['스프레드시트 파일이 비어 있습니다 (0 바이트).'],
    };
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  let totalRows = 0;
  let md = `# 📊 ${cleanTitle}\n\n`;
  md += `> **스프레드시트 출처**: \`${fileName}\` | 시트 ${sheetNames.length}개 | SheetJS 변환\n\n---\n\n`;

  sheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    const data = rawData.filter(
      (row) => Array.isArray(row) && row.some((cell) => cell !== '' && cell !== null && cell !== undefined)
    );

    totalRows += data.length;
    md += `## 시트 ${index + 1}: ${sheetName}\n\n`;

    if (data.length === 0) {
      md += `*(내용이 없는 빈 시트입니다.)*\n\n`;
      return;
    }

    const maxCols = Math.max(...data.map((row) => row.length), 0);
    if (maxCols === 0) {
      md += `*(유효한 데이터 행이 없습니다.)*\n\n`;
      return;
    }

    const normalized = data.map((row) => {
      const copy = [...row];
      while (copy.length < maxCols) copy.push('');
      return copy.map((cell) => {
        const str = String(cell ?? '').trim();
        return str.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
      });
    });

    const headers = normalized[0];
    md += '| ' + headers.map((h, i) => h || `열 ${i + 1}`).join(' | ') + ' |\n';
    md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    for (let r = 1; r < normalized.length; r++) {
      md += '| ' + normalized[r].join(' | ') + ' |\n';
    }

    md += '\n';
  });

  return { markdown: md.trim(), sheetCount: sheetNames.length, rowCount: totalRows, warnings };
}

/**
 * Convert PPTX presentation file into structured Markdown client-side using JSZip + XML parsing
 */
export async function convertPptxToMarkdown(
  file: File | Blob,
  fileName: string
): Promise<{ markdown: string; slideCount: number; warnings: string[] }> {
  const warnings: string[] = [];
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    arrayBuffer = new ArrayBuffer(0);
  }

  const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      markdown: `# 📽️ ${cleanTitle}\n\n*(프레젠테이션 파일의 크기가 0 바이트이거나 비어 있어 내용을 추출할 수 없습니다.)*\n`,
      slideCount: 0,
      warnings: ['프레젠테이션 파일이 비어 있습니다 (0 바이트).'],
    };
  }

  const zip = await JSZip.loadAsync(arrayBuffer);
  const parser = new DOMParser();

  const slidePaths = Object.keys(zip.files).filter((path) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(path)
  );

  slidePaths.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
    const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
    return numA - numB;
  });

  const slideCount = slidePaths.length;
  let md = `# 📽️ ${cleanTitle}\n\n`;
  md += `> **프레젠테이션 출처**: \`${fileName}\` | 슬라이드 ${slideCount}장 | 클라이언트 PPTX 엔진 변환\n\n---\n\n`;

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const slideIndex = i + 1;
    const xmlContent = await zip.files[slidePath].async('text');
    const doc = parser.parseFromString(xmlContent, 'application/xml');

    // Extract speaker notes if available
    let speakerNote = '';
    const notePath = `ppt/notesSlides/notesSlide${slideIndex}.xml`;
    if (zip.files[notePath]) {
      try {
        const noteXml = await zip.files[notePath].async('text');
        const noteDoc = parser.parseFromString(noteXml, 'application/xml');
        const noteParas = Array.from(noteDoc.querySelectorAll('p\\:txBody a\\:p, txBody a\\:p'));
        const noteTexts = noteParas
          .map((p) => {
            const rTexts = Array.from(p.querySelectorAll('a\\:t, t')).map((t) => t.textContent?.trim() || '');
            return rTexts.join('').trim();
          })
          .filter(Boolean);
        if (noteTexts.length > 0) {
          speakerNote = noteTexts.join('\n> ');
        }
      } catch (err: any) {
        warnings.push(`슬라이드 ${slideIndex} 노트 파싱 경고: ${err.message}`);
      }
    }

    let slideTitle = '';
    const slideParagraphs: Array<{ text: string; level: number; isBold: boolean }> = [];
    const tables: string[] = [];

    const shapes = Array.from(doc.querySelectorAll('p\\:sp, sp'));
    for (const shape of shapes) {
      const ph = shape.querySelector('p\\:ph, ph');
      const phType = ph?.getAttribute('type');
      const isTitleShape = phType === 'title' || phType === 'ctrTitle';

      const paragraphs = Array.from(shape.querySelectorAll('a\\:p, p'));
      for (const p of paragraphs) {
        const runs = Array.from(p.querySelectorAll('a\\:r, r'));
        let pText = '';
        let hasBold = false;

        runs.forEach((r) => {
          const tEl = r.querySelector('a\\:t, t');
          pText += tEl?.textContent || '';
          const rPr = r.querySelector('a\\:rPr, rPr');
          if (rPr?.getAttribute('b') === '1' || rPr?.getAttribute('b') === 'true') {
            hasBold = true;
          }
        });

        if (!pText) {
          const directText = Array.from(p.querySelectorAll('a\\:t, t'))
            .map((t) => t.textContent || '')
            .join('');
          pText = directText;
        }

        const trimmed = pText.trim();
        if (!trimmed) continue;

        if (isTitleShape && !slideTitle) {
          slideTitle = trimmed;
        } else {
          const pPr = p.querySelector('a\\:pPr, pPr');
          const lvl = parseInt(pPr?.getAttribute('lvl') || '0', 10);
          slideParagraphs.push({
            text: trimmed,
            level: lvl,
            isBold: hasBold,
          });
        }
      }
    }

    // Extract tables
    const tableNodes = Array.from(doc.querySelectorAll('a\\:tbl, tbl'));
    for (const tbl of tableNodes) {
      const rows = Array.from(tbl.querySelectorAll('a\\:tr, tr'));
      if (rows.length === 0) continue;

      const tblData: string[][] = [];
      for (const tr of rows) {
        const cells = Array.from(tr.querySelectorAll('a\\:tc, tc'));
        const rowData = cells.map((tc) => {
          const cellTexts = Array.from(tc.querySelectorAll('a\\:t, t')).map((t) => t.textContent?.trim() || '');
          return cellTexts.join(' ').trim().replace(/\|/g, '\\|');
        });
        tblData.push(rowData);
      }

      const maxCols = Math.max(...tblData.map((r) => r.length), 0);
      if (maxCols > 0) {
        const norm = tblData.map((r) => {
          const c = [...r];
          while (c.length < maxCols) c.push('');
          return c;
        });
        const header = norm[0];
        let tblMd = '| ' + header.map((h, idx) => h || `열 ${idx + 1}`).join(' | ') + ' |\n';
        tblMd += '| ' + header.map(() => '---').join(' | ') + ' |\n';
        for (let r = 1; r < norm.length; r++) {
          tblMd += '| ' + norm[r].join(' | ') + ' |\n';
        }
        tables.push(tblMd);
      }
    }

    if (!slideTitle && slideParagraphs.length > 0 && slideParagraphs[0].isBold) {
      slideTitle = slideParagraphs.shift()!.text;
    }

    md += `## 슬라이드 ${slideIndex}${slideTitle ? `: ${slideTitle}` : ''}\n\n`;

    if (slideParagraphs.length === 0 && tables.length === 0 && !speakerNote) {
      md += `*(슬라이드에 텍스트가 없거나 다이어그램/이미지 위주로 구성되어 있습니다.)*\n\n`;
    } else {
      for (const item of slideParagraphs) {
        const indent = '  '.repeat(item.level);
        const prefix = `${indent}- `;
        const formatted = item.isBold ? `**${item.text}**` : item.text;
        md += `${prefix}${formatted}\n`;
      }
      if (slideParagraphs.length > 0) md += '\n';

      for (const tbl of tables) {
        md += tbl + '\n\n';
      }

      if (speakerNote) {
        md += `> 💡 **발표자 메모 (Speaker Notes)**:\n> ${speakerNote}\n\n`;
      }
    }

    md += `---\n\n`;
  }

  return { markdown: md.trim(), slideCount, warnings };
}

/**
 * Universal client-side document converter orchestrator
 */
export async function convertDocumentToMarkdown(
  file: File,
  pdfOptions?: PdfConversionOptions
): Promise<DocumentConversionResult> {
  const format = detectDocumentFormat(file.name, file.type);
  const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
  const suggestedFileName = `${cleanBaseName}.md`;

  let markdown = '';
  let warnings: string[] = [];
  let pageCount: number | undefined;
  let sheetCount: number | undefined;
  let slideCount: number | undefined;
  let parserEngine: PdfParserEngine = 'fast';
  let ollamaModel: string | undefined;

  switch (format) {
    case 'pdf': {
      const res = await convertPdfToMarkdown(file, file.name, pdfOptions);
      markdown = res.markdown;
      pageCount = res.pageCount;
      warnings = res.warnings;
      parserEngine = res.parserEngine;
      ollamaModel = res.ollamaModel;
      break;
    }
    case 'docx': {
      const res = await convertDocxToMarkdown(file, file.name);
      markdown = res.markdown;
      warnings = res.warnings;
      break;
    }
    case 'xlsx': {
      const res = await convertXlsxToMarkdown(file, file.name);
      markdown = res.markdown;
      sheetCount = res.sheetCount;
      warnings = res.warnings;
      break;
    }
    case 'pptx': {
      const res = await convertPptxToMarkdown(file, file.name);
      markdown = res.markdown;
      slideCount = res.slideCount;
      warnings = res.warnings;
      break;
    }
    case 'text':
    default: {
      const text = await file.text();
      markdown = text;
      break;
    }
  }

  const wordCount = markdown.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = markdown.split(/\r?\n/).length;

  const stats: ConversionStats = {
    format,
    originalFileName: file.name,
    originalFileSize: file.size,
    pageCount,
    sheetCount,
    slideCount,
    wordCount,
    lineCount,
    convertedAt: new Date().toLocaleString('ko-KR'),
  };

  return {
    markdown,
    suggestedFileName,
    stats,
    warnings,
    parserEngine,
    ollamaModel,
    originalFile: file,
  };
}
