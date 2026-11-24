import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  SquareCode,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Sparkles,
  Wand2,
  X,
  Loader2,
  Languages,
  FileText
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getEditorTranslations } from '../locales/editorLocale';

export type TextFormatAction =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'bullet'
  | 'number'
  | 'task'
  | 'quote'
  | 'codeblock';

export interface TextFloatingBubbleMenuProps {
  position: { top: number; left: number };
  selectedText: string;
  onApplyFormat: (formatType: TextFormatAction) => void;
  onCleanText?: () => void;
  onClose?: () => void;
  onAiEditText: (prompt: string) => Promise<boolean | void>;
  isAiLoading?: boolean;
}

export const TextFloatingBubbleMenu: React.FC<TextFloatingBubbleMenuProps> = ({
  position,
  selectedText: _selectedText,
  onApplyFormat,
  onCleanText,
  onClose,
  onAiEditText,
  isAiLoading = false
}) => {
  const { language } = useLanguage();
  const bt = getEditorTranslations(language).bubble;
  const [aiError, setAiError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dynamically adjusted coordinate ensuring menu never bleeds outside boundary
  const [adjustedStyle, setAdjustedStyle] = useState<{ top: number; left: number }>({
    top: position.top,
    left: position.left
  });

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const parent = menuRef.current.parentElement;
    if (!parent) return;

    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    const menuWidth = menuRef.current.offsetWidth || 440;
    const menuHeight = menuRef.current.offsetHeight || 38;

    const safeRightMargin = 16;
    const safeLeftMargin = 8;
    const maxAllowedLeft = Math.max(safeLeftMargin, parentWidth - menuWidth - safeRightMargin);

    let finalLeft = position.left;
    if (finalLeft > maxAllowedLeft) {
      finalLeft = maxAllowedLeft;
    }
    if (finalLeft < safeLeftMargin) {
      finalLeft = safeLeftMargin;
    }

    let finalTop = position.top;
    const maxAllowedTop = Math.max(4, parentHeight - menuHeight - 12);
    if (finalTop > maxAllowedTop) {
      finalTop = maxAllowedTop;
    }
    if (finalTop < 4) {
      finalTop = 4;
    }

    setAdjustedStyle((prev) => {
      if (prev.left === finalLeft && prev.top === finalTop) return prev;
      return { top: finalTop, left: finalLeft };
    });
  }, [position.left, position.top]);

  // Window/container resize observer for real-time safety
  useEffect(() => {
    if (!menuRef.current) return;
    const parent = menuRef.current.parentElement;
    if (!parent) return;

    const handleResize = () => {
      if (!menuRef.current || !parent) return;
      const parentWidth = parent.clientWidth;
      const menuWidth = menuRef.current.offsetWidth || 440;
      const safeRightMargin = 16;
      const safeLeftMargin = 8;
      const maxAllowedLeft = Math.max(safeLeftMargin, parentWidth - menuWidth - safeRightMargin);

      setAdjustedStyle((prev) => {
        let finalLeft = position.left;
        if (finalLeft > maxAllowedLeft) finalLeft = maxAllowedLeft;
        if (finalLeft < safeLeftMargin) finalLeft = safeLeftMargin;
        if (prev.left === finalLeft) return prev;
        return { ...prev, left: finalLeft };
      });
    };

    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(handleResize);
    ro.observe(parent);

    return () => {
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
    };
  }, [position.left]);

  const executeAiPrompt = async (promptText: string) => {
    const cleanPrompt = promptText.trim();
    if (!cleanPrompt || isAiLoading) return;
    setAiError(null);
    try {
      await onAiEditText(cleanPrompt);
    } catch (err: any) {
      setAiError(err?.message || bt.aiError);
    }
  };

  const handleQuickTranslate = async () => {
    const hasHangul = /[가-힣]/.test(_selectedText || '');
    const prompt = hasHangul ? bt.quickTranslateToEnPrompt : bt.quickTranslateToKoPrompt;
    await executeAiPrompt(prompt);
  };

  return (
    <div
      ref={menuRef}
      id="text-floating-bubble-menu"
      style={{
        top: `${adjustedStyle.top}px`,
        left: `${adjustedStyle.left}px`
      }}
      onMouseDown={(e) => {
        // Prevent textarea blur unless interacting with text input
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
      className="absolute z-50 flex flex-col bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-[var(--border-luminous)] rounded-xl p-1.5 text-xs text-[var(--text-main)] select-none shadow-[var(--rim-glow)] cyber-rim-top animate-in fade-in duration-100 max-w-[calc(100%-16px)] season-shell"
    >
      {/* 1. Primary Formatting Toolbar Row */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {/* Headings (H1, H2, H3) - Pure Icon Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('h1')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.h1}
            aria-label={bt.h1}
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('h2')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.h2}
            aria-label={bt.h2}
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('h3')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.h3}
            aria-label={bt.h3}
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[var(--border-structural)] shrink-0" />

        {/* Text Style: Bold, Italic, Strikethrough, Inline Code */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('bold')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.bold}
            aria-label={bt.bold}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('italic')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.italic}
            aria-label={bt.italic}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('strikethrough')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.strike}
            aria-label={bt.strike}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('code')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.inlineCode}
            aria-label={bt.inlineCode}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[var(--border-structural)] shrink-0" />

        {/* Link & Code Block */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('link')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.link}
            aria-label={bt.link}
          >
            <Link className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('codeblock')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.codeBlock}
            aria-label={bt.codeBlock}
          >
            <SquareCode className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[var(--border-structural)] shrink-0" />

        {/* Lists & Quote */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('bullet')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.bullet}
            aria-label={bt.bullet}
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('number')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.numbered}
            aria-label={bt.numbered}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('task')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.task}
            aria-label={bt.task}
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('quote')}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={bt.quote}
            aria-label={bt.quote}
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[var(--border-structural)] shrink-0" />

        {/* AI Text Processing Quick Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            disabled={isAiLoading}
            onClick={() => executeAiPrompt(bt.quickRefinePrompt)}
            className="h-6 px-1.5 flex items-center gap-1 rounded-md bg-white/[0.04] hover:bg-white/[0.09] disabled:opacity-50 text-[var(--text-main)] hover:text-[var(--accent-primary)] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] text-[11px] font-medium transition cursor-pointer whitespace-nowrap"
            title={bt.quickRefineTitle}
            aria-label={bt.quickRefine}
          >
            {isAiLoading ? (
              <Loader2 className="w-3 h-3 text-[var(--accent-primary)] animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
            )}
            <span>{bt.quickRefine}</span>
          </button>

          <button
            type="button"
            disabled={isAiLoading}
            onClick={() => executeAiPrompt(bt.quickSummarizePrompt)}
            className="h-6 px-1.5 flex items-center gap-1 rounded-md hover:bg-white/[0.08] disabled:opacity-50 text-[var(--text-muted)] hover:text-[var(--text-main)] text-[11px] font-medium transition cursor-pointer whitespace-nowrap"
            title={bt.quickSummarizeTitle}
            aria-label={bt.quickSummarize}
          >
            <FileText className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>{bt.quickSummarize}</span>
          </button>

          <button
            type="button"
            disabled={isAiLoading}
            onClick={handleQuickTranslate}
            className="h-6 px-1.5 flex items-center gap-1 rounded-md hover:bg-white/[0.08] disabled:opacity-50 text-[var(--text-muted)] hover:text-[var(--text-main)] text-[11px] font-medium transition cursor-pointer whitespace-nowrap"
            title={bt.quickTranslateTitle}
            aria-label={bt.quickTranslate}
          >
            <Languages className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>{bt.quickTranslate}</span>
          </button>
        </div>

        {/* Quick Utilities: Auto Format / Clean */}
        {onCleanText && (
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onCleanText}
              className="w-6 h-6 flex items-center justify-center hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md transition cursor-pointer"
              title={bt.tidyTitle}
              aria-label={bt.tidyLabel}
            >
              <Wand2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Close Button */}
        {onClose && (
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md transition cursor-pointer"
              title={bt.close}
              aria-label={bt.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {aiError && (
        <div className="mt-1.5 pt-1 border-t border-[var(--border-structural)] flex items-center justify-between gap-2 text-[10px] text-rose-400 px-1">
          <span className="truncate">{aiError}</span>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="text-[var(--text-muted)] hover:text-rose-300 shrink-0 cursor-pointer"
            aria-label={bt.close}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
};

