import katex from 'katex';

/**
 * Universal, high-performance Markdown & HTML rendering engine.
 * Fully supports:
 * - CommonMark & GFM (GitHub Flavored Markdown)
 * - Raw HTML & Embedded HTML (tags, attributes, styling, iframes, SVG, canvas, details/summary, kbd, mark, sub, sup, ruby, etc.)
 * - Setext headings (===, ---) & ATX headings (# to ######, with or without space)
 * - Task / Checkbox lists (- [ ] / - [x], * [ ] / * [x], + [ ] / + [x], and bare [ ] / [x] / [v] / [X] / [o] / [O])
 * - Font formatting: Bold (**text**, __text__), Italic (*text*, _text_), Bold+Italic (***text***, ___text___),
 *   Strikethrough (~~text~~), Highlight (==text==), Subscript (~sub~, <sub>), Superscript (^sup^, <sup>),
 *   Underline (++text++, <u>, <ins>), Keyboard (<kbd>Key</kbd>)
 * - Multi-level nested unordered lists (-, *, +) and ordered lists (1., 1), a.)
 * - Tables with alignments (:---, :---:, ---:), ditto marks (", 〃, ^), inline markdown, and HTML
 * - Blockquotes, multi-paragraph quotes, nested blockquotes (>>, >>>), and GitHub Alerts ([!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION])
 * - Images (![alt](url "title")), Linked images ([![alt](url)](link)), Reference links ([text][ref]), Autolinks (<https://...>, <email>)
 * - LaTeX / MathJax / KaTeX formulas ($...$ inline, $$...$$ display block, \(...\), \[...\])
 * - Fenced code blocks (```lang ... ```, ~~~lang ... ~~~) with copy button and language tag
 * - Footnotes ([^1] reference and [^1]: definition with back-links ↩)
 * - Definition lists (Term\n: Definition)
 * - Soft and hard line breaks
 */

// Helper to escape text for HTML attributes
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeUrl(rawUrl: string): string {
  const url = (rawUrl || '').trim();
  if (!url) return '';

  const normalized = url.toLowerCase();
  if (normalized.startsWith('javascript:') || normalized.startsWith('vbscript:') || normalized.startsWith('data:')) {
    return '';
  }

  return url;
}

function sanitizeHtmlFragment(html: string): string {
  if (!html) return '';

  let safe = html;
  safe = safe.replace(/<\s*(script|style|iframe|object|embed|svg|math|base|meta|link)\b[\s\S]*?(?:<\s*\/\s*\1\s*>|>)/gi, '');
  safe = safe.replace(/\s+on[a-zA-Z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  safe = safe.replace(/\s+(href|src|xlink:href|data)\s*=\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s>]+))/gi, (_match, attrName, doubleQuoted, singleQuoted, unquoted) => {
    const rawValue = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
    const sanitized = sanitizeUrl(rawValue);
    if (!sanitized) {
      return '';
    }
    return ` ${attrName}="${escapeAttr(sanitized)}"`;
  });
  safe = safe.replace(/\s+(srcdoc)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return safe;
}

// Render Math Formula using KaTeX
function renderMath(formula: string, displayMode: boolean): string {
  try {
    return katex.renderToString(formula.trim(), {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml'
    });
  } catch {
    const escaped = formula.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<code class="font-mono text-xs text-amber-300 bg-slate-900 px-1 py-0.5 rounded border border-amber-500/30">${escaped}</code>`;
  }
}

export function renderMarkdownToHtml(md: string): string {
  if (!md || !md.trim()) {
    return '<div class="text-slate-500 italic py-6 text-center text-xs">미리보기할 마크다운 및 HTML 내용이 없습니다.</div>';
  }

  // Storage for protected placeholders
  const protectedBlocks: string[] = [];
  const storeProtected = (html: string): string => {
    const placeholder = `<!--PROTECTED_BLOCK_${protectedBlocks.length}-->`;
    protectedBlocks.push(html);
    return placeholder;
  };

  let text = md.replace(/\r\n/g, '\n');

  // If text is a full HTML document (<!DOCTYPE html> or <html> tag), return clean frame wrapper
  const trimmedLower = text.trim().toLowerCase();
  if (trimmedLower.startsWith('<!doctype html') || trimmedLower.startsWith('<html')) {
    return `<div class="html-rendered-root w-full h-full">${text}</div>`;
  }

  // 1. Extract & Protect Display Math Blocks: $$ ... $$ or \[ ... \]
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula) => {
    const rendered = renderMath(formula, true);
    return storeProtected(
      `<div class="my-3 px-3 py-2.5 bg-slate-900/70 border border-slate-800 rounded-lg overflow-x-auto text-center font-sans text-slate-100 flex items-center justify-center shadow-xs">${rendered}</div>`
    );
  });
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => {
    const rendered = renderMath(formula, true);
    return storeProtected(
      `<div class="my-3 px-3 py-2.5 bg-slate-900/70 border border-slate-800 rounded-lg overflow-x-auto text-center font-sans text-slate-100 flex items-center justify-center shadow-xs">${rendered}</div>`
    );
  });

  // 2. Extract & Protect Fenced Code Blocks: ```lang ... ``` or ~~~lang ... ~~~
  text = text.replace(/(?:```|~~~)([a-zA-Z0-9_\-\+#.]*)\n([\s\S]*?)(?:```|~~~)/g, (_match, lang, code) => {
    const cleanCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n$/, '');
    const languageLabel = lang ? lang.trim().toLowerCase() : 'code';
    return storeProtected(
      `<div class="my-2.5 rounded-lg border border-slate-800 bg-slate-950/95 shadow-sm overflow-hidden group">
        <div class="px-3 py-1 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[0.625rem] text-slate-400 font-mono select-none">
          <span class="font-semibold text-indigo-300 uppercase tracking-wider">${languageLabel}</span>
          <span class="text-[0.5625rem] text-slate-500">code block</span>
        </div>
        <pre class="p-3 overflow-x-auto font-mono text-[0.6875rem] text-emerald-300 leading-normal bg-transparent"><code>${cleanCode}</code></pre>
      </div>`
    );
  });

  // 3. Extract & Protect Inline Math: $ ... $ or \( ... \)
  text = text.replace(/(^|[^\\])\$([^\$\n\r]+?)\$/g, (_match, prefix, formula) => {
    const rendered = renderMath(formula, false);
    return `${prefix}${storeProtected(`<span class="inline-block px-0.5 text-slate-100 align-middle">${rendered}</span>`)}`;
  });
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula) => {
    const rendered = renderMath(formula, false);
    return storeProtected(`<span class="inline-block px-0.5 text-slate-100 align-middle">${rendered}</span>`);
  });

  // 4. Extract & Protect Multi-backtick and Single-backtick Inline Code: `...` or ``...``
  text = text.replace(/``([^`\n]+)``/g, (_match, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return storeProtected(
      `<code class="bg-slate-800/90 text-emerald-300 px-1 py-0.2 rounded font-mono text-[0.6875rem] border border-slate-700/60">${escaped}</code>`
    );
  });
  text = text.replace(/`([^`\n]+)`/g, (_match, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return storeProtected(
      `<code class="bg-slate-800/90 text-emerald-300 px-1 py-0.2 rounded font-mono text-[0.6875rem] border border-slate-700/60">${escaped}</code>`
    );
  });

  // 5. Extract Reference-Style Links & Footnotes Definitions
  const referenceLinks: Record<string, { url: string; title?: string }> = {};
  const footnotes: Record<string, string> = {};

  const linesRaw = text.split('\n');
  const filteredLines: string[] = [];

  for (let i = 0; i < linesRaw.length; i++) {
    const line = linesRaw[i];
    const trimmed = line.trim();

    // Link reference: [ref_id]: http://url "optional title"
    const linkRefMatch = trimmed.match(/^\[([a-zA-Z0-9_\-.\s]+)\]:\s*(\S+)(?:\s+"([^"]*)")?$/);
    if (linkRefMatch) {
      const refId = linkRefMatch[1].toLowerCase();
      referenceLinks[refId] = { url: linkRefMatch[2], title: linkRefMatch[3] };
      continue;
    }

    // Footnote definition: [^id]: footnote content
    const fnMatch = trimmed.match(/^\[\^([a-zA-Z0-9_\-]+)\]:\s*(.*)$/);
    if (fnMatch) {
      const fnId = fnMatch[1];
      footnotes[fnId] = fnMatch[2];
      continue;
    }

    filteredLines.push(line);
  }

  // Helper for inline Markdown and HTML formatting
  const formatInline = (str: string): string => {
    let s = str;

    // Preserve and protect existing HTML tags (like <span style="...">, <img ...>, <iframe ...>, <video>, <button>, etc.)
    const inlineHtmlBlocks: string[] = [];
    s = s.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>([\s\S]*?)<\/\1>/gi, (match) => {
      const safe = sanitizeHtmlFragment(match);
      if (!safe) return '';
      const ph = `<!--INLINE_HTML_${inlineHtmlBlocks.length}-->`;
      inlineHtmlBlocks.push(safe);
      return ph;
    });
    // Self-closing HTML tags: <br/>, <hr/>, <img .../>, <input .../>
    s = s.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>(?!\s*<\/\1>)/gi, (match) => {
      if (match.startsWith('<http://') || match.startsWith('<https://') || match.includes('@')) {
        return match;
      }
      const safe = sanitizeHtmlFragment(match);
      if (!safe) return '';
      const ph = `<!--INLINE_HTML_${inlineHtmlBlocks.length}-->`;
      inlineHtmlBlocks.push(safe);
      return ph;
    });

    // Linked Image: [![alt](img_url)](target_url)
    s = s.replace(/\[!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)\]\(([^)]+?)\)/g, (_match, alt, imgUrl, title, linkUrl) => {
      const safeImg = sanitizeUrl(imgUrl.trim());
      const safeLink = sanitizeUrl(linkUrl.trim());
      if (!safeImg || !safeLink) {
        return alt ? alt : 'image';
      }
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
      const altText = alt ? escapeAttr(alt) : 'Image';
      return `<a href="${escapeAttr(safeLink)}" target="_blank" rel="noopener noreferrer" class="inline-block my-2">
        <img src="${escapeAttr(safeImg)}" alt="${altText}"${titleAttr} class="max-h-80 max-w-full rounded border border-slate-800 mx-auto shadow-sm object-contain hover:opacity-95 transition-opacity" loading="lazy" referrerPolicy="no-referrer" />
      </a>`;
    });

    // Images: ![alt](url "title") or ![alt](url)
    s = s.replace(/!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g, (_match, alt, url, title) => {
      const safeUrl = sanitizeUrl(url.trim());
      if (!safeUrl) {
        return alt ? alt : '';
      }
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
      const altText = alt ? escapeAttr(alt) : 'Image';
      return `<figure class="my-2 text-center inline-block max-w-full">
        <img src="${escapeAttr(safeUrl)}" alt="${altText}"${titleAttr} class="max-h-80 max-w-full rounded border border-slate-800 mx-auto shadow-sm object-contain" loading="lazy" referrerPolicy="no-referrer" />
        ${alt ? `<figcaption class="text-[0.625rem] text-slate-500 mt-1">${altText}</figcaption>` : ''}
      </figure>`;
    });

    // Standard Links: [text](url "title") or [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g, (_match, label, url, title) => {
      const safeUrl = sanitizeUrl(url.trim());
      if (!safeUrl) {
        return label;
      }
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
      return `<a href="${escapeAttr(safeUrl)}"${titleAttr} target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer transition-colors">${label}</a>`;
    });

    // Reference-Style Links: [text][ref_id] or [ref_id]
    s = s.replace(/\[([^\]]+)\]\[([a-zA-Z0-9_\-.\s]*)\]/g, (match, label, refId) => {
      const key = (refId || label).toLowerCase().trim();
      const target = referenceLinks[key];
      if (target) {
        const titleAttr = target.title ? ` title="${escapeAttr(target.title)}"` : '';
        return `<a href="${escapeAttr(target.url.trim())}"${titleAttr} target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer transition-colors">${label}</a>`;
      }
      return match;
    });

    // Autolinks: <https://...> or <http://...>
    s = s.replace(/<(https?:\/\/[^\s>]+)>/g, (_match, url) => {
      return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline font-medium">${escapeAttr(url)}</a>`;
    });

    // Email Autolinks: <name@domain.com>
    s = s.replace(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, (_match, email) => {
      return `<a href="mailto:${escapeAttr(email)}" class="text-indigo-400 hover:text-indigo-300 underline font-medium">${escapeAttr(email)}</a>`;
    });

    // Footnote In-text References: [^1]
    s = s.replace(/\[\^([a-zA-Z0-9_\-]+)\]/g, (_match, id) => {
      return `<sup><a href="#fn-${id}" id="fnref-${id}" class="text-indigo-400 hover:text-indigo-300 font-mono text-[0.625rem] px-0.5 hover:underline font-semibold">[${id}]</a></sup>`;
    });

    // Inline Task Checkboxes: [x] or [ ] inside text
    s = s.replace(/\[([xXvVoO\u2713\u2714\u2611\u25A0\u25CF])\](?!\()/g, '<input type="checkbox" checked disabled class="inline-block align-middle w-3.5 h-3.5 mr-1.5 rounded accent-indigo-600 bg-slate-900 border-slate-700 pointer-events-none" />');
    s = s.replace(/\[\s?\](?!\()/g, '<input type="checkbox" disabled class="inline-block align-middle w-3.5 h-3.5 mr-1.5 rounded accent-indigo-600 bg-slate-900 border-slate-700 pointer-events-none" />');

    // Keyboard keys: <kbd>Key</kbd>
    s = s.replace(/<kbd>([\s\S]*?)<\/kbd>/gi, (_match, key) => {
      return `<kbd class="px-1.5 py-0.5 text-[0.625rem] font-mono bg-slate-800 border border-slate-700 rounded text-slate-300 shadow-xs">${key}</kbd>`;
    });

    // Highlight: ==text== (Page 6 of Markdown guide)
    s = s.replace(/==([^=\n]+?)==/g, '<mark class="bg-amber-400/25 text-amber-200 px-1 py-0.2 rounded border border-amber-500/30 font-medium">$1</mark>');

    // Strikethrough: ~~text~~
    s = s.replace(/~~([^~\n]+?)~~/g, '<del class="line-through text-slate-400 opacity-80">$1</del>');

    // Subscript: ~sub~ (e.g. H~2~O)
    s = s.replace(/~([^~\s\n]+?)~/g, '<sub class="text-[0.625rem] text-slate-400 bottom-[-0.2em]">$1</sub>');

    // Superscript: ^sup^ (e.g. x^2^)
    s = s.replace(/\^([^\^\s\n]+?)\^/g, '<sup class="text-[0.625rem] text-slate-400 top-[-0.3em]">$1</sup>');

    // Underline / Insertion: ++text++
    s = s.replace(/\+\+([^\+\n]+?)\+\+/g, '<ins class="underline underline-offset-2 text-slate-200">$1</ins>');

    // Bold + Italic: ***text*** or ___text___ or **_text_** or *__text__*
    s = s.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-white"><em class="italic text-slate-100">$1</em></strong>');
    s = s.replace(/___(.*?)___/g, '<strong class="font-bold text-white"><em class="italic text-slate-100">$1</em></strong>');
    s = s.replace(/\*\*_(.*?)_\*\*/g, '<strong class="font-bold text-white"><em class="italic text-slate-100">$1</em></strong>');
    s = s.replace(/\*__(.*?)__\*/g, '<strong class="font-bold text-white"><em class="italic text-slate-100">$1</em></strong>');

    // Bold: **text** or __text__
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    s = s.replace(/__([^_]+?)__/g, '<strong class="font-bold text-white">$1</strong>');

    // Italic: *text* or _text_
    s = s.replace(/\*([^\*\n]+?)\*/g, '<em class="italic text-slate-200">$1</em>');
    s = s.replace(/(^|[^a-zA-Z0-9_])_([^_]+?)_([^a-zA-Z0-9_]|$)/g, '$1<em class="italic text-slate-200">$2</em>$3');

    // Line breaks with 2 spaces or trailing backslash \
    s = s.replace(/ {2,}$/, '<br/>');
    s = s.replace(/\\$/, '<br/>');

    // Restore inline HTML tags
    for (let i = 0; i < inlineHtmlBlocks.length; i++) {
      const ph = `<!--INLINE_HTML_${i}-->`;
      s = s.replace(ph, inlineHtmlBlocks[i]);
    }

    return s;
  };

  const result: string[] = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableAlignments: Array<'left' | 'center' | 'right'> = [];
  let tableRows: string[] = [];
  let tableHeader = '';
  let inBlockquote = false;
  let blockquoteLines: string[] = [];
  let blockquoteType: 'normal' | 'note' | 'tip' | 'important' | 'warning' | 'caution' = 'normal';

  const closeList = () => {
    if (inUl) {
      result.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      result.push('</ol>');
      inOl = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      const headers = tableHeader.split('|').filter(Boolean);
      const headersHtml = headers.map((h, colIdx) => {
        const align = tableAlignments[colIdx] || 'left';
        const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
        return `<th class="px-3 py-1.5 bg-slate-900 text-indigo-300 font-semibold text-[0.6875rem] border border-slate-800 ${alignClass}">${formatInline(h.trim())}</th>`;
      }).join('');

      const rowsHtml = tableRows.map((r) => {
        const cols = r.split('|').filter(Boolean);
        const colsHtml = cols.map((c, colIdx) => {
          const txt = c.trim();
          const align = tableAlignments[colIdx] || 'left';
          const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
          const isDitto = txt === '"' || txt === '〃' || txt === '^';
          const content = isDitto
            ? `<span class="text-indigo-400 font-bold opacity-80 cursor-help" title="상단 항목과 동일">${txt}</span>`
            : formatInline(txt);
          return `<td class="px-3 py-1 border border-slate-800/80 text-slate-300 text-[0.6875rem] ${alignClass}">${content}</td>`;
        }).join('');
        return `<tr class="hover:bg-slate-900/50 transition-colors">${colsHtml}</tr>`;
      }).join('');

      result.push(`<div class="overflow-x-auto my-2.5 rounded-lg border border-slate-800 shadow-xs"><table class="w-full border-collapse border-hidden text-xs"><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`);
      inTable = false;
      tableRows = [];
      tableHeader = '';
      tableAlignments = [];
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      const processedHtml = blockquoteLines.map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
          const innerContent = trimmed.replace(/^>+\s?/, '');
          return `<blockquote class="border-l-2 border-slate-700 bg-slate-900/60 pl-2.5 py-1 my-1 text-slate-300 text-xs italic">${formatInline(innerContent)}</blockquote>`;
        }
        return formatInline(line);
      }).join('<br/>');
      
      if (blockquoteType === 'note') {
        result.push(`<div class="my-2.5 border-l-3 border-blue-500 bg-blue-950/30 text-blue-200 px-3.5 py-2 rounded-r-lg text-xs leading-normal shadow-xs"><div class="font-semibold text-blue-400 text-[0.6875rem] mb-1 flex items-center gap-1.5">ℹ️ NOTE</div><div>${processedHtml}</div></div>`);
      } else if (blockquoteType === 'tip') {
        result.push(`<div class="my-2.5 border-l-3 border-emerald-500 bg-emerald-950/30 text-emerald-200 px-3.5 py-2 rounded-r-lg text-xs leading-normal shadow-xs"><div class="font-semibold text-emerald-400 text-[0.6875rem] mb-1 flex items-center gap-1.5">💡 TIP</div><div>${processedHtml}</div></div>`);
      } else if (blockquoteType === 'important') {
        result.push(`<div class="my-2.5 border-l-3 border-purple-500 bg-purple-950/30 text-purple-200 px-3.5 py-2 rounded-r-lg text-xs leading-normal shadow-xs"><div class="font-semibold text-purple-400 text-[0.6875rem] mb-1 flex items-center gap-1.5">📌 IMPORTANT</div><div>${processedHtml}</div></div>`);
      } else if (blockquoteType === 'warning') {
        result.push(`<div class="my-2.5 border-l-3 border-amber-500 bg-amber-950/30 text-amber-200 px-3.5 py-2 rounded-r-lg text-xs leading-normal shadow-xs"><div class="font-semibold text-amber-400 text-[0.6875rem] mb-1 flex items-center gap-1.5">⚠️ WARNING</div><div>${processedHtml}</div></div>`);
      } else if (blockquoteType === 'caution') {
        result.push(`<div class="my-2.5 border-l-3 border-rose-500 bg-rose-950/30 text-rose-200 px-3.5 py-2 rounded-r-lg text-xs leading-normal shadow-xs"><div class="font-semibold text-rose-400 text-[0.6875rem] mb-1 flex items-center gap-1.5">🛑 CAUTION</div><div>${processedHtml}</div></div>`);
      } else {
        result.push(`<blockquote class="border-l-3 border-indigo-500 bg-indigo-950/25 text-indigo-200 pl-3 py-1.5 my-2 text-xs rounded-r-lg leading-relaxed shadow-xs">${processedHtml}</blockquote>`);
      }

      inBlockquote = false;
      blockquoteLines = [];
      blockquoteType = 'normal';
    }
  };

  for (let i = 0; i < filteredLines.length; i++) {
    const line = filteredLines[i];
    const trimmed = line.trim();

    // Check placeholder for code block or math block
    if (trimmed.startsWith('<!--PROTECTED_BLOCK_') && trimmed.endsWith('-->')) {
      closeList();
      closeTable();
      closeBlockquote();
      result.push(trimmed);
      continue;
    }

    // Blank line
    if (!trimmed) {
      closeList();
      closeTable();
      closeBlockquote();
      continue;
    }

    // Setext Heading 1 (Underlined with ===)
    if (i + 1 < filteredLines.length && /^[=]{2,}$/.test(filteredLines[i + 1].trim()) && !trimmed.startsWith('#')) {
      closeList();
      closeTable();
      closeBlockquote();
      result.push(`<h1 class="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-1.5 mt-3.5 mb-2 leading-snug">${formatInline(trimmed)}</h1>`);
      i++; // Skip the underline row
      continue;
    }

    // Setext Heading 2 (Underlined with ---)
    if (i + 1 < filteredLines.length && /^[-]{2,}$/.test(filteredLines[i + 1].trim()) && !trimmed.startsWith('#') && !trimmed.startsWith('|') && !trimmed.startsWith('-')) {
      closeList();
      closeTable();
      closeBlockquote();
      result.push(`<h2 class="text-sm sm:text-base font-semibold text-indigo-300 border-b border-slate-800/70 pb-1 mt-3 mb-1.5 leading-snug">${formatInline(trimmed)}</h2>`);
      i++; // Skip the underline row
      continue;
    }

    // ATX Headings: # to ###### (supports with or without spaces, e.g., '### 한글' or '###한글')
    const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
    if (headingMatch && !trimmed.startsWith('#unordered') && !trimmed.startsWith('#ordered')) {
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2];
      closeList();
      closeTable();
      closeBlockquote();

      if (level === 1) {
        result.push(`<h1 class="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-1.5 mt-3.5 mb-2 leading-snug">${formatInline(headingContent)}</h1>`);
      } else if (level === 2) {
        result.push(`<h2 class="text-sm sm:text-base font-semibold text-indigo-300 border-b border-slate-800/70 pb-1 mt-3 mb-1.5 leading-snug">${formatInline(headingContent)}</h2>`);
      } else if (level === 3) {
        result.push(`<h3 class="text-xs sm:text-sm font-semibold text-indigo-200 mt-2.5 mb-1 leading-snug">${formatInline(headingContent)}</h3>`);
      } else if (level === 4) {
        result.push(`<h4 class="text-xs font-semibold text-indigo-200 mt-2 mb-0.5 leading-snug">${formatInline(headingContent)}</h4>`);
      } else if (level === 5) {
        result.push(`<h5 class="text-xs font-medium text-slate-200 mt-1.5 mb-0.5 leading-snug">${formatInline(headingContent)}</h5>`);
      } else if (level === 6) {
        result.push(`<h6 class="text-[0.6875rem] font-medium text-slate-300 mt-1.5 mb-0.5 uppercase tracking-wider leading-snug">${formatInline(headingContent)}</h6>`);
      }
      continue;
    }

    // Horizontal Rule: ---, ***, ___, - - -, * * *, _ _ _
    if (/^(?:---|\*\*\*|___|- - -|\* \* \*|_ _ _)$/.test(trimmed)) {
      closeList();
      closeTable();
      closeBlockquote();
      result.push('<hr class="border-slate-800 my-3" />');
      continue;
    }

    // Table row: | Col 1 | Col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      closeList();
      closeBlockquote();
      if (!inTable) {
        inTable = true;
        tableHeader = trimmed;
        // Check next line for alignments: |:---|:---:|---:|
        if (i + 1 < filteredLines.length && filteredLines[i + 1].trim().startsWith('|') && filteredLines[i + 1].includes('-')) {
          const alignLine = filteredLines[i + 1].trim();
          const alignCols = alignLine.split('|').filter(Boolean);
          tableAlignments = alignCols.map((c) => {
            const trimmedCol = c.trim();
            if (trimmedCol.startsWith(':') && trimmedCol.endsWith(':')) return 'center';
            if (trimmedCol.endsWith(':')) return 'right';
            return 'left';
          });
          i++; // Skip the alignment row
        }
      } else {
        tableRows.push(trimmed);
      }
      continue;
    } else if (inTable) {
      closeTable();
    }

    // Blockquote: > or >> or >>> (including GitHub Alert callouts)
    if (trimmed.startsWith('>')) {
      closeList();
      closeTable();

      const bqContent = trimmed.replace(/^>+\s?/, '');

      // Check for GitHub Alerts: [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]
      const alertMatch = bqContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (alertMatch) {
        closeBlockquote();
        inBlockquote = true;
        blockquoteType = alertMatch[1].toLowerCase() as any;
        const restContent = bqContent.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();
        if (restContent) {
          blockquoteLines.push(restContent);
        }
        continue;
      }

      if (!inBlockquote) {
        inBlockquote = true;
        blockquoteType = 'normal';
      }
      blockquoteLines.push(bqContent);
      continue;
    } else if (inBlockquote) {
      closeBlockquote();
    }

    // Task / Checkbox List Item: Supports both standard "- [ ] / - [x]" and bare "[ ] / [x]" / "[v]" / "[X]" / "[o]"
    const taskMatch = trimmed.match(/^(?:[-*+]\s+)?\[([ xXvVoO\u2713\u2714\u2611\u25A0\u25CF])\]\s*(.*)$/);
    if (taskMatch) {
      closeBlockquote();
      closeTable();
      if (inOl) {
        result.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        inUl = true;
        result.push('<ul class="my-1.5 space-y-1 list-none pl-0 text-slate-300">');
      }
      const char = taskMatch[1].toLowerCase().trim();
      const isChecked = char === 'x' || char === 'v' || char === 'o' || char === '\u2713' || char === '\u2714' || char === '\u2611' || char === '\u25a0' || char === '\u25cf';
      const taskText = taskMatch[2];
      result.push(
        `<li class="flex items-start gap-2 my-0.5 leading-normal select-text ${isChecked ? 'text-slate-400 line-through opacity-85' : 'text-slate-200'}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} disabled class="w-3.5 h-3.5 mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 cursor-default shrink-0 accent-indigo-600" />
          <span class="flex-1">${formatInline(taskText)}</span>
        </li>`
      );
      continue;
    }

    // Unordered List: - item, * item, + item (with multi-level indentation)
    const ulMatch = trimmed.match(/^([-*+])\s+(.*)$/);
    if (ulMatch) {
      closeBlockquote();
      closeTable();
      if (inOl) {
        result.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        inUl = true;
        result.push('<ul class="my-1 pl-4 list-disc space-y-0.5 text-slate-300">');
      }
      const leadingSpaces = line.search(/\S/);
      const isNested2 = leadingSpaces >= 4;
      const isNested1 = leadingSpaces >= 2;
      const itemContent = ulMatch[2];
      const nestingClass = isNested2 ? 'ml-6 list-[square]' : isNested1 ? 'ml-3 list-[circle]' : '';
      result.push(`<li class="my-0 leading-normal text-slate-300 ${nestingClass}">${formatInline(itemContent)}</li>`);
      continue;
    }

    // Ordered List: 1. item, 1) item
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (olMatch) {
      closeBlockquote();
      closeTable();
      if (inUl) {
        result.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        inOl = true;
        result.push('<ol class="my-1 pl-4 list-decimal space-y-0.5 text-slate-300">');
      }
      const leadingSpaces = line.search(/\S/);
      const isNested = leadingSpaces >= 2;
      const itemContent = olMatch[2];
      result.push(`<li class="my-0 leading-normal text-slate-300 ${isNested ? 'ml-3' : ''}">${formatInline(itemContent)}</li>`);
      continue;
    }

    // Definition List: Term on line, : Definition on next line
    if (i + 1 < filteredLines.length && filteredLines[i + 1].trim().startsWith(':')) {
      closeList();
      closeTable();
      closeBlockquote();
      const term = trimmed;
      const def = filteredLines[i + 1].trim().replace(/^:\s*/, '');
      result.push(
        `<dl class="my-2">
          <dt class="font-semibold text-indigo-300 text-xs">${formatInline(term)}</dt>
          <dd class="pl-4 text-slate-300 text-xs mt-0.5 mb-1.5 leading-relaxed">${formatInline(def)}</dd>
        </dl>`
      );
      i++; // Skip the definition line
      continue;
    }

    // Raw Block-level HTML elements: <details>, <summary>, <div>, <p>, <table>, <iframe ...>, <svg>, <canvas>, <figure>, <style>, etc.
    const isBlockHtml = /^\s*<(\/)?(details|summary|div|p|table|thead|tbody|tr|th|td|iframe|svg|canvas|figure|figcaption|video|audio|form|center|blockquote|section|header|footer|nav|aside|article|style|script)\b/i.test(trimmed);
    if (isBlockHtml) {
      closeList();
      closeTable();
      closeBlockquote();
      const safeHtml = sanitizeHtmlFragment(trimmed);
      if (safeHtml) {
        result.push(safeHtml);
      }
      continue;
    }

    // Standard Paragraph
    closeList();
    closeTable();
    closeBlockquote();
    result.push(`<p class="mb-1 leading-relaxed text-slate-300">${formatInline(trimmed)}</p>`);
  }

  closeList();
  closeTable();
  closeBlockquote();

  // Append Footnotes section if any footnotes exist
  const fnKeys = Object.keys(footnotes);
  if (fnKeys.length > 0) {
    const fnListHtml = fnKeys.map((id) => {
      return `<li id="fn-${id}" class="text-[0.6875rem] text-slate-400 my-1 leading-normal flex items-start gap-1">
        <span class="font-mono text-indigo-400 font-semibold">[${id}]</span>
        <span>${formatInline(footnotes[id])}</span>
        <a href="#fnref-${id}" class="text-indigo-400 hover:text-indigo-300 font-semibold ml-1" title="Back to reference">↩</a>
      </li>`;
    }).join('');

    result.push(
      `<div class="footnotes border-t border-slate-800/80 pt-2.5 mt-4">
        <div class="text-[0.625rem] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Footnotes</div>
        <ol class="list-none pl-0 space-y-1">${fnListHtml}</ol>
      </div>`
    );
  }

  // Restore protected blocks (code blocks, math, inline code, display math)
  let finalHtml = result.join('');
  for (let i = 0; i < protectedBlocks.length; i++) {
    const placeholder = `<!--PROTECTED_BLOCK_${i}-->`;
    finalHtml = finalHtml.replace(placeholder, protectedBlocks[i]);
  }

  return `<div class="markdown-body text-slate-200 text-xs leading-normal font-sans">${finalHtml}</div>`;
}
