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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
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
      className="fixed inset-0 z-50 bg-[var(--bg-main)]/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl max-w-4xl w-full max-h-[92vh] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-[var(--text-muted)] animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-[var(--bg-surface)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-[var(--accent-primary)]/15 border border-white/[0.08] text-[var(--accent-primary)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--text-main)] truncate">
                  {t.title}
                </h2>
                {getFormatBadge()}
              </div>
              <p className="text-[0.6875rem] text-[var(--text-muted)] font-mono truncate">
                {stats.originalFileName} ({(stats.originalFileSize / 1024).toFixed(1)} KB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-md hover:bg-white/[0.06] transition cursor-pointer"
              title={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="px-5 py-2 bg-[var(--bg-surface)]/70 border-b border-[var(--border-structural)] flex items-center flex-wrap gap-3 text-xs text-[var(--text-muted)] shrink-0">
          <div className="flex items-center gap-1 font-mono text-[0.6875rem]">
            <span className="text-[var(--text-tertiary)]">{t.statsLabel}</span>
            {stats.pageCount !== undefined && (
              <span className="bg-white/[0.04] px-2 py-0.5 rounded-sm text-[var(--accent-primary)] border border-[var(--border-structural)]">
                📄 {t.pages(stats.pageCount)}
              </span>
            )}
            {stats.sheetCount !== undefined && (
              <span className="bg-white/[0.04] px-2 py-0.5 rounded-sm text-[var(--secondary-accent)] border border-[var(--border-structural)]">
                📊 {t.sheets(stats.sheetCount)}
              </span>
            )}
            {stats.slideCount !== undefined && (
              <span className="bg-white/[0.04] px-2 py-0.5 rounded-sm text-amber-300 border border-[var(--border-structural)]">
                📽️ {t.slides(stats.slideCount)}
              </span>
            )}
            <span className="bg-white/[0.04] px-2 py-0.5 rounded-sm text-[var(--text-muted)] border border-[var(--border-structural)]">
              {t.words(stats.wordCount || 0)}
            </span>
            <span className="bg-white/[0.04] px-2 py-0.5 rounded-sm text-[var(--text-muted)] border border-[var(--border-structural)]">
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
        <div className="px-5 py-3 bg-[var(--bg-editor)] border-b border-[var(--border-structural)] grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
          <div>
            <label className="block text-[0.6875rem] font-medium text-[var(--text-muted)] mb-1">
              {t.fileNameLabel}
            </label>
            <input
              type="text"
              value={targetFileName}
              onChange={(e) => setTargetFileName(e.target.value)}
              placeholder={t.fileNamePlaceholder}
              className="w-full bg-[var(--bg-surface)] text-[var(--text-main)] placeholder-[var(--text-tertiary)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--border-structural)] focus:border-[var(--border-luminous)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 focus:outline-none font-mono transition-colors"
            />
          </div>

          <div>
            <label className="block text-[0.6875rem] font-medium text-[var(--text-muted)] mb-1">
              {t.folderLabel}
            </label>
            <div className="relative">
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="w-full bg-[var(--bg-surface)] text-[var(--text-main)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--border-structural)] focus:border-[var(--border-luminous)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 focus:outline-none appearance-none cursor-pointer transition-colors"
              >
                {uniqueFolders.map((f) => (
                  <option key={f} value={f}>
                    📁 {f === 'root' ? t.rootFolder : f}
                  </option>
                ))}
              </select>
              <Folder className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* PDF Parser Engine Bar (Only for PDF) */}
        {stats.format === 'pdf' && (
          <div className="px-5 py-2.5 bg-[var(--bg-surface)]/80 border-b border-[var(--border-structural)] flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                {t.engineLabel}
              </span>
              <div className="inline-flex p-0.5 bg-[var(--bg-editor)] border border-[var(--border-structural)] rounded-md">
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
                      ? 'bg-white/[0.08] text-[var(--text-main)] shadow-xs font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
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
                      ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shadow-xs font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
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
                      ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shadow-xs font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Server className="w-3 h-3 text-[var(--accent-primary)]" />
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
                    className="bg-[var(--bg-surface)] border border-[var(--border-structural)] focus:border-[var(--border-luminous)] rounded-md px-2.5 py-1 text-xs text-[var(--text-main)] outline-none pr-7 cursor-pointer transition-colors"
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
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {selectedOllamaModel === 'custom' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={customOllamaModel}
                      onChange={(e) => setCustomOllamaModel(e.target.value)}
                      placeholder={t.modelTagPlaceholder}
                      className="w-28 bg-[var(--bg-surface)] border border-[var(--border-structural)] focus:border-[var(--border-luminous)] rounded-md px-2 py-1 text-xs font-mono text-[var(--text-main)] outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleReconvertPdf('ollama', customOllamaModel)}
                      disabled={isReconverting || !customOllamaModel.trim()}
                      className="px-2 py-1 rounded bg-[#F1F5F9] hover:bg-white text-[#0F172A] text-xs font-semibold transition cursor-pointer"
                    >
                      {t.apply}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleReconvertPdf('ollama')}
                  disabled={isReconverting}
                  className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-[var(--accent-primary)] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] text-xs font-medium transition cursor-pointer flex items-center gap-1"
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
        <div className="relative flex-1 min-h-0 flex flex-col bg-[var(--bg-editor)]">
          {/* Loading Overlay when Re-converting */}
          {isReconverting && (
            <div className="absolute inset-0 z-30 bg-[var(--bg-main)]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
              <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin mb-3" />
              <p className="text-sm font-semibold text-[var(--text-main)] mb-2">
                {reconvertStatus || t.defaultProgress}
              </p>
              
              {/* Progress Bar */}
              <div className="w-64 max-w-full bg-[var(--bg-surface)] border border-[var(--border-structural)] rounded-full h-2 overflow-hidden mb-2">
                <div
                  className="bg-[var(--accent-primary)] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(reconvertProgress, 8)}%` }}
                />
              </div>

              <p className="text-xs text-[var(--text-muted)] font-mono">
                {selectedEngine === 'gemini'
                  ? t.runningCloud
                  : selectedEngine === 'ollama'
                  ? t.runningLocal(selectedOllamaModel)
                  : t.runningFast}
              </p>
            </div>
          )}
          {/* Tab Header */}
          <div className="flex items-center justify-between px-5 border-b border-[var(--border-structural)] bg-[var(--bg-surface)]/60 shrink-0">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`relative flex items-center gap-1.5 py-2.5 text-xs font-medium transition cursor-pointer ${
                  activeTab === 'preview'
                    ? 'text-[var(--text-main)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t.tabPreview}</span>
                {activeTab === 'preview' && (
                  <span className="cyber-active-rail absolute bottom-0 left-0 right-0 h-[2px] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={`relative flex items-center gap-1.5 py-2.5 text-xs font-medium transition cursor-pointer ${
                  activeTab === 'source'
                    ? 'text-[var(--text-main)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>{t.tabSource}</span>
                {activeTab === 'source' && (
                  <span className="cyber-active-rail absolute bottom-0 left-0 right-0 h-[2px] rounded-full" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={openInEditor}
                  onChange={(e) => setOpenInEditor(e.target.checked)}
                  className="rounded border-white/[0.15] accent-[var(--accent-primary)] focus:ring-0 cursor-pointer"
                />
                <span className="text-[0.6875rem]">{t.openInEditor}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded border-white/[0.15] accent-[var(--accent-primary)] focus:ring-0 cursor-pointer"
                />
                <span className="text-[0.6875rem]">{t.includeHeader}</span>
              </label>
            </div>
          </div>

          {/* Tab Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'preview' ? (
              <div
                className="markdown-body prose prose-invert max-w-none text-[var(--text-main)] text-xs leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderedHtml) }}
              />
            ) : (
              <textarea
                value={editedMarkdown}
                onChange={(e) => setEditedMarkdown(e.target.value)}
                placeholder={t.sourcePlaceholder}
                className="w-full h-full min-h-[300px] bg-transparent text-[var(--text-main)] placeholder-[var(--text-tertiary)] font-mono text-xs focus:outline-none resize-none leading-relaxed custom-scrollbar"
                spellCheck={false}
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[var(--border-structural)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[0.6875rem] text-[var(--text-muted)]">
            {t.privacyNote}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06] transition cursor-pointer"
            >
              {t.cancel}
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndOpen(true)}
              className="px-3 py-1.5 rounded-md text-xs bg-white/[0.05] hover:bg-white/[0.1] text-[var(--text-main)] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] transition cursor-pointer flex items-center gap-1.5"
              title={t.openOnlyTitle}
            >
              <span>{t.openOnly}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#F1F5F9] hover:bg-white text-[#0F172A] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
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
