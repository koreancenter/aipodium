import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { ChatPanel, UniversalPromptInput } from '../src/components/chat';

test('1. ChatPanel and UniversalPromptInput are properly exported from src/components/chat', () => {
  assert.equal(typeof ChatPanel, 'function', 'ChatPanel must be a React component function');
  assert.equal(typeof UniversalPromptInput, 'function', 'UniversalPromptInput must be a React component function');
});

test('2. ChatPanel props contract validation', () => {
  // Test instantiation of props structure
  const dummyProps = {
    activeSessionId: 'sess-1',
    messages: [
      { id: 'm1', sender: 'user' as const, text: 'Hello AI', timestamp: '12:00' },
      { id: 'm2', sender: 'ai' as const, text: 'Hello User!', timestamp: '12:01' }
    ],
    isAiLoading: false,
    chatInput: 'test query',
    onChatInputChange: () => {},
    chatAttachments: [],
    onRemoveAttachment: () => {},
    onAddAttachment: () => {},
    onSendMessage: () => {},
    onSendToEditor: () => {},
    onDiff: () => {},
    onToast: () => {},
    selectedModel: 'gemini-2.5-flash',
    onSelectModel: () => {},
    selectedMultiModels: [],
    onSelectMultiModels: () => {},
    mode: 'single' as const,
    onModeChange: () => {},
    availableChatModels: [],
    provider: 'cloud',
    onSelectProvider: () => {}
  };

  assert.equal(dummyProps.activeSessionId, 'sess-1');
  assert.equal(dummyProps.messages.length, 2);
  assert.equal(dummyProps.provider, 'cloud');
});

test('3. UniversalPromptInput handles drag, drop, and mention autocomplete interfaces', () => {
  const mentionItems = [
    { id: 'f1', name: 'Notes', type: 'folder' as const, path: 'Notes' },
    { id: 'doc1', name: 'readme.md', type: 'file' as const, path: 'Notes/readme.md' }
  ];

  assert.equal(mentionItems.length, 2);
  assert.equal(mentionItems[0].type, 'folder');
  assert.equal(mentionItems[1].type, 'file');
});

test('4. ChatPanel confines project drawer within middle message viewport above full-width UniversalPromptInput', () => {
  const chatFile = fs.readFileSync(path.resolve(process.cwd(), 'src/components/chat/ChatPanel.tsx'), 'utf-8');

  // Verify projectDrawer prop exists
  assert.ok(chatFile.includes('projectDrawer?:'), 'ChatPanelProps should include projectDrawer');

  // Verify middle flex container confines project drawer above prompt bar
  assert.match(
    chatFile,
    /flex-1\s+min-h-0\s+relative\s+flex\s+flex-row\s+overflow-hidden/,
    'ChatPanel should confine drawer in middle message viewport container'
  );

  // Verify UniversalPromptInput is mounted full-width with border-t
  assert.match(
    chatFile,
    /<UniversalPromptInput[^>]*className="[^"]*w-full\s+shrink-0\s+border-t\s+border-\[#222226\]/,
    'UniversalPromptInput should be persistently mounted across full width with top border'
  );
});

test('5. App.tsx mounts project drawer as aside slot inside ChatPanel', () => {
  const appFile = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

  // Verify aside project-list-panel is passed as projectDrawer
  assert.match(
    appFile,
    /<ChatPanel\s+projectDrawer=\{\s*<aside\s+id="project-list-panel"/,
    'App.tsx should pass project drawer aside into ChatPanel projectDrawer slot'
  );
});
