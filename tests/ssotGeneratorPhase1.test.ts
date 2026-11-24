import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveSSOTSourceContext, resolveSSOTProvider, isModelConnected, getVendorForModel } from '../src/components/SSOTGeneratorModal';
import { WEB_LLM_MODEL_ID } from '../src/utils/webllmService';

test('1. SSOT Generator Empty Session: falls back to active editorContent when selectedFiles is empty', () => {
  const result = resolveSSOTSourceContext({
    selectedFiles: [],
    availableFiles: [],
    files: {},
    editorContent: '# Active Draft\n\nThis is content directly from the editor.',
    sessions: [
      {
        id: 'session-1',
        title: 'Project Alpha',
        messages: []
      }
    ],
    activeSessionId: 'session-1'
  });

  assert.equal(result.isValid, true);
  assert.equal(result.errorMessage, undefined);
  assert.ok(result.sourceContent.includes('### Active Editor Content:'));
  assert.ok(result.sourceContent.includes('# Active Draft'));
});

test('2. SSOT Generator Empty Session: falls back to active session assistant messages when editor is empty', () => {
  const result = resolveSSOTSourceContext({
    selectedFiles: [],
    availableFiles: [],
    files: {},
    editorContent: '   ',
    sessions: [
      {
        id: 'session-1',
        title: 'Project Alpha',
        messages: [
          { role: 'user', content: '기획서 초안 작성해줘' },
          { role: 'assistant', content: '## 프로젝트 개요\n\n핵심 아키텍처 및 요구사항 명세서입니다.' }
        ]
      }
    ],
    activeSessionId: 'session-1'
  });

  assert.equal(result.isValid, true);
  assert.equal(result.errorMessage, undefined);
  assert.ok(result.chatContext.includes('## 프로젝트 개요'));
  assert.ok(result.chatContext.includes('핵심 아키텍처 및 요구사항 명세서입니다.'));
});

test('3. SSOT Generator: safely falls back to sessions[0] when activeSessionId does not match', () => {
  const result = resolveSSOTSourceContext({
    selectedFiles: [],
    availableFiles: [],
    files: {},
    editorContent: '',
    sessions: [
      {
        id: 'fallback-session',
        title: 'Default First Session',
        messages: [
          { role: 'assistant', content: '첫 번째 세션의 AI 생성 기준 지식입니다.' }
        ]
      }
    ],
    activeSessionId: 'non-existent-session-id'
  });

  assert.equal(result.isValid, true);
  assert.ok(result.chatContext.includes('첫 번째 세션의 AI 생성 기준 지식입니다.'));
});

test('4. SSOT Generator: returns warning error message when BOTH sourceContent and chatContext are empty', () => {
  const result = resolveSSOTSourceContext({
    selectedFiles: [],
    availableFiles: [],
    files: {},
    editorContent: '   \n  ',
    sessions: [
      {
        id: 'empty-session',
        title: 'Empty Session',
        messages: [
          { role: 'user', content: '사용자 질문만 있고 어시스턴트 답변이 없는 상태' }
        ]
      }
    ],
    activeSessionId: 'empty-session'
  });

  assert.equal(result.isValid, false);
  assert.equal(result.errorMessage, '⚠️ 분석할 에디터 내용이나 대화 내역이 없습니다.');
});

test('5. SSOT Generator: prioritizes selectedFiles when selected files exist in files', () => {
  const result = resolveSSOTSourceContext({
    selectedFiles: ['spec.md', 'api.md'],
    availableFiles: ['spec.md', 'api.md'],
    files: {
      'spec.md': '# Specification\nArchitecture details.',
      'api.md': '# API Reference\nEndpoints list.'
    },
    editorContent: 'Editor content that should be overridden by explicit files',
    sessions: [
      {
        id: 'session-1',
        title: 'Main',
        messages: [{ role: 'assistant', content: 'Assistant chat' }]
      }
    ],
    activeSessionId: 'session-1'
  });

  assert.equal(result.isValid, true);
  assert.ok(result.sourceContent.includes('### File: spec.md'));
  assert.ok(result.sourceContent.includes('### File: api.md'));
  assert.ok(!result.sourceContent.includes('### Active Editor Content:'));
  assert.ok(result.chatContext.includes('Assistant chat'));
});

test('6. resolveSSOTProvider: routes to webllm when model is WEB_LLM_MODEL_ID or activeProvider is webllm', () => {
  const p1 = resolveSSOTProvider({
    selectedModelId: WEB_LLM_MODEL_ID,
    activeProvider: 'cloud'
  });
  assert.equal(p1, 'webllm');

  const p2 = resolveSSOTProvider({
    selectedModelId: 'custom-model',
    activeProvider: 'webllm'
  });
  assert.equal(p2, 'webllm');
});

test('7. resolveSSOTProvider: routes to local-pc for local Ollama models without requiring Gemini key', () => {
  const p1 = resolveSSOTProvider({
    selectedModelId: 'llama3.2:latest',
    modelOptions: [
      { id: 'llama3.2:latest', name: 'Llama 3.2', group: 'local' }
    ],
    activeProvider: 'cloud'
  });
  assert.equal(p1, 'local-pc');

  const p2 = resolveSSOTProvider({
    selectedModelId: 'unknown-local',
    modelOptions: [],
    activeProvider: 'local-pc'
  });
  assert.equal(p2, 'local-pc');
});

test('8. resolveSSOTProvider: routes to cloud for cloud models', () => {
  const p = resolveSSOTProvider({
    selectedModelId: 'gemini-2.5-flash',
    modelOptions: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', group: 'cloud' }
    ],
    activeProvider: 'cloud'
  });
  assert.equal(p, 'cloud');
});

test('9. isModelConnected: Gemini is connected by default; 3P models require explicit API key', () => {
  const gemini = { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', group: 'cloud' as const };
  const gpt4o = { id: 'gpt-4o', name: 'GPT-4o', group: 'cloud' as const };
  const claude = { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', group: 'cloud' as const };
  const localModel = { id: 'qwen2.5:latest', name: 'Qwen 2.5', group: 'local' as const };

  // Empty keys: Gemini and Local are connected; GPT-4o and Claude are not
  assert.equal(isModelConnected(gemini, {}), true);
  assert.equal(isModelConnected(localModel, {}), true);
  assert.equal(isModelConnected(gpt4o, {}), false);
  assert.equal(isModelConnected(claude, {}), false);

  // When openai key is supplied, GPT-4o becomes connected
  assert.equal(isModelConnected(gpt4o, { openai: 'sk-test-key' }), true);
  assert.equal(isModelConnected(claude, { openai: 'sk-test-key' }), false);

  // When anthropic key is supplied, Claude becomes connected
  assert.equal(isModelConnected(claude, { anthropic: 'sk-ant-key' }), true);
});

test('10. SSOTGeneratorModal: lightning Zap icon next to 구동 모델 is deleted', () => {
  const modalFilePath = path.resolve(process.cwd(), 'src/components/SSOTGeneratorModal.tsx');
  const modalFileContent = fs.readFileSync(modalFilePath, 'utf-8');

  // Verify Zap icon is NOT present next to 구동 모델
  assert.doesNotMatch(
    modalFileContent,
    /<Zap[^>]*\/>\s*<span>구동 모델:<\/span>/,
    'Zap lightning icon next to 구동 모델 must be removed'
  );

  // Verify Zap is not imported
  assert.doesNotMatch(
    modalFileContent,
    /import\s*\{[^}]*\bZap\b[^}]*\}\s*from\s*['"]lucide-react['"]/,
    'Zap icon should not be imported in SSOTGeneratorModal.tsx'
  );
});


