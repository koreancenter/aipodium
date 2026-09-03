/**
 * Markdown Table Helper Utility
 * Comprehensive, word-processor-grade Markdown table parsing, manipulation, formatting, and navigation.
 */

export interface MarkdownTableInfo {
  startOffset: number;
  endOffset: number;
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
  lines: string[];
  cursorRowIndex: number; // 0 = header, 1 = separator, 2+ = data row
  cursorColIndex: number; // 0-based column index
  isHeader: boolean;
  isSeparator: boolean;
  totalRows: number; // Header + data rows count
  totalCols: number;
}

/**
 * Calculates visual display width of a string considering CJK/Korean characters (2 width).
 */
export function getVisualWidth(str: string): number {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Hangul syllables, Jamo, CJK Unified Ideographs, Fullwidth forms
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff01 && code <= 0xff60)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Splits a table row line into trimmed cell strings, honoring escaped pipes (\|).
 */
export function splitTableRow(line: string): string[] {
  let content = line.trim();
  if (content.startsWith('|')) content = content.slice(1);
  if (content.endsWith('|')) content = content.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  let escaped = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '\\' && !escaped) {
      escaped = true;
      current += char;
    } else if (char === '|' && !escaped) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
      escaped = false;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Parses alignment indicator (:---:, :---, ---:, ---).
 */
export function parseAlignment(cell: string): 'left' | 'center' | 'right' {
  const trimmed = cell.trim();
  const startsWithColon = trimmed.startsWith(':');
  const endsWithColon = trimmed.endsWith(':');
  if (startsWithColon && endsWithColon) return 'center';
  if (endsWithColon) return 'right';
  return 'left';
}

/**
 * Checks if a line looks like a table row (has at least one pipe character).
 */
export function isTableRowLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  // Exclude code block fences or empty lines
  if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) return false;
  return true;
}

/**
 * Checks if a line is a markdown table separator line (e.g. | :--- | :---: | ---: |).
 */
export function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  const cells = splitTableRow(trimmed);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

/**
 * Detects if the cursor is currently inside a Markdown table, returning rich table metadata.
 */
export function getTableAtCursor(text: string, cursorPos: number): MarkdownTableInfo | null {
  if (!text) return null;

  // 1. Identify all lines and find cursor's line index
  const lines = text.split('\n');
  let currentOffset = 0;
  let cursorLineIdx = 0;
  let cursorColInLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length;
    if (cursorPos >= currentOffset && cursorPos <= currentOffset + lineLen) {
      cursorLineIdx = i;
      cursorColInLine = cursorPos - currentOffset;
      break;
    }
    currentOffset += lineLen + 1; // +1 for '\n'
  }

  // Check if current line is a table row
  if (!isTableRowLine(lines[cursorLineIdx])) {
    return null;
  }

  // 2. Expand upwards to find table start
  let startLine = cursorLineIdx;
  while (startLine > 0 && isTableRowLine(lines[startLine - 1])) {
    startLine--;
  }

  // 3. Expand downwards to find table end
  let endLine = cursorLineIdx;
  while (endLine < lines.length - 1 && isTableRowLine(lines[endLine + 1])) {
    endLine++;
  }

  const tableLines = lines.slice(startLine, endLine + 1);
  if (tableLines.length < 2) {
    return null; // At least header and separator needed
  }

  // Check if second line is a valid separator
  if (!isTableSeparatorLine(tableLines[1])) {
    // Maybe table starts from line 1 if line 0 wasn't header?
    // In GFM, separator must be line 1 (index 1 of table).
    return null;
  }

  // Calculate start & end character offsets
  let startOffset = 0;
  for (let i = 0; i < startLine; i++) {
    startOffset += lines[i].length + 1;
  }
  let endOffset = startOffset;
  for (let i = 0; i < tableLines.length; i++) {
    endOffset += tableLines[i].length + (i < tableLines.length - 1 ? 1 : 0);
  }

  // Parse headers and alignments
  const rawHeaders = splitTableRow(tableLines[0]);
  const rawAlignments = splitTableRow(tableLines[1]).map(parseAlignment);
  const colCount = Math.max(rawHeaders.length, rawAlignments.length);

  // Normalize headers
  const headers: string[] = [];
  const alignments: ('left' | 'center' | 'right')[] = [];
  for (let c = 0; c < colCount; c++) {
    headers.push(rawHeaders[c] || `헤더 ${c + 1}`);
    alignments.push(rawAlignments[c] || 'left');
  }

  // Parse data rows
  const rows: string[][] = [];
  for (let r = 2; r < tableLines.length; r++) {
    const rawRow = splitTableRow(tableLines[r]);
    const rowCells: string[] = [];
    for (let c = 0; c < colCount; c++) {
      rowCells.push(rawRow[c] || '');
    }
    rows.push(rowCells);
  }

  // Determine cursor row index and column index
  const cursorRowInTable = cursorLineIdx - startLine;
  const isHeader = cursorRowInTable === 0;
  const isSeparator = cursorRowInTable === 1;

  // Determine which column cursor is in on current line
  const currentLineText = lines[cursorLineIdx];
  const textBeforeCursor = currentLineText.slice(0, cursorColInLine);
  
  // Count non-escaped pipes before cursor
  let pipesBefore = 0;
  for (let i = 0; i < textBeforeCursor.length; i++) {
    if (textBeforeCursor[i] === '|' && (i === 0 || textBeforeCursor[i - 1] !== '\\')) {
      pipesBefore++;
    }
  }

  // If line starts with '|', 1 pipe before means column 0
  const cursorColIndex = Math.min(
    colCount - 1,
    Math.max(0, currentLineText.trim().startsWith('|') ? pipesBefore - 1 : pipesBefore)
  );

  return {
    startOffset,
    endOffset,
    headers,
    alignments,
    rows,
    lines: tableLines,
    cursorRowIndex: cursorRowInTable,
    cursorColIndex,
    isHeader,
    isSeparator,
    totalRows: 1 + rows.length, // header + data rows
    totalCols: colCount,
  };
}

/**
 * Formats table with beautiful padding so all columns and pipes align vertically.
 */
export function formatMarkdownTable(
  headers: string[],
  alignments: ('left' | 'center' | 'right')[],
  rows: string[][]
): string {
  const colCount = Math.max(
    headers.length,
    alignments.length,
    ...rows.map((r) => r.length),
    1
  );

  // Normalize column arrays
  const normHeaders: string[] = [];
  const normAlignments: ('left' | 'center' | 'right')[] = [];
  for (let c = 0; c < colCount; c++) {
    normHeaders.push(headers[c] || `헤더 ${c + 1}`);
    normAlignments.push(alignments[c] || 'left');
  }

  const normRows: string[][] = rows.map((r) => {
    const cells: string[] = [];
    for (let c = 0; c < colCount; c++) {
      cells.push(r[c] || '');
    }
    return cells;
  });

  // Calculate maximum visual width for each column
  const colWidths: number[] = [];
  for (let c = 0; c < colCount; c++) {
    let maxW = Math.max(3, getVisualWidth(normHeaders[c]));
    for (const row of normRows) {
      maxW = Math.max(maxW, getVisualWidth(row[c]));
    }
    colWidths.push(maxW);
  }

  // Helper to pad cell
  const padCell = (content: string, colIdx: number, align: 'left' | 'center' | 'right'): string => {
    const targetW = colWidths[colIdx];
    const curW = getVisualWidth(content);
    const diff = Math.max(0, targetW - curW);

    if (align === 'center') {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return ' ' + ' '.repeat(left) + content + ' '.repeat(right) + ' ';
    } else if (align === 'right') {
      return ' ' + ' '.repeat(diff) + content + ' ';
    }
    return ' ' + content + ' '.repeat(diff) + ' ';
  };

  // 1. Build Header
  const headerLine = '|' + normHeaders.map((h, i) => padCell(h, i, normAlignments[i])).join('|') + '|';

  // 2. Build Separator
  const separatorLine =
    '|' +
    normAlignments
      .map((align, i) => {
        const w = colWidths[i];
        const dashes = '-'.repeat(Math.max(3, w));
        if (align === 'center') return ` :${dashes.slice(2)}: `;
        if (align === 'right') return ` ${dashes.slice(1)}: `;
        return ` :${dashes.slice(1)} `;
      })
      .join('|') +
    '|';

  // 3. Build Rows
  const rowLines = normRows.map((row) => {
    return '|' + row.map((cell, i) => padCell(cell, i, normAlignments[i])).join('|') + '|';
  });

  return [headerLine, separatorLine, ...rowLines].join('\n');
}

/**
 * Generates an empty Markdown table with specified rows and columns.
 */
export function generateEmptyTable(rows: number, cols: number): string {
  const validCols = Math.max(1, Math.min(cols, 12));
  const validRows = Math.max(1, Math.min(rows, 30));

  const headers: string[] = [];
  const alignments: ('left' | 'center' | 'right')[] = [];
  for (let c = 1; c <= validCols; c++) {
    headers.push(`헤더 ${c}`);
    alignments.push('left');
  }

  const dataRows: string[][] = [];
  for (let r = 1; r <= validRows; r++) {
    const row: string[] = [];
    for (let c = 1; c <= validCols; c++) {
      row.push('');
    }
    dataRows.push(row);
  }

  return formatMarkdownTable(headers, alignments, dataRows);
}

/**
 * Inserts a new row above or below the current cursor position.
 */
export function insertTableRow(
  table: MarkdownTableInfo,
  position: 'above' | 'below'
): { formatted: string; newCursorRow: number; newCursorCol: number } {
  const colCount = table.totalCols;
  const newRow: string[] = new Array(colCount).fill('');
  const dataRows = [...table.rows];

  let insertIdx = 0;
  if (table.isHeader || table.isSeparator) {
    insertIdx = 0; // Insert right below separator as first data row
  } else {
    const currentDataIdx = table.cursorRowIndex - 2;
    insertIdx = position === 'below' ? currentDataIdx + 1 : Math.max(0, currentDataIdx);
  }

  dataRows.splice(insertIdx, 0, newRow);
  const formatted = formatMarkdownTable(table.headers, table.alignments, dataRows);
  return {
    formatted,
    newCursorRow: insertIdx + 2,
    newCursorCol: table.cursorColIndex,
  };
}

/**
 * Deletes the row at current cursor. If header is targeted, clears or warns.
 */
export function deleteTableRow(
  table: MarkdownTableInfo
): { formatted: string } | null {
  if (table.isHeader || table.isSeparator) {
    // Cannot delete header/separator row, only data rows
    return null;
  }
  const currentDataIdx = table.cursorRowIndex - 2;
  if (currentDataIdx < 0 || currentDataIdx >= table.rows.length) return null;

  const dataRows = [...table.rows];
  dataRows.splice(currentDataIdx, 1);

  // If no rows remain, keep at least one empty row
  if (dataRows.length === 0) {
    dataRows.push(new Array(table.totalCols).fill(''));
  }

  const formatted = formatMarkdownTable(table.headers, table.alignments, dataRows);
  return { formatted };
}

/**
 * Inserts a new column left or right of current column.
 */
export function insertTableColumn(
  table: MarkdownTableInfo,
  position: 'left' | 'right'
): { formatted: string; newCursorCol: number } {
  const targetCol = table.cursorColIndex;
  const insertIdx = position === 'right' ? targetCol + 1 : targetCol;

  const newHeaders = [...table.headers];
  newHeaders.splice(insertIdx, 0, `새 열 ${insertIdx + 1}`);

  const newAlignments = [...table.alignments];
  newAlignments.splice(insertIdx, 0, 'left');

  const newRows = table.rows.map((row) => {
    const r = [...row];
    r.splice(insertIdx, 0, '');
    return r;
  });

  const formatted = formatMarkdownTable(newHeaders, newAlignments, newRows);
  return {
    formatted,
    newCursorCol: insertIdx,
  };
}

/**
 * Deletes the column at current cursor position.
 */
export function deleteTableColumn(
  table: MarkdownTableInfo
): { formatted: string } | null {
  if (table.totalCols <= 1) {
    return null; // Cannot delete the only remaining column
  }
  const targetCol = table.cursorColIndex;

  const newHeaders = [...table.headers];
  newHeaders.splice(targetCol, 1);

  const newAlignments = [...table.alignments];
  newAlignments.splice(targetCol, 1);

  const newRows = table.rows.map((row) => {
    const r = [...row];
    r.splice(targetCol, 1);
    return r;
  });

  const formatted = formatMarkdownTable(newHeaders, newAlignments, newRows);
  return { formatted };
}

/**
 * Sets alignment for current column ('left' | 'center' | 'right').
 */
export function setTableColumnAlign(
  table: MarkdownTableInfo,
  align: 'left' | 'center' | 'right'
): string {
  const targetCol = table.cursorColIndex;
  const newAlignments = [...table.alignments];
  newAlignments[targetCol] = align;

  return formatMarkdownTable(table.headers, newAlignments, table.rows);
}

/**
 * Helper to calculate cursor position within a specific row and column of a formatted table string.
 */
export function findCellOffsetInTable(
  tableText: string,
  rowIndex: number,
  colIndex: number
): number {
  const lines = tableText.split('\n');
  if (rowIndex < 0 || rowIndex >= lines.length) return 0;

  let offset = 0;
  for (let r = 0; r < rowIndex; r++) {
    offset += lines[r].length + 1;
  }

  const line = lines[rowIndex];
  let pipesFound = 0;
  let cellStart = 0;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '|' && (i === 0 || line[i - 1] !== '\\')) {
      if (pipesFound === colIndex) {
        cellStart = i + 1;
        break;
      }
      pipesFound++;
    }
  }

  // Skip leading space in cell
  while (cellStart < line.length && line[cellStart] === ' ') {
    cellStart++;
  }

  return offset + cellStart;
}
