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
  Loader2
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
  hasSelection: boolean;
  onApplyFormat: (formatType: TextFormatAction) => void;
  onCleanText?: () => void;
  onClose?: () => void;
  onAiEditText: (prompt: string) => Promise<boolean | void>;
  isAiLoading?: boolean;
}

export const TextFloatingBubbleMenu: React.FC<TextFloatingBubbleMenuProps> = ({
  position,
  selectedText: _selectedText,
  hasSelection,
  onApplyFormat,
  onCleanText,
  onClose,
  onAiEditText,
  isAiLoading = false
}) => {
  const { language } = useLanguage();
  const bt = getEditorTranslations(language).bubble;
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
    const menuWidth = menuRef.current.offsetWidth || 480;
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
  }, [position.left, position.top, isAiOpen]);

  // Window/container resize observer for real-time safety
  useEffect(() => {
    if (!menuRef.current) return;
    const parent = menuRef.current.parentElement;
    if (!parent) return;

    const handleResize = () => {
      if (!menuRef.current || !parent) return;
      const parentWidth = parent.clientWidth;
      const menuWidth = menuRef.current.offsetWidth || 480;
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

  useEffect(() => {
    if (isAiOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAiOpen]);

  const handleAiSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim() || isAiLoading) return;
    setAiError(null);
    try {
      const success = await onAiEditText(aiPrompt.trim());
      if (success !== false) {
        setAiPrompt('');
        setIsAiOpen(false);
      }
    } catch (err: any) {
      setAiError(err?.message || bt.aiError);
    }
  };

  const handlePresetClick = (presetPrompt: string) => {
    setAiPrompt(presetPrompt);
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
      className="absolute z-50 flex flex-col bg-[#121214] border border-[#222226] rounded-xs p-1 text-xs text-slate-200 select-none shadow-xl animate-in fade-in duration-100 max-w-[calc(100%-16px)]"
    >
      {/* 1. Primary Formatting Toolbar Row */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {/* Headings (H1, H2, H3) - Pure Icon Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('h1')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.h1}
            aria-label={bt.h1}
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('h2')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.h2}
            aria-label={bt.h2}
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('h3')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.h3}
            aria-label={bt.h3}
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#222226] shrink-0" />

        {/* Text Style: Bold, Italic, Strikethrough, Inline Code */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('bold')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.bold}
            aria-label={bt.bold}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('italic')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.italic}
            aria-label={bt.italic}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('strikethrough')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.strike}
            aria-label={bt.strike}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('code')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.inlineCode}
            aria-label={bt.inlineCode}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#222226] shrink-0" />

        {/* Link & Code Block */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('link')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.link}
            aria-label={bt.link}
          >
            <Link className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('codeblock')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.codeBlock}
            aria-label={bt.codeBlock}
          >
            <SquareCode className="w-3.5 h-3.5 text-amber-400/80" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#222226] shrink-0" />

        {/* Lists & Quote */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('bullet')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.bullet}
            aria-label={bt.bullet}
          >
            <List className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('number')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.numbered}
            aria-label={bt.numbered}
          >
            <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('task')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.task}
            aria-label={bt.task}
          >
            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('quote')}
            className="w-6 h-6 flex items-center justify-center rounded-xs hover:bg-[#18181b] text-slate-300 hover:text-white transition cursor-pointer"
            title={bt.quote}
            aria-label={bt.quote}
          >
            <Quote className="w-3.5 h-3.5 text-purple-400" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#222226] shrink-0" />

        {/* AI Text Assistant Trigger (Sparkles) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsAiOpen(!isAiOpen);
              setAiError(null);
            }}
            className={`w-6 h-6 flex items-center justify-center rounded-xs transition cursor-pointer border ${
              isAiOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-indigo-600/15 hover:bg-indigo-600/30 text-amber-400 hover:text-amber-300 border-indigo-500/30'
            }`}
            title={bt.aiTitle}
            aria-label={bt.aiLabel}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Utilities: Auto Format / Clean */}
        {onCleanText && (
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onCleanText}
              className="w-6 h-6 flex items-center justify-center hover:bg-[#18181b] text-slate-400 hover:text-white rounded-xs transition cursor-pointer"
              title={bt.tidyTitle}
              aria-label={bt.tidyLabel}
            >
              <Wand2 className="w-3.5 h-3.5 hover:text-amber-300" />
            </button>
          </div>
        )}

        {/* Close Button */}
        {onClose && (
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center hover:bg-[#18181b] text-slate-400 hover:text-white rounded-xs transition cursor-pointer"
              title={bt.close}
              aria-label={bt.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Inline Expandable AI Prompt Input Tray */}
      {isAiOpen && (
        <div className="mt-1.5 pt-1.5 border-t border-[#222226] flex flex-col gap-1.5 w-80 text-xs animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300 px-0.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{bt.aiHeader}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAiOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded-xs hover:bg-[#18181b] cursor-pointer"
              title={bt.close}
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap gap-1">
            {bt.chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handlePresetClick(chip.prompt)}
                className="px-1.5 py-0.5 rounded-xs bg-[#09090b] hover:bg-[#18181b] text-[10px] text-slate-300 border border-[#222226] transition cursor-pointer whitespace-nowrap"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleAiSubmit} className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={
                hasSelection
                  ? bt.placeholderSelected
                  : bt.placeholderEmpty
              }
              disabled={isAiLoading}
              className="flex-1 bg-[#09090b] border border-[#222226] focus:border-[#6366f1] rounded-xs px-2 py-1 text-xs text-slate-200 outline-none placeholder:text-slate-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAiLoading || !aiPrompt.trim()}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xs text-xs font-medium flex items-center gap-1 transition shrink-0 cursor-pointer"
            >
              {isAiLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              ) : (
                <Sparkles className="w-3 h-3 text-amber-300" />
              )}
              <span>{isAiLoading ? bt.running : bt.run}</span>
            </button>
          </form>

          {aiError && (
            <div className="text-[10px] text-rose-400 px-0.5">{aiError}</div>
          )}
        </div>
      )}
    </div>
  );
};

