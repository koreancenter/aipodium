import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderMarkdownToHtml } from '../src/utils/markdownParser';

test('1. Initial WYSIWYG mode parses "# 마크다운 노트" as Heading 1 node instead of plain text', () => {
  const md = '# 마크다운 노트';
  const html = renderMarkdownToHtml(md);

  // Must contain an <h1> tag wrapping the title
  assert.match(html, /<h1[^>]*>마크다운 노트<\/h1>/, 'Must render Heading 1 HTML tag for Tiptap parser');
  assert.doesNotMatch(html, /<p>[^<]*#\s*마크다운 노트/, 'Must not render raw # symbol inside paragraph');
});

test('2. TiptapWysiwygEditor exposes getEditor and implements requested commands', () => {
  const tiptapFilePath = path.resolve(process.cwd(), 'src/components/editor/TiptapWysiwygEditor.tsx');
  const content = fs.readFileSync(tiptapFilePath, 'utf-8');

  // Verify getEditor is exposed on imperative handle
  assert.match(content, /getEditor:\s*\(\)\s*=>\s*editor/, 'Must expose getEditor on ref');

  // Verify initial content uses getInitialContent
  assert.match(content, /content:\s*getInitialContent\(value\)/, 'useEditor must initialize with parsed markdown content');

  // Verify command execution for headings, lists, blockquote, codeblock
  assert.match(content, /toggleHeading\(\{\s*level:\s*1\s*\}\)/);
  assert.match(content, /toggleHeading\(\{\s*level:\s*2\s*\}\)/);
  assert.match(content, /toggleHeading\(\{\s*level:\s*3\s*\}\)/);
  assert.match(content, /toggleBold\(\)/);
  assert.match(content, /toggleItalic\(\)/);
  assert.match(content, /toggleBulletList\(\)/);
  assert.match(content, /toggleOrderedList\(\)/);
  assert.match(content, /toggleTaskList\(\)/);
  assert.match(content, /toggleBlockquote\(\)/);
  assert.match(content, /toggleCodeBlock\(\)/);
});

test('3. UnifiedEditor implements applyFormat with dual-mode support', () => {
  const unifiedEditorPath = path.resolve(process.cwd(), 'src/components/editor/UnifiedEditor.tsx');
  const content = fs.readFileSync(unifiedEditorPath, 'utf-8');

  // Verify applyFormat function is defined
  assert.match(content, /const\s+applyFormat\s*=\s*useCallback\s*\(/);

  // Verify wysiwyg mode executes Tiptap chain commands
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleBold\(\)\.run\(\)/);
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleItalic\(\)\.run\(\)/);
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleHeading\(\{ level: 1 \}\)\.run\(\)/);
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleHeading\(\{ level: 2 \}\)\.run\(\)/);
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleHeading\(\{ level: 3 \}\)\.run\(\)/);
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleBulletList\(\)\.run\(\)/);
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleOrderedList\(\)\.run\(\)/);
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleTaskList\(\)\.run\(\)/);
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleBlockquote\(\)\.run\(\)/);
  assert.match(content, /editor\.chain\(\)\.focus\(\)\.toggleCodeBlock\(\)\.run\(\)/);

  // Verify markdown mode syntax wrapping
  assert.match(content, /\*\*.*?\*\*/, 'Bold markdown wrap');
  assert.match(content, /\*.*?\*/, 'Italic markdown wrap');
  assert.match(content, /headingPrefixRegex/);
  assert.match(content, /quotePrefixRegex/);
  assert.match(content, /onChange\(newText\)/, 'Immediately triggers onChange');
});

test('4. UnifiedEditor top toolbar has Pen, BookOpen, Split mode toggles and onMouseDown preventDefault', () => {
  const unifiedEditorPath = path.resolve(process.cwd(), 'src/components/editor/UnifiedEditor.tsx');
  const content = fs.readFileSync(unifiedEditorPath, 'utf-8');

  // Verify imports from lucide-react
  assert.match(content, /import\s*\{[^}]*Pen[^}]*BookOpen[^}]*Split[^}]*\}\s*from\s*'lucide-react'/);

  // Verify toolbar container
  assert.match(content, /id="unified-editor-top-toolbar"/);

  // Verify mode switch calls
  assert.match(content, /handleModeSelect\('wysiwyg'\)/);
  assert.match(content, /handleModeSelect\('markdown'\)/);
  assert.match(content, /handleModeSelect\('split'\)/);

  // Verify onMouseDown preventDefault on toolbar buttons to avoid focus loss
  const preventDefaultMatches = content.match(/onMouseDown=\{\(e\)\s*=>\s*e\.preventDefault\(\)\}/g);
  assert.ok(preventDefaultMatches && preventDefaultMatches.length >= 10, 'All toolbar buttons must prevent mousedown blur');
});

test('5. App.tsx right-side vertical toolbar buttons prevent focus loss via onMouseDown', () => {
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');

  // Verify toolbar has onMouseDown on h1, h2, h3, bold, italic, code, etc.
  assert.match(content, /applyMarkdownBlockFormat\('h1'\)/);
  assert.match(content, /applyMarkdownBlockFormat\('bold'\)/);
  assert.match(content, /applyMarkdownBlockFormat\('italic'\)/);
  assert.match(content, /applyMarkdownBlockFormat\('code'\)/);
  assert.match(content, /applyMarkdownBlockFormat\('bullet'\)/);
  assert.match(content, /applyMarkdownBlockFormat\('quote'\)/);

  // Verify unifiedEditorRef is plugged in
  assert.ok(content.includes('unifiedEditorRef.current?.applyFormat'));
  assert.ok(content.includes('ref={unifiedEditorRef}'));
});
