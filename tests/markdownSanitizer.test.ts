import test from 'node:test';
import assert from 'node:assert/strict';

import { renderMarkdownToHtml } from '../src/utils/markdownParser.ts';
import { sanitizeHtml, sanitizeUrl } from '../src/utils/securitySanitizer.ts';

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

test('strips raw <script>alert(1)</script> payloads cleanly', () => {
  const md = '# Document Title\n<script>alert(1)</script>\nLegitimate paragraph content.';
  const html = renderMarkdownToHtml(md);
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('</script>'), false);
  assert.equal(html.includes('alert(1)'), false);
  assert.equal(html.includes('Legitimate paragraph content.'), true);
});

test('strips <a href="javascript:alert(1)">Click</a> directly via sanitizeHtml and renderMarkdownToHtml', () => {
  const rawHtml = '<a href="javascript:alert(1)">Click Me</a>';
  const sanitized = sanitizeHtml(rawHtml);
  assert.equal(sanitized.includes('javascript:'), false);
  assert.equal(sanitized.includes('alert(1)'), false);
  assert.equal(sanitized.includes('Click Me'), true);

  const mdHtml = renderMarkdownToHtml(rawHtml);
  assert.equal(mdHtml.includes('javascript:'), false);
  assert.equal(mdHtml.includes('alert(1)'), false);
  assert.equal(mdHtml.includes('Click Me'), true);
});

test('preserves legitimate Markdown tables, alignment, and cell content', () => {
  const tableMd = `
| 헤더 1 | 헤더 2 | 헤더 3 |
| :--- | :---: | ---: |
| 왼쪽 정렬 | 중앙 정렬 | **굵은 텍스트** |
| *기울임* | \`인라인 코드\` | 123,456원 |
`.trim();

  const html = renderMarkdownToHtml(tableMd);
  assert.equal(html.includes('<table'), true);
  assert.equal(html.includes('<thead'), true);
  assert.equal(html.includes('<tbody'), true);
  assert.equal(html.includes('헤더 1'), true);
  assert.equal(html.includes('왼쪽 정렬'), true);
  assert.equal(html.includes('굵은 텍스트'), true);
  assert.equal(html.includes('인라인 코드'), true);
  assert.equal(html.includes('123,456원'), true);
});

test('preserves legitimate code blocks without escaping code characters', () => {
  const codeMd = '```typescript\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```';
  const html = renderMarkdownToHtml(codeMd);
  assert.equal(html.includes('<pre'), true);
  assert.equal(html.includes('<code'), true);
  assert.equal(html.includes('function add'), true);
  assert.equal(html.includes('return a + b;'), true);
});

test('preserves inline styling and standard markdown tags safely', () => {
  const input = '<p><span style="color: rgb(239, 68, 68); font-weight: bold;">주의사항</span>: <em>중요 안내문</em></p>';
  const sanitized = sanitizeHtml(input);
  assert.equal(sanitized.includes('color: rgb(239, 68, 68)'), true);
  assert.equal(sanitized.includes('주의사항'), true);
  assert.equal(sanitized.includes('<em>중요 안내문</em>'), true);
});

test('sanitizeUrl utility properly strips malicious and bypass URLs', () => {
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('JAVASCRIPT:alert(1)'), '');
  assert.equal(sanitizeUrl('jav&#x61;script:alert(1)'), '');
  assert.equal(sanitizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), '');
  assert.equal(sanitizeUrl('https://example.com/document.pdf'), 'https://example.com/document.pdf');
  assert.equal(sanitizeUrl('#section-1'), '#section-1');
});

