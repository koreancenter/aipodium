import React, { useState } from 'react';
import {
  X,
  Table as TableIcon,
  Plus,
  Trash2,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowDown,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { MarkdownTableInfo, formatMarkdownTable } from '../utils/markdownTableHelper';

interface VisualTableModalProps {
  tableInfo: MarkdownTableInfo;
  onApply: (newTableMarkdown: string) => void;
  onClose: () => void;
}

export const VisualTableModal: React.FC<VisualTableModalProps> = ({
  tableInfo,
  onApply,
  onClose,
}) => {
  const [headers, setHeaders] = useState<string[]>([...tableInfo.headers]);
  const [alignments, setAlignments] = useState<('left' | 'center' | 'right')[]>([
    ...tableInfo.alignments,
  ]);
  const [rows, setRows] = useState<string[][]>(
    tableInfo.rows.map((r) => [...r])
  );

  // Column letters (A, B, C, ...)
  const getColLetter = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  // Header update
  const handleHeaderChange = (colIdx: number, val: string) => {
    const next = [...headers];
    next[colIdx] = val;
    setHeaders(next);
  };

  // Cell update
  const handleCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const next = rows.map((r, rI) => {
      if (rI !== rowIdx) return r;
      const nextR = [...r];
      nextR[colIdx] = val;
      return nextR;
    });
    setRows(next);
  };

  // Column alignment toggle
  const toggleColAlign = (colIdx: number) => {
    const next = [...alignments];
    const current = next[colIdx] || 'left';
    if (current === 'left') next[colIdx] = 'center';
    else if (current === 'center') next[colIdx] = 'right';
    else next[colIdx] = 'left';
    setAlignments(next);
  };

  // Add row
  const addRow = (position: 'end' | number) => {
    const newRow = new Array(headers.length).fill('');
    if (position === 'end') {
      setRows([...rows, newRow]);
    } else {
      const next = [...rows];
      next.splice(position + 1, 0, newRow);
      setRows(next);
    }
  };

  // Delete row
  const deleteRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    const next = rows.filter((_, i) => i !== rowIdx);
    setRows(next);
  };

  // Add column
  const addColumn = (position: 'end' | number) => {
    const insertIdx = position === 'end' ? headers.length : position + 1;
    const nextHeaders = [...headers];
    nextHeaders.splice(insertIdx, 0, `열 ${insertIdx + 1}`);
    setHeaders(nextHeaders);

    const nextAlign = [...alignments];
    nextAlign.splice(insertIdx, 0, 'left');
    setAlignments(nextAlign);

    const nextRows = rows.map((row) => {
      const nextR = [...row];
      nextR.splice(insertIdx, 0, '');
      return nextR;
    });
    setRows(nextRows);
  };

  // Delete column
  const deleteColumn = (colIdx: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, i) => i !== colIdx));
    setAlignments(alignments.filter((_, i) => i !== colIdx));
    setRows(rows.map((row) => row.filter((_, i) => i !== colIdx)));
  };

  // Apply to document
  const handleSave = () => {
    const formatted = formatMarkdownTable(headers, alignments, rows);
    onApply(formatted);
    onClose();
  };

  return (
    <div
      id="visual-table-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1b24] border border-[#2e3142] rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#1e202b] border-b border-[#2e3142] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center">
              <TableIcon className="w-4 h-4 text-[#6366f1]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">표 편집기</h3>
              <p className="text-[0.6875rem] text-slate-400">
                스프레드시트처럼 셀 내용을 편집하고 행과 열을 구성할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-[#282a38] transition cursor-pointer"
              title="닫기 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 bg-[#16171e] border-b border-[#2e3142] flex items-center justify-between text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addRow('end')}
              className="px-2.5 py-1 bg-[#282a38] hover:bg-[#6366f1] hover:text-white rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer border border-[#2e3142]"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>행 추가</span>
            </button>
            <button
              type="button"
              onClick={() => addColumn('end')}
              className="px-2.5 py-1 bg-[#282a38] hover:bg-[#6366f1] hover:text-white rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer border border-[#2e3142]"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>열 추가</span>
            </button>
          </div>

          <div className="text-[0.6875rem] text-slate-400 font-mono">
            총 <span className="text-indigo-300 font-bold">{headers.length}</span> 열 ×{' '}
            <span className="text-indigo-300 font-bold">{rows.length}</span> 행
          </div>
        </div>

        {/* Table View Area */}
        <div className="flex-1 p-4 overflow-auto custom-scrollbar bg-[#121318]">
          <div className="inline-block min-w-full align-middle border border-[#2e3142] rounded-lg overflow-hidden shadow-inner bg-[#16171e]">
            <table className="w-full border-collapse text-xs">
              {/* Table Head */}
              <thead>
                {/* Column Meta Row (Letters & Alignment & Col Delete) */}
                <tr className="bg-[#1a1b24] border-b border-[#2e3142] text-[0.625rem] text-slate-400 select-none">
                  <th className="w-10 px-2 py-1 text-center font-mono border-r border-[#2e3142] bg-[#14151c]">
                    #
                  </th>
                  {headers.map((_, colIdx) => {
                    const align = alignments[colIdx] || 'left';
                    return (
                      <th
                        key={`col-meta-${colIdx}`}
                        className="px-2 py-1 text-center border-r border-[#2e3142] font-mono font-bold"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-slate-300">{getColLetter(colIdx)}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleColAlign(colIdx)}
                              className="p-0.5 hover:bg-[#282a38] rounded text-indigo-300 cursor-pointer"
                              title={`정렬 변경 (현재: ${align === 'center' ? '가운데' : align === 'right' ? '오른쪽' : '왼쪽'})`}
                            >
                              {align === 'center' ? (
                                <AlignCenter className="w-2.5 h-2.5" />
                              ) : align === 'right' ? (
                                <AlignRight className="w-2.5 h-2.5" />
                              ) : (
                                <AlignLeft className="w-2.5 h-2.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={headers.length <= 1}
                              onClick={() => deleteColumn(colIdx)}
                              className={`p-0.5 rounded cursor-pointer ${
                                headers.length <= 1
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'hover:bg-rose-500/30 text-rose-400'
                              }`}
                              title="열 삭제"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>

                {/* Actual Header Inputs */}
                <tr className="bg-[#1e202b] border-b-2 border-[#6366f1]/40">
                  <th className="w-10 px-2 py-2 text-center text-[0.625rem] font-mono text-indigo-400 font-bold border-r border-[#2e3142] bg-[#14151c]">
                    헤더
                  </th>
                  {headers.map((h, colIdx) => {
                    const align = alignments[colIdx] || 'left';
                    const alignClass =
                      align === 'center'
                        ? 'text-center'
                        : align === 'right'
                        ? 'text-right'
                        : 'text-left';
                    return (
                      <th key={`head-${colIdx}`} className="p-1 border-r border-[#2e3142]">
                        <input
                          type="text"
                          value={h}
                          onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                          placeholder={`헤더 ${colIdx + 1}`}
                          className={`w-full bg-[#121318] border border-[#2e3142] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] rounded px-2 py-1 text-xs font-semibold text-indigo-200 ${alignClass}`}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr
                    key={`row-${rowIdx}`}
                    className="border-b border-[#2e3142]/60 hover:bg-[#1e202b]/40 transition-colors group"
                  >
                    {/* Row Index & Row Delete */}
                    <td className="w-10 px-1 py-1 text-center font-mono text-[0.625rem] text-slate-500 border-r border-[#2e3142] bg-[#14151c]">
                      <div className="flex items-center justify-center gap-1">
                        <span className="group-hover:hidden">{rowIdx + 1}</span>
                        <button
                          type="button"
                          disabled={rows.length <= 1}
                          onClick={() => deleteRow(rowIdx)}
                          className={`hidden group-hover:flex p-0.5 rounded cursor-pointer ${
                            rows.length <= 1
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-rose-500/30 text-rose-400'
                          }`}
                          title="행 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Cell Inputs */}
                    {headers.map((_, colIdx) => {
                      const align = alignments[colIdx] || 'left';
                      const alignClass =
                        align === 'center'
                          ? 'text-center'
                          : align === 'right'
                          ? 'text-right'
                          : 'text-left';
                      return (
                        <td key={`cell-${rowIdx}-${colIdx}`} className="p-1 border-r border-[#2e3142]">
                          <input
                            type="text"
                            value={row[colIdx] || ''}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            placeholder="내용 입력..."
                            className={`w-full bg-transparent hover:bg-[#1e202b]/50 focus:bg-[#121318] border border-transparent focus:border-[#6366f1] rounded px-2 py-1 text-xs text-slate-200 ${alignClass}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#1e202b] border-t border-[#2e3142] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>반영 시 열 너비와 파이프가 자동으로 깔끔하게 정렬됩니다.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#282a38] hover:bg-[#323648] text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              <span>본문에 반영</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
