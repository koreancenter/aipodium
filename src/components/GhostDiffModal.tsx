import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Check,
  Plus,
  Minus,
  Copy,
  ArrowRight,
  Columns,
  AlignJustify,
  Sparkles,
  X,
  FileText
} from 'lucide-react';
import { diffLines, Change } from 'diff';

export interface GhostDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalContent: string;
  proposedContent: string;
  title?: string;
  sourceLabel?: string;
  onApplyRevisions: (newContent: string) => void;
  onAppendRevisions?: (contentToAppend: string) => void;
}

export const GhostDiffModal: React.FC<GhostDiffModalProps> = ({
  isOpen,
  onClose,
  originalContent,
  proposedContent,
  title = '시맨틱 Diff 및 스마트 반영 (Ghost Diff)',
  sourceLabel = 'AI 추천 개정안',
  onApplyRevisions,
  onAppendRevisions,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [copied, setCopied] = useState(false);

  // Compute line diff
  const { changes, addedCount, removedCount, totalLinesOriginal, totalLinesProposed } = useMemo(() => {
    const orig = originalContent || '';
    const prop = proposedContent || '';
    const diff = diffLines(orig, prop);

    let added = 0;
    let removed = 0;

    diff.forEach((part: Change) => {
      const lines = part.value.split('\n');
      // If trailing newline, last element is empty
      const count = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
      if (part.added) added += count;
      if (part.removed) removed += count;
    });

    const origLines = orig ? orig.split('\n').length : 0;
    const propLines = prop ? prop.split('\n').length : 0;

    return {
      changes: diff,
      addedCount: added,
      removedCount: removed,
      totalLinesOriginal: origLines,
      totalLinesProposed: propLines,
    };
  }, [originalContent, proposedContent]);

  const handleCopyProposed = async () => {
    try {
      await navigator.clipboard.writeText(proposedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = proposedContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[var(--bg-main)]/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] flex flex-col w-full max-w-5xl h-[88vh] overflow-hidden text-[var(--text-main)]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)]/90 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 border border-white/[0.08] flex items-center justify-center text-[var(--accent-primary)]">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--text-main)]">{title}</h2>
                <span className="text-[0.625rem] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/25">
                  {sourceLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                <span className="flex items-center gap-1 font-mono text-[var(--secondary-accent)]">
                  <Plus className="w-3 h-3" /> +{addedCount} 추가
                </span>
                <span className="flex items-center gap-1 font-mono text-rose-400">
                  <Minus className="w-3 h-3" /> -{removedCount} 삭제
                </span>
                <span className="text-[var(--text-tertiary)] font-mono text-[0.6875rem]">
                  (원본 {totalLinesOriginal}줄 → 변경안 {totalLinesProposed}줄)
                </span>
              </div>
            </div>
          </div>

          {/* View Mode Controls & Close */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md bg-[var(--bg-main)] border border-[var(--border-structural)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition font-medium cursor-pointer ${
                  viewMode === 'unified'
                    ? 'bg-[#F1F5F9] text-[#0F172A] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title="통합 인라인 보기"
              >
                <AlignJustify className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">단일 통합</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition font-medium cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-[#F1F5F9] text-[#0F172A] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title="좌우 분할 보기"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">좌우 분할</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-auto bg-[var(--bg-editor)] font-mono text-xs select-text">
          {viewMode === 'unified' ? (
            /* Unified Line-by-Line Diff */
            <div className="divide-y divide-[var(--border-structural)] min-w-full">
              {changes.map((part: Change, partIdx: number) => {
                const lines = part.value.split('\n');
                // Remove trailing empty line if it was split
                const cleanLines = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;

                if (cleanLines.length === 0) return null;

                return (
                  <div key={partIdx} className="w-full">
                    {cleanLines.map((lineText: string, lineIdx: number) => {
                      const isAdded = part.added;
                      const isRemoved = part.removed;

                      return (
                        <div
                          key={lineIdx}
                          className={`flex items-start px-3 py-0.5 leading-5 font-mono ${
                            isAdded
                              ? 'bg-emerald-950/35 text-emerald-200 border-l-2 border-emerald-500'
                              : isRemoved
                              ? 'bg-rose-950/35 text-rose-300/90 border-l-2 border-rose-500 line-through'
                              : 'text-[var(--text-muted)] hover:bg-white/[0.03]'
                          }`}
                        >
                          <span
                            className={`w-6 shrink-0 select-none font-bold text-[0.6875rem] ${
                              isAdded
                                ? 'text-[var(--secondary-accent)]'
                                : isRemoved
                                ? 'text-rose-400'
                                : 'text-[var(--text-tertiary)]'
                            }`}
                          >
                            {isAdded ? '+' : isRemoved ? '-' : ' '}
                          </span>
                          <span className="whitespace-pre-wrap break-all flex-1 select-text">
                            {lineText || ' '}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Side-by-Side Split Diff */
            <div className="grid grid-cols-2 divide-x divide-[var(--border-structural)] h-full min-h-full">
              {/* Left: Original */}
              <div className="flex flex-col h-full overflow-auto">
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border-structural)] text-[0.6875rem] font-bold text-[var(--text-muted)] tracking-wider flex items-center justify-between">
                  <span>원본 문서</span>
                  <span className="font-mono text-[var(--text-tertiary)]">{totalLinesOriginal}줄</span>
                </div>
                <div className="p-3 whitespace-pre-wrap font-mono text-xs text-[var(--text-muted)] leading-5 select-text">
                  {originalContent || <span className="italic text-[var(--text-tertiary)]">문서가 비어 있습니다</span>}
                </div>
              </div>

              {/* Right: Proposed Revision */}
              <div className="flex flex-col h-full overflow-auto bg-[var(--bg-surface)]/40">
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border-structural)] text-[0.6875rem] font-bold text-[var(--secondary-accent)] tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>개정 제안본</span>
                  </span>
                  <span className="font-mono text-[var(--secondary-accent)]">{totalLinesProposed}줄</span>
                </div>
                <div className="p-3 whitespace-pre-wrap font-mono text-xs text-emerald-200/90 leading-5 select-text">
                  {proposedContent || <span className="italic text-[var(--text-tertiary)]">제안 내용이 없습니다</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-surface)]/90 border-t border-[var(--border-structural)]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyProposed}
              className="px-3 py-1.5 rounded-md border border-[var(--border-structural)] hover:border-[var(--border-luminous)] bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-muted)] hover:text-[var(--text-main)] transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--secondary-accent)]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사 완료!' : '제안본 복사'}</span>
            </button>

            {onAppendRevisions && (
              <button
                type="button"
                onClick={() => {
                  onAppendRevisions(proposedContent);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-md border border-[var(--border-structural)] hover:border-[var(--border-luminous)] bg-white/[0.04] hover:bg-white/[0.08] text-[var(--accent-primary)] hover:text-[var(--text-main)] transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                title="원본 문서를 지우지 않고 본문 하단에 부록 형태로 추가합니다"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>문서 하단에 추가</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md border border-[var(--border-structural)] hover:border-[var(--border-luminous)] hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-medium transition cursor-pointer"
            >
              취소
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyRevisions(proposedContent);
                onClose();
              }}
              className="px-4 py-1.5 rounded-md bg-[#F1F5F9] hover:bg-white text-[#0F172A] text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>문서에 스마트 반영</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
