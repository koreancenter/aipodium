import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getCoreTranslations } from '../src/locales/coreLocale';

const readWorkspaceFile = (relPath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8');

test('1. EditorSelectionContext and ChatMessage.selectionContext are defined in src/types.ts', () => {
  const typesContent = readWorkspaceFile('src/types.ts');
  assert.match(typesContent, /export\s+interface\s+EditorSelectionContext\s*\{/);
  assert.match(typesContent, /text:\s*string;/);
  assert.match(typesContent, /mode\?:\s*'wysiwyg'\s*\|\s*'edit'\s*\|\s*'split'\s*\|\s*'preview'/);
  assert.match(typesContent, /selectionContext\?:\s*\{[\s\S]*text:\s*string;[\s\S]*fileName\?:\s*string;/);
});

test('2. TiptapWysiwygEditor tracks selection, preserves on blur, and renders TextFloatingBubbleMenu for inline AI edit', () => {
  const tiptapContent = readWorkspaceFile('src/components/editor/TiptapWysiwygEditor.tsx');
  assert.match(tiptapContent, /onSelectionChange\?:/);
  assert.match(tiptapContent, /onAiEditText\?:/);
  assert.match(tiptapContent, /onSelectionUpdate:\s*\(\{\s*editor:\s*currentEditor\s*\}\)\s*=>/);
  assert.match(tiptapContent, /if\s*\(currentEditor\.isFocused\)\s*\{\s*selectionRangeRef\.current\s*=\s*null;\s*onSelectionChangeRef\.current\?\.\(null\);/);
  assert.match(tiptapContent, /<TextFloatingBubbleMenu/);
  assert.match(tiptapContent, /insertContentAt\(\{\s*from,\s*to\s*\},\s*contentToInsert\)/);
});

test('3. OptimizedEditor preserves textarea selection range and fixes executeAiTask across WebLLM, Ollama, BYOK, and server fallback', () => {
  const optContent = readWorkspaceFile('src/components/editor/OptimizedEditor.tsx');
  assert.match(optContent, /activeSelectionRangeRef/);
  assert.match(optContent, /if\s*\(!textarea\s*\|\|\s*document\.activeElement\s*===\s*textarea\)/);
  assert.match(optContent, /aiClient\.streamCompletion\('webllm'/);
  assert.match(optContent, /data\?\.usage\?\.costEstimate\?\.includes\('로컬 안내 모드'\)/);
  assert.match(optContent, /overrideTargetText\?:\s*string/);
  assert.match(optContent, /window\.getSelection\(\)\?\.toString\(\)/);
  assert.match(optContent, /onAiEditText=\{\(prompt,\s*targetText\)\s*=>\s*handleAiTextEdit\(prompt,\s*targetText\)\}/);
});

test('4. UnifiedEditor, ChatPanel, UniversalPromptInput, and App.tsx wire end-to-end selection sharing', () => {
  const unifiedContent = readWorkspaceFile('src/components/editor/UnifiedEditor.tsx');
  assert.match(unifiedContent, /onSelectionChange\?:/);
  assert.match(unifiedContent, /onSelectionChange=\{onSelectionChange\}/);

  const promptContent = readWorkspaceFile('src/components/chat/UniversalPromptInput.tsx');
  assert.match(promptContent, /id="editor-selection-context-bar"/);
  assert.match(promptContent, /onClearEditorSelection/);

  const chatPanelContent = readWorkspaceFile('src/components/chat/ChatPanel.tsx');
  assert.match(chatPanelContent, /msg\.selectionContext\?\.text/);
  assert.match(chatPanelContent, /editorSelection=\{editorSelection\}/);

  const appContent = readWorkspaceFile('src/App.tsx');
  assert.match(appContent, /const\s*\[editorSelection,\s*setEditorSelection\]\s*=\s*useState<EditorSelectionContext\s*\|\s*null>\(null\)/);
  assert.match(appContent, /\[Selected Editor Text/);
  assert.match(appContent, /onSelectionChange=\{handleEditorSelectionChange\}/);
  assert.match(appContent, /editorSelection=\{editorSelection\}/);
});

test('5. Selection context Korean UI labels adhere to AGENTS.md pure Korean convention', () => {
  const koChat = getCoreTranslations('ko').chat;
  assert.equal(koChat.selectionContextLabel, '에디터 선택 영역');
  assert.equal(koChat.clearSelectionContext, '선택 영역 컨텍스트 해제');
  assert.doesNotMatch(koChat.selectionContextLabel, /\([A-Za-z]+\)/);
  assert.doesNotMatch(koChat.clearSelectionContext, /\([A-Za-z]+\)/);
  assert.doesNotMatch(koChat.selectionIncluded, /\([A-Za-z]+\)/);
});
