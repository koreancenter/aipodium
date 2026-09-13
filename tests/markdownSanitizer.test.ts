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

test('neutralizes nested script tag bypass attempts', () => {
  const html = renderMarkdownToHtml('<scr<script>ipt>alert(1)</scr</script>ipt>');
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('alert(1)'), false);
});

test('blocks obfuscated entity-encoded javascript URLs', () => {
  const html = renderMarkdownToHtml('[click me](jav&#x61;script:alert(1))');
  assert.equal(html.includes('javascript:'), false);
  assert.equal(html.includes('alert(1)'), false);
});

test('blocks dangerous data:text/html URIs in links', () => {
  const html = renderMarkdownToHtml('[dangerous](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)');
  assert.equal(html.includes('data:text/html'), false);
});

test('strips ontoggle and other obscure event handlers on HTML elements', () => {
  const html = renderMarkdownToHtml('<details ontoggle="alert(1)" open><summary>Details</summary>Body</details>');
  assert.equal(html.includes('ontoggle'), false);
  assert.equal(html.includes('alert(1)'), false);
  assert.equal(html.includes('Details'), true);
});

test('safely renders math formulas while preventing injection', () => {
  const html = renderMarkdownToHtml('$$E = mc^2$$');
  assert.equal(html.includes('katex'), true);
  assert.equal(html.includes('E'), true);
});
