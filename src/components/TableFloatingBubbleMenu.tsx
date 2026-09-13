import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
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

  const currentColAlign = tableInfo.alignments[tableInfo.cursorColIndex] || 'left';
  const isHeaderRow = tableInfo.isHeader;
  const isSeparatorRow = tableInfo.isSeparator;

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
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
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
      {/* 1. Primary Compact Toolbar Row */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {/* Alignment Controls (Left, Center, Right) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onSetAlign('left')}
            className={`w-6 h-6 flex items-center justify-center rounded transition cursor-pointer ${
              currentColAlign === 'left'
                ? 'bg-[#6366f1] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#282a38]'
            }`}
            title="현재 열 왼쪽 정렬 (:---)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSetAlign('center')}
            className={`w-6 h-6 flex items-center justify-center rounded transition cursor-pointer ${
              currentColAlign === 'center'
                ? 'bg-[#6366f1] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#282a38]'
            }`}
            title="현재 열 가운데 정렬 (:---:)"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSetAlign('right')}
            className={`w-6 h-6 flex items-center justify-center rounded transition cursor-pointer ${
              currentColAlign === 'right'
                ? 'bg-[#6366f1] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#282a38]'
            }`}
            title="현재 열 오른쪽 정렬 (---:)"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142] shrink-0" />

        {/* Row Operations (Insert Below, Delete Row) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onInsertRow('below')}
            className="w-6 h-6 flex items-center justify-center hover:bg-[#282a38] text-slate-300 hover:text-white rounded transition cursor-pointer"
            title="아래에 행 삽입 (+행)"
          >
            <div className="relative flex items-center justify-center">
              <Rows className="w-3.5 h-3.5 text-indigo-400" />
              <Plus className="w-2 h-2 text-indigo-300 absolute -top-1 -right-1" />
            </div>
          </button>
          <button
            type="button"
            disabled={isHeaderRow || isSeparatorRow}
            onClick={onDeleteRow}
            className={`w-6 h-6 flex items-center justify-center rounded transition cursor-pointer ${
              isHeaderRow || isSeparatorRow
                ? 'opacity-30 cursor-not-allowed text-slate-500'
                : 'hover:bg-rose-500/80 text-rose-400 hover:text-white'
            }`}
            title={isHeaderRow || isSeparatorRow ? '헤더/구분선은 삭제할 수 없습니다' : '현재 행 삭제 (Delete Row)'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142] shrink-0" />

        {/* Column Operations (Insert Right, Delete Column) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onInsertCol('right')}
            className="w-6 h-6 flex items-center justify-center hover:bg-[#282a38] text-slate-300 hover:text-white rounded transition cursor-pointer"
            title="오른쪽에 열 삽입 (+열)"
          >
            <div className="relative flex items-center justify-center">
              <Columns className="w-3.5 h-3.5 text-sky-400" />
              <Plus className="w-2 h-2 text-sky-300 absolute -top-1 -right-1" />
            </div>
          </button>
          <button
            type="button"
            disabled={tableInfo.totalCols <= 1}
            onClick={onDeleteCol}
            className={`w-6 h-6 flex items-center justify-center rounded transition cursor-pointer ${
              tableInfo.totalCols <= 1
                ? 'opacity-30 cursor-not-allowed text-slate-500'
                : 'hover:bg-rose-500/80 text-rose-400 hover:text-white'
            }`}
            title={tableInfo.totalCols <= 1 ? '마지막 남은 열은 삭제할 수 없습니다' : '현재 열 삭제 (Delete Column)'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142] shrink-0" />

        {/* Clear Selected Cells */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onClearSelectedCells}
            className="w-6 h-6 flex items-center justify-center hover:bg-[#282a38] text-amber-400 hover:text-amber-300 rounded transition cursor-pointer"
            title="선택한 셀 내용 비우기 (Clear Selected Cells)"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142] shrink-0" />

        {/* AI Table Edit Trigger (Icon only) */}
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
            title="AI 표 편집 / 요약 프롬프트 (✨)"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Utilities: Auto Format & Visual Spreadsheet Editor */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onFormatTable}
            className="w-6 h-6 flex items-center justify-center hover:bg-[#282a38] text-slate-400 hover:text-white rounded transition cursor-pointer"
            title="자동 정렬 (표 열 너비 및 파이프 정렬)"
          >
            <Wand2 className="w-3.5 h-3.5 hover:text-amber-300" />
          </button>
          <button
            type="button"
            onClick={onOpenVisualModal}
            className="w-6 h-6 flex items-center justify-center bg-[#6366f1]/15 hover:bg-[#6366f1] hover:text-white text-indigo-300 rounded transition cursor-pointer border border-[#6366f1]/30"
            title="시트 편집기 (스프레드시트 모달)"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Inline Expandable AI Prompt Input */}
      {isAiOpen && (
        <div className="mt-1.5 pt-1.5 border-t border-[#2e3142] flex flex-col gap-1.5 w-80 text-xs animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300 px-0.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>AI 표 편집 & 요약</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAiOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-[#282a38]"
              title="닫기"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: '📊 데이터 요약', prompt: '이 표의 주요 데이터와 패턴을 분석하여 하단에 핵심 요약 행과 통계를 추가해줘.' },
              { label: '➕ 합계/평균 추가', prompt: '수치 데이터가 있는 각 열에 대해 표 맨 아래에 합계(Total) 및 평균(Average) 행을 계산하여 추가해줘.' },
              { label: '🔤 한국어 번역', prompt: '표 안의 모든 영문 텍스트를 자연스러운 비즈니스 한국어로 번역해줘.' },
              { label: '⚡ 정제 & 정렬', prompt: '데이터의 빈칸을 정리하고, 헤더와 서식을 깔끔하게 정제해줘.' }
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
              placeholder="표 수정 또는 요약 지시 입력..."
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
