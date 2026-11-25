import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isWebOrGitHubUrl,
  normalizeLinkUrl,
  convertGitHubUrlToRaw,
  formatLinkReferenceBlock
} from '../src/services/externalLinkService.js';
import {
  appendModelIfMissing,
  getModelSelectorLabel,
  isModelSelected,
  normalizeModelIds,
} from '../src/utils/modelSelectorUtils.js';
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
    assert.equal(getModelSelectorLabel('single', 1, 'Gemini 2.5 Flash'), 'Gemini 2.5 Flash');
    assert.equal(getModelSelectorLabel('multi', 2, 'Gemini 2.5 Flash'), 'Gemini 2.5 Flash +1');
    assert.equal(getModelSelectorLabel('multi', 3, 'Gemini 2.5 Flash'), 'Gemini 2.5 Flash +2');
    assert.equal(getModelSelectorLabel('routing', 2, 'Gemini 2.5 Flash'), '자동 라우팅 2');
  });

  await t.test('Model selector normalizes legacy IDs and keeps fallback selection idempotent', () => {
    assert.deepEqual(
      normalizeModelIds(['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-pro']),
      ['gemini-2.5-flash', 'gemini-2.5-pro']
    );
    assert.equal(
      isModelSelected(
        'gemini-2.5-flash',
        'gemini-3.8-flash',
        ['gemini-2.5-pro'],
        'single'
      ),
      true
    );
    assert.deepEqual(
      appendModelIfMissing(['qwen2.5:latest'], 'qwen2.5:latest'),
      { modelIds: ['qwen2.5:latest'], added: false }
    );
    assert.deepEqual(
      appendModelIfMissing(['llama3.2:latest'], 'qwen2.5:latest'),
      { modelIds: ['llama3.2:latest', 'qwen2.5:latest'], added: true }

    );
  });

  await t.test('Local AI omits fake preset tags and verifies empty-state detection', () => {
    const selectorFile = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/InlineModelSelector.tsx'),
      'utf-8'
    );

    assert.doesNotMatch(
      selectorFile,
      /DEFAULT_LOCAL_TAGS|qwen2\.5:latest|llama3\.2:latest|deepseek-r1:latest/,
      'InlineModelSelector must not render fake preset Ollama tags'
    );
    assert.doesNotMatch(
      selectorFile,
      /renderUnconfiguredAccordion|tabUnconfiguredList|키 설정 필요 모델/,
      'InlineModelSelector must not render unconfigured models accordion'
    );
    assert.ok(
      selectorFile.includes('감지된 로컬 Ollama 모델 없음'),
      'Local tab must show understated empty-state row when no Ollama models are detected'
    );
    assert.ok(
      selectorFile.includes('연결된 클라우드 모델이 없습니다') &&
        selectorFile.includes('API 키 등록하기'),
      'Cloud empty state must display calm message and API key registration button'
    );
  });

  await t.test('InlineModelSelector popover dynamic boundary, scrollbar-none, and scrollable flex viewport', () => {
    const selectorFile = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/InlineModelSelector.tsx'),
      'utf-8'
    );

    // Verify dynamic height and matte precision command palette surface
    assert.match(
      selectorFile,
      /w-\[340px\]\s+min-w-\[340px\]\s+max-w-\[340px\]\s+h-auto\s+max-h-\[360px\]\s+flex\s+flex-col\s+bg-\[var\(--bg-elevated\)\]\/95\s+backdrop-blur-xl\s+border\s+border-white\/\[0\.09\]\s+shadow-\[0_24px_48px_-12px_rgba\(0,0,0,0\.85\)\]\s+rounded-xl\s+overflow-hidden/,
      'Outer popover container must enforce dynamic compact height and matte precision command palette glass surface'
    );

    // Verify borderless command search header slot
    assert.match(
      selectorFile,
      /shrink-0\s+px-3\.5\s+py-2\.5\s+border-b\s+border-white\/\[0\.06\]/,
      'Header slot must have borderless command search row with hairline divider'
    );

    // Verify scrollable body viewport with scrollbar-none
    assert.match(
      selectorFile,
      /flex-1\s+min-h-0\s+overflow-y-auto\s+scrollbar-none\s+p-2\s+space-y-0\.5/,
      'Body flex child must have flex-1 min-h-0 overflow-y-auto scrollbar-none p-2 space-y-0.5'
    );

    // Verify de-duplicated minimal utility footer slot
    assert.match(
      selectorFile,
      /shrink-0\s+px-3\.5\s+py-2\s+border-t\s+border-white\/\[0\.06\]\s+flex/,
      'Footer slot must have minimal utility bar'
    );

    // Verify AI Model trigger button shows only model name without left Sparkles icon
    assert.doesNotMatch(
      selectorFile,
      /<Sparkles[^>]*\/>\s*<span[^>]*>\{chipLabel\}/,
      'Trigger button must not render Sparkles icon to the left of the model name'
    );
  });
});
