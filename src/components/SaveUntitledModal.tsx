import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Folder } from 'lucide-react';

export interface SaveUntitledModalProps {
  isOpen: boolean;
  initialFileName?: string;
  defaultFileName?: string;
  defaultFolder?: string;
  availableFolders?: string[];
  existingFiles?: string[];
  existingFileNames?: string[];
  onSave?: (fileName: string, folder: string) => void;
  onConfirmSave?: (fileName: string, folder: string) => void;
  onClose: () => void;
}

export const SaveUntitledModal: React.FC<SaveUntitledModalProps> = ({
  isOpen,
  initialFileName,
  defaultFileName,
  defaultFolder = 'docs',
  availableFolders = ['docs'],
  existingFiles = [],
  existingFileNames = [],
  onSave,
  onConfirmSave,
  onClose,
}) => {
  const [fileNameInput, setFileNameInput] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>(defaultFolder);
  const [error, setError] = useState<string>('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const allExisting = useMemo(() => {
    return [...existingFiles, ...existingFileNames];
  }, [existingFiles, existingFileNames]);

  const targetDefaultName = defaultFileName || initialFileName || '새 문서.md';

  useEffect(() => {
    if (isOpen) {
      let suggested = targetDefaultName;
      const isGenericPlaceholder =
        !suggested ||
        suggested.startsWith('Untitled-') ||
        /^새 프로젝트(\s*\d*)?(\.md)?$/i.test(suggested) ||
        /^New Project(\s*\d*)?(\.md)?$/i.test(suggested) ||
        /^New Document(\s*\d*)?(\.md)?$/i.test(suggested) ||
        suggested === '새 문서.md' ||
        suggested.startsWith('note_');

      if (isGenericPlaceholder) {
        suggested = '';
      } else if (!suggested.includes('.')) {
        suggested = `${suggested}.md`;
      }
      setFileNameInput(suggested);
      setSelectedFolder(defaultFolder || availableFolders[0] || 'docs');
      setError('');

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (suggested) {
            const dotIdx = inputRef.current.value.lastIndexOf('.');
            if (dotIdx > 0) {
              inputRef.current.setSelectionRange(0, dotIdx);
            } else {
              inputRef.current.select();
            }
          }
        }
      }, 50);
    }
  }, [isOpen, targetDefaultName, defaultFolder, availableFolders]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let name = fileNameInput.trim();
    if (!name) {
      setError('파일명을 입력해주세요.');
      return;
    }
    if (!name.includes('.')) {
      name = `${name}.md`;
    }
    // Allow saving if name is the current file itself, otherwise check if another file already has this name
    if (name !== targetDefaultName && allExisting.includes(name)) {
      setError(`'${name}' 파일이 이미 존재합니다. 다른 이름을 사용해주세요.`);
      return;
    }

    if (onConfirmSave) {
      onConfirmSave(name, selectedFolder);
    } else if (onSave) {
      onSave(name, selectedFolder);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-main)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl max-w-md w-full p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] space-y-5 text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-100 font-sans">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Section Title */}
        <div className="space-y-1 pt-1">
          <h2 className="text-base font-semibold text-[var(--text-main)] tracking-tight">문서 저장</h2>
          <p className="text-xs text-[var(--text-muted)]">워크스페이스에 저장할 파일명과 디렉토리를 지정합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>문서 파일명</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={fileNameInput}
              onChange={(e) => {
                setFileNameInput(e.target.value);
                setError('');
              }}
              onFocus={(e) => {
                const dotIdx = e.target.value.lastIndexOf('.');
                if (dotIdx > 0) {
                  e.target.setSelectionRange(0, dotIdx);
                } else {
                  e.target.select();
                }
              }}
              placeholder="예: project_spec.md"
              className="w-full bg-[var(--bg-surface)] border border-white/[0.07] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[rgba(var(--accent-rgb),0.45)] transition placeholder-[var(--text-tertiary)]"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
              <Folder className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>대상 폴더</span>
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full bg-[var(--bg-surface)] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[rgba(var(--accent-rgb),0.45)] transition font-sans cursor-pointer"
            >
              {availableFolders.map((folder) => (
                <option key={folder} value={folder} className="bg-[var(--bg-elevated)] text-[var(--text-main)]">
                  📁 {folder}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F1F5F9] hover:bg-white text-[#0F172A] transition cursor-pointer"
            >
              문서 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
