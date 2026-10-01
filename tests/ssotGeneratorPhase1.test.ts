import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSSOTSourceContext } from '../src/components/SSOTGeneratorModal';

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
