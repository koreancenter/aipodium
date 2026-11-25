import React from 'react';
import { Trash2, Folder, RotateCcw, X } from 'lucide-react';
import { ChatSession } from '../../types';

export interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashSessions: ChatSession[];
  onRestoreSession: (id: string) => void;
  onPermanentDeleteSession: (id: string) => void;
  onEmptyTrash: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  trashSessions,
  onRestoreSession,
  onPermanentDeleteSession,
  onEmptyTrash
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-main)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl max-w-lg w-full p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] flex flex-col max-h-[80vh] space-y-4 font-sans">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-[var(--text-main)]">휴지통</h3>
            <span className="text-xs text-[var(--accent-primary)] font-mono font-medium">
              · {trashSessions.length}개 항목
            </span>
          </div>
          <div className="flex items-center gap-2">
            {trashSessions.length > 0 && (
              <button
                type="button"
                onClick={onEmptyTrash}
                className="text-[0.6875rem] text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
              >
                휴지통 전체 비우기
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-structural)] pr-1 custom-scrollbar">
          {trashSessions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Trash2 className="w-8 h-8 text-[var(--text-tertiary)] mx-auto opacity-60" />
              <p className="text-xs text-[var(--text-muted)] font-medium">휴지통이 비어 있습니다.</p>
              <p className="text-[0.6875rem] text-[var(--text-tertiary)]">삭제한 프로젝트는 여기에 임시 보관되며 언제든 복구할 수 있습니다.</p>
            </div>
          ) : (
            trashSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/[0.04] transition"
              >
                <div className="space-y-1 min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--text-main)] truncate">{session.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[0.625rem] text-[var(--text-muted)] font-mono">
                    <span>삭제 일시: {session.deletedAt || session.createdAt}</span>
                    <span>대화 내역: {session.messages.length}건</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRestoreSession(session.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-white text-[#0F172A] text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    title="프로젝트, 대화, 메모, 폴더 복구"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>복구</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPermanentDeleteSession(session.id)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 border border-[var(--border-structural)] hover:border-rose-500/30 text-[var(--text-muted)] hover:text-rose-300 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                    title="영구 삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>영구 삭제</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-[var(--border-structural)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-medium transition cursor-pointer border border-[var(--border-structural)]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
