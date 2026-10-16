/**
 * Markdown Block Parser & Chunker for Virtualized Document Rendering
 * Decomposes large Markdown documents into discrete structural blocks
 * (headings, code blocks, tables, blockquotes, lists, math, paragraphs)
 * with precise line metrics, estimated heights, and LRU block HTML caching.
 */

import { renderMarkdownToHtml, sanitizeHtml } from './markdownParser';

export type MarkdownBlockType =
  | 'heading'
  | 'code'
  | 'table'
  | 'quote'
  | 'list'
  | 'math'
  | 'hr'
  | 'paragraph'
  | 'html'
  | 'footnotes';

export interface MarkdownBlock {
  id: string;
  raw: string;
  type: MarkdownBlockType;
  startLine: number;
  endLine: number;
  lineCount: number;
  estimatedHeight: number;
}

export interface SplitResult {
  blocks: MarkdownBlock[];
  referenceDefs: string;
  totalLines: number;
}

/**
 * Calculates a realistic estimated rendered pixel height for a block based on its type and line count.
 */
export function estimateBlockHeight(type: MarkdownBlockType, lines: string[]): number {
  const lineCount = lines.length;
  switch (type) {
    case 'heading': {
      const first = lines[0]?.trim() || '';
      if (first.startsWith('# ')) return 56;
      if (first.startsWith('## ')) return 48;
      if (first.startsWith('### ')) return 42;
      return 38;
    }
    case 'code':
      // Header bar (28px) + line height (~22px) + padding (24px)
      return Math.max(64, lineCount * 22 + 52);
    case 'table':
      // Header row (38px) + data rows (~36px each) + borders/margins
      return Math.max(74, lineCount * 36 + 28);
    case 'math':
      return Math.max(60, lineCount * 28 + 36);
    case 'quote':
      return Math.max(48, lineCount * 24 + 20);
    case 'list':
      return Math.max(36, lineCount * 26 + 12);
    case 'hr':
      return 24;
    case 'html':
      return Math.max(50, lineCount * 24 + 20);
    case 'footnotes':
      return Math.max(50, lineCount * 22 + 30);
    case 'paragraph':
    default:
      return Math.max(34, lineCount * 24 + 14);
  }
}

/**
 * Splits a full markdown document into logical structural blocks for virtual windowing.
 */
export function splitMarkdownIntoBlocks(markdown: string): SplitResult {
  if (!markdown) {
    return { blocks: [], referenceDefs: '', totalLines: 0 };
  }

  const lines = markdown.split(/\r?\n/);
  const totalLines = lines.length;
  const blocks: MarkdownBlock[] = [];
  const refDefLines: string[] = [];
  const footnoteLines: string[] = [];

  let currentLines: string[] = [];
  let currentType: MarkdownBlockType = 'paragraph';
  let blockStartLine = 1;

  function flush() {
    if (currentLines.length > 0) {
      const lineCount = currentLines.length;
      const estimatedHeight = estimateBlockHeight(currentType, currentLines);
      const raw = currentLines.join('\n');
      blocks.push({
        id: `blk-${blocks.length}-${currentType}-L${blockStartLine}`,
        raw,
        type: currentType,
        startLine: blockStartLine,
        endLine: blockStartLine + lineCount - 1,
        lineCount,
        estimatedHeight
      });
      currentLines = [];
      currentType = 'paragraph';
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // 1. Footnote definition: [^id]: ...
    if (/^\[\^([a-zA-Z0-9_\-]+)\]:\s*/.test(trimmed)) {
      flush();
      footnoteLines.push(line);
      i++;
      while (i < lines.length && (lines[i].startsWith('    ') || lines[i].startsWith('\t'))) {
        footnoteLines.push(lines[i]);
        i++;
      }
      continue;
    }

    // 2. Reference-style link definition: [id]: url "optional title"
    if (/^\[([^\]]+)\]:\s*(\S+)/.test(trimmed)) {
      flush();
      refDefLines.push(line);
      i++;
      continue;
    }

    // 3. Fenced Code Block: ```lang or ~~~lang
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      flush();
      const fence = trimmed.slice(0, 3);
      blockStartLine = lineNum;
      currentType = 'code';
      currentLines.push(line);
      i++;
      while (i < lines.length) {
        currentLines.push(lines[i]);
        if (lines[i].trim().startsWith(fence)) {
          break;
        }
        i++;
      }
      flush();
      i++;
      continue;
    }

    // 4. Display Math Block: $$ ... $$
    if (trimmed.startsWith('$$')) {
      flush();
      blockStartLine = lineNum;
      currentType = 'math';
      currentLines.push(line);
      if (trimmed.length > 2 && trimmed.endsWith('$$')) {
        flush();
        i++;
        continue;
      }
      i++;
      while (i < lines.length) {
        currentLines.push(lines[i]);
        if (lines[i].trim().endsWith('$$')) {
          break;
        }
        i++;
      }
      flush();
      i++;
      continue;
    }

    // 5. Blank lines: delimit blocks
    if (!trimmed) {
      flush();
      i++;
      continue;
    }

    // 6. Setext Heading: line followed by === or ---
    if (i + 1 < lines.length && /^(?:={2,}|-{2,})\s*$/.test(lines[i + 1].trim()) && !/^[-*+]\s+/.test(trimmed)) {
      flush();
      blockStartLine = lineNum;
      currentType = 'heading';
      currentLines.push(line);
      currentLines.push(lines[i + 1]);
      flush();
      i += 2;
      continue;
    }

    // 7. ATX Headings: # to ######
    if (/^#{1,6}\s+/.test(trimmed)) {
      flush();
      blockStartLine = lineNum;
      currentType = 'heading';
      currentLines.push(line);
      flush();
      i++;
      continue;
    }

    // 8. Horizontal Rules: ---, ***, ___
    if (/^(?:---|\*\*\*|___)\s*$/.test(trimmed)) {
      flush();
      blockStartLine = lineNum;
      currentType = 'hr';
      currentLines.push(line);
      flush();
      i++;
      continue;
    }

    // 9. Markdown Tables
    if (trimmed.startsWith('|') && (trimmed.endsWith('|') || trimmed.includes('|'))) {
      if (currentType !== 'table') {
        flush();
        blockStartLine = lineNum;
        currentType = 'table';
      }
      currentLines.push(line);
      i++;
      continue;
    }

    // 10. Blockquotes: > ...
    if (trimmed.startsWith('>')) {
      if (currentType !== 'quote') {
        flush();
        blockStartLine = lineNum;
        currentType = 'quote';
      }
      currentLines.push(line);
      i++;
      continue;
    }

    // 11. Lists (unordered, ordered, task lists, or indented list items)
    const isListItem =
      /^(?:[*+-]|\d+[.)]|\s*(?:[-*+]|\d+[.)]))\s+/.test(line) ||
      (currentType === 'list' && (/^\s{2,}/.test(line) || /^\s*[-*+]\s+/.test(line)));
    if (isListItem) {
      if (currentType !== 'list') {
        flush();
        blockStartLine = lineNum;
        currentType = 'list';
      }
      currentLines.push(line);
      i++;
      continue;
    }

    // 12. Block HTML elements
    const isBlockHtml = /^\s*<(\/)?(details|summary|div|p|table|thead|tbody|tr|th|td|iframe|svg|canvas|figure|video|audio|form|center|blockquote|section|header|footer|nav|aside|article)\b/i.test(
      trimmed
    );
    if (isBlockHtml) {
      if (currentType !== 'html') {
        flush();
        blockStartLine = lineNum;
        currentType = 'html';
      }
      currentLines.push(line);
      i++;
      continue;
    }

    // 13. Standard paragraph text
    if (currentType !== 'paragraph') {
      flush();
      blockStartLine = lineNum;
      currentType = 'paragraph';
    }
    currentLines.push(line);
    i++;
  }

  flush();

  // If footnotes exist in document, add Footnotes block at bottom
  if (footnoteLines.length > 0) {
    const rawFootnotes = footnoteLines.join('\n');
    blocks.push({
      id: `blk-${blocks.length}-footnotes-L${totalLines - footnoteLines.length + 1}`,
      raw: rawFootnotes,
      type: 'footnotes',
      startLine: totalLines - footnoteLines.length + 1,
      endLine: totalLines,
      lineCount: footnoteLines.length,
      estimatedHeight: Math.max(50, footnoteLines.length * 24 + 30)
    });
  }

  return {
    blocks,
    referenceDefs: refDefLines.join('\n'),
    totalLines
  };
}

// In-Memory LRU / Content-Hash Cache for rendered block HTML
const BLOCK_HTML_CACHE = new Map<string, string>();
const MAX_CACHE_ENTRIES = 2000;

/**
 * Returns cached sanitized HTML for a markdown block, or renders and stores it.
 */
export function renderCachedBlockHtml(
  raw: string,
  renderFn: (md: string) => string,
  referenceDefs?: string
): string {
  const cacheKey = referenceDefs ? `${raw}\n__REF__\n${referenceDefs}` : raw;
  const existing = BLOCK_HTML_CACHE.get(cacheKey);
  if (existing !== undefined) {
    return existing;
  }

  const markdownToRender = referenceDefs ? `${raw}\n\n${referenceDefs}` : raw;
  const rawHtml = renderFn(markdownToRender);
  const sanitized = sanitizeHtml(rawHtml);

  if (BLOCK_HTML_CACHE.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest entries
    const keys = Array.from(BLOCK_HTML_CACHE.keys()).slice(0, 200);
    for (const k of keys) {
      BLOCK_HTML_CACHE.delete(k);
    }
  }

  BLOCK_HTML_CACHE.set(cacheKey, sanitized);
  return sanitized;
}

/**
 * Clears the block HTML cache (useful on major project switch or memory purge).
 */
export function clearBlockHtmlCache(): void {
  BLOCK_HTML_CACHE.clear();
}
