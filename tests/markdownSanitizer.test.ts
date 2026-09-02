import test from 'node:test';
import assert from 'node:assert/strict';

import { renderMarkdownToHtml } from '../src/utils/markdownParser.ts';

test('strips inline event-handler attributes from HTML', () => {
  const html = renderMarkdownToHtml('<img src=x onerror=alert(1)>');
  assert.equal(html.includes('onerror'), false);
  assert.equal(html.includes('alert(1)'), false);
});

test('removes javascript: URLs from links and images', () => {
  const html = renderMarkdownToHtml('[click me](javascript:alert(1))\n\n![x](javascript:alert(1))');
  assert.equal(html.includes('javascript:'), false);
  assert.equal(html.includes('alert(1)'), false);
});
