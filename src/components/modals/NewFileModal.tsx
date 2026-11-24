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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-main)]/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-white/[0.08] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pt-1">
          <h2 className="text-base font-semibold text-[var(--text-main)] tracking-tight">새 마크다운 노트 생성</h2>
          <p className="text-xs text-[var(--text-muted)]">워크스페이스에 새로운 마크다운 문서를 추가합니다.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>문서 파일명</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={fileNameInput}
              onChange={(e) => onFileNameChange(e.target.value)}
              placeholder="예: design_specs.md, meeting_notes.md"
              className="w-full bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-primary)]/50 focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition placeholder-[var(--text-tertiary)]"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
              <Folder className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>소속 프로젝트 및 대상 폴더</span>
            </label>
            <select
              value={folderTarget}
              onChange={(e) => onFolderTargetChange(e.target.value)}
              className="w-full bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-primary)]/50 focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition font-sans cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.title} className="bg-[var(--bg-elevated)] text-[var(--text-main)]">
                  📁 {s.title} (현재 프로젝트)
                </option>
              ))}
              <option value="docs" className="bg-[var(--bg-elevated)] text-[var(--text-main)]">📁 docs (공용 문서 폴더)</option>
              <option value="src" className="bg-[var(--bg-elevated)] text-[var(--text-main)]">📁 src (소스 폴더)</option>
              <option value="root" className="bg-[var(--bg-elevated)] text-[var(--text-main)]">📁 루트 (기본 디렉토리)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F1F5F9] hover:bg-white text-[#0F172A] transition cursor-pointer"
            >
              문서 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
