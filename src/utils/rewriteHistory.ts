import type { ChatMessage, RewriteHistoryMetadata, SessionRewriteHistoryItem } from '../types';
import { cleanAiContentText } from './markdownParser';

export interface RewriteHistoryEntry {
  msgId: string;
  timestamp: string;
  model?: string;
  history: RewriteHistoryMetadata;
  rewrittenText: string;
  isStreaming?: boolean;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces a target text segment inside a document string using:
 * 1. Exact slice match at [hintStart, hintEnd] when provided
 * 2. Exact substring match (raw / trimmed)
 * 3. Collapsed-whitespace + optional inline markdown marker tolerant match
 */
export function replaceTextSegment(
  docContent: string,
  searchCandidates: Array<string | undefined>,
  replacementText: string,
  hintStart?: number,
  hintEnd?: number
): { updated: string; replaced: boolean; matchStart?: number; matchEnd?: number } {
  const candidates = searchCandidates
    .map((c) => (c ?? '').trim())
    .filter((c, idx, arr) => Boolean(c) && arr.indexOf(c) === idx);

  if (candidates.length === 0) {
    return { updated: docContent, replaced: false };
  }

  // 1. Offset-hinted match when offsets align cleanly with a candidate
  if (
    typeof hintStart === 'number' &&
    typeof hintEnd === 'number' &&
    hintStart >= 0 &&
    hintEnd > hintStart &&
    hintEnd <= docContent.length
  ) {
    const sliced = docContent.slice(hintStart, hintEnd).trim();
    if (candidates.some((c) => c === sliced)) {
      const updated =
        docContent.slice(0, hintStart) + replacementText + docContent.slice(hintEnd);
      return {
        updated,
        replaced: true,
        matchStart: hintStart,
        matchEnd: hintStart + replacementText.length,
      };
    }
  }

  // 2. Exact match
  for (const candidate of candidates) {
    const idx = docContent.indexOf(candidate);
    if (idx !== -1) {
      const updated =
        docContent.slice(0, idx) +
        replacementText +
        docContent.slice(idx + candidate.length);
      return {
        updated,
        replaced: true,
        matchStart: idx,
        matchEnd: idx + replacementText.length,
      };
    }
  }

  // 3. Whitespace-normalized & optional inline markdown marker tolerant match
  for (const candidate of candidates) {
    const tokens = candidate.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const inlineMarkers = '(?:\\*\\*|__|~~|`|\\*|_|==)?';
    const pattern = tokens
      .map((tok) => `${inlineMarkers}${escapeRegExp(tok)}${inlineMarkers}`)
      .join('\\s+');
    try {
      const regex = new RegExp(pattern);
      const match = docContent.match(regex);
      if (match && typeof match.index === 'number') {
        const updated =
          docContent.slice(0, match.index) +
          replacementText +
          docContent.slice(match.index + match[0].length);
        return {
          updated,
          replaced: true,
          matchStart: match.index,
          matchEnd: match.index + replacementText.length,
        };
      }
    } catch {
      // Ignore invalid regex fallback edge cases
    }
  }

  return { updated: docContent, replaced: false };
}

/**
 * Extracts the exact markdown span changed between beforeDoc and afterDoc for WYSIWYG inline rewrites,
 * preserving surrounding markdown markers while falling back safely when only a partial word changed
 * or when serializer normalization touched a wider range.
 */
export function extractChangedMarkdownSpan(
  beforeDoc: string,
  afterDoc: string,
  fallbackOriginal: string,
  fallbackRewritten: string
): { originalText: string; rewrittenText: string; startOffset?: number; endOffset?: number } {
  const safeOrig = fallbackOriginal.trim();
  const safeRewritten = fallbackRewritten.trim();

  if (!beforeDoc || !afterDoc || beforeDoc === afterDoc) {
    return { originalText: safeOrig, rewrittenText: safeRewritten };
  }

  const minLen = Math.min(beforeDoc.length, afterDoc.length);
  let prefixLen = 0;
  while (prefixLen < minLen && beforeDoc[prefixLen] === afterDoc[prefixLen]) {
    prefixLen += 1;
  }

  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    beforeDoc[beforeDoc.length - 1 - suffixLen] === afterDoc[afterDoc.length - 1 - suffixLen]
  ) {
    suffixLen += 1;
  }

  const rawOrigSlice = beforeDoc.slice(prefixLen, beforeDoc.length - suffixLen);
  const rawAfterSlice = afterDoc.slice(prefixLen, afterDoc.length - suffixLen);
  const origSpan = rawOrigSlice.trim();
  const newSpan = rawAfterSlice.trim();

  const minExpectedLen = Math.max(1, Math.floor(safeOrig.length * 0.8));
  const maxExpectedLen = Math.max(200, safeOrig.length * 3 + 120);

  if (
    origSpan &&
    newSpan &&
    origSpan.length >= minExpectedLen &&
    origSpan.length <= maxExpectedLen
  ) {
    const leadingWs = rawAfterSlice.length - rawAfterSlice.trimStart().length;
    const startOffset = prefixLen + leadingWs;
    const endOffset = startOffset + newSpan.length;
    return {
      originalText: origSpan,
      rewrittenText: newSpan,
      startOffset,
      endOffset,
    };
  }

  return { originalText: safeOrig, rewrittenText: safeRewritten };
}

/**
 * Finalizes rewrite history metadata once AI streaming completes.
 */
export function finalizeRewriteHistory(
  meta: RewriteHistoryMetadata | undefined,
  rawAiText: string,
  rewrittenLabel = '재작성본'
): RewriteHistoryMetadata | undefined {
  if (!meta) return undefined;
  const cleaned = cleanAiContentText(rawAiText).trim();
  if (!cleaned) return meta;

  const existingVersions = meta.versions ? [...meta.versions] : [];
  const hasRewritten = existingVersions.some((v) => !v.isOriginal && v.text === cleaned);
  if (!hasRewritten) {
    existingVersions.push({
      id: `ver-rw-${Date.now()}`,
      label: rewrittenLabel,
      text: cleaned,
      createdAt: Date.now(),
      isOriginal: false,
    });
  }

  return {
    ...meta,
    rewrittenText: cleaned,
    versions: existingVersions,
  };
}

/**
 * Extracts all 'Rewrite with AI' history entries from a chat session's message thread (newest first).
 */
export function buildRewriteHistoryItems(messages: ChatMessage[]): RewriteHistoryEntry[] {
  const entries: RewriteHistoryEntry[] = [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.sender === 'ai' && msg.rewriteHistory?.originalText) {
      const rewrittenText = (
        msg.rewriteHistory.rewrittenText ||
        cleanAiContentText(msg.text || '')
      ).trim();
      entries.push({
        msgId: msg.id,
        timestamp: msg.timestamp,
        model: msg.model,
        history: msg.rewriteHistory,
        rewrittenText,
        isStreaming: msg.isStreaming,
      });
    }
  }
  return entries;
}

/**
 * Combines inline session 'Rewrite with AI' actions and chat-thread rewrite entries for a single session,
 * ordered newest-first.
 */
export function buildSessionRewriteHistoryItems(
  messages: ChatMessage[],
  sessionHistory: SessionRewriteHistoryItem[] = [],
  sessionId?: string
): SessionRewriteHistoryItem[] {
  const seenIds = new Set<string>();
  const combined: SessionRewriteHistoryItem[] = [];

  for (const item of sessionHistory) {
    if (!item || !item.originalText) continue;
    if (sessionId && item.sessionId && item.sessionId !== sessionId) continue;
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    combined.push(item);
  }

  const chatEntries = buildRewriteHistoryItems(messages);
  chatEntries.forEach((entry, index) => {
    if (seenIds.has(entry.msgId)) return;
    seenIds.add(entry.msgId);
    const createdAt =
      entry.history.versions?.[entry.history.versions.length - 1]?.createdAt ??
      entry.history.versions?.[0]?.createdAt ??
      Date.now() - index;

    combined.push({
      id: entry.msgId,
      sessionId,
      msgId: entry.msgId,
      source: 'chat',
      originalText: entry.history.originalText,
      rewrittenText: entry.rewrittenText,
      lastAppliedText: entry.history.lastAppliedText,
      fileName: entry.history.fileName,
      startOffset: entry.history.startOffset,
      endOffset: entry.history.endOffset,
      appliedCount: entry.history.appliedCount,
      revertedAt: entry.history.revertedAt,
      createdAt,
      timestamp: entry.timestamp,
      model: entry.model,
      isStreaming: entry.isStreaming,
      versions: entry.history.versions,
    });
  });

  return combined.sort((a, b) => b.createdAt - a.createdAt);
}
