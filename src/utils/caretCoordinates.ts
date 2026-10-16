/**
 * Precise Caret & Selection Coordinates Calculator for HTMLTextAreaElement
 * Accurately mirrors textarea styles, font-size, line-height, text-wrapping, and whitespace
 * to calculate exact pixel coordinates for floating bubble menus and autocomplete popovers.
 */

const PROPERTIES_TO_COPY = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize'
] as const;

let mirrorDiv: HTMLDivElement | null = null;

function getMirrorDiv(): HTMLDivElement {
  if (!mirrorDiv) {
    mirrorDiv = document.createElement('div');
    mirrorDiv.id = 'textarea-caret-position-mirror';
    mirrorDiv.style.position = 'absolute';
    mirrorDiv.style.top = '-9999px';
    mirrorDiv.style.left = '-9999px';
    mirrorDiv.style.visibility = 'hidden';
    mirrorDiv.style.pointerEvents = 'none';
    mirrorDiv.style.whiteSpace = 'pre-wrap';
    mirrorDiv.style.wordWrap = 'break-word';
    document.body.appendChild(mirrorDiv);
  }
  return mirrorDiv;
}

export interface SelectionCoordinates {
  /** Top coordinate of the selection relative to textarea container viewport */
  top: number;
  /** Bottom coordinate of the selection relative to textarea container viewport */
  bottom: number;
  /** Horizontal center coordinate of the selection relative to textarea container viewport */
  left: number;
  /** Start X position */
  startX: number;
  /** End X position */
  endX: number;
  /** Line height of the selected text */
  lineHeight: number;
}

export function getTextareaSelectionCoordinates(
  element: HTMLTextAreaElement,
  selectionStart: number,
  selectionEnd: number
): SelectionCoordinates {
  const div = getMirrorDiv();
  const style = window.getComputedStyle(element);

  // Copy relevant styles
  PROPERTIES_TO_COPY.forEach((prop) => {
    (div.style as any)[prop] = style[prop as any];
  });

  // Handle Firefox scrollbar width differences and border-box
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.overflowWrap = 'anywhere';
  div.style.width = `${element.clientWidth}px`; // Use clientWidth to exclude scrollbars

  const text = element.value;
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));

  // Build mirror content with marker spans
  div.textContent = '';

  const textBefore = text.slice(0, start);
  const selectedText = text.slice(start, end);
  const textAfter = text.slice(end);

  const beforeNode = document.createTextNode(textBefore);
  div.appendChild(beforeNode);

  const span = document.createElement('span');
  span.textContent = selectedText.length > 0 ? selectedText : '\u200B'; // zero-width space if empty
  div.appendChild(span);

  const afterNode = document.createTextNode(textAfter);
  div.appendChild(afterNode);

  const spanOffsetTop = span.offsetTop;
  const spanOffsetLeft = span.offsetLeft;
  const spanOffsetWidth = span.offsetWidth;
  const spanOffsetHeight = span.offsetHeight;

  const parsedLineHeight = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.65) || 24;

  // Calculate coordinates relative to visible viewport of textarea
  const visibleTop = spanOffsetTop - element.scrollTop;
  const visibleBottom = visibleTop + (spanOffsetHeight || parsedLineHeight);
  const startX = spanOffsetLeft - element.scrollLeft;
  const endX = startX + spanOffsetWidth;
  const centerX = startX + (spanOffsetWidth > 0 ? spanOffsetWidth / 2 : 0);

  return {
    top: visibleTop,
    bottom: visibleBottom,
    left: centerX,
    startX,
    endX,
    lineHeight: spanOffsetHeight || parsedLineHeight
  };
}
