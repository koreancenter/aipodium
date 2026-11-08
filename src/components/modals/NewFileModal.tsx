import React from 'react';
import { X, FileText, Folder } from 'lucide-react';

export interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileNameInput: string;
  onFileNameChange: (value: string) => void;
  folderTarget: string;
  onFolderTargetChange: (value: string) => void;
  sessions: Array<{ id: string; title: string }>;
  onSubmit: (e: React.FormEvent) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const NewFileModal: React.FC<NewFileModalProps> = ({
  isOpen,
  onClose,
  fileNameInput,
  onFileNameChange,
  folderTarget,
  onFolderTargetChange,
  sessions,
  onSubmit,
  inputRef
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-[#121214] border border-[#222226] rounded-xs max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-xs hover:bg-[#18181b] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pt-1">
          <h2 className="text-base font-bold text-white">새 마크다운 노트 생성</h2>
          <p className="text-xs text-slate-400">워크스페이스에 새로운 마크다운 문서를 추가합니다.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>문서 파일명</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={fileNameInput}
              onChange={(e) => onFileNameChange(e.target.value)}
              placeholder="예: design_specs.md, meeting_notes.md"
              className="w-full bg-[#09090b] border border-[#222226] rounded-xs px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition placeholder-slate-500"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>소속 프로젝트 및 대상 폴더</span>
            </label>
            <select
              value={folderTarget}
              onChange={(e) => onFolderTargetChange(e.target.value)}
              className="w-full bg-[#09090b] border border-[#222226] rounded-xs px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition font-sans cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.title} className="bg-[#121214] text-slate-200">
                  📁 {s.title} (현재 프로젝트)
                </option>
              ))}
              <option value="docs" className="bg-[#121214] text-slate-200">📁 docs (공용 문서 폴더)</option>
              <option value="src" className="bg-[#121214] text-slate-200">📁 src (소스 폴더)</option>
              <option value="root" className="bg-[#121214] text-slate-200">📁 루트 (기본 디렉토리)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222226]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xs text-xs text-slate-300 hover:text-white bg-[#121214] hover:bg-[#18181b] border border-[#222226] transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xs text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
            >
              문서 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
