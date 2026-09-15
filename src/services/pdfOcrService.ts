import Tesseract from 'tesseract.js';

export interface PageOcrResult {
  markdown: string;
  rawText: string;
  confidence: number;
  engineUsed: 'gemini-cloud' | 'tesseract-ocr' | 'ollama-vision' | 'layout-vector';
  pageNumber: number;
}

export interface OcrProgressInfo {
  status: string;
  progress: number; // 0 to 100
}

export interface ExtractPageOptions {
  pageNumber: number;
  canvas: HTMLCanvasElement | null;
  pageTextItems?: Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
  }>;
  engine?: 'auto' | 'gemini' | 'tesseract' | 'ollama' | 'vector';
  ollamaEndpoint?: string;
  ollamaModel?: string;
  geminiApiKey?: string;
  lang?: string; // 'kor+eng', 'eng', etc.
  onProgress?: (info: OcrProgressInfo) => void;
}

/**
 * Intelligent Layout to Markdown Formatter
 * Analyzes positional text chunks (X, Y, font sizes) and produces formatted Markdown.
 */
export function formatLayoutItemsToMarkdown(
  items: Array<{ str: string; x: number; y: number; width: number; height: number; fontSize: number }>,
  pageNumber: number,
  sourceLabel = 'PDF Parser'
): string {
  if (!items || items.length === 0) {
    return `## [페이지 ${pageNumber}]\n\n*(텍스트를 감지하지 못했습니다.)*\n`;
  }

  // Filter out empty strings
  const valid = items.filter((it) => it.str && it.str.trim().length > 0);
  if (valid.length === 0) {
    return `## [페이지 ${pageNumber}]\n\n*(텍스트가 없는 이미지 또는 빈 페이지입니다.)*\n`;
  }

  // Determine average font size
  const fontSizes = valid.map((v) => v.fontSize).filter((s) => s > 0);
  const avgFontSize = fontSizes.length > 0 ? fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length : 12;

  // Group items into lines based on Y coordinate (within tolerance)
  const lineTolerance = Math.max(avgFontSize * 0.4, 4);
  const rawLines: Array<{ y: number; items: typeof valid; avgFontSize: number }> = [];

  // Sort by Y descending first (PDF origin is bottom-left) or Y ascending (standard image top-left)
  // We'll normalize by checking sorting
  const sortedByY = [...valid].sort((a, b) => b.y - a.y);

  for (const item of sortedByY) {
    let matchedLine = rawLines.find((l) => Math.abs(l.y - item.y) <= lineTolerance);
    if (!matchedLine) {
      matchedLine = { y: item.y, items: [], avgFontSize: item.fontSize };
      rawLines.push(matchedLine);
    }
    matchedLine.items.push(item);
    matchedLine.avgFontSize = (matchedLine.avgFontSize + item.fontSize) / 2;
  }

  // Sort lines top to bottom (highest Y first in PDF coordinates)
  rawLines.sort((a, b) => b.y - a.y);

  // Within each line, sort items left to right (X ascending)
  const processedLines: Array<{ text: string; fontSize: number; isHeader: boolean; isTableCandidate: boolean }> = [];

  for (const line of rawLines) {
    line.items.sort((a, b) => a.x - b.x);

    // Detect if this line has large gaps between items (possible table row)
    let isTable = false;
    if (line.items.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < line.items.length; i++) {
        gaps.push(line.items[i].x - (line.items[i - 1].x + line.items[i - 1].width));
      }
      const largeGaps = gaps.filter((g) => g > avgFontSize * 1.8);
      if (largeGaps.length >= 1 && line.items.length >= 2) {
        isTable = true;
      }
    }

    const lineText = line.items.map((it) => it.str.trim()).filter(Boolean).join(' ');
    if (!lineText.trim()) continue;

    const isHeader = line.avgFontSize > avgFontSize * 1.25 && lineText.length < 100;
    processedLines.push({
      text: lineText,
      fontSize: line.avgFontSize,
      isHeader,
      isTableCandidate: isTable,
    });
  }

  // Build Markdown
  let md = `## [페이지 ${pageNumber}] (${sourceLabel})\n\n`;
  let inTable = false;

  for (let i = 0; i < processedLines.length; i++) {
    const cur = processedLines[i];
    const trimmed = cur.text.trim();

    // Check if table row candidate
    if (cur.isTableCandidate && trimmed.includes('  ')) {
      const columns = trimmed.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
      if (columns.length >= 2) {
        if (!inTable) {
          inTable = true;
          md += `| ${columns.join(' | ')} |\n`;
          md += `| ${columns.map(() => '---').join(' | ')} |\n`;
        } else {
          md += `| ${columns.join(' | ')} |\n`;
        }
        continue;
      }
    }

    if (inTable) {
      inTable = false;
      md += '\n';
    }

    // Headers
    if (cur.isHeader) {
      if (cur.fontSize > avgFontSize * 1.6) {
        md += `### ${trimmed}\n\n`;
      } else {
        md += `#### ${trimmed}\n\n`;
      }
      continue;
    }

    // List items
    if (trimmed.startsWith('•') || trimmed.startsWith('▪') || trimmed.startsWith('-') || trimmed.startsWith('·')) {
      md += `- ${trimmed.replace(/^[•▪\-·]\s*/, '')}\n`;
      continue;
    }

    // Numbered lists
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      md += `${trimmed}\n`;
      continue;
    }

    // Quotes or references
    if (trimmed.startsWith('>') || trimmed.startsWith('※') || trimmed.startsWith('Note:')) {
      md += `> ${trimmed}\n\n`;
      continue;
    }

    // Standard paragraph line
    md += `${trimmed}\n\n`;
  }

  return md.trim();
}

/**
 * Perform Tesseract OCR on an HTMLCanvasElement
 */
export async function runTesseractOcrOnCanvas(
  canvas: HTMLCanvasElement,
  options?: {
    lang?: string;
    onProgress?: (info: OcrProgressInfo) => void;
  }
): Promise<{ text: string; confidence: number; lines: any[] }> {
  const lang = options?.lang || 'kor+eng';
  options?.onProgress?.({ status: 'OCR 엔진 초기화 중...', progress: 10 });

  try {
    const res = await Tesseract.recognize(canvas, lang, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.min(Math.round((m.progress || 0) * 80) + 15, 95);
          options?.onProgress?.({ status: `텍스트 및 레이아웃 인식 중... (${pct}%)`, progress: pct });
        } else if (m.status) {
          options?.onProgress?.({ status: `${m.status}...`, progress: 20 });
        }
      },
    });

    options?.onProgress?.({ status: 'OCR 완료! 마크다운 재구성 중...', progress: 100 });
    const dataAny = res.data as any;
    return {
      text: res.data.text || '',
      confidence: res.data.confidence || 0,
      lines: dataAny.lines || (dataAny.blocks ? dataAny.blocks.flatMap((b: any) => b.lines || []) : []),
    };
  } catch (primaryErr: any) {
    console.warn('Tesseract Korean+English model failed, falling back to English model:', primaryErr);
    options?.onProgress?.({ status: '영어 기본 모델로 재시도 중...', progress: 30 });

    // Fallback to pure English model if Korean traineddata failed to download or load
    const fallbackRes = await Tesseract.recognize(canvas, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.min(Math.round((m.progress || 0) * 80) + 15, 95);
          options?.onProgress?.({ status: `텍스트 인식 중... (${pct}%)`, progress: pct });
        }
      },
    });

    options?.onProgress?.({ status: 'OCR 완료!', progress: 100 });
    const fallbackAny = fallbackRes.data as any;
    return {
      text: fallbackRes.data.text || '',
      confidence: fallbackRes.data.confidence || 0,
      lines: fallbackAny.lines || (fallbackAny.blocks ? fallbackAny.blocks.flatMap((b: any) => b.lines || []) : []),
    };
  }
}

/**
 * Format Tesseract OCR Lines to Markdown with layout awareness
 */
export function formatOcrLinesToMarkdown(lines: any[], pageNumber: number): string {
  if (!lines || lines.length === 0) {
    return `## [페이지 ${pageNumber}]\n\n*(OCR 텍스트를 감지하지 못했습니다.)*\n`;
  }

  const items: Array<{ str: string; x: number; y: number; width: number; height: number; fontSize: number }> = [];

  for (const line of lines) {
    const text = (line.text || '').trim();
    if (!text) continue;

    const bbox = line.bbox || { x0: 0, y0: 0, x1: 100, y1: 20 };
    const width = Math.max(bbox.x1 - bbox.x0, 10);
    const height = Math.max(bbox.y1 - bbox.y0, 12);
    // In Tesseract, y0 is from top, so we invert Y for standard layout grouping
    const normalizedY = 10000 - bbox.y0;

    items.push({
      str: text,
      x: bbox.x0,
      y: normalizedY,
      width: width,
      height: height,
      fontSize: height,
    });
  }

  return formatLayoutItemsToMarkdown(items, pageNumber, 'Tesseract OCR');
}

/**
 * Extract Markdown from the Current PDF Page with Intelligent OCR & Layout Analysis
 */
export async function extractCurrentPageToMarkdown(
  options: ExtractPageOptions
): Promise<PageOcrResult> {
  const { pageNumber, canvas, pageTextItems, engine = 'auto', ollamaEndpoint, ollamaModel, onProgress } = options;

  onProgress?.({ status: `페이지 ${pageNumber} 레이아웃 정밀 분석 시작...`, progress: 5 });

  // 1. Check if Vector Text exists from PDF.js
  const hasVectorText = pageTextItems && pageTextItems.filter((i) => i.str && i.str.trim()).length >= 5;

  // 2. Google Gemini Cloud Multimodal Vision Parser
  if (engine === 'gemini') {
    try {
      onProgress?.({ status: `⚡ Google Gemini Flash AI로 페이지 ${pageNumber} 분석 중...`, progress: 30 });
      let imageBase64: string | undefined;
      if (canvas && canvas.width > 20) {
        imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
      }

      const vectorTextString = hasVectorText && pageTextItems
        ? pageTextItems.map((i) => i.str).join(' ')
        : undefined;

      const resp = await fetch('/api/pdf/parse-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          textContent: vectorTextString,
          pageNumber,
          apiKey: options.geminiApiKey,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        let md = (data.markdown || '').trim();
        if (md.length > 10) {
          onProgress?.({ status: 'Gemini Cloud AI 파싱 완료!', progress: 100 });
          return {
            markdown: `## [페이지 ${pageNumber}] (Google Gemini Flash)\n\n${md}`,
            rawText: md,
            confidence: 99,
            engineUsed: 'gemini-cloud',
            pageNumber,
          };
        }
      }
    } catch (geminiErr) {
      console.warn('Gemini parse failed, falling back to OCR / Vector:', geminiErr);
    }
  }

  // 3. Ollama Local AI Parser with Smart CORS / Mixed Content Proxy Failover
  if (engine === 'ollama' && canvas) {
    try {
      onProgress?.({ status: `🤖 Local AI (${ollamaModel || 'vision'})로 페이지 이미지 전송 중...`, progress: 20 });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

      const endpoint = (ollamaEndpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
      const model = (ollamaModel || 'llama3.2-vision').trim().replace(/^ollama\//, '');
      const prompt = '이 PDF 문서 페이지의 내용을 완벽한 마크다운(Markdown)으로 재구성해 주세요. 제목, 본문, 목록, 표가 있다면 정확한 마크다운 문법으로 변환해 주세요. 오직 마크다운 텍스트만 출력하세요.';

      let md = '';

      // Direct browser fetch attempt
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);

        const resp = await fetch(`${endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: model,
            prompt,
            images: [base64Data],
            stream: false,
          }),
        });

        clearTimeout(timer);

        if (resp.ok) {
          const data = await resp.json();
          md = data?.response || '';
        }
      } catch {
        // Direct fetch failed (CORS or Mixed Content) -> Failover to server proxy
        onProgress?.({ status: `CORS 제약 우회를 위해 서버 프록시로 안전하게 전환하여 재시도 중...`, progress: 40 });
        const proxyResp = await fetch('/api/ollama/proxy-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            model,
            prompt,
            images: [base64Data],
          }),
        });
        if (proxyResp.ok) {
          const proxyData = await proxyResp.json();
          md = proxyData?.response || '';
        }
      }

      if (md.startsWith('```markdown')) {
        md = md.replace(/^```markdown\s*/i, '').replace(/```\s*$/, '');
      } else if (md.startsWith('```')) {
        md = md.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
      }
      md = md.trim();

      if (md.length > 20) {
        onProgress?.({ status: 'Local AI 비전 파싱 완료!', progress: 100 });
        return {
          markdown: `## [페이지 ${pageNumber}] (Local AI: ${model})\n\n${md}`,
          rawText: md,
          confidence: 95,
          engineUsed: 'ollama-vision',
          pageNumber,
        };
      }
    } catch (ollamaErr) {
      console.warn('Ollama Vision parse attempt failed or offline, falling back to OCR / Vector:', ollamaErr);
    }
  }

  // 3. Tesseract OCR on Canvas (High-precision OCR requested or Scanned Document)
  if (canvas && (engine === 'tesseract' || (!hasVectorText && canvas.width > 50))) {
    try {
      const ocrResult = await runTesseractOcrOnCanvas(canvas, {
        lang: options.lang || 'kor+eng',
        onProgress,
      });

      if (ocrResult.text.trim().length > 0) {
        const formattedMd = formatOcrLinesToMarkdown(ocrResult.lines, pageNumber);
        return {
          markdown: formattedMd,
          rawText: ocrResult.text,
          confidence: Math.round(ocrResult.confidence),
          engineUsed: 'tesseract-ocr',
          pageNumber,
        };
      }
    } catch (ocrErr: any) {
      console.warn('Tesseract OCR failed:', ocrErr);
    }
  }

  // 4. Vector Text Coordinate Layout Parser (Instant & zero-loss for vector PDFs)
  if (hasVectorText && pageTextItems) {
    onProgress?.({ status: '벡터 텍스트 레이아웃 좌표 분석 중...', progress: 60 });
    const items = pageTextItems.map((it) => {
      const x = it.transform[4] || 0;
      const y = it.transform[5] || 0;
      const fontSize = Math.abs(it.transform[0] || it.height || 12);
      return {
        str: it.str,
        x,
        y,
        width: it.width || 10,
        height: it.height || fontSize,
        fontSize,
      };
    });

    const layoutMd = formatLayoutItemsToMarkdown(items, pageNumber, 'Vector Layout Parser');
    onProgress?.({ status: '레이아웃 마크다운 변환 완료!', progress: 100 });

    return {
      markdown: layoutMd,
      rawText: items.map((i) => i.str).join(' '),
      confidence: 98,
      engineUsed: 'layout-vector',
      pageNumber,
    };
  }

  // Fallback: If both failed or canvas empty
  return {
    markdown: `## [페이지 ${pageNumber}]\n\n*(텍스트를 추출할 수 없습니다. 빈 페이지이거나 지원되지 않는 이미지 형식일 수 있습니다.)*\n`,
    rawText: '',
    confidence: 0,
    engineUsed: 'layout-vector',
    pageNumber,
  };
}
