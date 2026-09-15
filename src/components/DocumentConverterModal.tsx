import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Check,
  X,
  Eye,
  Code,
  Folder,
  ArrowRight,
  Sparkles,
  AlertCircle,
  FileCheck,
  Layers,
  Zap,
  Server,
  RotateCcw,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  DocumentConversionResult,
  PdfParserEngine,
  convertPdfToMarkdown,
  fetchOllamaInstalledModels,
} from '../services/documentConverterService';

interface DocumentConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversionResult: DocumentConversionResult | null;
  availableFolders: string[];
  defaultFolder?: string;
  onConfirm: (options: {
    fileName: string;
    folder: string;
    markdown: string;
    openInEditor: boolean;
  }) => void;
  renderMarkdownToHtml?: (md: string) => string;
  defaultOllamaEndpoint?: string;
  defaultOllamaModel?: string;
  onToast?: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

export const DocumentConverterModal: React.FC<DocumentConverterModalProps> = ({
  isOpen,
  onClose,
  conversionResult,
  availableFolders,
  defaultFolder = 'docs',
  onConfirm,
  renderMarkdownToHtml,
  defaultOllamaEndpoint = 'http://localhost:11434',
  defaultOllamaModel = 'llama3.2-vision',
  onToast,
}) => {
  const [targetFileName, setTargetFileName] = useState('');
  const [targetFolder, setTargetFolder] = useState(defaultFolder);
  const [editedMarkdown, setEditedMarkdown] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview');
  const [openInEditor, setOpenInEditor] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);

  // PDF Parser Engine State
  const [selectedEngine, setSelectedEngine] = useState<PdfParserEngine>('fast');
  const [ollamaEndpoint, setOllamaEndpoint] = useState(defaultOllamaEndpoint);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState(defaultOllamaModel);
  const [customOllamaModel, setCustomOllamaModel] = useState('');
  const [installedOllamaModels, setInstalledOllamaModels] = useState<string[]>([]);
  const [isReconverting, setIsReconverting] = useState(false);
  const [reconvertStatus, setReconvertStatus] = useState<string>('');
  const [reconvertProgress, setReconvertProgress] = useState<number>(0);
  const [currentWarnings, setCurrentWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (conversionResult) {
      setTargetFileName(conversionResult.suggestedFileName);
      setEditedMarkdown(conversionResult.markdown);
      setTargetFolder(defaultFolder || 'docs');
      setSelectedEngine(conversionResult.parserEngine || 'fast');
      if (conversionResult.ollamaModel) {
        setSelectedOllamaModel(conversionResult.ollamaModel);
      }
      setCurrentWarnings(conversionResult.warnings || []);
    }
  }, [conversionResult, defaultFolder]);

  // Fetch installed models when Ollama engine is active
  useEffect(() => {
    if (isOpen && conversionResult?.stats?.format === 'pdf' && selectedEngine === 'ollama') {
      fetchOllamaInstalledModels(ollamaEndpoint).then((models) => {
        if (models && models.length > 0) {
          setInstalledOllamaModels(models);
        }
      });
    }
  }, [isOpen, conversionResult?.stats?.format, selectedEngine, ollamaEndpoint]);

  if (!isOpen || !conversionResult) return null;

  const { stats } = conversionResult;

  const handleReconvertPdf = async (engineToUse?: PdfParserEngine, modelToUse?: string) => {
    if (!conversionResult.originalFile) {
      onToast?.('원본 PDF 파일 데이터가 메모리에 유지되지 않아 다시 변환할 수 없습니다.', 'warn');
      return;
    }

    const engine = engineToUse || selectedEngine;
    const targetModel =
      (modelToUse || selectedOllamaModel) === 'custom' && customOllamaModel.trim()
        ? customOllamaModel.trim()
        : modelToUse || selectedOllamaModel;

    setIsReconverting(true);
    setReconvertProgress(10);
    setReconvertStatus(
      engine === 'gemini'
        ? '클라우드 AI로 문서 구조 및 서식 정밀 분석 중...'
        : engine === 'ollama'
        ? '로컬 AI로 PDF 양식을 분석하여 마크다운으로 변환 중...'
        : '고속 텍스트 추출 엔진으로 변환 중...'
    );

    try {
      const res = await convertPdfToMarkdown(conversionResult.originalFile, conversionResult.originalFile.name, {
        engine,
        ollamaEndpoint,
        ollamaModel: targetModel,
        onStatusUpdate: (msg) => setReconvertStatus(msg),
        onProgress: (pct, msg) => {
          setReconvertProgress(pct);
          if (msg) setReconvertStatus(msg);
        },
        onFallback: (reason) => {
          onToast?.(reason, 'warn');
        },
      });

      setEditedMarkdown(res.markdown);
      setSelectedEngine(res.parserEngine);
      if (res.ollamaModel) {
        setSelectedOllamaModel(res.ollamaModel);
      }
      setCurrentWarnings(res.warnings || []);
      if (res.parserEngine === 'gemini') {
        onToast?.('클라우드 AI 정밀 마크다운 변환 완료!', 'success');
      } else if (res.parserEngine === 'ollama') {
        onToast?.(`로컬 AI (${res.ollamaModel || targetModel}) 파싱 완료!`, 'success');
      } else {
        onToast?.('고속 텍스트 엔진으로 변환되었습니다.', 'info');
      }
    } catch (err: any) {
      onToast?.(`PDF 변환 실패: ${err.message}`, 'error');
    } finally {
      setIsReconverting(false);
      setReconvertStatus('');
      setReconvertProgress(0);
    }
  };

  const getFormatBadge = () => {
    switch (stats.format) {
      case 'pdf':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80">
            <FileText className="w-3 h-3" /> PDF 문서
          </span>
        );
      case 'docx':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80">
            <FileText className="w-3 h-3" /> 워드 문서
          </span>
        );
      case 'xlsx':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <FileSpreadsheet className="w-3 h-3" /> 엑셀 스프레드시트
          </span>
        );
      case 'pptx':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
            <Presentation className="w-3 h-3" /> 파워포인트 슬라이드
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
            <FileCheck className="w-3 h-3" /> 텍스트 문서
          </span>
        );
    }
  };

  const handleSaveAndOpen = (onlyOpenInEditor: boolean = false) => {
    let finalFileName = targetFileName.trim();
    if (!finalFileName) {
      finalFileName = conversionResult.suggestedFileName;
    }
    if (!finalFileName.endsWith('.md')) {
      finalFileName = `${finalFileName.replace(/\.[^/.]+$/, '')}.md`;
    }

    let finalMarkdown = editedMarkdown;
    if (includeMetadata) {
      const metaHeader = `<!--\n[변환 메타데이터]\n- 원본 파일: ${stats.originalFileName}\n- 변환 형식: ${stats.format.toUpperCase()}\n- 원본 크기: ${(stats.originalFileSize / 1024).toFixed(1)} KB\n- 변환 일시: ${stats.convertedAt}\n-->\n\n`;
      finalMarkdown = metaHeader + finalMarkdown;
    }

    onConfirm({
      fileName: finalFileName,
      folder: onlyOpenInEditor ? '__none__' : targetFolder,
      markdown: finalMarkdown,
      openInEditor: onlyOpenInEditor || openInEditor,
    });
  };

  const uniqueFolders = Array.from(
    new Set([defaultFolder, 'root', 'docs', ...availableFolders])
  ).filter(Boolean);

  const renderedHtml = renderMarkdownToHtml ? renderMarkdownToHtml(editedMarkdown) : '';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#09090b]/85 backdrop-blur-xs flex items-center justify-center p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0c0c0e] border border-[#222226] rounded-lg max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222226]/80 bg-[#1a1b24]/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-[#6366f1]/20 border border-[#6366f1]/30 text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 truncate">
                  문서 마크다운 변환 미리보기
                </h2>
                {getFormatBadge()}
              </div>
              <p className="text-[0.6875rem] text-slate-400 font-mono truncate">
                {stats.originalFileName} ({(stats.originalFileSize / 1024).toFixed(1)} KB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-[#18181b] transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="px-5 py-2 bg-[#09090b]/70 border-b border-[#222226]/60 flex items-center flex-wrap gap-3 text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-1 font-mono text-[0.6875rem]">
            <span className="text-slate-500">통계:</span>
            {stats.pageCount !== undefined && (
              <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-indigo-300 border border-[#222226]">
                📄 {stats.pageCount} 페이지
              </span>
            )}
            {stats.sheetCount !== undefined && (
              <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-emerald-300 border border-[#222226]">
                📊 {stats.sheetCount}개 시트
              </span>
            )}
            {stats.slideCount !== undefined && (
              <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-amber-300 border border-[#222226]">
                📽️ {stats.slideCount}개 슬라이드
              </span>
            )}
            <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-slate-300 border border-[#222226]">
              {stats.wordCount || 0} 단어
            </span>
            <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-slate-300 border border-[#222226]">
              {stats.lineCount || 0} 줄
            </span>
          </div>

          {currentWarnings.length > 0 && (
            <div className="flex items-center gap-1 text-[0.6875rem] text-amber-400 ml-auto">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-xs">{currentWarnings[0]}</span>
            </div>
          )}
        </div>

        {/* Configuration Bar */}
        <div className="px-5 py-3 bg-[#0c0c0e] border-b border-[#222226]/60 grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
          <div>
            <label className="block text-[0.6875rem] font-medium text-slate-400 mb-1">
              생성할 마크다운 파일명
            </label>
            <input
              type="text"
              value={targetFileName}
              onChange={(e) => setTargetFileName(e.target.value)}
              placeholder="문서_이름.md"
              className="w-full bg-[#09090b] text-slate-200 placeholder-slate-500 text-xs px-2.5 py-1.5 rounded-md border border-[#222226] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/40 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[0.6875rem] font-medium text-slate-400 mb-1">
              워크스페이스 대상 폴더
            </label>
            <div className="relative">
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="w-full bg-[#09090b] text-slate-200 text-xs px-2.5 py-1.5 rounded border border-[#222226] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/40 focus:outline-none appearance-none cursor-pointer"
              >
                {uniqueFolders.map((f) => (
                  <option key={f} value={f}>
                    📁 {f === 'root' ? '최상위 기본 폴더' : f}
                  </option>
                ))}
              </select>
              <Folder className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* PDF Parser Engine Bar (Only for PDF) */}
        {stats.format === 'pdf' && (
          <div className="px-5 py-2.5 bg-[#14151c] border-b border-[#222226]/70 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                파싱 엔진:
              </span>
              <div className="inline-flex p-0.5 bg-[#1a1b24] border border-[#222226] rounded-md">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEngine('fast');
                    if (selectedEngine !== 'fast') {
                      handleReconvertPdf('fast');
                    }
                  }}
                  disabled={isReconverting}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    selectedEngine === 'fast'
                      ? 'bg-[#222226] text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>고속 텍스트 엔진</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedEngine('gemini');
                    if (selectedEngine !== 'gemini') {
                      handleReconvertPdf('gemini');
                    }
                  }}
                  disabled={isReconverting}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    selectedEngine === 'gemini'
                      ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-600/40 shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>클라우드 AI 엔진</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedEngine('ollama');
                    if (selectedEngine !== 'ollama') {
                      handleReconvertPdf('ollama');
                    }
                  }}
                  disabled={isReconverting}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    selectedEngine === 'ollama'
                      ? 'bg-sky-950/80 text-sky-200 border border-sky-600/40 shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Server className="w-3 h-3 text-sky-400" />
                  <span>로컬 AI 엔진</span>
                </button>
              </div>
            </div>

            {selectedEngine === 'ollama' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <select
                    value={selectedOllamaModel}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setSelectedOllamaModel(newModel);
                      if (newModel !== 'custom') {
                        handleReconvertPdf('ollama', newModel);
                      }
                    }}
                    disabled={isReconverting}
                    className="bg-[#1a1b24] border border-[#222226] focus:border-sky-500 rounded px-2.5 py-1 text-xs text-slate-200 outline-none pr-7 cursor-pointer"
                  >
                    <optgroup label="추천 파싱 모델">
                      <option value="llama3.2-vision">llama3.2-vision</option>
                      <option value="deepseek-ocr">deepseek-ocr</option>
                      <option value="qwen3.5">qwen3.5</option>
                      <option value="qwen2.5-coder">qwen2.5-coder</option>
                      <option value="deepseek-r1:8b">deepseek-r1:8b</option>
                      <option value="llama3.2:latest">llama3.2:latest</option>
                    </optgroup>
                    {installedOllamaModels.length > 0 && (
                      <optgroup label="내 PC 설치 모델">
                        {installedOllamaModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="custom">직접 입력...</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {selectedOllamaModel === 'custom' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={customOllamaModel}
                      onChange={(e) => setCustomOllamaModel(e.target.value)}
                      placeholder="모델 태그..."
                      className="w-28 bg-[#1a1b24] border border-[#222226] focus:border-sky-500 rounded px-2 py-1 text-xs font-mono text-slate-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleReconvertPdf('ollama', customOllamaModel)}
                      disabled={isReconverting || !customOllamaModel.trim()}
                      className="px-2 py-1 rounded bg-sky-800 hover:bg-sky-700 text-white text-xs font-medium transition cursor-pointer"
                    >
                      적용
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleReconvertPdf('ollama')}
                  disabled={isReconverting}
                  className="px-2.5 py-1 rounded bg-[#242735] hover:bg-[#222226] text-sky-300 border border-[#3e4258] text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  title="현재 선택한 로컬 AI 모델로 다시 변환"
                >
                  <RotateCcw className={`w-3 h-3 ${isReconverting ? 'animate-spin' : ''}`} />
                  <span>다시 가공</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preview Tabs & Editor Area */}
        <div className="relative flex-1 min-h-0 flex flex-col bg-[#09090b]">
          {/* Loading Overlay when Re-converting */}
          {isReconverting && (
            <div className="absolute inset-0 z-30 bg-[#09090b]/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-100 mb-2">
                {reconvertStatus || '문서를 분석하여 마크다운으로 변환하는 중입니다...'}
              </p>
              
              {/* Progress Bar */}
              <div className="w-64 max-w-full bg-[#121214] border border-[#222226] rounded-full h-2 overflow-hidden mb-2">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(reconvertProgress, 8)}%` }}
                />
              </div>

              <p className="text-xs text-slate-400 font-mono">
                {selectedEngine === 'gemini'
                  ? '클라우드 AI 엔진 작동 중'
                  : selectedEngine === 'ollama'
                  ? `로컬 AI 모델: ${selectedOllamaModel}`
                  : '고속 텍스트 엔진 처리 중'}
              </p>
            </div>
          )}
          {/* Tab Header */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-[#222226]/60 bg-[#0c0c0e]/60 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-[#6366f1] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>렌더링 미리보기</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'source'
                    ? 'bg-[#6366f1] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>마크다운 원본 편집</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={openInEditor}
                  onChange={(e) => setOpenInEditor(e.target.checked)}
                  className="rounded border-[#222226] text-[#6366f1] focus:ring-0 cursor-pointer"
                />
                <span className="text-[0.6875rem]">변환 즉시 에디터에서 열기</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded border-[#222226] text-[#6366f1] focus:ring-0 cursor-pointer"
                />
                <span className="text-[0.6875rem]">변환 출처 헤더 포함</span>
              </label>
            </div>
          </div>

          {/* Tab Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'preview' ? (
              <div
                className="markdown-body prose prose-invert max-w-none text-slate-200 text-xs leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : (
              <textarea
                value={editedMarkdown}
                onChange={(e) => setEditedMarkdown(e.target.value)}
                placeholder="# 변환된 마크다운 내용..."
                className="w-full h-full min-h-[300px] bg-transparent text-slate-200 font-mono text-xs focus:outline-none resize-none leading-relaxed custom-scrollbar"
                spellCheck={false}
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#222226]/80 bg-[#1a1b24]/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[0.6875rem] text-slate-400">
            순수 브라우저 클라이언트 처리로 외부 서버 전송 없이 안전하게 변환됩니다.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            >
              취소
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndOpen(true)}
              className="px-3 py-1.5 rounded-md text-xs bg-[#242735] hover:bg-[#222226] text-indigo-300 border border-[#3e4258] transition cursor-pointer flex items-center gap-1.5"
              title="워크스페이스 파일 목록에 영구 저장하지 않고 에디터에서만 열람합니다"
            >
              <span>에디터에서만 열기</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-[#6366f1] hover:bg-[#5254e0] text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>작업 공간에 저장 및 열기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
