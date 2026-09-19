import DOMPurify from 'isomorphic-dompurify';

/**
 * Whitelist policy allowing standard Markdown formatting tags, tables,
 * code blocks, and math/formula nodes while strictly disallowing executable scripts.
 */
export const SANITIZER_ALLOWED_TAGS: string[] = [
  // Typography & Standard Markdown Formatting
  'b',
  'i',
  'em',
  'strong',
  'a',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  // Tables
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  // Code & Lists
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'span',
  'div',
  // Media & Extended Inline
  'img',
  'del',
  'ins',
  'mark',
  'sub',
  'sup',
  'kbd',
  'details',
  'summary',
  // Interactive Controls (Checklists & Copy Buttons)
  'input',
  'button',
  'svg',
  'path',
  // MathML / KaTeX Nodes
  'math',
  'semantics',
  'annotation',
  'mrow',
  'mi',
  'mo',
  'mn',
  'msup',
  'msub',
  'mfrac',
  'mover',
  'munder',
  'munderover',
  'mspace',
  'msqrt',
  'mtable',
  'mtr',
  'mtd',
  'mpadded',
  'mphantom',
  'menclose',
];

/**
 * Whitelist policy allowing safe layout and presentation attributes.
 */
export const SANITIZER_ALLOWED_ATTR: string[] = [
  'href',
  'target',
  'class',
  'style',
  'src',
  'alt',
  'title',
  'id',
  'type',
  'disabled',
  'checked',
  'open',
  'rel',
  'referrerpolicy',
  'width',
  'height',
  'align',
  'colspan',
  'rowspan',
  'viewBox',
  'fill',
  'stroke',
  'stroke-width',
  'd',
  'aria-hidden',
  'aria-label',
  'data-code',
];

/**
 * Explicitly banned executable or embedding tags.
 */
export const SANITIZER_FORBIDDEN_TAGS: string[] = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'base',
  'meta',
  'link',
  'form',
  'applet',
  'noscript',
];

/**
 * Explicitly banned inline event handlers and injection vectors.
 */
export const SANITIZER_FORBIDDEN_ATTR: string[] = [
  'onerror',
  'onload',
  'onclick',
  'onmouseover',
  'onmouseout',
  'ontoggle',
  'onfocus',
  'onblur',
  'onchange',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'srcdoc',
];

/**
 * Strict DOMPurify configuration object enforcing FORCE_BODY: true,
 * tag/attribute whitelisting, and disallowed URI protocols.
 */
export const STRICT_PURIFY_CONFIG = {
  ALLOWED_TAGS: SANITIZER_ALLOWED_TAGS,
  ALLOWED_ATTR: SANITIZER_ALLOWED_ATTR,
  FORBID_TAGS: SANITIZER_FORBIDDEN_TAGS,
  FORBID_ATTR: SANITIZER_FORBIDDEN_ATTR,
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: true,
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

// Register hook to guarantee link safety (anti-tabnabbing, no javascript: or dangerous data: URIs)
if (typeof DOMPurify.addHook === 'function') {
  DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    if (node.tagName === 'A') {
      const href = (node.getAttribute('href') || '').trim();
      const lower = href.toLowerCase();
      if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        (lower.startsWith('data:') && !lower.startsWith('data:image/'))
      ) {
        node.removeAttribute('href');
      } else if (href && !href.startsWith('#')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (node.tagName === 'IMG') {
      const src = (node.getAttribute('src') || '').trim();
      const lower = src.toLowerCase();
      if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        (lower.startsWith('data:') && !lower.startsWith('data:image/'))
      ) {
        node.removeAttribute('src');
      }
    }
  });
}

/**
 * Centralized sanitization utility.
 * Sanitizes HTML input against Cross-Site Scripting (XSS) while preserving
 * valid Markdown formatting, tables, math formulas, code blocks, and styling.
 */
export function sanitizeHtml(dirtyHtml: string, customConfig?: Record<string, any>): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }
  const config = customConfig
    ? { ...STRICT_PURIFY_CONFIG, ...customConfig, FORCE_BODY: true }
    : STRICT_PURIFY_CONFIG;

  return DOMPurify.sanitize(dirtyHtml, config);
}

/**
 * Validates and sanitizes a URL string, stripping javascript: and malicious protocols.
 */
export function sanitizeUrl(rawUrl: string): string {
  const url = (rawUrl || '').trim();
  if (!url) return '';

  const cleanUrl = url.replace(/[\u0000-\u001F\u007F-\u009F\s]/g, '');
  let decoded = cleanUrl;
  try {
    decoded = decodeURIComponent(cleanUrl);
  } catch {}

  decoded = decoded
    .replace(/&#x([0-9a-fA-F]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#([0-9]+);?/gi, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .toLowerCase();

  if (
    decoded.startsWith('javascript:') ||
    decoded.startsWith('vbscript:') ||
    (decoded.startsWith('data:') && !decoded.startsWith('data:image/'))
  ) {
    return '';
  }

  return cleanUrl;
}

export { DOMPurify };
