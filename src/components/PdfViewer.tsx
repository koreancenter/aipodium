import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Sparkles,
  Columns2,
  FileText,
  Upload,
  Download,
  Check,
  Copy,
  Eye,
  Edit3,
  Loader2,
  AlertCircle,
  RefreshCw,
  Settings2,
  ScanText,
  Layers,
  ArrowDownUp,
  LocateFixed,
} from 'lucide-react';
import { convertPdfToMarkdown, PdfParserEngine } from '../services/documentConverterService';
import { extractCurrentPageToMarkdown, OcrProgressInfo } from '../services/pdfOcrService';
import { SAMPLE_PDF_DATA_URL } from '../data/samplePdfData';

// Polyfill Promise.try for environments where it is missing
if (typeof Promise !== 'undefined' && typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function <T>(fn: () => T | PromiseLike<T>): Promise<T> {
    return new Promise<T>((resolve) => resolve(fn()));
  };
}

// Configure PDF.js worker
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

export interface PdfViewerProps {
  fileName: string;
  pdfData?: string | ArrayBuffer | Uint8Array | null;
  markdownContent: string;
  onMarkdownChange: (newMarkdown: string) => void;
  onUploadPdf?: (file: File) => void;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  renderMarkdownToHtml?: (md: string) => string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  fileName,
  pdfData,
  markdownContent,
  onMarkdownChange,
  onUploadPdf,
  ollamaEndpoint = 'http://localhost:11434',
  ollamaModel = 'llama3.2-vision',
  onToast,
  renderMarkdownToHtml,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInputValue, setPageInputValue] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.0);
  const [currentEffectiveScale, setCurrentEffectiveScale] = useState<number>(1.0);
  const [zoomInputValue, setZoomInputValue] = useState<string>('100');
  const [fitMode, setFitMode] = useState<'custom' | 'width'>('width');
  const [rotation, setRotation] = useState<number>(0);
  const [isSplitView, setIsSplitView] = useState<boolean>(true);
  const [rightPaneTab, setRightPaneTab] = useState<'edit' | 'preview'>('edit');
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractEngine, setExtractEngine] = useState<PdfParserEngine | 'ocr'>('ollama');
  const [extractScope, setExtractScope] = useState<'current' | 'all'>('current');
  const [ocrProgress, setOcrProgress] = useState<OcrProgressInfo | null>(null);
  const [ocrLanguage, setOcrLanguage] = useState<'kor+eng' | 'eng'>('kor+eng');
  const [isSyncScrollEnabled, setIsSyncScrollEnabled] = useState<boolean>(true);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const activePdfBytesRef = useRef<Uint8Array | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to fallback to pre-compiled multi-page sample PDF
  const getSamplePdfBytes = useCallback((): Uint8Array => {
    try {
      const b64 = SAMPLE_PDF_DATA_URL.split(',')[1] || '';
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      return new Uint8Array(0);
    }
  }, []);

  // Helper to convert base64 / dataUrl / ArrayBuffer to Uint8Array safely
  const resolvePdfBytes = useCallback((source: string | ArrayBuffer | Uint8Array | null | undefined): Uint8Array => {
    if (!source) {
      return getSamplePdfBytes();
    }

    if (source instanceof Uint8Array) {
      return source.byteLength > 0 ? source : getSamplePdfBytes();
    }

    if (source instanceof ArrayBuffer) {
      return source.byteLength > 0 ? new Uint8Array(source) : getSamplePdfBytes();
    }

    if (typeof source === 'string') {
      const trimmed = source.trim();
      if (!trimmed) {
        return getSamplePdfBytes();
      }

      let b64 = trimmed;
      if (trimmed.startsWith('data:')) {
        b64 = trimmed.split(',')[1] || '';
      }

      if (!b64 || b64.trim().length === 0) {
        return getSamplePdfBytes();
      }

      try {
        const binary = atob(b64);
        if (binary.length === 0) {
          return getSamplePdfBytes();
        }
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } catch {
        // Source string was plain text or invalid base64; fallback to sample
        return getSamplePdfBytes();
      }
    }

    return getSamplePdfBytes();
  }, [getSamplePdfBytes]);

  // 1. Load PDF Document via PDF.js
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingPdf(true);
    setLoadError(null);

    const loadDocument = async () => {
      try {
        const bytes = resolvePdfBytes(pdfData);
        activePdfBytesRef.current = bytes;

        if (!bytes || bytes.byteLength === 0) {
          setLoadError('PDF 파일의 크기가 0 바이트이거나 비어 있습니다.');
          setIsLoadingPdf(false);
          return;
        }

        const loadingTask = pdfjsLib.getDocument({
          data: bytes,
          useSystemFonts: true,
          disableFontFace: false,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInputValue('1');
        setIsLoadingPdf(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Error loading PDF document:', err);
        setLoadError(err?.message || 'PDF 문서를 로드하지 못했습니다.');
        setIsLoadingPdf(false);
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [pdfData, resolvePdfBytes]);

  // 2. Render Page on Canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > numPages) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    setIsRenderingPage(true);

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      // Calculate viewport
      let effectiveScale = scale;
      if (fitMode === 'width' && viewerContainerRef.current) {
        const containerWidth = viewerContainerRef.current.clientWidth - 48; // padding
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        if (unscaledViewport.width > 0 && containerWidth > 100) {
          effectiveScale = Math.max(containerWidth / unscaledViewport.width, 0.4);
        }
      }

      const viewport = page.getViewport({ scale: effectiveScale, rotation });
      setCurrentEffectiveScale(effectiveScale);
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.save();
      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;

      await task.promise;
      ctx.restore();
      setIsRenderingPage(false);
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') {
        // Expected on fast navigation/zoom
        return;
      }
      console.warn('PDF Page render warning:', err);
      setIsRenderingPage(false);
    }
  }, [pdfDoc, currentPage, scale, fitMode, rotation, numPages]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Handle Container Resize for Fit Width mode
  useEffect(() => {
    if (fitMode !== 'width') return;
    const container = viewerContainerRef.current;
    if (!container) return;

    let timer: any = null;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        renderCurrentPage();
      }, 100);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [fitMode, renderCurrentPage]);

  // Sync zoom input value with effective zoom
  useEffect(() => {
    const currentPct = Math.round((fitMode === 'width' ? currentEffectiveScale : scale) * 100);
    setZoomInputValue(String(currentPct));
  }, [scale, currentEffectiveScale, fitMode]);

  // Page Navigation Handlers
  const handleJumpPage = (targetPage: number) => {
    const clamped = Math.max(1, Math.min(targetPage, numPages));
    setCurrentPage(clamped);
    setPageInputValue(String(clamped));
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handleJumpPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      handleJumpPage(currentPage + 1);
    }
  };

  const handlePageInputCommit = () => {
    const val = parseInt(pageInputValue.trim(), 10);
    if (!isNaN(val)) {
      handleJumpPage(val);
    } else {
      setPageInputValue(String(currentPage));
    }
  };

  // Zoom Handlers (10% fine step adjustments: 0.1 increments)
  const handleZoomIn = useCallback(() => {
    const base = fitMode === 'width' ? currentEffectiveScale : scale;
    const rounded = Math.round(base * 10) / 10;
    const next = Math.min(Math.round((rounded + 0.1) * 10) / 10, 4.0);
    setFitMode('custom');
    setScale(next);
  }, [fitMode, currentEffectiveScale, scale]);

  const handleZoomOut = useCallback(() => {
    const base = fitMode === 'width' ? currentEffectiveScale : scale;
    const rounded = Math.round(base * 10) / 10;
    const next = Math.max(Math.round((rounded - 0.1) * 10) / 10, 0.2);
    setFitMode('custom');
    setScale(next);
  }, [fitMode, currentEffectiveScale, scale]);

  const handleSetExactZoom = (targetScale: number) => {
    const clamped = Math.min(Math.max(Math.round(targetScale * 100) / 100, 0.2), 4.0);
    setFitMode('custom');
    setScale(clamped);
  };

  const handleZoomInputCommit = () => {
    const clean = zoomInputValue.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= 20 && num <= 400) {
      handleSetExactZoom(num / 100);
    } else {
      setZoomInputValue(String(Math.round((fitMode === 'width' ? currentEffectiveScale : scale) * 100)));
    }
  };

  const handleFitWidth = () => {
    setFitMode('width');
  };

  const handleResetZoom = () => {
    setFitMode('custom');
    setScale(1.0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Ctrl + Wheel Zoom Handler for 10% steps
  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else if (e.deltaY > 0) {
          handleZoomOut();
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleZoomIn, handleZoomOut]);

  // Auto-scroll (Sync Scroll) right Markdown Editor or Preview to matching page section
  const scrollToCurrentPageInEditor = useCallback((targetPageNum: number) => {
    if (!markdownContent) return;

    // Search patterns for matching page in Markdown
    const pagePatterns = [
      new RegExp(`(?:^|\\n)##\\s*\\[?페이지\\s*${targetPageNum}(?:\\]|\\s|$)`, 'i'),
      new RegExp(`(?:^|\\n)##\\s*\\[?Page\\s*${targetPageNum}(?:\\]|\\s|$)`, 'i'),
      new RegExp(`(?:^|\\n)#+\\s*.*\\[?페이지\\s*${targetPageNum}(?:\\]|\\s|$)`, 'i'),
      new RegExp(`(?:^|\\n)---+\\s*\\n+#+\\s*.*${targetPageNum}`, 'i'),
    ];

    let matchIndex = -1;
    for (const pattern of pagePatterns) {
      const match = pattern.exec(markdownContent);
      if (match && match.index !== undefined) {
        matchIndex = match.index;
        break;
      }
    }

    // 1. Textarea Edit Mode Scroll
    if (rightPaneTab === 'edit' && editorTextareaRef.current) {
      const textarea = editorTextareaRef.current;
      if (matchIndex !== -1) {
        // Calculate target scroll position based on line number
        const textBefore = markdownContent.substring(0, matchIndex);
        const targetLineIndex = textBefore.split('\n').length - 1;
        const totalLines = Math.max(markdownContent.split('\n').length, 1);
        const scrollHeight = textarea.scrollHeight;
        const targetTop = Math.max(0, (targetLineIndex / totalLines) * scrollHeight - 32);

        textarea.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });

        // Set cursor position to the page header for visual feedback
        try {
          textarea.setSelectionRange(matchIndex, matchIndex);
        } catch {
          // ignore focus/selection issues if not focused
        }
      } else if (numPages > 1) {
        // Approximate proportional scroll if exact page header not extracted yet
        const ratio = (targetPageNum - 1) / Math.max(numPages - 1, 1);
        const targetTop = ratio * (textarea.scrollHeight - textarea.clientHeight);
        textarea.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
      }
    }

    // 2. HTML Preview Mode Scroll
    if (rightPaneTab === 'preview' && previewContainerRef.current) {
      const previewEl = previewContainerRef.current;
      // Search DOM headings for page text
      const headings = previewEl.querySelectorAll('h1, h2, h3, h4, strong, p');
      let foundElement: HTMLElement | null = null;

      for (let i = 0; i < headings.length; i++) {
        const text = headings[i].textContent || '';
        if (
          text.includes(`페이지 ${targetPageNum}`) ||
          text.includes(`페이지${targetPageNum}`) ||
          text.includes(`Page ${targetPageNum}`) ||
          text.includes(`[${targetPageNum}/${numPages}]`)
        ) {
          foundElement = headings[i] as HTMLElement;
          break;
        }
      }

      if (foundElement) {
        foundElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      } else if (numPages > 1) {
        const ratio = (targetPageNum - 1) / Math.max(numPages - 1, 1);
        const targetTop = ratio * (previewEl.scrollHeight - previewEl.clientHeight);
        previewEl.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
      }
    }
  }, [markdownContent, numPages, rightPaneTab]);

  // Trigger sync scroll whenever currentPage or split view state changes
  useEffect(() => {
    if (!isSplitView || !isSyncScrollEnabled) return;

    // Debounce slightly to allow tab render or transition to settle
    const timer = setTimeout(() => {
      scrollToCurrentPageInEditor(currentPage);
    }, 80);

    return () => clearTimeout(timer);
  }, [currentPage, isSplitView, isSyncScrollEnabled, rightPaneTab, scrollToCurrentPageInEditor]);

  // Extract to Markdown Pipeline (Current Page OCR/Layout or Full Document)
  const handleExtractToMarkdown = async (engine: PdfParserEngine | 'ocr' = extractEngine) => {
    let bytesToUse = activePdfBytesRef.current;
    if (!bytesToUse || bytesToUse.byteLength === 0) {
      bytesToUse = resolvePdfBytes(pdfData);
      activePdfBytesRef.current = bytesToUse;
    }

    if (!bytesToUse || bytesToUse.byteLength === 0) {
      onToast?.('변환할 PDF 데이터가 없거나 비어 있습니다.', 'error');
      return;
    }

    setIsExtracting(true);

    if (extractScope === 'current') {
      const engineNameLabel =
        engine === 'ocr'
          ? 'Tesseract OCR'
          : engine === 'ollama'
          ? `Local AI (${ollamaModel})`
          : 'Fast Layout Parser';

      onToast?.(`🔍 [페이지 ${currentPage}] 레이아웃 및 텍스트 정밀 분석을 시작합니다 (${engineNameLabel})...`, 'info');
      setOcrProgress({ status: `페이지 ${currentPage} 분석 준비 중...`, progress: 10 });

      try {
        let pageTextItems: any[] = [];
        if (pdfDoc) {
          try {
            const page = await pdfDoc.getPage(currentPage);
            const textContent = await page.getTextContent();
            pageTextItems = textContent.items || [];
          } catch (e) {
            console.warn('Could not read vector textContent for page:', e);
          }
        }

        const result = await extractCurrentPageToMarkdown({
          pageNumber: currentPage,
          canvas: canvasRef.current,
          pageTextItems,
          engine: engine === 'ocr' ? 'tesseract' : engine === 'ollama' ? 'ollama' : 'vector',
          ollamaEndpoint,
          ollamaModel,
          lang: ocrLanguage,
          onProgress: (info) => {
            setOcrProgress(info);
          },
        });

        // Smart Markdown Integration into Editor
        let updatedMd = markdownContent;
        const pageHeaderRegex = new RegExp(
          `##\\s*\\[페이지\\s*${currentPage}\\].*?(?=(?:##\\s*\\[페이지\\s*\\d+\\]|$))`,
          's'
        );

        if (pageHeaderRegex.test(updatedMd)) {
          // Replace matching page section in existing markdown
          updatedMd = updatedMd.replace(pageHeaderRegex, result.markdown + '\n\n');
        } else if (!updatedMd.trim()) {
          const docHeader = `# 📕 ${fileName.replace(/\.[^/.]+$/, '')}\n\n> **문서 출처**: \`${fileName}\` | [페이지 ${currentPage}/${numPages}] 정밀 레이아웃 파싱 (${result.engineUsed.toUpperCase()})\n\n---\n\n`;
          updatedMd = docHeader + result.markdown;
        } else {
          // Append page section to document
          updatedMd = updatedMd.trim() + `\n\n---\n\n` + result.markdown;
        }

        onMarkdownChange(updatedMd);
        setIsSplitView(true);
        setRightPaneTab('edit');
        setIsExtracting(false);
        setOcrProgress(null);

        const engineLabel =
          result.engineUsed === 'tesseract-ocr'
            ? `Tesseract OCR (${result.confidence}% 신뢰도)`
            : result.engineUsed === 'ollama-vision'
            ? `Local AI (${ollamaModel})`
            : 'Vector Layout Parser';

        onToast?.(
          `✨ [페이지 ${currentPage}] 텍스트와 레이아웃이 마크다운 에디터에 반영되었습니다 (${engineLabel})!`,
          'success'
        );
      } catch (err: any) {
        setIsExtracting(false);
        setOcrProgress(null);
        console.error('Page extraction failed:', err);
        onToast?.(`페이지 추출 실패: ${err?.message || '알 수 없는 오류'}`, 'error');
      }
      return;
    }

    // Full Document Extraction
    onToast?.(
      engine === 'ollama'
        ? `🤖 Local AI (${ollamaModel})로 전체 PDF 마크다운 변환을 시작합니다...`
        : `⚡ PDF 전체 텍스트 스트림을 마크다운으로 추출합니다...`,
      'info'
    );
    setOcrProgress({ status: '전체 문서 파싱 진행 중...', progress: 20 });

    try {
      const blob = new Blob([bytesToUse], { type: 'application/pdf' });
      const result = await convertPdfToMarkdown(blob, fileName, {
        engine: engine === 'ocr' ? 'fast' : engine,
        ollamaEndpoint: ollamaEndpoint,
        ollamaModel: ollamaModel,
        onFallback: (reason) => {
          onToast?.(`⚠️ 로컬 AI 추출 실패 (${reason}). 고속 브라우저 파서로 자동 대체되었습니다.`, 'info');
        },
      });

      onMarkdownChange(result.markdown);
      setIsSplitView(true);
      setRightPaneTab('edit');
      setIsExtracting(false);
      setOcrProgress(null);

      if (result.pageCount === 0) {
        onToast?.(`⚠️ '${fileName}' 파일이 비어 있어 추출된 마크다운 내용이 없습니다.`, 'info');
      } else {
        const engineName = result.parserEngine === 'ollama' ? `Local AI (${result.ollamaModel || ollamaModel})` : 'Fast Text Parser';
        onToast?.(`✓ '${fileName}' 전체 마크다운이 성공적으로 추출되었습니다 (${engineName})!`, 'success');
      }
    } catch (err: any) {
      setIsExtracting(false);
      setOcrProgress(null);
      console.error('PDF extraction failed:', err);
      onToast?.(`마크다운 추출 실패: ${err?.message || '알 수 없는 오류'}`, 'error');
    }
  };

  // Copy Markdown Handler
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
      onToast?.('마크다운 텍스트가 클립보드에 복사되었습니다.', 'success');
    } catch {
      onToast?.('복사 실패', 'error');
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = () => {
    if (!activePdfBytesRef.current) return;
    const blob = new Blob([activePdfBytesRef.current], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast?.(`📥 '${fileName}' 파일 다운로드를 시작했습니다.`, 'info');
  };

  // Replace/Upload PDF Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onUploadPdf) {
      onUploadPdf(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#121318] text-slate-100 select-none overflow-hidden">
      {/* Hidden File Input for PDF Upload/Replace */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Mini Toolbar: Fixed Height, High Contrast, Enhanced Controls */}
      <div className="h-9 px-2 bg-[#181a24] border-b border-[#2e3142] flex items-center justify-between gap-2 shrink-0 z-20 text-xs overflow-x-auto select-none no-scrollbar">
        {/* Left Section: File Title, Page Navigation & 10% Zoom Controls */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#222433] border border-[#2e3142] text-slate-200 shrink-0">
            <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-mono text-[0.6875rem] truncate max-w-[130px]" title={fileName}>
              {fileName}
            </span>
            <span className="text-[0.5625rem] bg-rose-500/20 text-rose-300 px-1 py-0.2 rounded border border-rose-500/30 uppercase font-bold">
              PDF
            </span>
          </div>

          <div className="h-4 w-px bg-[#2e3142] shrink-0" />

          {/* Enhanced Page Navigation Controls with Direct Jump Input */}
          <div className="flex items-center gap-0.5 shrink-0 bg-[#121318] border border-[#2e3142] rounded-sm p-0.5">
            {/* First Page (1P) */}
            <button
              type="button"
              onClick={() => handleJumpPage(1)}
              disabled={currentPage <= 1 || isLoadingPdf}
              className="p-1 rounded-xs text-slate-400 hover:text-white hover:bg-[#282a38] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
              title="첫 페이지로 이동 (1P)"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Previous Page */}
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoadingPdf}
              className="p-1 rounded-xs text-slate-300 hover:text-white hover:bg-[#282a38] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
              title="이전 페이지"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page Jump Input Box */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#181a24] rounded-xs font-mono text-[0.6875rem] border border-[#282b3d] focus-within:border-[#6366f1]">
              <span className="text-slate-400 text-[0.625rem]">P.</span>
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePageInputCommit()}
                onBlur={handlePageInputCommit}
                className="w-7 text-center bg-transparent text-indigo-300 font-semibold outline-none py-0 leading-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="페이지 번호 입력 후 Enter 또는 이동 클릭"
              />
              <span className="text-slate-500">/</span>
              <span className="text-slate-300 font-semibold min-w-[14px] text-center">{numPages}</span>
              <button
                type="button"
                onClick={handlePageInputCommit}
                className="ml-0.5 px-1 py-0.2 rounded-xs bg-[#2b2d3e] hover:bg-[#6366f1] active:bg-[#4f46e5] text-[0.5625rem] text-slate-300 hover:text-white font-sans transition cursor-pointer"
                title="입력한 페이지로 바로 이동"
              >
                이동
              </button>
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages || isLoadingPdf}
              className="p-1 rounded-xs text-slate-300 hover:text-white hover:bg-[#282a38] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
              title="다음 페이지"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => handleJumpPage(numPages)}
              disabled={currentPage >= numPages || isLoadingPdf}
              className="p-1 rounded-xs text-slate-400 hover:text-white hover:bg-[#282a38] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
              title={`마지막 페이지로 이동 (${numPages}P)`}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-[#2e3142] shrink-0" />

          {/* Enhanced Zoom Controls: 10% Step Fine-Grained Adjustments */}
          <div className="flex items-center gap-0.5 shrink-0 bg-[#121318] border border-[#2e3142] rounded-sm p-0.5">
            {/* Zoom Out (-10%) */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={isLoadingPdf}
              className="px-1 py-0.5 rounded-xs text-slate-300 hover:text-white hover:bg-[#282a38] transition cursor-pointer flex items-center gap-0.5"
              title="10% 축소 (Ctrl + 마우스 휠 아래)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span className="text-[0.5625rem] font-mono text-slate-400">-10%</span>
            </button>

            {/* Zoom Direct Input & 10% Stepped Dropdown */}
            <div className="flex items-center gap-0.5 bg-[#181a24] rounded-xs px-1 py-0.5 font-mono text-[0.6875rem] border border-[#282b3d] focus-within:border-[#6366f1]">
              <input
                type="text"
                value={zoomInputValue}
                onChange={(e) => setZoomInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleZoomInputCommit()}
                onBlur={handleZoomInputCommit}
                className="w-7 text-right bg-transparent text-indigo-300 font-semibold outline-none py-0 leading-tight"
                title="확대/축소 배율(%) 직접 입력 후 Enter"
              />
              <span className="text-slate-400 text-[0.625rem] mr-0.5">%</span>

              {/* 10% Stepped Preset Dropdown */}
              <select
                value={fitMode === 'width' ? 'width' : String(Math.round(scale * 100))}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'width') {
                    handleFitWidth();
                  } else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) {
                      handleSetExactZoom(num / 100);
                    }
                  }
                }}
                className="bg-[#242738] text-slate-300 text-[0.625rem] rounded-xs px-1 py-0.2 border border-[#2e3142] outline-none cursor-pointer hover:border-[#6366f1] transition"
                title="배율 10% 단위 프리셋 선택"
              >
                <option value="width">너비맞춤</option>
                <option value="50">50%</option>
                <option value="60">60%</option>
                <option value="70">70%</option>
                <option value="80">80%</option>
                <option value="90">90%</option>
                <option value="100">100% (1:1)</option>
                <option value="110">110%</option>
                <option value="120">120%</option>
                <option value="130">130%</option>
                <option value="140">140%</option>
                <option value="150">150%</option>
                <option value="160">160%</option>
                <option value="170">170%</option>
                <option value="180">180%</option>
                <option value="190">190%</option>
                <option value="200">200%</option>
                <option value="250">250%</option>
                <option value="300">300%</option>
                <option value="400">400%</option>
              </select>
            </div>

            {/* Zoom In (+10%) */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={isLoadingPdf}
              className="px-1 py-0.5 rounded-xs text-slate-300 hover:text-white hover:bg-[#282a38] transition cursor-pointer flex items-center gap-0.5"
              title="10% 확대 (Ctrl + 마우스 휠 위)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span className="text-[0.5625rem] font-mono text-slate-400">+10%</span>
            </button>

            {/* 100% Reset Button */}
            <button
              type="button"
              onClick={handleResetZoom}
              className={`px-1.5 py-0.5 rounded-xs text-[0.625rem] font-mono transition cursor-pointer ${
                fitMode === 'custom' && Math.round(scale * 10) === 10
                  ? 'bg-[#6366f1]/30 text-indigo-300 border border-[#6366f1]/50'
                  : 'text-slate-400 hover:text-white hover:bg-[#282a38]'
              }`}
              title="100% 원래 크기로 초기화 (1:1)"
            >
              100%
            </button>

            {/* Fit Width */}
            <button
              type="button"
              onClick={handleFitWidth}
              className={`p-1 rounded-xs transition cursor-pointer ${
                fitMode === 'width'
                  ? 'bg-[#6366f1]/30 text-indigo-300 border border-[#6366f1]/50'
                  : 'text-slate-400 hover:text-white hover:bg-[#282a38]'
              }`}
              title="너비 맞춤 (Fit to Width)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Rotate */}
            <button
              type="button"
              onClick={handleRotate}
              className="p-1 rounded-xs text-slate-400 hover:text-white hover:bg-[#282a38] transition cursor-pointer"
              title="90° 시계방향 회전"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scope Selector: Current Page vs All Pages */}
          <div className="flex items-center bg-[#121318] border border-[#2e3142] rounded-sm p-0.5" title="마크다운 추출 범위 선택">
            <button
              type="button"
              onClick={() => setExtractScope('current')}
              className={`px-1.5 py-0.5 rounded-xs text-[0.625rem] font-mono transition cursor-pointer ${
                extractScope === 'current'
                  ? 'bg-[#2b2d3e] text-indigo-300 font-semibold border border-[#6366f1]/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="현재 보고 있는 페이지만 정밀 추출 (OCR / Layout)"
            >
              현재 {currentPage}P
            </button>
            <button
              type="button"
              onClick={() => setExtractScope('all')}
              className={`px-1.5 py-0.5 rounded-xs text-[0.625rem] font-mono transition cursor-pointer ${
                extractScope === 'all'
                  ? 'bg-[#2b2d3e] text-indigo-300 font-semibold border border-[#6366f1]/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="전체 페이지 일괄 변환"
            >
              전체 {numPages}P
            </button>
          </div>

          {/* Engine Selector Dropdown for Extract */}
          <div className="flex items-center bg-[#121318] border border-[#2e3142] rounded-sm p-0.5">
            <button
              type="button"
              onClick={() => setExtractEngine('ollama')}
              className={`px-1.5 py-0.5 rounded-xs text-[0.625rem] font-mono transition cursor-pointer ${
                extractEngine === 'ollama'
                  ? 'bg-[#6366f1] text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="로컬 AI (Ollama) 의미론적 / 비전 마크다운 변환 엔진"
            >
              Local AI
            </button>
            <button
              type="button"
              onClick={() => setExtractEngine('ocr')}
              className={`px-1.5 py-0.5 rounded-xs text-[0.625rem] font-mono transition cursor-pointer ${
                extractEngine === 'ocr'
                  ? 'bg-[#6366f1] text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tesseract.js 브라우저 OCR 엔진 (한국어+영어 지원, 레이아웃/표/제목 인식)"
            >
              OCR
            </button>
            <button
              type="button"
              onClick={() => setExtractEngine('fast')}
              className={`px-1.5 py-0.5 rounded-xs text-[0.625rem] font-mono transition cursor-pointer ${
                extractEngine === 'fast'
                  ? 'bg-[#6366f1] text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="고속 브라우저 텍스트 스트림 파서"
            >
              Fast
            </button>
          </div>

          {/* OCR Language indicator/toggle if OCR selected */}
          {extractEngine === 'ocr' && (
            <button
              type="button"
              onClick={() => setOcrLanguage((prev) => (prev === 'kor+eng' ? 'eng' : 'kor+eng'))}
              className="px-1.5 py-0.5 bg-[#121318] hover:bg-[#222433] border border-emerald-500/40 rounded-xs text-[0.5625rem] font-mono text-emerald-300 transition cursor-pointer"
              title="OCR 인식 언어 모델 전환 (kor+eng / eng)"
            >
              {ocrLanguage === 'kor+eng' ? '한/영' : 'ENG'}
            </button>
          )}

          {/* Extract to Markdown Button */}
          <button
            type="button"
            onClick={() => handleExtractToMarkdown(extractEngine)}
            disabled={isExtracting || isLoadingPdf}
            className="h-6 px-2.5 rounded-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:from-indigo-700 active:to-violet-700 text-white font-medium flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
            title="현재 보고 있는 PDF 페이지의 텍스트와 레이아웃을 마크다운 에디터에 자동 반영"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                <span className="text-[0.6875rem] max-w-[130px] truncate">
                  {ocrProgress?.status || '추출 중...'}
                </span>
              </>
            ) : (
              <>
                {extractEngine === 'ocr' ? (
                  <ScanText className="w-3 h-3 text-emerald-300" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-300" />
                )}
                <span className="text-[0.6875rem]">
                  {extractScope === 'current'
                    ? extractEngine === 'ollama'
                      ? '마크다운으로 추출 (Local AI)'
                      : extractEngine === 'ocr'
                      ? '현재 페이지 OCR 추출'
                      : '현재 페이지 추출 (Fast)'
                    : extractEngine === 'ollama'
                    ? '전체 추출 (Local AI)'
                    : extractEngine === 'ocr'
                    ? '전체 OCR 추출'
                    : '전체 고속 추출'}
                </span>
              </>
            )}
          </button>

          <div className="h-4 w-px bg-[#2e3142] shrink-0" />

          {/* Split View Toggle Button */}
          <button
            type="button"
            onClick={() => setIsSplitView((prev) => !prev)}
            className={`h-6 px-2 rounded-sm border text-xs flex items-center gap-1 transition cursor-pointer ${
              isSplitView
                ? 'bg-[#2b2d3e] text-indigo-300 border-[#6366f1]/50 font-medium'
                : 'bg-[#121318] text-slate-300 border-[#2e3142] hover:bg-[#282a38] hover:text-white'
            }`}
            title="마크다운 편집 전환 (원본 PDF와 마크다운 에디터 2분할 화면 토글)"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="text-[0.6875rem]">
              {isSplitView ? '단일 뷰 (PDF만)' : '마크다운 편집 전환 (Split View)'}
            </span>
          </button>

          {/* Upload / Replace PDF */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-[#282a38] transition cursor-pointer"
            title="다른 PDF 파일 열기 / 교체"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-[#282a38] transition cursor-pointer"
            title="원본 PDF 파일 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Animated Extraction / OCR Progress Bar */}
      {isExtracting && (
        <div className="h-0.5 w-full bg-[#1e202b] overflow-hidden shrink-0 z-30">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 ease-out"
            style={{ width: `${ocrProgress?.progress || 40}%` }}
          />
        </div>
      )}

      {/* Main Body: 1-Column or 2-Column Split View */}
      <div className="flex-1 flex flex-row min-h-0 relative overflow-hidden bg-[#0d0e12]">
        {/* Left Pane: PDF Canvas Viewer */}
        <div
          ref={viewerContainerRef}
          className={`h-full min-h-0 overflow-auto custom-scrollbar flex flex-col items-center justify-start p-4 relative ${
            isSplitView ? 'w-1/2 border-r border-[#2e3142]' : 'w-full'
          }`}
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Active OCR / Extraction Floating Status Pill */}
          {isExtracting && ocrProgress && (
            <div className="sticky top-2 z-30 mb-2 bg-[#121318]/95 border border-indigo-500/60 text-indigo-100 text-xs px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-md">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
              <span className="font-mono text-[0.6875rem]">{ocrProgress.status}</span>
              {ocrProgress.progress > 0 && (
                <span className="text-[0.625rem] font-mono text-emerald-400">({ocrProgress.progress}%)</span>
              )}
            </div>
          )}

          {/* Loading Overlay */}
          {isLoadingPdf && (
            <div className="absolute inset-0 bg-[#121318]/90 z-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#6366f1]" />
              <p className="text-xs text-slate-300 font-mono">PDF 문서를 렌더링 엔진에 준비 중입니다...</p>
            </div>
          )}

          {/* Error Message */}
          {loadError && (
            <div className="m-auto max-w-md p-4 rounded-md bg-rose-950/40 border border-rose-800 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-200 font-medium">{loadError}</p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded text-xs transition cursor-pointer"
                >
                  다른 PDF 파일 선택
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 bg-[#282a38] hover:bg-[#34374a] text-slate-200 rounded text-xs transition cursor-pointer"
                >
                  새로고침
                </button>
              </div>
            </div>
          )}

          {/* Canvas Wrapper */}
          <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white my-auto border border-slate-700/50">
            <canvas ref={canvasRef} className="block max-w-none" />
            {isRenderingPage && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[0.625rem] flex items-center gap-1 backdrop-blur-xs font-mono">
                <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#6366f1]" />
                <span>렌더링 중...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Markdown Text Editor (Split View Mode) */}
        {isSplitView && (
          <div className="w-1/2 h-full min-h-0 flex flex-col bg-[#14151e] overflow-hidden select-text">
            {/* Editor Sub-Header */}
            <div className="h-8 px-3 bg-[#191b26] border-b border-[#2e3142] flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  마크다운 에디터
                </span>
                <span className="text-[0.625rem] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  실시간 로컬 DB 동기화
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Sync Scroll Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsSyncScrollEnabled((prev) => !prev)}
                  className={`px-2 py-0.5 rounded-xs text-[0.625rem] font-mono transition cursor-pointer flex items-center gap-1 border ${
                    isSyncScrollEnabled
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 font-medium'
                      : 'bg-[#121318] text-slate-400 border-[#2e3142] hover:text-slate-200'
                  }`}
                  title={
                    isSyncScrollEnabled
                      ? '페이지 연동 스크롤 (Sync Scroll) 활성화됨 - PDF 페이지 변경 시 에디터 자동 이동'
                      : '페이지 연동 스크롤 (Sync Scroll) 일시 해제됨 - 클릭하여 활성화'
                  }
                >
                  <ArrowDownUp className={`w-3 h-3 ${isSyncScrollEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>동기화 스크롤 {isSyncScrollEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Instant Page Scroll Trigger */}
                <button
                  type="button"
                  onClick={() => scrollToCurrentPageInEditor(currentPage)}
                  className="p-1 rounded-sm text-slate-400 hover:text-indigo-300 hover:bg-[#282a38] transition cursor-pointer"
                  title={`현재 PDF ${currentPage}페이지 위치로 에디터 즉시 스크롤`}
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                </button>

                <div className="h-3.5 w-px bg-[#2e3142]" />

                {/* Tab Switcher: Edit vs Preview */}
                <div className="flex bg-[#121318] border border-[#2e3142] rounded-xs p-0.5">
                  <button
                    type="button"
                    onClick={() => setRightPaneTab('edit')}
                    className={`px-2 py-0.5 rounded-xs text-[0.625rem] font-mono transition cursor-pointer flex items-center gap-1 ${
                      rightPaneTab === 'edit'
                        ? 'bg-[#282a38] text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>편집 (Edit)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRightPaneTab('preview')}
                    className={`px-2 py-0.5 rounded-xs text-[0.625rem] font-mono transition cursor-pointer flex items-center gap-1 ${
                      rightPaneTab === 'preview'
                        ? 'bg-[#282a38] text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>미리보기 (Preview)</span>
                  </button>
                </div>

                <div className="h-3.5 w-px bg-[#2e3142]" />

                {/* Copy Markdown */}
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-[#282a38] transition cursor-pointer"
                  title="마크다운 전체 복사"
                >
                  {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Editor Workspace Area */}
            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
              {rightPaneTab === 'edit' ? (
                <div className="flex-1 min-h-0 relative flex flex-col bg-[#121318]">
                  <textarea
                    ref={editorTextareaRef}
                    value={markdownContent}
                    onChange={(e) => onMarkdownChange(e.target.value)}
                    placeholder="# PDF 마크다운 내용&#10;&#10;상단의 [마크다운으로 추출 (Local AI)] 버튼을 누르면 원본 PDF의 표, 목록, 텍스트가 자동으로 완벽하게 구조화되어 여기에 채워집니다. 직접 마크다운을 타이핑하거나 수정할 수도 있습니다."
                    className="flex-1 w-full h-full p-4 bg-transparent text-slate-200 font-mono text-xs leading-relaxed resize-none outline-none custom-scrollbar selection:bg-[#6366f1]/30 selection:text-white border-none"
                    spellCheck={false}
                  />

                  {/* Character/Line Stats Bar */}
                  <div className="h-6 px-3 bg-[#161822] border-t border-[#2e3142] flex items-center justify-between text-[0.625rem] font-mono text-slate-400 select-none">
                    <div className="flex items-center gap-3">
                      <span>줄: {markdownContent.split('\n').length}</span>
                      <span>단어: {markdownContent.trim() ? markdownContent.trim().split(/\s+/).length : 0}</span>
                      <span>글자수: {markdownContent.length}</span>
                      {isSyncScrollEnabled && (
                        <span className="text-indigo-400/90 font-medium">
                          • 동기화: {currentPage}P 포커스
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500">Ctrl+S 또는 입력 즉시 자동 저장</span>
                  </div>
                </div>
              ) : (
                /* Markdown Preview Mode */
                <div
                  ref={previewContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#161722] text-slate-200 custom-scrollbar"
                >
                  {markdownContent.trim() ? (
                    renderMarkdownToHtml ? (
                      <div
                        className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3"
                        dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(markdownContent) }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-mono text-xs text-slate-300">
                        {markdownContent}
                      </pre>
                    )
                  ) : (
                    <div className="py-16 text-center text-slate-500 space-y-3">
                      <FileText className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="text-xs">추출된 마크다운 내용이 없습니다.</p>
                      <p className="text-[0.6875rem] text-slate-600">
                        상단 미니 툴바의 <strong>[마크다운으로 추출 (Local AI)]</strong> 버튼을 눌러보세요.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
