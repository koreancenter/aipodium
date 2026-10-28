import React, { useState, useEffect, useMemo } from 'react';
import { sanitizeHtml } from '../utils/securitySanitizer';
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
import { useLanguage } from '../context/LanguageContext';
import { getDocModalsTranslations } from '../locales/docModalsLocale';
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
  const { language } = useLanguage();
  const t = getDocModalsTranslations(language).docConverter;
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
      onToast?.(t.noOriginalPdf, 'warn');
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
        ? t.statusCloud
        : engine === 'ollama'
        ? t.statusLocal
        : t.statusFast
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
        onToast?.(t.doneCloud, 'success');
      } else if (res.parserEngine === 'ollama') {
        onToast?.(t.doneLocal(res.ollamaModel || targetModel), 'success');
      } else {
        onToast?.(t.doneFast, 'info');
      }
    } catch (err: any) {
      onToast?.(t.failed(err.message), 'error');
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
            <FileText className="w-3 h-3" /> {t.badgePdf}
          </span>
        );
      case 'docx':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80">
            <FileText className="w-3 h-3" /> {t.badgeDocx}
          </span>
        );
      case 'xlsx':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <FileSpreadsheet className="w-3 h-3" /> {t.badgeXlsx}
          </span>
        );
      case 'pptx':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
            <Presentation className="w-3 h-3" /> {t.badgePptx}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
            <FileCheck className="w-3 h-3" /> {t.badgeText}
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
      const metaHeader = `<!--\n[${t.metaTitle}]\n- ${t.metaSourceFile}: ${stats.originalFileName}\n- ${t.metaFormat}: ${stats.format.toUpperCase()}\n- ${t.metaSize}: ${(stats.originalFileSize / 1024).toFixed(1)} KB\n- ${t.metaDate}: ${stats.convertedAt}\n-->\n\n`;
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

  const renderedHtml = useMemo(() => {
    const raw = renderMarkdownToHtml ? renderMarkdownToHtml(editedMarkdown) : '';
    return sanitizeHtml(raw);
  }, [editedMarkdown, renderMarkdownToHtml]);

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
                  {t.title}
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
              title={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="px-5 py-2 bg-[#09090b]/70 border-b border-[#222226]/60 flex items-center flex-wrap gap-3 text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-1 font-mono text-[0.6875rem]">
            <span className="text-slate-500">{t.statsLabel}</span>
            {stats.pageCount !== undefined && (
              <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-indigo-300 border border-[#222226]">
                📄 {t.pages(stats.pageCount)}
              </span>
            )}
            {stats.sheetCount !== undefined && (
              <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-emerald-300 border border-[#222226]">
                📊 {t.sheets(stats.sheetCount)}
              </span>
            )}
            {stats.slideCount !== undefined && (
              <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-amber-300 border border-[#222226]">
                📽️ {t.slides(stats.slideCount)}
              </span>
            )}
            <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-slate-300 border border-[#222226]">
              {t.words(stats.wordCount || 0)}
            </span>
            <span className="bg-[#121214] px-2 py-0.5 rounded-sm text-slate-300 border border-[#222226]">
              {t.lines(stats.lineCount || 0)}
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
              {t.fileNameLabel}
            </label>
            <input
              type="text"
              value={targetFileName}
              onChange={(e) => setTargetFileName(e.target.value)}
              placeholder={t.fileNamePlaceholder}
              className="w-full bg-[#09090b] text-slate-200 placeholder-slate-500 text-xs px-2.5 py-1.5 rounded-md border border-[#222226] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/40 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[0.6875rem] font-medium text-slate-400 mb-1">
              {t.folderLabel}
            </label>
            <div className="relative">
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="w-full bg-[#09090b] text-slate-200 text-xs px-2.5 py-1.5 rounded border border-[#222226] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/40 focus:outline-none appearance-none cursor-pointer"
              >
                {uniqueFolders.map((f) => (
                  <option key={f} value={f}>
                    📁 {f === 'root' ? t.rootFolder : f}
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
                {t.engineLabel}
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
                  <span>{t.engineFast}</span>
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
                  <span>{t.engineCloud}</span>
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
                  <span>{t.engineLocal}</span>
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
                    <optgroup label={t.recommendedModels}>
                      <option value="llama3.2-vision">llama3.2-vision</option>
                      <option value="deepseek-ocr">deepseek-ocr</option>
                      <option value="qwen3.5">qwen3.5</option>
                      <option value="qwen2.5-coder">qwen2.5-coder</option>
                      <option value="deepseek-r1:8b">deepseek-r1:8b</option>
                      <option value="llama3.2:latest">llama3.2:latest</option>
                    </optgroup>
                    {installedOllamaModels.length > 0 && (
                      <optgroup label={t.installedModels}>
                        {installedOllamaModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="custom">{t.customModel}</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {selectedOllamaModel === 'custom' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={customOllamaModel}
                      onChange={(e) => setCustomOllamaModel(e.target.value)}
                      placeholder={t.modelTagPlaceholder}
                      className="w-28 bg-[#1a1b24] border border-[#222226] focus:border-sky-500 rounded px-2 py-1 text-xs font-mono text-slate-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleReconvertPdf('ollama', customOllamaModel)}
                      disabled={isReconverting || !customOllamaModel.trim()}
                      className="px-2 py-1 rounded bg-sky-800 hover:bg-sky-700 text-white text-xs font-medium transition cursor-pointer"
                    >
                      {t.apply}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleReconvertPdf('ollama')}
                  disabled={isReconverting}
                  className="px-2.5 py-1 rounded bg-[#242735] hover:bg-[#222226] text-sky-300 border border-[#3e4258] text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  title={t.reconvertTitle}
                >
                  <RotateCcw className={`w-3 h-3 ${isReconverting ? 'animate-spin' : ''}`} />
                  <span>{t.reconvert}</span>
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
                {reconvertStatus || t.defaultProgress}
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
                  ? t.runningCloud
                  : selectedEngine === 'ollama'
                  ? t.runningLocal(selectedOllamaModel)
                  : t.runningFast}
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
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t.tabPreview}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  activeTab === 'source'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>{t.tabSource}</span>
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
                <span className="text-[0.6875rem]">{t.openInEditor}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded border-[#222226] text-[#6366f1] focus:ring-0 cursor-pointer"
                />
                <span className="text-[0.6875rem]">{t.includeHeader}</span>
              </label>
            </div>
          </div>

          {/* Tab Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'preview' ? (
              <div
                className="markdown-body prose prose-invert max-w-none text-slate-200 text-xs leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderedHtml) }}
              />
            ) : (
              <textarea
                value={editedMarkdown}
                onChange={(e) => setEditedMarkdown(e.target.value)}
                placeholder={t.sourcePlaceholder}
                className="w-full h-full min-h-[300px] bg-transparent text-slate-200 font-mono text-xs focus:outline-none resize-none leading-relaxed custom-scrollbar"
                spellCheck={false}
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#222226]/80 bg-[#1a1b24]/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[0.6875rem] text-slate-400">
            {t.privacyNote}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
            >
              {t.cancel}
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndOpen(true)}
              className="px-3 py-1.5 rounded-md text-xs bg-[#242735] hover:bg-[#222226] text-indigo-300 border border-[#3e4258] transition cursor-pointer flex items-center gap-1.5"
              title={t.openOnlyTitle}
            >
              <span>{t.openOnly}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.saveAndOpen}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
