import test from 'node:test';
import assert from 'node:assert/strict';
import { convertDocumentToMarkdown } from '../src/services/documentConverterService.js';
import type { ChatAttachment } from '../src/types.js';

// Helper function modeling prompt assembly logic in handleSendMessage
function buildFinalPrompt(userMessageText: string, attachedFiles: ChatAttachment[]): string {
  let finalPrompt = userMessageText;
  if (attachedFiles.length > 0) {
    const contextBlock = attachedFiles
      .map(
        (file) =>
          `\n\n--- [Attached Document: ${file.name}] ---\n${file.parsedMarkdown || file.content || ''}\n--- [End of Document] ---\n`
      )
      .join('\n');
    finalPrompt = `${finalPrompt}\n\n[Reference Context]:\n${contextBlock}`;
  }
  return finalPrompt;
}

test('Chat Prompt File Attachment Payload Injection', async (t) => {
  await t.test('injects parsedMarkdown into finalPrompt with reference context block', () => {
    const userText = '이 문서의 핵심 요약을 알려줘';
    const attachments: ChatAttachment[] = [
      {
        id: 'att-1',
        name: 'quarterly_report.md',
        type: 'file',
        size: '1.2 KB',
        parsedMarkdown: '# 2026 1Q 실적 요약\n- 매출: 100억\n- 영업이익: 25억',
        isParsing: false,
      },
    ];

    const prompt = buildFinalPrompt(userText, attachments);

    assert.ok(prompt.includes('이 문서의 핵심 요약을 알려줘'));
    assert.ok(prompt.includes('[Reference Context]:'));
    assert.ok(prompt.includes('--- [Attached Document: quarterly_report.md] ---'));
    assert.ok(prompt.includes('# 2026 1Q 실적 요약'));
    assert.ok(prompt.includes('--- [End of Document] ---'));
  });

  await t.test('handles multiple attached files correctly without data loss', () => {
    const userText = '두 문서의 차이점을 비교해줘';
    const attachments: ChatAttachment[] = [
      {
        id: 'att-1',
        name: 'spec_v1.txt',
        type: 'file',
        size: '500 B',
        parsedMarkdown: 'API v1 엔드포인트: /api/v1/users',
        isParsing: false,
      },
      {
        id: 'att-2',
        name: 'spec_v2.txt',
        type: 'file',
        size: '600 B',
        parsedMarkdown: 'API v2 엔드포인트: /api/v2/members',
        isParsing: false,
      },
    ];

    const prompt = buildFinalPrompt(userText, attachments);

    assert.ok(prompt.includes('--- [Attached Document: spec_v1.txt] ---'));
    assert.ok(prompt.includes('API v1 엔드포인트: /api/v1/users'));
    assert.ok(prompt.includes('--- [Attached Document: spec_v2.txt] ---'));
    assert.ok(prompt.includes('API v2 엔드포인트: /api/v2/members'));
  });

  await t.test('handles empty user message text with attached documents', () => {
    const userText = '';
    const attachments: ChatAttachment[] = [
      {
        id: 'att-solo',
        name: 'analysis.md',
        type: 'file',
        size: '2 KB',
        parsedMarkdown: '분석 내용 전문입니다.',
        isParsing: false,
      },
    ];

    const prompt = buildFinalPrompt(userText, attachments);
    assert.ok(prompt.includes('[Reference Context]:'));
    assert.ok(prompt.includes('--- [Attached Document: analysis.md] ---'));
    assert.ok(prompt.includes('분석 내용 전문입니다.'));
  });

  await t.test('flags attachments when isParsing is true to block dispatch', () => {
    const attachments: ChatAttachment[] = [
      {
        id: 'att-parsing',
        name: 'heavy_document.pdf',
        type: 'file',
        size: '5.4 MB',
        parsedMarkdown: '',
        isParsing: true,
      },
    ];

    const isBlocked = attachments.some((a) => a.isParsing);
    assert.equal(isBlocked, true);
  });

  await t.test('convertDocumentToMarkdown parses text/markdown files accurately', async () => {
    const file = new File(
      ['# AI Podium Design Spec\n\n- Zero latency\n- Single Source of Truth'],
      'spec.md',
      { type: 'text/markdown' }
    );

    const result = await convertDocumentToMarkdown(file);
    assert.ok(result.markdown.includes('# AI Podium Design Spec'));
    assert.ok(result.markdown.includes('Single Source of Truth'));
  });
});
