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
  Sparkles,
  CheckSquare,
  Merge
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
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);

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

  // Merge selected cells
  const handleMergeCells = () => {
    if (selectedCells.length < 2) return;

    // Sort selected cells to find the top-left-most cell (primary target)
    const sorted = [...selectedCells].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    const targetCell = sorted[0];
    const otherCells = sorted.slice(1);

    // Collect values from all selected cells
    const valuesToMerge: string[] = [];
    const targetVal = rows[targetCell.row]?.[targetCell.col] || '';
    if (targetVal.trim()) {
      valuesToMerge.push(targetVal.trim());
    }

    const nextRows = rows.map((row, rIdx) => {
      return row.map((cell, cIdx) => {
        const isOther = otherCells.some((c) => c.row === rIdx && c.col === cIdx);
        if (isOther) {
          if (cell.trim()) {
            valuesToMerge.push(cell.trim());
          }
          return ''; // empty merged cells
        }
        return cell;
      });
    });

    // Merge contents into the target cell
    const mergedValue = valuesToMerge.join(' ');
    if (nextRows[targetCell.row]) {
      nextRows[targetCell.row][targetCell.col] = mergedValue;
    }

    setRows(nextRows);
    setSelectedCells([]);
    setSelectMode(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-main)]/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[var(--bg-surface)] border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <TableIcon className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-main)]">표 편집기</h3>
              <p className="text-[0.6875rem] text-[var(--text-muted)]">
                스프레드시트처럼 셀 내용을 편집하고 행과 열을 구성할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md hover:bg-white/[0.06] transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 bg-[var(--bg-surface)]/70 border-b border-[var(--border-structural)] flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addRow('end')}
              className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.09] text-[var(--text-main)] rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer border border-[var(--border-structural)] hover:border-[var(--border-luminous)]"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>행 추가</span>
            </button>
            <button
              type="button"
              onClick={() => addColumn('end')}
              className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.09] text-[var(--text-main)] rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer border border-[var(--border-structural)] hover:border-[var(--border-luminous)]"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>열 추가</span>
            </button>

            {/* Divider */}
            <div className="w-[1px] h-4 bg-[var(--border-structural)] mx-1" />

            <button
              type="button"
              onClick={() => {
                setSelectMode(!selectMode);
                setSelectedCells([]);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer border ${
                selectMode
                  ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--border-luminous)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.09] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border-structural)] hover:border-[var(--border-luminous)]'
              }`}
              title="셀을 다중 선택하여 병합할 수 있는 모드를 켭니다"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>셀 선택 모드 {selectMode ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              disabled={selectedCells.length < 2}
              onClick={handleMergeCells}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer border ${
                selectedCells.length >= 2
                  ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--border-luminous)] hover:bg-[var(--accent-primary)]/25 hover:text-[var(--text-main)]'
                  : 'bg-white/[0.02] text-[var(--text-tertiary)] border-[var(--border-structural)] cursor-not-allowed opacity-60'
              }`}
              title="선택한 여러 셀의 내용을 하나로 병합합니다"
            >
              <Merge className="w-3.5 h-3.5" />
              <span>셀 병합 {selectedCells.length > 0 ? `(${selectedCells.length})` : ''}</span>
            </button>
          </div>

          <div className="text-[0.6875rem] text-[var(--text-muted)] font-mono">
            총 <span className="text-[var(--accent-primary)] font-bold">{headers.length}</span> 열 ×{' '}
            <span className="text-[var(--accent-primary)] font-bold">{rows.length}</span> 행
          </div>
        </div>

        {/* Table View Area */}
        <div className="flex-1 p-4 overflow-auto custom-scrollbar bg-[var(--bg-editor)]">
          <div className="inline-block min-w-full align-middle border border-[var(--border-structural)] rounded-md overflow-hidden shadow-inner bg-[var(--bg-surface)]">
            <table className="w-full border-collapse text-xs">
              {/* Table Head */}
              <thead>
                {/* Column Meta Row (Letters & Alignment & Col Delete) */}
                <tr className="bg-[var(--bg-editor)] border-b border-[var(--border-structural)] text-[0.625rem] text-[var(--text-muted)] select-none">
                  <th className="w-10 px-2 py-1 text-center font-mono border-r border-[var(--border-structural)] bg-[var(--bg-surface)]">
                    #
                  </th>
                  {headers.map((_, colIdx) => {
                    const align = alignments[colIdx] || 'left';
                    return (
                      <th
                        key={`col-meta-${colIdx}`}
                        className="px-2 py-1 text-center border-r border-[var(--border-structural)] font-mono font-bold"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[var(--text-muted)]">{getColLetter(colIdx)}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleColAlign(colIdx)}
                              className="p-0.5 hover:bg-white/[0.06] rounded-md text-[var(--accent-primary)] cursor-pointer"
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
                              className={`p-0.5 rounded-md cursor-pointer ${
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
                <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-luminous)]">
                  <th className="w-10 px-2 py-2 text-center text-[0.625rem] font-mono text-[var(--accent-primary)] font-bold border-r border-[var(--border-structural)] bg-[var(--bg-surface)]">
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
                      <th key={`head-${colIdx}`} className="p-1 border-r border-[var(--border-structural)]">
                        <input
                          type="text"
                          value={h}
                          onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                          placeholder={`헤더 ${colIdx + 1}`}
                          className={`w-full bg-[var(--bg-editor)] border border-[var(--border-structural)] focus:border-[var(--border-luminous)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 outline-none rounded-md px-2 py-1 text-xs font-semibold text-[var(--text-main)] placeholder-[var(--text-tertiary)] transition-colors ${alignClass}`}
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
                    className="border-b border-[var(--border-structural)] hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Row Index & Row Delete */}
                    <td className="w-10 px-1 py-1 text-center font-mono text-[0.625rem] text-[var(--text-tertiary)] border-r border-[var(--border-structural)] bg-[var(--bg-surface)]">
                      <div className="flex items-center justify-center gap-1">
                        <span className="group-hover:hidden">{rowIdx + 1}</span>
                        <button
                          type="button"
                          disabled={rows.length <= 1}
                          onClick={() => deleteRow(rowIdx)}
                          className={`hidden group-hover:flex p-0.5 rounded-md cursor-pointer ${
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

                      const isSelected = selectedCells.some((c) => c.row === rowIdx && c.col === colIdx);

                      return (
                        <td
                          key={`cell-${rowIdx}-${colIdx}`}
                          onClick={() => {
                            if (selectMode) {
                              const alreadySelected = selectedCells.some(
                                (c) => c.row === rowIdx && c.col === colIdx
                              );
                              if (alreadySelected) {
                                setSelectedCells(
                                  selectedCells.filter(
                                    (c) => !(c.row === rowIdx && c.col === colIdx)
                                  )
                                );
                              } else {
                                setSelectedCells([...selectedCells, { row: rowIdx, col: colIdx }]);
                              }
                            }
                          }}
                          className={`p-1 border-r border-[var(--border-structural)] transition-all duration-150 ${
                            selectMode
                              ? 'cursor-pointer select-none hover:bg-[var(--accent-primary)]/10'
                              : ''
                          } ${
                            isSelected
                              ? 'bg-[var(--accent-primary)]/15 border-[var(--border-luminous)] ring-1 ring-[var(--accent-primary)]/50 ring-inset'
                              : ''
                          }`}
                        >
                          {selectMode ? (
                            <div
                              className={`w-full px-2 py-1 text-xs select-none min-h-[26px] flex items-center justify-${
                                align === 'center'
                                  ? 'center'
                                  : align === 'right'
                                  ? 'end'
                                  : 'start'
                              } ${isSelected ? 'text-[var(--text-main)] font-medium' : 'text-[var(--text-muted)]'}`}
                            >
                              {row[colIdx] || (
                                <span className="opacity-40 italic text-[11px] text-[var(--text-tertiary)]">빈 칸</span>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={row[colIdx] || ''}
                              onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                              placeholder="내용 입력..."
                              className={`w-full bg-transparent hover:bg-white/[0.03] focus:bg-[var(--bg-editor)] border border-transparent focus:border-[var(--border-luminous)] outline-none rounded-md px-2 py-1 text-xs text-[var(--text-main)] placeholder-[var(--text-tertiary)] transition-colors ${alignClass}`}
                            />
                          )}
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
        <div className="px-4 py-3 bg-[var(--bg-surface)] border-t border-[var(--border-structural)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>반영 시 열 너비와 파이프가 자동으로 깔끔하게 정렬됩니다.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md text-xs font-medium transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#F1F5F9] hover:bg-white text-[#0F172A] rounded-md text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
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
