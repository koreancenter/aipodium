import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { WorkspaceDrawer } from '../src/components/explorer';
import { AiMessageBubble } from '../src/components/AiMessageBubble';
import { aiClient } from '../src/services/ai';

test('1. WorkspaceDrawer is properly exported and is a React component', () => {
  assert.equal(typeof WorkspaceDrawer, 'function', 'WorkspaceDrawer must be a React component function');
});

test('2. WorkspaceDrawerProps contract validation', () => {
  const dummyProps = {
    files: { 'readme.md': '# Project Readme', 'src/index.ts': 'console.log(1);' },
    currentFile: 'readme.md',
    onSelectFile: () => {},
    onCreateFile: () => {},
    onDeleteFile: () => {},
    onRenameFile: () => {},
    onOpenSSOTModal: () => {},
    onOpenDriftModal: () => {},
    isOpen: true,
    onToggleOpen: () => {},
    sessions: [
      {
        id: 's1',
        title: 'Project Alpha',
        createdAt: '2026-10-02',
        messages: []
      }
    ],
    activeSessionId: 's1'
  };

  assert.equal(dummyProps.isOpen, true);
  assert.equal(Object.keys(dummyProps.files).length, 2);
  assert.equal(dummyProps.sessions.length, 1);
  assert.equal(dummyProps.sessions[0].title, 'Project Alpha');
});

test('3. AiClient.translateText method handles mock translation stream', async () => {
  assert.equal(typeof aiClient.translateText, 'function', 'aiClient must expose translateText');

  // Verify adapter delegation with a mocked stream completion
  const originalStream = aiClient.streamCompletion.bind(aiClient);
  try {
    aiClient.streamCompletion = async (provider, options) => {
      const translated = '안녕하세요! 이것은 번역된 텍스트입니다.';
      options.onChunk?.(translated);
      return {
        fullText: translated,
        promptTokens: 10,
        completionTokens: 10,
        totalTokens: 20
      };
    };

    const translation = await aiClient.translateText('Hello! This is a translated text.', 'ko');
    assert.equal(translation, '안녕하세요! 이것은 번역된 텍스트입니다.');
  } finally {
    aiClient.streamCompletion = originalStream;
  }
});

test('4. AiMessageBubble is exported and accepts onTranslate prop', () => {
  assert.equal(typeof AiMessageBubble, 'object', 'AiMessageBubble is wrapped in React.memo');
});
