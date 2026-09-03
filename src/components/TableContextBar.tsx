import React from 'react';
import {
  Table,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Edit3,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { MarkdownTableInfo } from '../utils/markdownTableHelper';

interface TableContextBarProps {
  tableInfo: MarkdownTableInfo;
  onInsertRow: (position: 'above' | 'below') => void;
  onDeleteRow: () => void;
  onInsertCol: (position: 'left' | 'right') => void;
  onDeleteCol: () => void;
  onSetAlign: (align: 'left' | 'center' | 'right') => void;
  onFormatTable: () => void;
  onOpenVisualModal: () => void;
}

export const TableContextBar: React.FC<TableContextBarProps> = ({
  tableInfo,
  onInsertRow,
  onDeleteRow,
  onInsertCol,
  onDeleteCol,
  onSetAlign,
  onFormatTable,
  onOpenVisualModal,
}) => {
  const currentColAlign = tableInfo.alignments[tableInfo.cursorColIndex] || 'left';
  const isHeaderRow = tableInfo.isHeader;
  const isSeparatorRow = tableInfo.isSeparator;
  const rowLabel = isHeaderRow
    ? '헤더'
    : isSeparatorRow
    ? '구분선'
    : `${tableInfo.cursorRowIndex - 1}행`;

  return (
    <div
      id="table-context-toolbar"
      className="shrink-0 flex items-center justify-between px-2.5 py-1 bg-[#1a1b24] border-b border-[#2e3142] text-xs text-slate-200 select-none overflow-x-auto scrollbar-none z-10 animate-in fade-in slide-in-from-top-1 duration-150"
    >
      {/* Left: Table Status Badge & Row Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Badge */}
        <div className="flex items-center gap-1.5 bg-[#6366f1]/15 text-indigo-300 border border-[#6366f1]/35 px-2 py-0.5 rounded text-[0.6875rem] font-mono whitespace-nowrap">
          <Table className="w-3 h-3 text-[#6366f1]" />
          <span className="text-white font-medium">{rowLabel}</span>
          <span className="opacity-50">·</span>
          <span className="text-white font-medium">{tableInfo.cursorColIndex + 1}열</span>
          <span className="text-[0.625rem] text-indigo-300/70 font-mono">
            ({tableInfo.totalCols}×{tableInfo.totalRows})
          </span>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142]" />

        {/* Row Operations */}
        <div className="flex items-center gap-1 bg-[#20222e] border border-[#2e3142] rounded px-1.5 py-0.5">
          <span className="text-[0.625rem] text-slate-400 font-medium mr-0.5">행</span>
          <button
            type="button"
            onClick={() => onInsertRow('below')}
            className="px-1.5 py-0.5 hover:bg-[#6366f1] hover:text-white rounded text-[0.6875rem] font-medium text-slate-300 transition flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            title="현재 위치 아래에 새 행 삽입 (마지막 셀에서 Tab)"
          >
            <ChevronDown className="w-3 h-3 text-indigo-400" />
            <span>+아래</span>
          </button>
          <button
            type="button"
            onClick={() => onInsertRow('above')}
            className="px-1.5 py-0.5 hover:bg-[#6366f1] hover:text-white rounded text-[0.6875rem] font-medium text-slate-300 transition flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            title="현재 위치 위에 새 행 삽입"
          >
            <ChevronUp className="w-3 h-3 text-indigo-400" />
            <span>+위</span>
          </button>
          <button
            type="button"
            disabled={isHeaderRow || isSeparatorRow}
            onClick={onDeleteRow}
            className={`p-1 rounded transition flex items-center cursor-pointer ${
              isHeaderRow || isSeparatorRow
                ? 'opacity-30 cursor-not-allowed text-slate-500'
                : 'hover:bg-rose-500/80 text-rose-400 hover:text-white'
            }`}
            title={isHeaderRow || isSeparatorRow ? '헤더/구분선은 삭제할 수 없습니다' : '현재 행 삭제'}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142]" />

        {/* Column Operations */}
        <div className="flex items-center gap-1 bg-[#20222e] border border-[#2e3142] rounded px-1.5 py-0.5">
          <span className="text-[0.625rem] text-slate-400 font-medium mr-0.5">열</span>
          <button
            type="button"
            onClick={() => onInsertCol('right')}
            className="px-1.5 py-0.5 hover:bg-[#6366f1] hover:text-white rounded text-[0.6875rem] font-medium text-slate-300 transition flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            title="현재 위치 오른쪽에 새 열 삽입"
          >
            <ArrowRight className="w-3 h-3 text-indigo-400" />
            <span>+우측</span>
          </button>
          <button
            type="button"
            onClick={() => onInsertCol('left')}
            className="px-1.5 py-0.5 hover:bg-[#6366f1] hover:text-white rounded text-[0.6875rem] font-medium text-slate-300 transition flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            title="현재 위치 왼쪽에 새 열 삽입"
          >
            <ArrowLeft className="w-3 h-3 text-indigo-400" />
            <span>+좌측</span>
          </button>
          <button
            type="button"
            disabled={tableInfo.totalCols <= 1}
            onClick={onDeleteCol}
            className={`p-1 rounded transition flex items-center cursor-pointer ${
              tableInfo.totalCols <= 1
                ? 'opacity-30 cursor-not-allowed text-slate-500'
                : 'hover:bg-rose-500/80 text-rose-400 hover:text-white'
            }`}
            title={tableInfo.totalCols <= 1 ? '마지막 남은 열은 삭제할 수 없습니다' : '현재 열 삭제'}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-3.5 bg-[#2e3142]" />

        {/* Column Alignment */}
        <div className="flex items-center gap-0.5 bg-[#20222e] border border-[#2e3142] rounded p-0.5">
          <button
            type="button"
            onClick={() => onSetAlign('left')}
            className={`p-1 rounded text-xs transition cursor-pointer ${
              currentColAlign === 'left'
                ? 'bg-[#6366f1] text-white'
                : 'text-slate-400 hover:text-white hover:bg-[#282a38]'
            }`}
            title="현재 열 왼쪽 정렬 (:---)"
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onSetAlign('center')}
            className={`p-1 rounded text-xs transition cursor-pointer ${
              currentColAlign === 'center'
                ? 'bg-[#6366f1] text-white'
                : 'text-slate-400 hover:text-white hover:bg-[#282a38]'
            }`}
            title="현재 열 가운데 정렬 (:---:)"
          >
            <AlignCenter className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onSetAlign('right')}
            className={`p-1 rounded text-xs transition cursor-pointer ${
              currentColAlign === 'right'
                ? 'bg-[#6366f1] text-white'
                : 'text-slate-400 hover:text-white hover:bg-[#282a38]'
            }`}
            title="현재 열 오른쪽 정렬 (---:)"
          >
            <AlignRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right: Quick Tools */}
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {/* Prettify / 줄 맞춤 */}
        <button
          type="button"
          onClick={onFormatTable}
          className="px-2 py-1 bg-[#20222e] hover:bg-[#282a38] text-slate-300 hover:text-white border border-[#2e3142] rounded text-[0.6875rem] font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          title="표의 모든 열 너비와 파이프(|)를 칼각으로 자동 정렬합니다"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>자동 정렬</span>
        </button>

        {/* Visual Spreadsheet Modal */}
        <button
          type="button"
          onClick={onOpenVisualModal}
          className="px-2.5 py-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded text-[0.6875rem] font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          title="엑셀/스프레드시트 형식으로 표를 시각적으로 편집합니다"
        >
          <Edit3 className="w-3 h-3" />
          <span>스프레드시트</span>
        </button>
      </div>
    </div>
  );
};
