import React, { useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Table, Plus, ArrowRight, X } from 'lucide-react';

interface TableGridPickerProps {
  onInsertTable: (rows: number, cols: number) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const MAX_GRID_ROWS = 8;
const MAX_GRID_COLS = 8;

export const TableGridPicker: React.FC<TableGridPickerProps> = ({
  onInsertTable,
  onClose,
  anchorRef,
}) => {
  const [hoverRows, setHoverRows] = useState(3);
  const [hoverCols, setHoverCols] = useState(3);
  const [customRows, setCustomRows] = useState(4);
  const [customCols, setCustomCols] = useState(4);

  const presets = [
    { name: '기본표', size: '3 × 3', rows: 3, cols: 3 },
    { name: '비교표', size: '2 × 2', rows: 2, cols: 2 },
    { name: '데이터표', size: '4 × 4', rows: 4, cols: 4 },
    { name: '계획/일정', size: '5 × 3', rows: 5, cols: 3 },
  ];

  // Compute position relative to trigger button
  const getCoords = () => {
    if (anchorRef?.current && typeof window !== 'undefined') {
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverWidth = 288; // w-72 = 288px
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - popoverWidth - 12);
      }
      return {
        top: rect.bottom + 6,
        left: Math.max(12, left),
      };
    }
    return { top: 60, left: 100 };
  };

  const [coords, setCoords] = useState(getCoords);

  useLayoutEffect(() => {
    const updatePosition = () => {
      setCoords(getCoords());
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const content = (
    <div className="fixed inset-0 z-[99999] pointer-events-auto">
      {/* Invisible backdrop to capture outside clicks and close popover */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[1px] cursor-default transition-opacity"
        onClick={onClose}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      />

      {/* Popover */}
      <div
        id="table-grid-picker-popover"
        style={{
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
        }}
        className="w-72 bg-[#1e202b] backdrop-blur-xl border border-[#2e3142] rounded-xl shadow-2xl z-[100000] p-3 text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2e3142]">
          <div className="flex items-center gap-1.5 font-semibold text-slate-100 whitespace-nowrap">
            <Table className="w-3.5 h-3.5 text-[#6366f1]" />
            <span>표 삽입</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap font-mono text-[0.6875rem] text-[#818cf8] font-bold bg-[#6366f1]/15 px-2 py-0.5 rounded border border-[#6366f1]/30">
              {hoverCols}열 × {hoverRows}행
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-[#282a38] transition cursor-pointer"
              title="닫기 (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Interactive Hover Grid */}
        <div className="flex flex-col items-center justify-center p-2 bg-[#121318]/70 border border-[#2e3142]/60 rounded-lg mb-2.5">
          <div className="grid grid-cols-8 gap-1 select-none">
            {Array.from({ length: MAX_GRID_ROWS }).map((_, rIdx) => {
              const r = rIdx + 1;
              return (
                <div key={`row-${r}`} className="contents">
                  {Array.from({ length: MAX_GRID_COLS }).map((_, cIdx) => {
                    const c = cIdx + 1;
                    const isHighlighted = r <= hoverRows && c <= hoverCols;
                    return (
                      <button
                        key={`cell-${r}-${c}`}
                        type="button"
                        onMouseEnter={() => {
                          setHoverRows(r);
                          setHoverCols(c);
                        }}
                        onClick={() => {
                          onInsertTable(r, c);
                          onClose();
                        }}
                        className={`w-5 h-5 rounded-xs transition-colors cursor-pointer border ${
                          isHighlighted
                            ? 'bg-[#6366f1] border-indigo-400/80 shadow-xs'
                            : 'bg-[#282a38]/60 border-[#383b4e] hover:bg-[#323648]'
                        }`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 text-[0.625rem] text-slate-300 font-mono text-center">
            크기: <span className="text-indigo-400 font-bold">{hoverCols}열 × {hoverRows}행</span> (클릭하여 삽입)
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-2.5">
          <div className="text-[0.625rem] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            빠른 프리셋
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  onInsertTable(p.rows, p.cols);
                  onClose();
                }}
                className="px-2.5 py-1.5 bg-[#282a38]/80 hover:bg-[#6366f1] hover:text-white text-slate-300 rounded-lg text-[0.6875rem] font-medium transition flex items-center justify-between text-left cursor-pointer border border-[#2e3142] hover:border-indigo-400/60"
              >
                <span>{p.name}</span>
                <span className="font-mono text-[0.625rem] text-indigo-300/80 bg-[#1e202b] px-1.5 py-0.5 rounded border border-[#2e3142]">
                  {p.size}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Rows / Cols Input */}
        <div className="pt-2 border-t border-[#2e3142] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[0.6875rem]">
            <span className="text-slate-400">열:</span>
            <input
              type="number"
              min={1}
              max={12}
              value={customCols}
              onChange={(e) => setCustomCols(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-10 bg-[#121318] border border-[#2e3142] rounded px-1 py-0.5 text-center font-mono text-xs text-white focus:outline-none focus:border-[#6366f1]"
            />
            <span className="text-slate-400 ml-1">행:</span>
            <input
              type="number"
              min={1}
              max={30}
              value={customRows}
              onChange={(e) => setCustomRows(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-10 bg-[#121318] border border-[#2e3142] rounded px-1 py-0.5 text-center font-mono text-xs text-white focus:outline-none focus:border-[#6366f1]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onInsertTable(customRows, customCols);
              onClose();
            }}
            className="px-2.5 py-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-md text-[0.6875rem] font-semibold transition flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <span>생성</span>
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
