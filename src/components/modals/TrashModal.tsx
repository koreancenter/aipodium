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
    <div className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121214] border border-[#222226] rounded-xs max-w-lg w-full p-5 flex flex-col max-h-[80vh] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-slate-200">휴지통</h3>
            <span className="text-xs bg-[#09090b] text-indigo-300 px-2 py-0.5 rounded-xs font-mono font-semibold border border-[#222226]">
              {trashSessions.length}개 항목
            </span>
          </div>
          <div className="flex items-center gap-2">
            {trashSessions.length > 0 && (
              <button
                type="button"
                onClick={onEmptyTrash}
                className="text-[0.6875rem] text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 rounded-xs bg-rose-950/40 border border-rose-900/60 transition cursor-pointer"
              >
                휴지통 전체 비우기
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xs hover:bg-[#18181b] text-slate-400 hover:text-white transition cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {trashSessions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Trash2 className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
              <p className="text-xs text-slate-400 font-medium">휴지통이 비어 있습니다.</p>
              <p className="text-[0.6875rem] text-slate-400">삭제한 프로젝트는 여기에 임시 보관되며 언제든 복구할 수 있습니다.</p>
            </div>
          ) : (
            trashSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-xs bg-[#09090b] border border-[#222226] hover:border-indigo-500/40 transition"
              >
                <div className="space-y-1 min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-200 truncate">{session.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[0.625rem] text-slate-400 font-mono">
                    <span>삭제 일시: {session.deletedAt || session.createdAt}</span>
                    <span>대화 내역: {session.messages.length}건</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRestoreSession(session.id)}
                    className="px-2.5 py-1 rounded-xs bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 text-white text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                    title="프로젝트, 대화, 메모, 폴더 복구"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>복구</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPermanentDeleteSession(session.id)}
                    className="px-2.5 py-1 rounded-xs bg-[#121214] hover:bg-rose-950 border border-[#222226] hover:border-rose-800 text-slate-300 hover:text-rose-300 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
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

        <div className="pt-3 border-t border-[#222226] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xs bg-[#121214] hover:bg-[#18181b] text-slate-300 text-xs font-medium transition cursor-pointer border border-[#222226]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
