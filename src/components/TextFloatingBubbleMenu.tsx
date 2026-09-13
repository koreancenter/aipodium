import React, { useState, useRef, useEffect } from 'react';
import {
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
  selectedText,
  hasSelection,
  onApplyFormat,
  onCleanText,
  onClose,
  onAiEditText,
  isAiLoading = false
}) => {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setAiError(err?.message || 'AI 텍스트 가공 중 오류가 발생했습니다.');
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
      id="text-floating-bubble-menu"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
      onMouseDown={(e) => {
        // Prevent textarea blur unless interacting with text input
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
      className="absolute z-40 flex flex-col bg-[#1e202b]/98 backdrop-blur-md border border-[#2e3142] rounded-lg shadow-2xl p-1 text-xs text-slate-200 select-none transition-[top,left] duration-150 ease-out animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100%-24px)]"
    >
      {/* 1. Primary Compact Formatting Toolbar Row */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {/* Headings (H1, H2, H3) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('h1')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white font-bold text-[11px] font-mono transition cursor-pointer"
            title="대제목 (H1 #)"
            aria-label="대제목 (H1)"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('h2')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white font-bold text-[11px] font-mono transition cursor-pointer"
            title="중제목 (H2 ##)"
            aria-label="중제목 (H2)"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('h3')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white font-bold text-[11px] font-mono transition cursor-pointer"
            title="소제목 (H3 ###)"
            aria-label="소제목 (H3)"
          >
            H3
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142] shrink-0" />

        {/* Text Style: Bold, Italic, Strikethrough, Inline Code */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('bold')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="굵게 (**텍스트** - Ctrl+B)"
            aria-label="굵게"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('italic')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="기울임 (*텍스트* - Ctrl+I)"
            aria-label="기울임"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('strikethrough')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="취소선 (~~텍스트~~)"
            aria-label="취소선"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('code')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="인라인 코드 (`코드`)"
            aria-label="인라인 코드"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142] shrink-0" />

        {/* Link & Code Block */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('link')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="링크 삽입 [이름](URL)"
            aria-label="링크 삽입"
          >
            <Link className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('codeblock')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="코드 블록 (```코드```)"
            aria-label="코드 블록"
          >
            <SquareCode className="w-3.5 h-3.5 text-amber-400/80" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142] shrink-0" />

        {/* Lists & Quote */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onApplyFormat('bullet')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="글머리 기호 목록 (- 항목)"
            aria-label="글머리 기호 목록"
          >
            <List className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('number')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="번호 순서 목록 (1. 항목)"
            aria-label="번호 순서 목록"
          >
            <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('task')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="할 일 체크박스 (- [ ] 항목)"
            aria-label="할 일 체크박스"
          >
            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          <button
            type="button"
            onClick={() => onApplyFormat('quote')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#282a38] text-slate-300 hover:text-white transition cursor-pointer"
            title="인용구 (> 인용문)"
            aria-label="인용구"
          >
            <Quote className="w-3.5 h-3.5 text-purple-400" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142] shrink-0" />

        {/* AI Text Assistant Trigger (Sparkles) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsAiOpen(!isAiOpen);
              setAiError(null);
            }}
            className={`w-6 h-6 flex items-center justify-center rounded transition cursor-pointer border ${
              isAiOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-indigo-600/15 hover:bg-indigo-600/30 text-amber-400 hover:text-amber-300 border-indigo-500/30'
            }`}
            title="AI 텍스트 가공 & 요약 프롬프트 (✨)"
            aria-label="AI 텍스트 가공 & 요약"
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
              className="w-6 h-6 flex items-center justify-center hover:bg-[#282a38] text-slate-400 hover:text-white rounded transition cursor-pointer"
              title="텍스트 서식 & 들여쓰기 정돈"
              aria-label="텍스트 정돈"
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
              className="w-6 h-6 flex items-center justify-center hover:bg-[#282a38] text-slate-500 hover:text-slate-200 rounded transition cursor-pointer"
              title="버블 메뉴 닫기 (Esc)"
              aria-label="버블 메뉴 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Inline Expandable AI Prompt Input Tray */}
      {isAiOpen && (
        <div className="mt-1.5 pt-1.5 border-t border-[#2e3142] flex flex-col gap-1.5 w-80 text-xs animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300 px-0.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>AI 텍스트 편집 & 가공</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAiOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-[#282a38] cursor-pointer"
              title="닫기"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap gap-1">
            {[
              {
                label: '📝 문장 다듬기',
                prompt: '선택한 텍스트를 더 자연스럽고 매끄러운 전문 비즈니스 문체로 다듬어줘.'
              },
              {
                label: '⚡ 핵심 요약',
                prompt: '선택한 텍스트의 핵심 내용을 3줄 불렛포인트로 간결하게 요약해줘.'
              },
              {
                label: '🔤 한국어 번역',
                prompt: '선택한 텍스트를 자연스럽고 읽기 쉬운 한국어로 번역해줘.'
              },
              {
                label: '🌐 영어 번역',
                prompt: '선택한 텍스트를 자연스러운 비즈니스 영어(English)로 번역해줘.'
              },
              {
                label: '🎯 맞춤법 교정',
                prompt: '선택한 텍스트의 오탈자, 맞춤법, 띄어쓰기 및 문법을 완벽히 교정해줘.'
              },
              {
                label: '📋 구조화',
                prompt: '선택한 내용을 마크다운 소제목과 글머리 기호 목록으로 체계적으로 구조화해줘.'
              }
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handlePresetClick(chip.prompt)}
                className="px-1.5 py-0.5 rounded bg-[#121318] hover:bg-[#282a38] text-[10px] text-slate-300 border border-[#2e3142] transition cursor-pointer whitespace-nowrap"
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
                  ? '선택된 텍스트 수정 또는 변환 지시 입력...'
                  : '텍스트 가공 또는 생성 지시 입력...'
              }
              disabled={isAiLoading}
              className="flex-1 bg-[#121318] border border-[#2e3142] focus:border-[#6366f1] rounded px-2 py-1 text-xs text-slate-200 outline-none placeholder:text-slate-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAiLoading || !aiPrompt.trim()}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded text-xs font-medium flex items-center gap-1 transition shrink-0 cursor-pointer"
            >
              {isAiLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              ) : (
                <Sparkles className="w-3 h-3 text-amber-300" />
              )}
              <span>{isAiLoading ? '가공 중' : '실행'}</span>
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
