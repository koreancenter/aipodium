import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isWebOrGitHubUrl,
  normalizeLinkUrl,
  convertGitHubUrlToRaw,
  formatLinkReferenceBlock
} from '../src/services/externalLinkService.js';
import type { ChatAttachment } from '../src/types.js';

// Helper matching handleSendMessage in App.tsx
function buildFinalPromptWithLinks(userMessageText: string, attachedFiles: ChatAttachment[]): string {
  let finalPrompt = userMessageText;
  if (attachedFiles.length > 0) {
    const contextBlock = attachedFiles
      .map((file) => {
        if (file.type === 'link') {
          return `\n\n--- [Reference Web/Repo: ${file.url || file.name}] ---\n${file.parsedMarkdown || file.content || ''}\n--- [End] ---\n`;
        }
        return `\n\n--- [Attached Document: ${file.name}] ---\n${file.parsedMarkdown || file.content || ''}\n--- [End of Document] ---\n`;
      })
      .join('\n');
    finalPrompt = `${finalPrompt}\n\n[Reference Context]:\n${contextBlock}`;
  }
  return finalPrompt;
}

test('External Link Ingestion Pipeline & Model Selector', async (t) => {
  await t.test('isWebOrGitHubUrl correctly detects valid URLs and rejects invalid strings', () => {
    assert.equal(isWebOrGitHubUrl('https://github.com/owner/repo'), true);
    assert.equal(isWebOrGitHubUrl('github.com/owner/repo/blob/main/src/App.tsx'), true);
    assert.equal(isWebOrGitHubUrl('https://news.ycombinator.com'), true);
    assert.equal(isWebOrGitHubUrl('http://example.com/docs'), true);
    assert.equal(isWebOrGitHubUrl('plain text not a url'), false);
    assert.equal(isWebOrGitHubUrl(''), false);
  });

  await t.test('normalizeLinkUrl adds https protocol where appropriate', () => {
    assert.equal(normalizeLinkUrl('github.com/owner/repo'), 'https://github.com/owner/repo');
    assert.equal(normalizeLinkUrl('https://example.com'), 'https://example.com');
  });

  await t.test('convertGitHubUrlToRaw converts blob URLs to raw.githubusercontent.com', () => {
    const blobUrl = 'https://github.com/facebook/react/blob/main/packages/react/src/React.js';
    const result = convertGitHubUrlToRaw(blobUrl);

    assert.equal(result.isGitHub, true);
    assert.equal(result.isFile, true);
    assert.equal(
      result.rawUrl,
      'https://raw.githubusercontent.com/facebook/react/main/packages/react/src/React.js'
    );
  });

  await t.test('convertGitHubUrlToRaw identifies repo root without rawUrl', () => {
    const repoUrl = 'https://github.com/facebook/react';
    const result = convertGitHubUrlToRaw(repoUrl);

    assert.equal(result.isGitHub, true);
    assert.equal(result.isFile, false);
  });

  await t.test('formatLinkReferenceBlock outputs exact required format', () => {
    const url = 'https://github.com/facebook/react';
    const content = '# React Library\nA JavaScript library for building user interfaces';
    const formatted = formatLinkReferenceBlock(url, content);

    assert.ok(formatted.includes('--- [Reference Web/Repo: https://github.com/facebook/react] ---'));
    assert.ok(formatted.includes('# React Library'));
    assert.ok(formatted.includes('--- [End] ---'));
  });

  await t.test('buildFinalPromptWithLinks formats link attachments as Reference Web/Repo blocks', () => {
    const userText = '이 라이브러리의 아키텍처를 분석해줘';
    const attachments: ChatAttachment[] = [
      {
        id: 'link-1',
        name: 'React Repo',
        url: 'https://github.com/facebook/react',
        type: 'link',
        size: '12.4 KB',
        content: '# React Documentation\nDeclarative and component-based',
        isParsing: false,
      },
    ];

    const prompt = buildFinalPromptWithLinks(userText, attachments);

    assert.ok(prompt.includes('이 라이브러리의 아키텍처를 분석해줘'));
    assert.ok(prompt.includes('[Reference Context]:'));
    assert.ok(prompt.includes('--- [Reference Web/Repo: https://github.com/facebook/react] ---'));
    assert.ok(prompt.includes('# React Documentation'));
    assert.ok(prompt.includes('--- [End] ---'));
    assert.equal(prompt.includes('--- [Attached Document:'), false);
  });

  await t.test('buildFinalPromptWithLinks handles mixed file and link attachments seamlessly', () => {
    const userText = '참조 자료와 로컬 문서를 비교 분석해줘';
    const attachments: ChatAttachment[] = [
      {
        id: 'att-file',
        name: 'local_notes.md',
        type: 'file',
        size: '1.5 KB',
        parsedMarkdown: '로컬 프로젝트 요구사항 정의서',
        isParsing: false,
      },
      {
        id: 'att-link',
        name: 'OpenAI Spec',
        url: 'https://platform.openai.com/docs',
        type: 'link',
        size: '8.2 KB',
        content: 'OpenAI Developer Documentation',
        isParsing: false,
      },
    ];

    const prompt = buildFinalPromptWithLinks(userText, attachments);

    assert.ok(prompt.includes('--- [Attached Document: local_notes.md] ---'));
    assert.ok(prompt.includes('--- [End of Document] ---'));
    assert.ok(prompt.includes('--- [Reference Web/Repo: https://platform.openai.com/docs] ---'));
    assert.ok(prompt.includes('OpenAI Developer Documentation'));
    assert.ok(prompt.includes('--- [End] ---'));
  });

  await t.test('Inline model selector label generation logic', () => {
    // Helper function matching InlineModelSelector label logic
    const getChipLabel = (
      selectedModel: string,
      selectedMultiModels: string[],
      mode: 'single' | 'routing' | 'multi'
    ) => {
      const isMulti = mode === 'multi' || selectedMultiModels.length >= 2;
      if (isMulti && selectedMultiModels.length >= 2) {
        return `${selectedMultiModels[0]} +${selectedMultiModels.length - 1}`;
      }
      return selectedModel;
    };

    // Single model
    assert.equal(getChipLabel('gemini-2.5-flash', ['gemini-2.5-flash'], 'single'), 'gemini-2.5-flash');

    // Multiple models
    assert.equal(
      getChipLabel('gemini-2.5-flash', ['gemini-2.5-flash', 'gemini-2.5-pro'], 'multi'),
      'gemini-2.5-flash +1'
    );
    assert.equal(
      getChipLabel('gemini-2.5-flash', ['gemini-2.5-flash', 'ollama-qwen', 'webllm'], 'multi'),
      'gemini-2.5-flash +2'
    );
  });
});
