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

  const allExisting = useMemo(() => {
    return [...existingFiles, ...existingFileNames];
  }, [existingFiles, existingFileNames]);

  const targetDefaultName = defaultFileName || initialFileName || 'Untitled-1';

  useEffect(() => {
    if (isOpen) {
      const suggested = targetDefaultName.startsWith('Untitled-')
        ? `note_${Date.now().toString().slice(-4)}.md`
        : targetDefaultName.endsWith('.md')
        ? targetDefaultName
        : `${targetDefaultName}.md`;
      setFileNameInput(suggested);
      setSelectedFolder(defaultFolder || availableFolders[0] || 'docs');
      setError('');
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
    if (allExisting.includes(name)) {
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
    <div className="fixed inset-0 bg-[#121318]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Deep Charcoal & Electric Purple Modal */}
      <div className="relative bg-[#1e202b] border border-[#2e3142] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
        
        {/* Top-Right Minimal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#282a38] transition cursor-pointer"
          title="닫기 (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Section Title */}
        <div className="space-y-1 pt-1">
          <h2 className="text-base font-bold text-white">Save Document (문서 저장)</h2>
          <p className="text-xs text-[#94a3b8]">워크스페이스에 저장할 파일명과 디렉토리를 지정합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-[#6366f1]" />
              <span>문서 파일명</span>
            </label>
            <input
              type="text"
              value={fileNameInput}
              onChange={(e) => {
                setFileNameInput(e.target.value);
                setError('');
              }}
              placeholder="예: project_spec.md"
              className="w-full bg-[#121318] border border-[#2e3142] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition placeholder-slate-500"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>대상 폴더</span>
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full bg-[#121318] border border-[#2e3142] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/50 transition font-sans cursor-pointer"
            >
              {availableFolders.map((folder) => (
                <option key={folder} value={folder} className="bg-[#1e202b] text-slate-200">
                  📁 {folder}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#2e3142]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-[#121318] hover:bg-[#282a38] transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white transition shadow-xs cursor-pointer"
            >
              문서 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
