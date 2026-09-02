import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  BarChart2,
  TrendingUp,
  Sparkles,
  Calculator,
  FileSpreadsheet,
  ArrowUpDown,
  Filter,
  Check,
  X
} from 'lucide-react';

export interface SpreadsheetData {
  title?: string;
  columns: string[];
  rows: (string | number)[][];
  showChart?: boolean;
  chartType?: 'bar' | 'line' | 'pie';
}

export interface InlineSpreadsheetBlockProps {
  initialData: SpreadsheetData;
  onChangeData?: (newData: SpreadsheetData) => void;
  onVibeAnalyze?: (data: SpreadsheetData, prompt: string) => void;
  readOnly?: boolean;
  isDarkTheme?: boolean;
}

// Column letter converter (0 -> A, 1 -> B, etc.)
export function colIndexToLetter(idx: number): string {
  let letter = '';
  let temp = idx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function letterToColIndex(letter: string): number {
  let idx = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    idx = idx * 26 + (upper.charCodeAt(i) - 64);
  }
  return idx - 1;
}

export const InlineSpreadsheetBlock: React.FC<InlineSpreadsheetBlockProps> = ({
  initialData,
  onChangeData,
  onVibeAnalyze,
  readOnly = false,
  isDarkTheme = true
}) => {
  const [data, setData] = useState<SpreadsheetData>(() => ({
    title: initialData.title || '스마트 스프레드시트 (Smart Sheet)',
    columns: initialData.columns?.length ? initialData.columns : ['구분', '2024 실적', '2025 전망', '2027 (E)', '2030 (E)', '성장률(%)'],
    rows: initialData.rows?.length
      ? initialData.rows
      : [
          ['매출액 (억원)', 120, 185, 450, 1200, '=E1/B1*100'],
          ['영업이익 (억원)', 18, 32, 95, 310, '=E2/B2*100'],
          ['R&D 투자 (억원)', 25, 40, 90, 220, '=E3/B3*100'],
          ['고객사 수 (개)', 45, 80, 210, 650, '=E4/B4*100']
        ],
    showChart: initialData.showChart !== undefined ? initialData.showChart : true,
    chartType: initialData.chartType || 'bar'
  }));

  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [isChartOpen, setIsChartOpen] = useState<boolean>(data.showChart ?? true);
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'line' | 'pie'>(data.chartType || 'bar');
  const [isVibePromptOpen, setIsVibePromptOpen] = useState<boolean>(false);
  const [vibePromptText, setVibePromptText] = useState<string>('2030년까지 연평균 성장률(CAGR) 및 추이를 분석하고 예측 행을 보강해 줘');

  // Keep local data in sync if initialData changes drastically
  useEffect(() => {
    if (initialData && initialData.columns) {
      setData({
        title: initialData.title || '스마트 스프레드시트 (Smart Sheet)',
        columns: initialData.columns,
        rows: initialData.rows || [],
        showChart: initialData.showChart ?? true,
        chartType: initialData.chartType || 'bar'
      });
    }
  }, [initialData]);

  // Evaluate single cell or formula
  const evaluateCell = (
    rawVal: string | number,
    r: number,
    c: number,
    rowsMatrix: (string | number)[][]
  ): string | number => {
    if (typeof rawVal === 'number') return rawVal;
    if (!rawVal || typeof rawVal !== 'string') return '';
    const trimmed = rawVal.trim();
    if (!trimmed.startsWith('=')) return rawVal;

    const formula = trimmed.substring(1).toUpperCase();

    try {
      // SUM(A1:A5) or SUM(B1:E1)
      const sumMatch = formula.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
      if (sumMatch) {
        const startC = letterToColIndex(sumMatch[1]);
        const startR = parseInt(sumMatch[2], 10) - 1;
        const endC = letterToColIndex(sumMatch[3]);
        const endR = parseInt(sumMatch[4], 10) - 1;

        let total = 0;
        for (let ri = Math.min(startR, endR); ri <= Math.max(startR, endR); ri++) {
          for (let ci = Math.min(startC, endC); ci <= Math.max(startC, endC); ci++) {
            if (rowsMatrix[ri] && rowsMatrix[ri][ci] !== undefined) {
              const v = rowsMatrix[ri][ci];
              const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
              if (!isNaN(num)) total += num;
            }
          }
        }
        return Math.round(total * 100) / 100;
      }

      // AVG / AVERAGE(A1:A5)
      const avgMatch = formula.match(/^(?:AVG|AVERAGE)\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
      if (avgMatch) {
        const startC = letterToColIndex(avgMatch[1]);
        const startR = parseInt(avgMatch[2], 10) - 1;
        const endC = letterToColIndex(avgMatch[3]);
        const endR = parseInt(avgMatch[4], 10) - 1;

        let total = 0;
        let count = 0;
        for (let ri = Math.min(startR, endR); ri <= Math.max(startR, endR); ri++) {
          for (let ci = Math.min(startC, endC); ci <= Math.max(startC, endC); ci++) {
            if (rowsMatrix[ri] && rowsMatrix[ri][ci] !== undefined) {
              const v = rowsMatrix[ri][ci];
              const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
              if (!isNaN(num)) {
                total += num;
                count++;
              }
            }
          }
        }
        return count > 0 ? Math.round((total / count) * 100) / 100 : 0;
      }

      // Simple arithmetic with cell references like E1/B1*100 or A1+B1
      const expr = formula.replace(/([A-Z]+)(\d+)/g, (_m, colLet, rowNumStr) => {
        const ci = letterToColIndex(colLet);
        const ri = parseInt(rowNumStr, 10) - 1;
        if (rowsMatrix[ri] && rowsMatrix[ri][ci] !== undefined) {
          const v = rowsMatrix[ri][ci];
          const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
          return isNaN(num) ? '0' : String(num);
        }
        return '0';
      });

      // Safe arithmetic evaluator (only math symbols)
      if (/^[0-9.\s+\-*/()]+$/.test(expr)) {
        // eslint-disable-next-line no-new-func
        const res = Function(`'use strict'; return (${expr})`)();
        return typeof res === 'number' && !isNaN(res) ? Math.round(res * 100) / 100 : '#ERR';
      }
      return '#ERR';
    } catch {
      return '#ERR';
    }
  };

  // Computed matrix
  const computedRows = useMemo(() => {
    return data.rows.map((row, r) =>
      row.map((cell, c) => evaluateCell(cell, r, c, data.rows))
    );
  }, [data.rows]);

  // Display rows filtered & sorted
  const displayRows = useMemo(() => {
    let list = computedRows.map((r, originalIdx) => ({
      originalIdx,
      cells: r,
      rawCells: data.rows[originalIdx]
    }));

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      list = list.filter((item) =>
        item.cells.some((cell) => String(cell).toLowerCase().includes(q))
      );
    }

    if (sortCol !== null && sortCol < data.columns.length) {
      list.sort((a, b) => {
        const valA = a.cells[sortCol];
        const valB = b.cells[sortCol];
        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA));
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB));

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortAsc ? numA - numB : numB - numA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return list;
  }, [computedRows, data.rows, filterQuery, sortCol, sortAsc, data.columns.length]);

  const notifyChange = (updated: SpreadsheetData) => {
    setData(updated);
    if (onChangeData) {
      onChangeData(updated);
    }
  };

  // Handle cell edit commit
  const handleCellCommit = (r: number, c: number, val: string) => {
    const newRows = data.rows.map((row) => [...row]);
    const num = Number(val);
    const finalVal = !isNaN(num) && val.trim() !== '' && !val.startsWith('=') ? num : val;
    newRows[r][c] = finalVal;

    const updated: SpreadsheetData = {
      ...data,
      rows: newRows
    };
    notifyChange(updated);
    setActiveCell(null);
  };

  // Add row
  const handleAddRow = () => {
    const newRow = data.columns.map((_, i) => (i === 0 ? `새 항목 ${data.rows.length + 1}` : 0));
    const updated: SpreadsheetData = {
      ...data,
      rows: [...data.rows, newRow]
    };
    notifyChange(updated);
  };

  // Add column
  const handleAddColumn = () => {
    const newColName = `열 ${colIndexToLetter(data.columns.length)}`;
    const updated: SpreadsheetData = {
      ...data,
      columns: [...data.columns, newColName],
      rows: data.rows.map((row) => [...row, 0])
    };
    notifyChange(updated);
  };

  // Delete row
  const handleDeleteRow = (rIdx: number) => {
    if (data.rows.length <= 1) return;
    const updated: SpreadsheetData = {
      ...data,
      rows: data.rows.filter((_, idx) => idx !== rIdx)
    };
    notifyChange(updated);
  };

  // Chart data extraction (numeric columns)
  const chartDatasets = useMemo(() => {
    const labels = computedRows.map((r, idx) => String(r[0] || `항목 ${idx + 1}`));
    const series: { name: string; values: number[] }[] = [];

    for (let c = 1; c < data.columns.length; c++) {
      const colName = data.columns[c];
      const vals: number[] = [];
      let isNumericCol = true;

      for (let r = 0; r < computedRows.length; r++) {
        const val = computedRows[r][c];
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        if (isNaN(num)) {
          isNumericCol = false;
          break;
        }
        vals.push(num);
      }

      if (isNumericCol && vals.length > 0) {
        series.push({ name: colName, values: vals });
      }
    }

    return { labels, series };
  }, [computedRows, data.columns]);

  // Max value for chart scaling
  const chartMaxVal = useMemo(() => {
    let max = 10;
    chartDatasets.series.forEach((s) => {
      s.values.forEach((v) => {
        if (v > max) max = v;
      });
    });
    return max * 1.15;
  }, [chartDatasets]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

  return (
    <div
      className={`my-4 border rounded-xl overflow-hidden shadow-xl transition-all ${
        isDarkTheme
          ? 'bg-slate-900/95 border-slate-800 text-slate-100'
          : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      {/* 1. SPREADSHEET HEADER */}
      <div
        className={`px-3 py-2 border-b flex flex-wrap items-center justify-between gap-2 select-none ${
          isDarkTheme ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Title & Badge */}
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={data.title || ''}
            disabled={readOnly}
            onChange={(e) => notifyChange({ ...data, title: e.target.value })}
            placeholder="스프레드시트 제목..."
            className={`font-semibold text-xs bg-transparent focus:outline-none focus:border-b border-indigo-500 transition px-1 ${
              isDarkTheme ? 'text-white' : 'text-slate-900'
            }`}
          />
          <span className="text-[0.625rem] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
            수식 연산 (SUM, AVG)
          </span>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {/* Quick Filter */}
          <div className="relative flex items-center">
            <Filter className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="데이터 필터..."
              className={`pl-6 pr-2 py-0.5 text-xs rounded border transition focus:outline-none w-24 sm:w-32 font-mono ${
                isDarkTheme
                  ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-600'
              }`}
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Toggle Chart Button */}
          <button
            type="button"
            onClick={() => {
              const next = !isChartOpen;
              setIsChartOpen(next);
              notifyChange({ ...data, showChart: next });
            }}
            className={`p-1 px-2 rounded border transition flex items-center gap-1 font-medium ${
              isChartOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : isDarkTheme
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="인터랙티브 차트 미리보기 토글"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">차트</span>
          </button>

          {/* AI Vibe Analyze & Forecast Prompt Button */}
          {onVibeAnalyze && (
            <button
              type="button"
              onClick={() => setIsVibePromptOpen(!isVibePromptOpen)}
              className="p-1 px-2 rounded bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white border border-amber-400/40 transition flex items-center gap-1 font-semibold text-xs shadow-sm active:scale-95 cursor-pointer"
              title="AI Vibe로 데이터 분석 및 2030년 추이 예측 확장"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Vibe 데이터 분석</span>
            </button>
          )}

          {!readOnly && (
            <>
              {/* Add Row Button */}
              <button
                type="button"
                onClick={handleAddRow}
                className={`p-1 px-2 rounded border transition flex items-center gap-1 ${
                  isDarkTheme
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title="행 추가"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span className="hidden md:inline">행 추가</span>
              </button>

              {/* Add Column Button */}
              <button
                type="button"
                onClick={handleAddColumn}
                className={`p-1 px-2 rounded border transition flex items-center gap-1 ${
                  isDarkTheme
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title="열 추가"
              >
                <Plus className="w-3 h-3 text-sky-400" />
                <span className="hidden md:inline">열 추가</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. VIBE PROMPT FLOATING BAR FOR DATASET */}
      {isVibePromptOpen && onVibeAnalyze && (
        <div
          className={`p-3 border-b flex flex-col gap-2 ${
            isDarkTheme ? 'bg-indigo-950/40 border-indigo-800/80' : 'bg-indigo-50/80 border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Vibe 데이터 지능형 가공 프롬프트</span>
            </div>
            <button
              type="button"
              onClick={() => setIsVibePromptOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5">
            {[
              '2030년까지 연평균 성장률(CAGR) 및 추이 예측',
              '전체 항목의 합계(SUM) 및 평균(AVG) 요약행 자동 추가',
              '영업이익률 및 마진율 계산 수식열 삽입',
              '최대/최소 실적 구간 분석 및 하이라이트'
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setVibePromptText(preset)}
                className={`text-[0.625rem] px-2 py-0.5 rounded-full border transition ${
                  vibePromptText === preset
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : isDarkTheme
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-500'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={vibePromptText}
              onChange={(e) => setVibePromptText(e.target.value)}
              placeholder="예: 2030년까지의 시장 규모와 매출을 예측하여 행과 수식을 추가해 줘"
              className={`flex-1 px-3 py-1.5 text-xs rounded-lg border font-mono focus:outline-none ${
                isDarkTheme
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600'
              }`}
            />
            <button
              type="button"
              onClick={() => {
                onVibeAnalyze(data, vibePromptText);
                setIsVibePromptOpen(false);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>실행</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE CHART PREVIEW (BAR, LINE, PIE) */}
      {isChartOpen && chartDatasets.series.length > 0 && (
        <div
          className={`p-4 border-b transition-all ${
            isDarkTheme ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Chart Header & Type selector */}
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>실시간 데이터 시각화 & 2030 추이 프리뷰</span>
            </div>
            <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedChartType('bar');
                  notifyChange({ ...data, chartType: 'bar' });
                }}
                className={`p-1 px-2 rounded text-xs transition ${
                  selectedChartType === 'bar' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                막대 (Bar)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedChartType('line');
                  notifyChange({ ...data, chartType: 'line' });
                }}
                className={`p-1 px-2 rounded text-xs transition ${
                  selectedChartType === 'line' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                추이선 (Line)
              </button>
            </div>
          </div>

          {/* SVG / Canvas Responsive Bar / Line Chart */}
          <div className="w-full h-44 overflow-hidden relative flex flex-col justify-end pt-4 pb-6 px-2">
            {selectedChartType === 'bar' && (
              <div className="flex items-end justify-around h-32 w-full gap-2 border-b border-slate-700/80 pb-1">
                {chartDatasets.labels.map((lbl, idx) => {
                  return (
                    <div key={lbl} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="flex items-end gap-1 w-full justify-center h-full">
                        {chartDatasets.series.map((s, sIdx) => {
                          const val = s.values[idx] || 0;
                          const heightPct = Math.min(100, Math.max(8, (val / chartMaxVal) * 100));
                          return (
                            <div
                              key={s.name}
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: COLORS[sIdx % COLORS.length]
                              }}
                              className="w-full max-w-[20px] rounded-t-sm transition-all duration-300 relative group/bar hover:opacity-90 cursor-pointer shadow-md"
                            >
                              <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[0.625rem] px-1.5 py-0.5 rounded shadow border border-slate-700 whitespace-nowrap pointer-events-none z-30 font-mono">
                                {s.name}: {val.toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-[0.6875rem] text-slate-400 truncate max-w-[80px] text-center font-mono">
                        {lbl}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedChartType === 'line' && (
              <div className="w-full h-32 relative border-b border-slate-700/80">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="0" x2="500" y2="0" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" />
                  <line x1="0" y1="60" x2="500" y2="60" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#475569" strokeWidth="1" />

                  {chartDatasets.series.map((s, sIdx) => {
                    const step = 500 / Math.max(1, chartDatasets.labels.length - 1);
                    const points = s.values.map((v, i) => {
                      const x = i * step;
                      const y = 120 - Math.min(120, Math.max(4, (v / chartMaxVal) * 120));
                      return `${x},${y}`;
                    });
                    const pathD = `M ${points.join(' L ')}`;
                    const color = COLORS[sIdx % COLORS.length];

                    return (
                      <g key={s.name}>
                        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" className="transition-all" />
                        {s.values.map((v, i) => {
                          const cx = i * step;
                          const cy = 120 - Math.min(120, Math.max(4, (v / chartMaxVal) * 120));
                          return (
                            <circle
                              key={i}
                              cx={cx}
                              cy={cy}
                              r="4"
                              fill={color}
                              className="hover:r-6 cursor-pointer transition-all"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>

                {/* X Axis Labels */}
                <div className="flex justify-between w-full mt-1">
                  {chartDatasets.labels.map((lbl) => (
                    <span key={lbl} className="text-[0.625rem] text-slate-400 font-mono">
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-2">
              {chartDatasets.series.map((s, sIdx) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[0.6875rem] font-mono text-slate-300">
                  <span
                    className="w-2.5 h-2.5 rounded-xs"
                    style={{ backgroundColor: COLORS[sIdx % COLORS.length] }}
                  />
                  <span>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SPREADSHEET GRID TABLE */}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full border-collapse text-xs font-mono select-none">
          <thead>
            <tr className={isDarkTheme ? 'bg-slate-950/80 text-slate-400' : 'bg-slate-100 text-slate-600'}>
              {/* Row index header */}
              <th className="w-10 px-2 py-1.5 border-b border-r border-slate-800 text-center text-[0.625rem] font-bold">
                #
              </th>
              {data.columns.map((colName, cIdx) => (
                <th
                  key={cIdx}
                  className={`px-3 py-1.5 border-b border-r text-left font-semibold cursor-pointer group transition ${
                    isDarkTheme
                      ? 'border-slate-800 text-indigo-300 hover:bg-slate-900'
                      : 'border-slate-300 text-indigo-700 hover:bg-slate-200'
                  }`}
                  onClick={() => {
                    if (sortCol === cIdx) {
                      setSortAsc(!sortAsc);
                    } else {
                      setSortCol(cIdx);
                      setSortAsc(true);
                    }
                  }}
                  title="클릭하여 정렬"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[0.625rem] opacity-50 font-bold">{colIndexToLetter(cIdx)}</span>
                      <span>{colName}</span>
                    </div>
                    <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                  </div>
                </th>
              ))}
              {!readOnly && (
                <th className="w-12 px-2 py-1.5 border-b border-slate-800 text-center text-[0.625rem]">관리</th>
              )}
            </tr>
          </thead>

          <tbody>
            {displayRows.map((item, rowIdx) => {
              const r = item.originalIdx;
              return (
                <tr
                  key={r}
                  className={`border-b transition ${
                    isDarkTheme
                      ? 'border-slate-800/80 hover:bg-slate-800/40'
                      : 'border-slate-200 hover:bg-indigo-50/50'
                  }`}
                >
                  {/* Row Number (1-indexed) */}
                  <td className="px-2 py-1 border-r border-slate-800 text-center text-[0.625rem] text-slate-500 font-bold bg-slate-950/40">
                    {r + 1}
                  </td>

                  {/* Columns */}
                  {data.columns.map((_, c) => {
                    const isEditing = activeCell?.r === r && activeCell?.c === c;
                    const rawVal = data.rows[r] && data.rows[r][c] !== undefined ? data.rows[r][c] : '';
                    const displayVal = item.cells[c];
                    const isFormula = String(rawVal).startsWith('=');

                    return (
                      <td
                        key={c}
                        className={`px-3 py-1.5 border-r border-slate-800/60 relative cursor-pointer ${
                          isEditing
                            ? 'bg-indigo-950 border-2 border-indigo-500'
                            : 'hover:outline hover:outline-1 hover:outline-indigo-500/50'
                        }`}
                        onClick={() => {
                          if (readOnly) return;
                          setActiveCell({ r, c });
                          setEditingValue(String(rawVal));
                        }}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellCommit(r, c, editingValue);
                                } else if (e.key === 'Escape') {
                                  setActiveCell(null);
                                }
                              }}
                              onBlur={() => handleCellCommit(r, c, editingValue)}
                              className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                            />
                            <Check
                              className="w-3 h-3 text-emerald-400 cursor-pointer"
                              onClick={() => handleCellCommit(r, c, editingValue)}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`truncate ${
                                isFormula
                                  ? 'text-emerald-300 font-semibold'
                                  : typeof displayVal === 'number'
                                  ? 'text-sky-300 font-mono'
                                  : isDarkTheme
                                  ? 'text-slate-200'
                                  : 'text-slate-800'
                              }`}
                            >
                              {typeof displayVal === 'number' ? displayVal.toLocaleString() : displayVal}
                            </span>
                            {isFormula && (
                              <span
                                className="text-[0.5625rem] text-emerald-500 font-mono opacity-60"
                                title={`수식: ${rawVal}`}
                              >
                                fx
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Row actions */}
                  {!readOnly && (
                    <td className="px-1 py-1 text-center border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(r)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="행 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. SPREADSHEET FOOTER INFO */}
      <div
        className={`px-3 py-1.5 border-t flex items-center justify-between text-[0.625rem] font-mono select-none ${
          isDarkTheme ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>{data.rows.length}개 행 × {data.columns.length}개 열</span>
          <span>•</span>
          <span>셀 클릭하여 수식(=SUM, =AVG, =E1/B1) 입력 가능</span>
        </div>
        <div className="flex items-center gap-1 text-indigo-400">
          <Calculator className="w-3 h-3" />
          <span>Compound Smart Sheet Engine</span>
        </div>
      </div>
    </div>
  );
};
