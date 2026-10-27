export interface TocItem {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  lineIndex: number;
  charOffset: number;
}

/**
 * Real-time High-Performance Heading Parser for Markdown documents.
 * - Skips code fences (``` or ~~~) to prevent code comments/shebangs from being mistaken for headings.
 * - Strips inline markdown formatting (bold, italic, links, inline code) for clean title display.
 * - Supports heading levels H1 through H6 (# to ######).
 * - Generates stable unique keys for each item.
 */
export function parseTocItems(content: string): TocItem[] {
  if (!content) return [];
  const lines = content.split('\n');
  const items: TocItem[] = [];
  let charOffset = 0;
  let inCodeFence = false;

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    // Detect code fence toggles
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeFence = !inCodeFence;
      charOffset += rawLine.length + 1;
      continue;
    }

    if (!inCodeFence && trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        let cleanText = match[2].trim();

        // Strip inline markdown markup
        cleanText = cleanText
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // [text](url) -> text
          .replace(/[*_~`]/g, '') // remove *, _, ~, `
          .trim();

        if (cleanText) {
          items.push({
            id: `toc-${index}-h${level}`,
            text: cleanText,
            level,
            lineIndex: index,
            charOffset
          });
        }
      }
    }

    charOffset += rawLine.length + 1;
  }

  return items;
}
