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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#1a1b26] border border-[#222226] rounded-xl shadow-2xl flex flex-col w-full max-w-5xl h-[88vh] overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#13141f] border-b border-[#222226]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center text-[#818cf8]">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">{title}</h2>
                <span className="text-[0.625rem] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#6366f1]/15 text-[#a5b4fc] border border-[#6366f1]/30">
                  {sourceLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono text-emerald-400">
                  <Plus className="w-3 h-3" /> +{addedCount} 추가
                </span>
                <span className="flex items-center gap-1 font-mono text-rose-400">
                  <Minus className="w-3 h-3" /> -{removedCount} 삭제
                </span>
                <span className="text-slate-500 font-mono text-[0.6875rem]">
                  (원본 {totalLinesOriginal}줄 → 변경안 {totalLinesProposed}줄)
                </span>
              </div>
            </div>
          </div>

          {/* View Mode Controls & Close */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md bg-[#0e0f17] border border-[#222226] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition font-medium cursor-pointer ${
                  viewMode === 'unified'
                    ? 'bg-[#6366f1] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
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
                    ? 'bg-[#6366f1] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
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
              className="p-1.5 rounded-md hover:bg-[#222226] text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-auto bg-[#11121c] font-mono text-xs select-text">
          {viewMode === 'unified' ? (
            /* Unified Line-by-Line Diff */
            <div className="divide-y divide-[#222434]/40 min-w-full">
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
                              : 'text-slate-300 hover:bg-[#181926]'
                          }`}
                        >
                          <span
                            className={`w-6 shrink-0 select-none font-bold text-[0.6875rem] ${
                              isAdded
                                ? 'text-emerald-400'
                                : isRemoved
                                ? 'text-rose-400'
                                : 'text-slate-600'
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
            <div className="grid grid-cols-2 divide-x divide-[#222226] h-full min-h-full">
              {/* Left: Original */}
              <div className="flex flex-col h-full overflow-auto">
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-[#171824] border-b border-[#222226] text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>원본 문서 (Current)</span>
                  <span className="font-mono text-slate-500">{totalLinesOriginal} lines</span>
                </div>
                <div className="p-3 whitespace-pre-wrap font-mono text-xs text-slate-300 leading-5 select-text">
                  {originalContent || <span className="italic text-slate-600">(문서가 비어 있습니다)</span>}
                </div>
              </div>

              {/* Right: Proposed Revision */}
              <div className="flex flex-col h-full overflow-auto bg-[#13141f]">
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-[#171824] border-b border-[#222226] text-[0.6875rem] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>개정 제안본 (Proposed)</span>
                  </span>
                  <span className="font-mono text-emerald-500">{totalLinesProposed} lines</span>
                </div>
                <div className="p-3 whitespace-pre-wrap font-mono text-xs text-emerald-200/90 leading-5 select-text">
                  {proposedContent || <span className="italic text-slate-600">(제안 내용이 없습니다)</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#13141f] border-t border-[#222226]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyProposed}
              className="px-3 py-1.5 rounded-md border border-[#222226] bg-[#1a1b26] hover:bg-[#18181b] text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사 완료!' : '제안본 복사'}</span>
            </button>

            {onAppendRevisions && (
              <button
                type="button"
                onClick={() => {
                  onAppendRevisions(proposedContent);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-md border border-[#222226] bg-[#1a1b26] hover:bg-[#18181b] text-[#818cf8] hover:text-white transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
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
              className="px-3.5 py-1.5 rounded-md border border-[#222226] hover:bg-[#18181b] text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              취소
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyRevisions(proposedContent);
                onClose();
              }}
              className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950 cursor-pointer"
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
