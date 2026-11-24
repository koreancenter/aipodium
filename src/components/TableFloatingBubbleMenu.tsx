import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Sparkles,
  Edit3,
  Plus,
  X,
  Loader2,
  Wand2,
  Eraser,
  Rows,
  Columns
} from 'lucide-react';
import { MarkdownTableInfo } from '../utils/markdownTableHelper';

export interface TableFloatingBubbleMenuProps {
  tableInfo: MarkdownTableInfo;
  position: { top: number; left: number };
  onInsertRow: (position: 'above' | 'below') => void;
  onDeleteRow: () => void;
  onInsertCol: (position: 'left' | 'right') => void;
  onDeleteCol: () => void;
  onSetAlign: (align: 'left' | 'center' | 'right') => void;
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onFormatTable: () => void;
  onClearSelectedCells: () => void;
  onOpenVisualModal: () => void;
  onAiEditTable: (prompt: string) => Promise<boolean | void>;
  isAiLoading?: boolean;
}

export const TableFloatingBubbleMenu: React.FC<TableFloatingBubbleMenuProps> = ({
  tableInfo,
  position,
  onInsertRow,
  onDeleteRow,
  onInsertCol,
  onDeleteCol,
  onSetAlign,
  onToggleBold,
  onToggleItalic,
  onFormatTable,
  onClearSelectedCells,
  onOpenVisualModal,
  onAiEditTable,
  isAiLoading = false
}) => {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dynamically adjusted coordinate ensuring menu never bleeds outside right container boundary or into right panel
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
    const menuWidth = menuRef.current.offsetWidth || 365;
    const menuHeight = menuRef.current.offsetHeight || 38;

    const safeRightMargin = 24;
    const safeLeftMargin = 12;
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

  // Window/container resize observer for real-time safety during panel dragging/resizing
  useEffect(() => {
    if (!menuRef.current) return;
    const parent = menuRef.current.parentElement;
    if (!parent) return;

    const handleResize = () => {
      if (!menuRef.current || !parent) return;
      const parentWidth = parent.clientWidth;
      const menuWidth = menuRef.current.offsetWidth || 365;
      const safeRightMargin = 24;
      const safeLeftMargin = 12;
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

  const currentColAlign = tableInfo.alignments[tableInfo.cursorColIndex] || 'left';
  const isHeaderRow = tableInfo.isHeader;
  const isSeparatorRow = tableInfo.isSeparator;

  // Check active bold / italic state for the current cell
  const currentCellText = (
    isHeaderRow
      ? tableInfo.headers[tableInfo.cursorColIndex]
      : !isSeparatorRow
      ? tableInfo.rows[tableInfo.cursorRowIndex - 2]?.[tableInfo.cursorColIndex]
      : ''
  )?.trim() || '';

  const isCellBold =
    (currentCellText.startsWith('**') && currentCellText.endsWith('**') && currentCellText.length >= 4) ||
    (currentCellText.startsWith('***') && currentCellText.endsWith('***') && currentCellText.length >= 6);

  const isCellItalic =
    (currentCellText.startsWith('***') && currentCellText.endsWith('***') && currentCellText.length >= 6) ||
    (currentCellText.startsWith('*') && currentCellText.endsWith('*') && currentCellText.length >= 2 && !currentCellText.startsWith('**')) ||
    (currentCellText.startsWith('_') && currentCellText.endsWith('_') && currentCellText.length >= 2);

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
      const success = await onAiEditTable(aiPrompt.trim());
      if (success !== false) {
        setAiPrompt('');
        setIsAiOpen(false);
      }
    } catch (err: any) {
      setAiError(err?.message || 'AI 표 가공 중 오류가 발생했습니다.');
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
      id="table-floating-bubble-menu"
      ref={menuRef}
      style={{
        top: `${adjustedStyle.top}px`,
        left: `${adjustedStyle.left}px`,
      }}
      onMouseDown={(e) => {
        // Prevent textarea blur unless interacting with text input
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
      className="absolute z-50 flex flex-col bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-white/[0.08] rounded-xl p-1.5 text-xs text-[var(--text-main)] select-none shadow-2xl animate-in fade-in duration-100 max-w-[calc(100%-24px)] season-shell"
    >
      {/* 1. Primary Compact Toolbar Row */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {/* Alignment Controls (Left, Center, Right) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onSetAlign('left')}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition cursor-pointer ${
              currentColAlign === 'left'
                ? 'bg-white/[0.1] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06]'
            }`}
            title="현재 열 왼쪽 정렬"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSetAlign('center')}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition cursor-pointer ${
              currentColAlign === 'center'
                ? 'bg-white/[0.1] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06]'
            }`}
            title="현재 열 가운데 정렬"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSetAlign('right')}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition cursor-pointer ${
              currentColAlign === 'right'
                ? 'bg-white/[0.1] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06]'
            }`}
            title="현재 열 오른쪽 정렬"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-white/[0.08] shrink-0" />

        {/* Text Style Controls (Bold, Italic) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onToggleBold}
            disabled={isSeparatorRow}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition cursor-pointer ${
              isSeparatorRow
                ? 'opacity-30 cursor-not-allowed text-[var(--text-tertiary)]'
                : isCellBold
                ? 'bg-white/[0.1] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06]'
            }`}
            title="굵게 서식 적용 또는 해제"
          >
            <Bold className="w-3.5 h-3.5 font-bold" />
          </button>
          <button
            type="button"
            onClick={onToggleItalic}
            disabled={isSeparatorRow}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition cursor-pointer ${
              isSeparatorRow
                ? 'opacity-30 cursor-not-allowed text-[var(--text-tertiary)]'
                : isCellItalic
                ? 'bg-white/[0.1] text-[var(--accent-primary)] italic font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06]'
            }`}
            title="기울임 서식 적용 또는 해제"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-white/[0.08] shrink-0" />

        {/* Row Operations (Insert Below, Delete Row) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onInsertRow('below')}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md transition cursor-pointer"
            title="아래에 행 삽입"
          >
            <div className="relative flex items-center justify-center">
              <Rows className="w-3.5 h-3.5 text-[var(--secondary-accent)]" />
              <Plus className="w-2 h-2 text-[var(--secondary-accent)] absolute -top-1 -right-1" />
            </div>
          </button>
          <button
            type="button"
            disabled={isHeaderRow || isSeparatorRow}
            onClick={onDeleteRow}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition cursor-pointer ${
              isHeaderRow || isSeparatorRow
                ? 'opacity-30 cursor-not-allowed text-[var(--text-tertiary)]'
                : 'hover:bg-rose-500/20 text-rose-400 hover:text-rose-300'
            }`}
            title={isHeaderRow || isSeparatorRow ? '헤더 및 구분선 행은 삭제할 수 없습니다' : '현재 행 삭제'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-white/[0.08] shrink-0" />

        {/* Column Operations (Insert Right, Delete Column) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onInsertCol('right')}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md transition cursor-pointer"
            title="오른쪽에 열 삽입"
          >
            <div className="relative flex items-center justify-center">
              <Columns className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <Plus className="w-2 h-2 text-[var(--accent-primary)] absolute -top-1 -right-1" />
            </div>
          </button>
          <button
            type="button"
            disabled={tableInfo.totalCols <= 1}
            onClick={onDeleteCol}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition cursor-pointer ${
              tableInfo.totalCols <= 1
                ? 'opacity-30 cursor-not-allowed text-[var(--text-tertiary)]'
                : 'hover:bg-rose-500/20 text-rose-400 hover:text-rose-300'
            }`}
            title={tableInfo.totalCols <= 1 ? '마지막 남은 열은 삭제할 수 없습니다' : '현재 열 삭제'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-white/[0.08] shrink-0" />

        {/* Clear Selected Cells */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onClearSelectedCells}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-amber-300 rounded-md transition cursor-pointer"
            title="선택한 셀 내용 지우기"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-white/[0.08] shrink-0" />

        {/* AI Table Edit Trigger (Icon only) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsAiOpen(!isAiOpen);
              setAiError(null);
            }}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition cursor-pointer border ${
              isAiOpen
                ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/40'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-[var(--accent-primary)] border-white/[0.08]'
            }`}
            title="AI 표 편집 및 요약 프롬프트"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Utilities: Auto Format & Visual Spreadsheet Editor */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onFormatTable}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md transition cursor-pointer"
            title="표 서식 자동 정렬"
          >
            <Wand2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenVisualModal}
            className="w-6 h-6 flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.1] hover:text-[var(--text-main)] text-[var(--accent-primary)] rounded-md transition cursor-pointer border border-white/[0.08]"
            title="스프레드시트 편집기 열기"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Inline Expandable AI Prompt Input */}
      {isAiOpen && (
        <div className="mt-1.5 pt-2 border-t border-white/[0.06] flex flex-col gap-1.5 w-80 text-xs animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-main)] px-0.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>AI 표 편집 및 요약</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAiOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-0.5 rounded-md hover:bg-white/[0.06]"
              title="닫기"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: '📊 데이터 요약', prompt: '이 표의 주요 데이터와 패턴을 분석하여 하단에 핵심 요약 행과 통계를 추가해줘.' },
              { label: '➕ 합계 및 평균 추가', prompt: '수치 데이터가 있는 각 열에 대해 표 맨 아래에 합계 및 평균 행을 계산하여 추가해줘.' },
              { label: '🔤 한국어 번역', prompt: '표 안의 모든 영문 텍스트를 자연스러운 비즈니스 한국어로 번역해줘.' },
              { label: '⚡ 정제 및 정렬', prompt: '데이터의 빈칸을 정리하고, 헤더와 서식을 깔끔하게 정제해줘.' }
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handlePresetClick(chip.prompt)}
                className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] hover:bg-white/[0.06] text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-white/[0.06] transition cursor-pointer whitespace-nowrap"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleAiSubmit} className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="표 수정 또는 요약 지시 입력..."
              disabled={isAiLoading}
              className="flex-1 bg-[var(--bg-surface)] border border-white/[0.08] focus:border-[var(--accent-primary)]/50 rounded-md px-2.5 py-1 text-xs text-[var(--text-main)] outline-none placeholder:text-[var(--text-tertiary)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAiLoading || !aiPrompt.trim()}
              className="px-2.5 py-1 bg-[#F1F5F9] hover:bg-white disabled:opacity-40 text-[#0F172A] rounded-md text-xs font-medium flex items-center gap-1 transition shrink-0 cursor-pointer"
            >
              {isAiLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-[#0F172A]" />
              ) : (
                <Sparkles className="w-3 h-3 text-[#0F172A]" />
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
