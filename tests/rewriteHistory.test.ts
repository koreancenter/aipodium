import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  replaceTextSegment,
  extractChangedMarkdownSpan,
  finalizeRewriteHistory,
  buildRewriteHistoryItems,
  buildSessionRewriteHistoryItems,
} from '../src/utils/rewriteHistory';
import { getCoreTranslations } from '../src/locales/coreLocale';
import type { ChatMessage, SessionRewriteHistoryItem } from '../src/types';

const readWorkspaceFile = (relPath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8');

test('1. replaceTextSegment handles exact, offset-hinted, markdown-tolerant apply and revert round-trips', () => {
  const doc = '# Title\n\nThis is a rough draft sentence.\n\nFooter';
  const original = 'This is a rough draft sentence.';
  const rewritten = 'This is a polished, concise sentence.';

  // Apply using offset hint
  const start = doc.indexOf(original);
  const end = start + original.length;
  const applied = replaceTextSegment(doc, [original], rewritten, start, end);
  assert.equal(applied.replaced, true);
  assert.equal(applied.updated, '# Title\n\nThis is a polished, concise sentence.\n\nFooter');
  assert.equal(applied.matchStart, start);
  assert.equal(applied.matchEnd, start + rewritten.length);

  // Revert back to previous version using updated offsets
  const reverted = replaceTextSegment(
    applied.updated,
    [rewritten],
    original,
    applied.matchStart,
    applied.matchEnd
  );
  assert.equal(reverted.replaced, true);
  assert.equal(reverted.updated, doc);

  // Whitespace & inline markdown marker tolerant match (e.g. WYSIWYG plain-text selection)
  const mdDoc = 'Intro **rough   draft** text end.';
  const plainSel = 'rough draft';
  const mdApplied = replaceTextSegment(mdDoc, [plainSel], 'refined segment');
  assert.equal(mdApplied.replaced, true);
  assert.equal(mdApplied.updated, 'Intro refined segment text end.');
});

test('2. extractChangedMarkdownSpan extracts inline WYSIWYG markdown span cleanly and falls back safely', () => {
  const beforeMd = '# Heading\n\nIntro **rough draft** tail.';
  const afterMd = '# Heading\n\nIntro **polished copy** tail.';
  const span = extractChangedMarkdownSpan(beforeMd, afterMd, 'rough draft', 'polished copy');
  assert.equal(span.originalText, 'rough draft');
  assert.equal(span.rewrittenText, 'polished copy');
  assert.equal(
    afterMd.slice(span.startOffset!, span.endOffset!),
    'polished copy'
  );

  // Partial suffix diff falls back to full target/rewritten strings
  const partialBefore = 'Hello rough draft end.';
  const partialAfter = 'Hello rough summary end.';
  const partialSpan = extractChangedMarkdownSpan(
    partialBefore,
    partialAfter,
    'rough draft',
    'rough summary'
  );
  assert.equal(partialSpan.originalText, 'rough draft');
  assert.equal(partialSpan.rewrittenText, 'rough summary');
});

test('3. finalizeRewriteHistory, buildRewriteHistoryItems, and buildSessionRewriteHistoryItems merge session inline + chat history newest-first', () => {
  const initialMeta = {
    originalText: 'Old snippet one',
    fileName: 'notes.md',
    appliedCount: 0,
    versions: [
      {
        id: 'ver-orig-1',
        label: '이전 버전',
        text: 'Old snippet one',
        createdAt: 1000,
        isOriginal: true,
      },
    ],
  };

  const finalized = finalizeRewriteHistory(initialMeta, 'New snippet one', '재작성본');
  assert.ok(finalized);
  assert.equal(finalized.rewrittenText, 'New snippet one');
  assert.equal(finalized.versions?.length, 2);

  const messages: ChatMessage[] = [
    {
      id: 'msg-user-1',
      sender: 'user',
      text: 'Rewrite request 1',
      timestamp: '10:00',
      rewriteHistory: initialMeta,
    },
    {
      id: 'msg-ai-1',
      sender: 'ai',
      text: 'New snippet one',
      timestamp: '10:01',
      rewriteHistory: finalized,
    },
    {
      id: 'msg-ai-2',
      sender: 'ai',
      text: 'New snippet two',
      timestamp: '10:05',
      rewriteHistory: {
        originalText: 'Old snippet two',
        rewrittenText: 'New snippet two',
        fileName: 'notes.md',
        appliedCount: 1,
        lastAppliedText: 'New snippet two',
        versions: [
          {
            id: 'ver-rw-2',
            text: 'New snippet two',
            createdAt: 3000,
          },
        ],
      },
    },
  ];

  const baseNow = Date.now();
  const chatEntries = buildRewriteHistoryItems(messages);
  assert.equal(chatEntries.length, 2);
  assert.equal(chatEntries[0].msgId, 'msg-ai-2');

  const inlineHistory: SessionRewriteHistoryItem[] = [
    {
      id: 'rw-inline-1',
      sessionId: 'session-A',
      source: 'inline',
      prompt: '문장 다듬기',
      originalText: 'Inline rough line',
      rewrittenText: 'Inline refined line',
      lastAppliedText: 'Inline refined line',
      fileName: 'notes.md',
      appliedCount: 1,
      createdAt: baseNow + 5000,
      timestamp: '10:06',
    },
    {
      id: 'rw-inline-other-session',
      sessionId: 'session-B',
      source: 'inline',
      originalText: 'Other session text',
      rewrittenText: 'Other session rewritten',
      createdAt: baseNow + 9000,
      timestamp: '10:10',
    },
  ];

  const mergedSessionA = buildSessionRewriteHistoryItems(messages, inlineHistory, 'session-A');
  assert.equal(mergedSessionA.length, 3);
  assert.equal(mergedSessionA[0].id, 'rw-inline-1');
  assert.equal(mergedSessionA[0].source, 'inline');
  assert.equal(mergedSessionA[1].id, 'msg-ai-1');
  assert.equal(mergedSessionA[1].source, 'chat');
  assert.equal(mergedSessionA[2].id, 'msg-ai-2');
  assert.ok(!mergedSessionA.some((item) => item.id === 'rw-inline-other-session'));
});

test('4. ChatPanel, Editor, EventBus, and App.tsx wire session-scoped Rewrite History & Revert buttons', () => {
  const bubbleContent = readWorkspaceFile('src/components/AiMessageBubble.tsx');
  assert.match(bubbleContent, /data-rewrite-history-msg=\{msg\.id\}/);
  assert.match(bubbleContent, /onApplyRewrite/);
  assert.match(bubbleContent, /onRevertRewrite/);
  assert.match(bubbleContent, /prevProps\.msg\.rewriteHistory === nextProps\.msg\.rewriteHistory/);

  const chatPanelContent = readWorkspaceFile('src/components/chat/ChatPanel.tsx');
  assert.match(chatPanelContent, /id="chat-rewrite-history"/);
  assert.match(chatPanelContent, /id="chat-rewrite-history-toggle"/);
  assert.match(chatPanelContent, /id=\{`chat-msg-\$\{msg\.id\}`\}/);
  assert.match(chatPanelContent, /buildSessionRewriteHistoryItems/);
  assert.match(chatPanelContent, /data-revert-history-id=\{item\.id\}/);
  assert.match(chatPanelContent, /sessionRewriteHistory/);

  const busContent = readWorkspaceFile('src/context/EditorEventBusContext.tsx');
  assert.match(busContent, /'editor:rewrite-applied'/);

  const optimizedEditorContent = readWorkspaceFile('src/components/editor/OptimizedEditor.tsx');
  assert.match(optimizedEditorContent, /'editor:rewrite-applied'/);
  assert.match(optimizedEditorContent, /onAiEditApplied/);

  const tiptapContent = readWorkspaceFile('src/components/editor/TiptapWysiwygEditor.tsx');
  assert.match(tiptapContent, /extractChangedMarkdownSpan/);
  assert.match(tiptapContent, /onAiEditApplied/);

  const appContent = readWorkspaceFile('src/App.tsx');
  assert.match(appContent, /useEditorEventSubscription\('editor:rewrite-applied'/);
  assert.match(appContent, /const handleApplyRewriteSegment = useCallback/);
  assert.match(appContent, /const handleRevertRewriteSegment = useCallback/);
  assert.match(appContent, /sessionRewriteHistory=\{activeSession\?\.rewriteHistory\}/);
  assert.match(appContent, /onApplyRewrite=\{handleApplyRewriteSegment\}/);
  assert.match(appContent, /onRevertRewrite=\{handleRevertRewriteSegment\}/);
  assert.match(appContent, /finalizeRewriteHistory/);
});

test('5. Rewrite History Korean UI labels adhere to AGENTS.md pure Korean convention', () => {
  const koChat = getCoreTranslations('ko').chat;
  const enChat = getCoreTranslations('en').chat;
  assert.equal(koChat.rewriteHistoryTitle, '재작성 히스토리');
  assert.equal(enChat.rewriteHistoryTitle, 'Rewrite History');
  assert.equal(koChat.revertShortAction, '되돌리기');
  assert.equal(enChat.revertShortAction, 'Revert');

  const koLabels = [
    koChat.rewriteHistoryTitle,
    koChat.rewriteOriginalLabel,
    koChat.rewriteResultLabel,
    koChat.applyRewriteAction,
    koChat.revertRewriteAction,
    koChat.revertShortAction,
    koChat.restoreVersionAction,
    koChat.rewriteStatusApplied,
    koChat.rewriteStatusReverted,
    koChat.rewriteStatusReady,
    koChat.rewriteSourceInline,
    koChat.rewriteSourceChat,
    koChat.rewriteHistorySessionHint,
    koChat.rewriteEmptyHistory,
    koChat.rewriteAppliedToast,
    koChat.rewriteRevertedToast,
    koChat.rewriteAlreadyOriginalToast,
    koChat.rewriteSegmentNotFoundToast,
    koChat.jumpToMessage,
    koChat.toggleRewriteCompare,
  ];
  for (const label of koLabels) {
    assert.doesNotMatch(label, /\([A-Za-z]+\)/);
  }
});
