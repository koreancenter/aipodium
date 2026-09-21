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
  Minimize2,
  RotateCw,
  RotateCcw,
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
  Square,
  Cpu,
  SlidersHorizontal,
  CheckCircle2,
  X,
  Info,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { convertPdfToMarkdown, PdfParserEngine } from '../services/documentConverterService';
import { extractCurrentPageToMarkdown, OcrProgressInfo } from '../services/pdfOcrService';
import { SAMPLE_PDF_DATA_URL } from '../data/samplePdfData';
import {
  reducePdfSizeAndStripImageMetadata,
  PdfReductionResult,
  formatBytes,
} from '../utils/pdfSizeReducer';

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

export interface PdfViewerHandle {
  clearCacheAndReparse: () => void;
  openReducerModal: () => void;
  extractToMarkdown: (engine?: PdfParserEngine | 'ocr') => void;
  downloadPdf: () => void;
  openFilePicker: () => void;
  toggleSplitView: () => void;
  setEngine: (engine: PdfParserEngine | 'ocr') => void;
  setScope: (scope: 'current' | 'all') => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitWidth: () => void;
  rotate: () => void;
  getReductionStats: () => PdfReductionResult | null;
  getCurrentPage: () => number;
  getNumPages: () => number;
  getExtractEngine: () => PdfParserEngine | 'ocr';
  getExtractScope: () => 'current' | 'all';
}

export interface PdfViewerState {
  isExtracting: boolean;
  extractEngine: PdfParserEngine | 'ocr';
  extractScope: 'current' | 'all';
  isSplitView: boolean;
  currentPage: number;
  numPages: number;
  scale: number;
  ocrProgress: OcrProgressInfo | null;
  reductionStats: PdfReductionResult | null;
}

export interface PdfViewerProps {
  fileName: string;
  pdfData?: string | ArrayBuffer | Uint8Array | null;
  markdownContent: string;
  onMarkdownChange: (newMarkdown: string) => void;
  onClearMarkdownCache?: (fileName: string) => void;
  onUploadPdf?: (file: File) => void;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  renderMarkdownToHtml?: (md: string) => string;
  onViewerStateChange?: (state: PdfViewerState) => void;
  hideTopToolbar?: boolean;
}

export const PdfViewer = React.forwardRef<PdfViewerHandle, PdfViewerProps>(({
  fileName,
  pdfData,
  markdownContent,
  onMarkdownChange,
  onClearMarkdownCache,
  onUploadPdf,
  ollamaEndpoint = 'http://localhost:11434',
  ollamaModel = 'llama3.2-vision',
  onToast,
  renderMarkdownToHtml,
  onViewerStateChange,
  hideTopToolbar = true,
}, ref) => {
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
  const [extractEngine, setExtractEngine] = useState<PdfParserEngine | 'ocr'>('fast');
  const [extractScope, setExtractScope] = useState<'current' | 'all'>('current');
  const [ocrProgress, setOcrProgress] = useState<OcrProgressInfo | null>(null);
  const [ocrLanguage, setOcrLanguage] = useState<'kor+eng' | 'eng'>('kor+eng');
  const [isSyncScrollEnabled, setIsSyncScrollEnabled] = useState<boolean>(true);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const leftPaneContainerRef = useRef<HTMLDivElement>(null);

  // PDF Size Reducer States (strips embedded high-res image metadata to reduce memory footprint)
  const [isAutoReduceEnabled, setIsAutoReduceEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('aipodium_pdf_auto_reduce');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isOptimizingSize, setIsOptimizingSize] = useState<boolean>(false);
  const [reductionStats, setReductionStats] = useState<PdfReductionResult | null>(null);
  const [showReducerModal, setShowReducerModal] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const activePdfBytesRef = useRef<Uint8Array | null>(null);
  const rawOriginalBytesRef = useRef<Uint8Array | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Popover menus state & refs
  const [isExtractionMenuOpen, setIsExtractionMenuOpen] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const extractionMenuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (extractionMenuRef.current && !extractionMenuRef.current.contains(e.target as Node)) {
        setIsExtractionMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // 1. Load PDF Document via PDF.js with embedded image metadata stripping
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingPdf(true);
    setLoadError(null);

    const loadDocument = async () => {
      try {
        const bytes = resolvePdfBytes(pdfData);
        rawOriginalBytesRef.current = bytes;
        activePdfBytesRef.current = bytes;

        if (!bytes || bytes.byteLength === 0) {
          setLoadError('PDF 파일의 크기가 0 바이트이거나 비어 있습니다.');
          setIsLoadingPdf(false);
          return;
        }

        let bytesToUse = bytes;

        // Strip embedded high-resolution image metadata during the parsing phase to reduce memory footprint
        if (isAutoReduceEnabled && bytes.byteLength > 60 * 1024) {
          try {
            const reduction = await reducePdfSizeAndStripImageMetadata(bytes);
            if (!isCancelled) {
              setReductionStats(reduction);
              if (reduction.wasOptimized && reduction.savedBytes > 0) {
                bytesToUse = reduction.reducedPdfBytes;
                activePdfBytesRef.current = bytesToUse;
                if (reduction.savedPercentage >= 5) {
                  onToast?.(
                    `[PDF 크기 최적화] 고해상도 이미지 메타데이터를 정리하여 메모리를 ${reduction.savedPercentage}% 절감했습니다 (${formatBytes(reduction.originalSizeBytes)} → ${formatBytes(reduction.reducedSizeBytes)}).`,
                    'info'
                  );
                }
              }
            }
          } catch (optErr) {
            console.warn('PDF size reducer optimization skipped during load:', optErr);
          }
        }

        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: bytesToUse,
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
  }, [pdfData, resolvePdfBytes, isAutoReduceEnabled, onToast]);

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
  const handleExtractToMarkdown = async (
    engine: PdfParserEngine | 'ocr' = extractEngine,
    overrideBytes?: Uint8Array,
    overrideDoc?: any
  ) => {
    let bytesToUse = overrideBytes || activePdfBytesRef.current;
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
        engine === 'gemini'
          ? '클라우드 AI 엔진'
          : engine === 'ocr'
          ? '문자 인식 엔진'
          : engine === 'ollama'
          ? `로컬 AI (${ollamaModel})`
          : '고속 텍스트 엔진';

      onToast?.(`[페이지 ${currentPage}] 레이아웃 및 텍스트 정밀 분석을 시작합니다 (${engineNameLabel})...`, 'info');
      setOcrProgress({ status: `페이지 ${currentPage} 분석 준비 중...`, progress: 10 });

      try {
        let pageTextItems: any[] = [];
        const activeDoc = overrideDoc || pdfDoc;
        if (activeDoc) {
          try {
            const page = await activeDoc.getPage(currentPage);
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
          engine: engine === 'gemini' ? 'gemini' : engine === 'ocr' ? 'tesseract' : engine === 'ollama' ? 'ollama' : 'vector',
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
          result.engineUsed === 'gemini-cloud'
            ? '클라우드 AI 엔진'
            : result.engineUsed === 'tesseract-ocr'
            ? `문자 인식 (${result.confidence}% 신뢰도)`
            : result.engineUsed === 'ollama-vision'
            ? `로컬 AI (${ollamaModel})`
            : '고속 텍스트 엔진';

        onToast?.(
          `[페이지 ${currentPage}] 텍스트와 레이아웃이 마크다운 에디터에 반영되었습니다 (${engineLabel})!`,
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
      engine === 'gemini'
        ? '클라우드 AI로 전체 문서 구조 및 서식 정밀 분석을 시작합니다...'
        : engine === 'ollama'
        ? `로컬 AI (${ollamaModel})로 전체 마크다운 변환을 시작합니다...`
        : '고속 텍스트 추출 엔진으로 전체 문서를 변환합니다...',
      'info'
    );
    setOcrProgress({ status: '전체 문서 파싱 준비 중...', progress: 10 });

    try {
      const blob = new Blob([bytesToUse], { type: 'application/pdf' });
      const result = await convertPdfToMarkdown(blob, fileName, {
        engine: engine === 'ocr' ? 'fast' : engine,
        ollamaEndpoint: ollamaEndpoint,
        ollamaModel: ollamaModel,
        onProgress: (pct, msg) => {
          setOcrProgress({ status: msg || '변환 진행 중...', progress: pct });
        },
        onFallback: (reason) => {
          onToast?.(`로컬 AI 추출 실패 (${reason}). 고속 텍스트 엔진으로 자동 대체되었습니다.`, 'info');
        },
      });

      onMarkdownChange(result.markdown);
      setIsSplitView(true);
      setRightPaneTab('edit');
      setIsExtracting(false);
      setOcrProgress(null);

      if (result.pageCount === 0) {
        onToast?.(`'${fileName}' 파일이 비어 있어 추출된 마크다운 내용이 없습니다.`, 'info');
      } else {
        const engineName =
          result.parserEngine === 'gemini'
            ? '클라우드 AI 엔진'
            : result.parserEngine === 'ollama'
            ? `로컬 AI (${result.ollamaModel || ollamaModel})`
            : '고속 텍스트 엔진';
        onToast?.(`'${fileName}' 전체 마크다운이 성공적으로 추출되었습니다 (${engineName})!`, 'success');
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
    onToast?.(`'${fileName}' 파일 다운로드를 시작했습니다.`, 'info');
  };

  // Manual clear markdown cache for current document, forcing re-reduction of metadata and re-parse
  const handleClearCacheAndReparse = async () => {
    if (isExtracting || isLoadingPdf || isOptimizingSize) return;

    onToast?.(`'${fileName}' 마크다운 캐시를 삭제하고 메타데이터 재최적화 및 파싱을 시작합니다...`, 'info');

    // 1. Clear Markdown Cache: in parent state and local storage
    try {
      const stored = localStorage.getItem('aipodium_pdf_markdowns');
      if (stored) {
        const parsed = JSON.parse(stored);
        delete parsed[fileName];
        delete parsed[fileName.replace(/\.pdf$/i, '.md')];
        localStorage.setItem('aipodium_pdf_markdowns', JSON.stringify(parsed));
      }
    } catch (cacheErr) {
      console.warn('Could not clear local markdown cache:', cacheErr);
    }

    if (onClearMarkdownCache) {
      onClearMarkdownCache(fileName);
    }
    onMarkdownChange('');

    // 2. Force Re-reduction of PDF Metadata
    const rawBytes = rawOriginalBytesRef.current || activePdfBytesRef.current || resolvePdfBytes(pdfData);
    if (!rawBytes || rawBytes.byteLength === 0) {
      onToast?.('최적화할 PDF 원본 데이터가 없습니다.', 'error');
      return;
    }

    let reducedBytes = rawBytes;
    setIsOptimizingSize(true);
    try {
      const reduction = await reducePdfSizeAndStripImageMetadata(rawBytes);
      setReductionStats(reduction);
      if (reduction.wasOptimized && reduction.savedBytes > 0) {
        reducedBytes = reduction.reducedPdfBytes;
        activePdfBytesRef.current = reducedBytes;
      }
    } catch (redErr) {
      console.warn('Re-reduction failed, proceeding with original bytes:', redErr);
    } finally {
      setIsOptimizingSize(false);
    }

    // 3. Re-initialize PDF.js and force Re-parse
    try {
      setIsLoadingPdf(true);
      const loadingTask = pdfjsLib.getDocument({
        data: reducedBytes,
        useSystemFonts: true,
        disableFontFace: false,
      });
      const newDoc = await loadingTask.promise;
      setPdfDoc(newDoc);
      setNumPages(newDoc.numPages);
      setIsLoadingPdf(false);

      // Trigger re-parsing with fresh document and newly reduced bytes
      await handleExtractToMarkdown(extractEngine, reducedBytes, newDoc);

      onToast?.(
        `'${fileName}' 마크다운 캐시 삭제, 메타데이터 재최적화 및 파싱이 완료되었습니다!`,
        'success'
      );
    } catch (parseErr: any) {
      setIsLoadingPdf(false);
      setIsExtracting(false);
      console.error('Re-parse error:', parseErr);
      onToast?.(`재파싱 실패: ${parseErr?.message || '오류가 발생했습니다.'}`, 'error');
    }
  };

  // PDF Size Reducer: Apply optimization on current active document
  const handleApplySizeReduction = async () => {
    const bytes = rawOriginalBytesRef.current || activePdfBytesRef.current;
    if (!bytes || bytes.byteLength === 0) {
      onToast?.('최적화할 PDF 데이터가 없습니다.', 'info');
      return;
    }

    setIsOptimizingSize(true);
    try {
      const result = await reducePdfSizeAndStripImageMetadata(bytes);
      setReductionStats(result);

      if (result.wasOptimized && result.savedBytes > 0) {
        activePdfBytesRef.current = result.reducedPdfBytes;

        setIsLoadingPdf(true);
        const loadingTask = pdfjsLib.getDocument({
          data: result.reducedPdfBytes,
          useSystemFonts: true,
          disableFontFace: false,
        });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoadingPdf(false);

        onToast?.(
          `[PDF 크기 최적화] 고해상도 이미지 메타데이터 제거 완료: ${result.savedPercentage}% 절감 (${formatBytes(result.originalSizeBytes)} → ${formatBytes(result.reducedSizeBytes)})`,
          'success'
        );
      } else {
        onToast?.('이미 고해상도 이미지 메타데이터가 정리되어 최적화된 상태입니다.', 'info');
      }
    } catch (err: any) {
      console.error('PDF size reduction error:', err);
      onToast?.(`크기 최적화 실패: ${err?.message || '알 수 없는 오류'}`, 'error');
    } finally {
      setIsOptimizingSize(false);
    }
  };

  // PDF Size Reducer: Download cleaned PDF
  const handleDownloadOptimizedPdf = () => {
    const bytesToDownload = reductionStats?.reducedPdfBytes || activePdfBytesRef.current;
    if (!bytesToDownload) return;
    const blob = new Blob([bytesToDownload], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = fileName.replace(/\.pdf$/i, '');
    a.download = `${baseName}_optimized.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast?.(`최적화된 PDF 파일 (${formatBytes(bytesToDownload.byteLength)}) 다운로드를 시작했습니다.`, 'info');
  };

  // PDF Size Reducer: Toggle auto-reduce on import
  const handleToggleAutoReduce = (checked: boolean) => {
    setIsAutoReduceEnabled(checked);
    try {
      localStorage.setItem('aipodium_pdf_auto_reduce', String(checked));
    } catch {}
    onToast?.(
      checked
        ? '문서 불러오기 시 고해상도 이미지 메타데이터 자동 제거가 활성화되었습니다.'
        : '자동 최적화가 비활성화되었습니다.',
      'info'
    );
  };

  // Replace/Upload PDF Handler with Size Reduction on Parsing Phase
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = '';

    if (file.size === 0) {
      onToast?.(`'${file.name}' 파일이 비어 있습니다 (0 바이트).`, 'info');
      return;
    }

    // Process during import phase: strip embedded image metadata to reduce memory footprint
    if (isAutoReduceEnabled && file.size > 60 * 1024) {
      try {
        setIsLoadingPdf(true);
        const buffer = await file.arrayBuffer();
        const rawBytes = new Uint8Array(buffer);
        rawOriginalBytesRef.current = rawBytes;

        const reduction = await reducePdfSizeAndStripImageMetadata(rawBytes);
        setReductionStats(reduction);

        const bytesToUse = reduction.savedBytes > 0 ? reduction.reducedPdfBytes : rawBytes;
        activePdfBytesRef.current = bytesToUse;

        if (reduction.savedBytes > 0 && reduction.savedPercentage >= 5) {
          onToast?.(
            `[PDF 크기 최적화] 가져오기 단계에서 고해상도 이미지 메타데이터를 제거하여 메모리를 ${reduction.savedPercentage}% 절감했습니다 (${formatBytes(reduction.originalSizeBytes)} → ${formatBytes(reduction.reducedSizeBytes)}).`,
            'info'
          );
        }

        if (onUploadPdf) {
          const optimizedFile = new File([bytesToUse], file.name, { type: 'application/pdf' });
          onUploadPdf(optimizedFile);
        }

        const loadingTask = pdfjsLib.getDocument({
          data: bytesToUse,
          useSystemFonts: true,
          disableFontFace: false,
        });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInputValue('1');
        setIsLoadingPdf(false);
        return;
      } catch (optErr) {
        console.warn('Import optimization error, falling back to standard upload:', optErr);
        setIsLoadingPdf(false);
      }
    }

    if (onUploadPdf) {
      onUploadPdf(file);
    }
  };

  const handleToggleFullscreen = useCallback(() => {
    const container = leftPaneContainerRef.current || viewerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {
          setIsSplitView(false);
        });
      } else {
        setIsSplitView(false);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    onViewerStateChange?.({
      isExtracting,
      extractEngine,
      extractScope,
      isSplitView,
      currentPage,
      numPages,
      scale,
      ocrProgress,
      reductionStats,
    });
  }, [
    isExtracting,
    extractEngine,
    extractScope,
    isSplitView,
    currentPage,
    numPages,
    scale,
    ocrProgress,
    reductionStats,
    onViewerStateChange,
  ]);

  React.useImperativeHandle(ref, () => ({
    clearCacheAndReparse: handleClearCacheAndReparse,
    openReducerModal: () => setShowReducerModal(true),
    extractToMarkdown: (engine) => handleExtractToMarkdown(engine || extractEngine),
    downloadPdf: handleDownloadPdf,
    openFilePicker: () => fileInputRef.current?.click(),
    toggleSplitView: () => setIsSplitView((prev) => !prev),
    setEngine: (engine) => setExtractEngine(engine),
    setScope: (scope) => setExtractScope(scope),
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    fitWidth: handleFitWidth,
    rotate: handleRotate,
    getReductionStats: () => reductionStats,
    getCurrentPage: () => currentPage,
    getNumPages: () => numPages,
    getExtractEngine: () => extractEngine,
    getExtractScope: () => extractScope,
  }));

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#09090b] text-slate-100 select-none overflow-hidden">
      {/* Hidden File Input for PDF Upload/Replace */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Toolbar: Compact IDE Design Constitution Compliant (Rendered only when hideTopToolbar is false) */}
      {!hideTopToolbar && (
      <div className="h-8.5 px-2 bg-[#181a24] border-b border-[#222226] flex items-center justify-between gap-1.5 shrink-0 z-20 text-xs select-none">
        {/* Left Section: Pure Viewer Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Page Navigation */}
          <div className="flex items-center bg-[#09090b] border border-[#222226] rounded-md p-0.5 shrink-0">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoadingPdf}
              className="w-5.5 h-5.5 flex items-center justify-center rounded-xs text-slate-300 hover:text-white hover:bg-[#18181b] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
              title="이전 페이지"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-0.5 px-1 font-mono text-[0.6875rem]">
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePageInputCommit()}
                onBlur={handlePageInputCommit}
                className="w-6 text-center bg-transparent text-indigo-300 font-semibold outline-none py-0 leading-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="페이지 번호 입력 후 Enter"
              />
              <span className="text-slate-500">/</span>
              <span className="text-slate-300 font-semibold px-0.5">{numPages}</span>
            </div>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages || isLoadingPdf}
              className="w-5.5 h-5.5 flex items-center justify-center rounded-xs text-slate-300 hover:text-white hover:bg-[#18181b] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
              title="다음 페이지"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-[#222226] shrink-0" />

          {/* Zoom & View Controls */}
          <div className="flex items-center gap-0.5 bg-[#09090b] border border-[#222226] rounded-md p-0.5 shrink-0">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={isLoadingPdf}
              className="w-5.5 h-5.5 flex items-center justify-center rounded-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

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
              className="bg-[#242738] text-slate-200 text-[0.6875rem] font-mono rounded-xs px-1.5 py-0.5 border border-[#222226] outline-none cursor-pointer hover:border-[#6366f1] transition h-5.5"
              title="배율 선택"
            >
              <option value="width">너비 맞춤</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="90">90%</option>
              <option value="100">100%</option>
              <option value="125">125%</option>
              <option value="150">150%</option>
              <option value="200">200%</option>
            </select>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={isLoadingPdf}
              className="w-5.5 h-5.5 flex items-center justify-center rounded-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleFitWidth}
              className={`w-5.5 h-5.5 flex items-center justify-center rounded-xs transition cursor-pointer ${
                fitMode === 'width'
                  ? 'bg-[#6366f1]/30 text-indigo-300 border border-[#6366f1]/50'
                  : 'text-slate-400 hover:text-white hover:bg-[#18181b]'
              }`}
              title="너비 맞춤"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRotate}
              className="w-5.5 h-5.5 flex items-center justify-center rounded-xs text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
              title="90도 회전"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Size Optimization Badge (Compact Indicator) */}
          {reductionStats && reductionStats.wasOptimized && reductionStats.savedPercentage > 0 && (
            <button
              type="button"
              onClick={() => setShowReducerModal(true)}
              className="h-6 px-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[0.625rem] font-mono flex items-center gap-1 transition cursor-pointer shrink-0"
              title="PDF 메타데이터 최적화 상태 확인"
            >
              <Minimize2 className="w-3 h-3 text-emerald-400" />
              <span>{reductionStats.savedPercentage}% 최적화됨</span>
            </button>
          )}
        </div>

        {/* Right Section: Smart Extraction Combo, Split View, and More Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Smart Extraction Combo Button & Popover */}
          <div className="relative" ref={extractionMenuRef}>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleExtractToMarkdown(extractEngine)}
                disabled={isExtracting || isLoadingPdf}
                className="h-6.5 px-2.5 rounded-l-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 text-xs shadow-xs"
                title={`${extractScope === 'current' ? `현재 ${currentPage}쪽` : '전체 문서'} 마크다운 추출 실행 (${
                  extractEngine === 'fast' ? '고속 텍스트' : extractEngine === 'gemini' ? '클라우드 AI' : extractEngine === 'ollama' ? '로컬 AI' : '문자 인식'
                })`}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
                    <span className="text-[0.6875rem] max-w-[90px] truncate whitespace-nowrap">
                      {ocrProgress?.status || '추출 중...'}
                    </span>
                  </>
                ) : (
                  <>
                    {extractEngine === 'ocr' ? (
                      <ScanText className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    )}
                    <span className="text-[0.6875rem] font-medium whitespace-nowrap">
                      마크다운 추출
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsExtractionMenuOpen((prev) => !prev)}
                disabled={isExtracting || isLoadingPdf}
                className="h-6.5 px-1.5 rounded-r-md bg-indigo-600 hover:bg-indigo-500 text-white/90 hover:text-white border-l border-indigo-400/30 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                title="추출 설정 (엔진 및 범위)"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Extraction Settings Popover */}
            {isExtractionMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs text-zinc-300">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08] mb-2">
                  <span className="font-medium text-zinc-200 text-xs flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    마크다운 추출 설정
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsExtractionMenuOpen(false)}
                    className="text-zinc-400 hover:text-white p-0.5 rounded-xs cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Scope Selector */}
                <div className="mb-2.5">
                  <div className="text-[0.625rem] text-zinc-400 font-medium mb-1">추출 범위</div>
                  <div className="grid grid-cols-2 gap-1 bg-[#09090b] p-0.5 rounded-md border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setExtractScope('current')}
                      className={`py-1 px-1.5 rounded-xs text-[0.6875rem] font-medium transition cursor-pointer text-center ${
                        extractScope === 'current'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      현재 쪽 ({currentPage}쪽)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtractScope('all')}
                      className={`py-1 px-1.5 rounded-xs text-[0.6875rem] font-medium transition cursor-pointer text-center ${
                        extractScope === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      전체 문서 ({numPages}쪽)
                    </button>
                  </div>
                </div>

                {/* Engine Options */}
                <div className="mb-2.5 space-y-1">
                  <div className="text-[0.625rem] text-zinc-400 font-medium mb-1">변환 엔진</div>
                  {[
                    { id: 'fast', name: '고속 텍스트 엔진', desc: '내장 텍스트 스트림 즉각 추출 (초고속)' },
                    { id: 'gemini', name: '클라우드 AI', desc: 'Gemini 정밀 서식 및 구조화 파싱' },
                    { id: 'ollama', name: '로컬 AI', desc: 'Ollama 비전 모델 기반 로컬 변환' },
                    { id: 'ocr', name: '문자 인식', desc: '스캔 문서용 이미지 광학 문자 인식' },
                  ].map((eng) => (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => setExtractEngine(eng.id as any)}
                      className={`w-full text-left p-1.5 rounded-md border transition cursor-pointer flex items-start gap-2 ${
                        extractEngine === eng.id
                          ? 'bg-white/[0.08] border-indigo-500/50 text-white'
                          : 'bg-[#09090b]/60 border-white/[0.06] text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="pt-0.5">
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          extractEngine === eng.id ? 'border-indigo-500 bg-indigo-600' : 'border-zinc-500'
                        }`}>
                          {extractEngine === eng.id && <div className="w-1 h-1 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium leading-tight">{eng.name}</div>
                        <div className="text-[0.5625rem] text-zinc-400 leading-tight mt-0.5">{eng.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* OCR Language if OCR */}
                {extractEngine === 'ocr' && (
                  <div className="mb-2.5 p-1.5 bg-[#09090b] rounded-md border border-emerald-500/30">
                    <div className="text-[0.625rem] text-emerald-400 font-medium mb-1">문자 인식 언어</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setOcrLanguage('kor+eng')}
                        className={`py-0.5 px-1 rounded-xs text-[0.625rem] transition cursor-pointer text-center ${
                          ocrLanguage === 'kor+eng'
                            ? 'bg-emerald-600 text-white font-medium'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        한글/영문
                      </button>
                      <button
                        type="button"
                        onClick={() => setOcrLanguage('eng')}
                        className={`py-0.5 px-1 rounded-xs text-[0.625rem] transition cursor-pointer text-center ${
                          ocrLanguage === 'eng'
                            ? 'bg-emerald-600 text-white font-medium'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        영문 전용
                      </button>
                    </div>
                  </div>
                )}

                {/* Run Action */}
                <button
                  type="button"
                  onClick={() => {
                    setIsExtractionMenuOpen(false);
                    handleExtractToMarkdown(extractEngine);
                  }}
                  disabled={isExtracting || isLoadingPdf}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>설정 적용 후 추출 실행</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-3.5 w-px bg-white/[0.08] shrink-0" />

          {/* Split View Toggle */}
          <button
            type="button"
            onClick={() => setIsSplitView((prev) => !prev)}
            className={`h-6.5 px-2 rounded-md border text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              isSplitView
                ? 'bg-white/[0.08] text-indigo-300 border-indigo-500/50 font-medium'
                : 'bg-[#09090b] text-zinc-300 border-white/[0.08] hover:bg-white/[0.06] hover:text-white'
            }`}
            title="단일 뷰 및 분할 편집 전환"
          >
            {isSplitView ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span className="text-[0.6875rem] whitespace-nowrap">단일 뷰</span>
              </>
            ) : (
              <>
                <Columns2 className="w-3.5 h-3.5" />
                <span className="text-[0.6875rem] whitespace-nowrap">분할 뷰</span>
              </>
            )}
          </button>

          <div className="h-3.5 w-px bg-white/[0.08] shrink-0" />

          {/* More Options Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className={`h-6.5 w-6.5 flex items-center justify-center rounded-md border text-zinc-300 hover:text-white transition cursor-pointer shrink-0 ${
                isMoreMenuOpen
                  ? 'bg-white/[0.08] border-indigo-500/50 text-white'
                  : 'bg-[#09090b] border-white/[0.08] hover:bg-white/[0.06]'
              }`}
              title="추가 도구 및 관리"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl p-1.5 text-xs text-zinc-300 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleClearCacheAndReparse();
                  }}
                  disabled={isExtracting || isLoadingPdf || isOptimizingSize}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center gap-2 transition cursor-pointer group text-zinc-300"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 shrink-0" />
                  <div className="flex flex-col">
                    <span>캐시 초기화 및 재파싱</span>
                    <span className="text-[0.5625rem] text-zinc-500 group-hover:text-zinc-400">마크다운 캐시 삭제 및 새로 파싱</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setShowReducerModal(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center gap-2 transition cursor-pointer group text-zinc-300"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 shrink-0" />
                  <div className="flex flex-col">
                    <span>PDF 크기 최적화...</span>
                    <span className="text-[0.5625rem] text-zinc-500 group-hover:text-zinc-400">
                      {reductionStats?.savedPercentage ? `${reductionStats.savedPercentage}% 절감됨 (메타데이터 제거)` : '메타데이터 제거 및 메모리 최적화'}
                    </span>
                  </div>
                </button>

                <div className="my-1 border-t border-white/[0.08]" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center gap-2 transition cursor-pointer text-zinc-300"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>다른 PDF 파일 열기...</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleDownloadPdf();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center gap-2 transition cursor-pointer text-zinc-300"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>현재 PDF 다운로드</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleRotate();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center gap-2 transition cursor-pointer text-zinc-300"
                >
                  <RotateCw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>시계 방향 90도 회전</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Animated Extraction / OCR Progress Bar */}
      {isExtracting && (
        <div className="h-0.5 w-full bg-[#121214] overflow-hidden shrink-0 z-30">
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
          ref={leftPaneContainerRef}
          className={`h-full min-h-0 relative flex flex-col overflow-hidden bg-[#0d0e12] ${
            isSplitView ? 'w-1/2 border-r border-[#222226]' : 'w-full'
          }`}
        >
          <div
            ref={viewerContainerRef}
            className="flex-1 min-h-0 overflow-auto custom-scrollbar flex flex-col items-center justify-start p-4 relative"
            style={{ scrollBehavior: 'smooth' }}
          >
          {/* Active OCR / Extraction Floating Status Pill */}
          {isExtracting && ocrProgress && (
            <div className="sticky top-2 z-30 mb-2 bg-[#09090b]/95 border border-indigo-500/60 text-indigo-100 text-xs px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-md">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
              <span className="font-mono text-[0.6875rem]">{ocrProgress.status}</span>
              {ocrProgress.progress > 0 && (
                <span className="text-[0.625rem] font-mono text-emerald-400">({ocrProgress.progress}%)</span>
              )}
            </div>
          )}

          {/* Loading Overlay */}
          {isLoadingPdf && (
            <div className="absolute inset-0 bg-[#09090b]/90 z-20 flex flex-col items-center justify-center gap-2">
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
                  className="px-3 py-1 bg-[#18181b] hover:bg-[#34374a] text-slate-200 rounded text-xs transition cursor-pointer"
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
            {isExtracting && (
              <div className="absolute inset-0 bg-[#09090b]/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 animate-in fade-in duration-100">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin mb-2.5" />
                <p className="text-xs font-semibold text-slate-100 mb-1">
                  {ocrProgress?.status || '문서 텍스트 및 서식 분석 중...'}
                </p>
                {ocrProgress?.progress !== undefined && (
                  <div className="w-48 max-w-full bg-[#121214] border border-[#222226] rounded-full h-1.5 overflow-hidden mt-1">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(ocrProgress.progress, 5)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

          {/* Bottom Floating Dock: Navigation & Zoom & Fullscreen */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl z-20 select-none text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoadingPdf}
              className="p-1 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="이전 페이지"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Indicator */}
            <div className="flex items-center gap-1 font-mono text-xs text-zinc-200 px-1">
              <span className="font-semibold text-white">{currentPage}</span>
              <span className="text-zinc-500">/</span>
              <span className="text-zinc-400">{numPages}</span>
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages || isLoadingPdf}
              className="p-1 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="다음 페이지"
              aria-label="다음 페이지"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-3.5 w-px bg-white/15 shrink-0" />

            {/* Fit-to-width Toggle */}
            <button
              type="button"
              onClick={() => {
                if (fitMode === 'width') {
                  handleSetExactZoom(1.0);
                } else {
                  handleFitWidth();
                }
              }}
              className={`px-2 py-0.5 rounded-full text-xs font-mono transition cursor-pointer flex items-center gap-1 ${
                fitMode === 'width'
                  ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
              title={fitMode === 'width' ? '너비 맞춤 해제 (100%로 변경)' : '너비 맞춤으로 변경'}
            >
              <span>{fitMode === 'width' ? '너비 맞춤' : `${Math.round(scale * 100)}%`}</span>
            </button>

            <div className="h-3.5 w-px bg-white/15 shrink-0" />

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={isFullscreen ? '전체화면 종료' : '전체화면'}
              aria-label="전체화면"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Right Pane: Markdown Text Editor (Split View Mode) */}
        {isSplitView && (
          <div className="w-1/2 h-full min-h-0 flex flex-col bg-[#0c0c0e] overflow-hidden select-text">
            {/* Editor Sub-Header: Clean, Flat, Borderless IDE Aesthetic */}
            <div className="h-8.5 px-3 bg-[#0c0c0e] border-b border-[#222226] flex items-center justify-between gap-2 shrink-0 select-none text-xs">
              {/* Left: Saved indicator */}
              <div className="flex items-center gap-1.5 font-mono text-[0.6875rem] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-xs shadow-emerald-500/50" />
                <span className="text-slate-300 font-medium">저장됨</span>
              </div>

              {/* Right: Icon-only buttons with tooltips */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Scroll Sync Toggle Button [ ⇅ ] */}
                <button
                  type="button"
                  onClick={() => setIsSyncScrollEnabled((prev) => !prev)}
                  className={`w-6 h-6 rounded-xs flex items-center justify-center transition cursor-pointer ${
                    isSyncScrollEnabled
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                  }`}
                  title={
                    isSyncScrollEnabled
                      ? '스크롤 연동 활성화됨 (PDF 페이지 변경 시 에디터 자동 이동)'
                      : '스크롤 연동 비활성화됨 (클릭하여 활성화)'
                  }
                  aria-label="스크롤 연동"
                >
                  <ArrowDownUp className="w-3.5 h-3.5" />
                </button>

                {/* Edit / Preview Toggle [ ✏️/👁️ ] */}
                <div className="flex items-center bg-[#18181b]/70 border border-[#222226] rounded-xs p-0.5">
                  <button
                    type="button"
                    onClick={() => setRightPaneTab('edit')}
                    className={`w-6 h-5.5 rounded-xs flex items-center justify-center transition cursor-pointer ${
                      rightPaneTab === 'edit'
                        ? 'bg-[#27272a] text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="편집 모드"
                    aria-label="편집 모드"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRightPaneTab('preview')}
                    className={`w-6 h-5.5 rounded-xs flex items-center justify-center transition cursor-pointer ${
                      rightPaneTab === 'preview'
                        ? 'bg-[#27272a] text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="미리보기 모드"
                    aria-label="미리보기 모드"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Copy Markdown [ 📋 ] */}
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="w-6 h-6 rounded-xs flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.04] transition cursor-pointer"
                  title="마크다운 복사"
                  aria-label="마크다운 복사"
                >
                  {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Editor Workspace Area */}
            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-[#0c0c0e]">
              {rightPaneTab === 'edit' ? (
                <div className="flex-1 min-h-0 relative flex flex-col bg-[#0c0c0e]">
                  <textarea
                    ref={editorTextareaRef}
                    value={markdownContent}
                    onChange={(e) => onMarkdownChange(e.target.value)}
                    placeholder="# PDF 마크다운 내용&#10;&#10;상단의 [마크다운 추출] 버튼을 누르면 원본 PDF의 내용이 마크다운으로 자동 추출됩니다."
                    className="flex-1 w-full h-full p-4 bg-transparent text-slate-200 font-mono text-xs leading-relaxed resize-none outline-none custom-scrollbar selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)] border-none"
                    spellCheck={false}
                  />

                  {/* Character/Line Stats Bar */}
                  <div className="h-6 px-3 bg-[#0c0c0e] border-t border-[#222226] flex items-center justify-between text-[0.625rem] font-mono text-slate-500 select-none">
                    <div className="flex items-center gap-3">
                      <span>줄: {markdownContent.split('\n').length}</span>
                      <span>단어: {markdownContent.trim() ? markdownContent.trim().split(/\s+/).length : 0}</span>
                      <span>글자수: {markdownContent.length}</span>
                      {isSyncScrollEnabled && (
                        <span className="text-indigo-400/90 font-medium">
                          • 동기화: {currentPage}쪽
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500">자동 저장됨</span>
                  </div>
                </div>
              ) : (
                /* Markdown Preview Mode */
                <div
                  ref={previewContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#0c0c0e] text-slate-200 custom-scrollbar"
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
                        상단의 <strong>[마크다운 추출]</strong> 버튼을 눌러보세요.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PDF Size Reducer Modal */}
      {showReducerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-[#121214] border border-[#222226] rounded-lg shadow-2xl w-full max-w-lg overflow-hidden text-slate-100 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-12 px-5 bg-[#181a24] border-b border-[#222226] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Minimize2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">PDF 크기 최적화 유틸리티</h3>
                  <p className="text-[0.6875rem] text-slate-400">
                    문서 파싱 단계에서 고해상도 이미지 메타데이터를 제거하여 메모리 점유율을 대폭 낮춥니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReducerModal(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh] custom-scrollbar">
              {/* Stats Overview */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-[#09090b] border border-[#222226] rounded-md flex flex-col">
                  <span className="text-[0.6875rem] text-slate-400">원본 문서 크기</span>
                  <span className="text-sm font-semibold text-slate-200 mt-1">
                    {formatBytes(
                      reductionStats?.originalSizeBytes ||
                        rawOriginalBytesRef.current?.byteLength ||
                        activePdfBytesRef.current?.byteLength ||
                        0
                    )}
                  </span>
                </div>

                <div className="p-3 bg-[#09090b] border border-[#222226] rounded-md flex flex-col">
                  <span className="text-[0.6875rem] text-slate-400">최적화 후 크기</span>
                  <span className="text-sm font-semibold text-emerald-400 mt-1">
                    {formatBytes(
                      reductionStats?.reducedSizeBytes ||
                        activePdfBytesRef.current?.byteLength ||
                        0
                    )}
                  </span>
                </div>

                <div className="p-3 bg-[#09090b] border border-[#222226] rounded-md flex flex-col">
                  <span className="text-[0.6875rem] text-slate-400">메모리 절감량</span>
                  <span className="text-sm font-semibold text-indigo-400 mt-1">
                    {reductionStats && reductionStats.wasOptimized && reductionStats.savedPercentage > 0
                      ? `${formatBytes(reductionStats.savedBytes)} (${reductionStats.savedPercentage}%)`
                      : '최적화 가능'}
                  </span>
                </div>
              </div>

              {/* Stripped Breakdown Details */}
              <div className="p-3.5 bg-[#09090b] border border-[#222226] rounded-md space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#222226]/60 pb-2">
                  <span className="font-medium text-slate-200 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    제거된 고해상도 메타데이터 항목
                  </span>
                  <span className="text-[0.6875rem] text-slate-400">
                    {reductionStats?.wasOptimized ? '정리 완료' : '분석 대기'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[0.6875rem]">
                  <div className="p-2 bg-[#161822] rounded border border-[#222226]/40 flex justify-between items-center">
                    <span className="text-slate-300">이미지 메타데이터 블록</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {reductionStats?.strippedItems.imageMetadataCount || 0}개
                    </span>
                  </div>
                  <div className="p-2 bg-[#161822] rounded border border-[#222226]/40 flex justify-between items-center">
                    <span className="text-slate-300">내장 압축 마커 세그먼트</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {reductionStats?.strippedItems.jpegSegmentsCount || 0}개
                    </span>
                  </div>
                  <div className="p-2 bg-[#161822] rounded border border-[#222226]/40 flex justify-between items-center">
                    <span className="text-slate-300">문서 메타데이터 스트림</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {reductionStats?.strippedItems.xmpStreamCount || 0}개
                    </span>
                  </div>
                  <div className="p-2 bg-[#161822] rounded border border-[#222226]/40 flex justify-between items-center">
                    <span className="text-slate-300">내장 썸네일 캐시 스트림</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {reductionStats?.strippedItems.thumbnailStreamCount || 0}개
                    </span>
                  </div>
                </div>

                <p className="text-[0.6875rem] text-slate-400 leading-relaxed pt-1">
                  내장 이미지의 압축 계수와 시각적 품질은 온전히 유지하면서 불필요한 촬영 정보, 컬러 프로필, 포토샵 헤더 등 메모리 점유 메타데이터만을 선택적으로 분리 제거합니다.
                </p>
              </div>

              {/* Preferences: Auto Reduce On Import Toggle */}
              <div className="p-3.5 bg-[#09090b] border border-[#222226] rounded-md flex items-start gap-3">
                <input
                  type="checkbox"
                  id="auto_reduce_checkbox"
                  checked={isAutoReduceEnabled}
                  onChange={(e) => handleToggleAutoReduce(e.target.checked)}
                  className="mt-0.5 accent-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="auto_reduce_checkbox" className="cursor-pointer select-none space-y-0.5">
                  <div className="font-medium text-slate-200">문서 불러올 때 자동 최적화</div>
                  <div className="text-[0.6875rem] text-slate-400 leading-relaxed">
                    대용량 문서를 열 때 파싱 단계에서 불필요한 고해상도 이미지 메타데이터를 자동으로 분리하여 브라우저 메모리 부하와 버벅임을 사전에 방지합니다.
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="h-14 px-5 bg-[#181a24] border-t border-[#222226] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleDownloadOptimizedPdf}
                disabled={!activePdfBytesRef.current}
                className="h-8 px-3 rounded-md border border-[#222226] bg-[#09090b] text-slate-300 hover:text-white hover:bg-[#18181b] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>최적화된 PDF 저장</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowReducerModal(false);
                  handleClearCacheAndReparse();
                }}
                disabled={isExtracting || isLoadingPdf || isOptimizingSize}
                className="h-8 px-3 rounded-md border border-amber-500/30 bg-[#1e1c18] text-amber-300 hover:bg-[#28241d] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                title="현재 문서의 마크다운 캐시를 삭제하고 메타데이터 재최적화 및 파싱을 다시 실행합니다"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>캐시 삭제 후 전체 재파싱</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReducerModal(false)}
                  className="h-8 px-3.5 rounded-md border border-[#222226] bg-[#09090b] text-slate-300 hover:text-white hover:bg-[#18181b] text-xs font-medium transition cursor-pointer"
                >
                  닫기
                </button>

                <button
                  type="button"
                  onClick={handleApplySizeReduction}
                  disabled={isOptimizingSize || isLoadingPdf}
                  className="h-8 px-4 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isOptimizingSize ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>최적화 처리 중...</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>지금 최적화 실행</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PdfViewer.displayName = 'PdfViewer';
