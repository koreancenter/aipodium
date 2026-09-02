import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  FolderOpen,
  Check,
  X,
  RotateCw,
  Search,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { googleDriveService, DriveItem, DriveFolderInfo } from '../services/googleDriveService';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (folder: DriveFolderInfo) => void;
  currentFolder: DriveFolderInfo | null;
  onToast: (msg: string) => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFolder,
  currentFolder,
  onToast,
}) => {
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentFolder?.id || 'root');
  const [selectedFolderName, setSelectedFolderName] = useState<string>(currentFolder?.name || 'Google Drive Root');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      const items = await googleDriveService.listFolders('root');
      setFolders(items);
    } catch (e: any) {
      onToast('Google Drive 폴더 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFolders();
      if (currentFolder) {
        setSelectedFolderId(currentFolder.id);
        setSelectedFolderName(currentFolder.name);
      }
    }
  }, [isOpen, currentFolder]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsLoading(true);
    try {
      const created = await googleDriveService.createFolder(newFolderName.trim(), 'root');
      onToast(`'${created.name}' 폴더가 생성되었습니다.`);
      setNewFolderName('');
      setIsCreatingFolder(false);
      await loadFolders();
      setSelectedFolderId(created.id);
      setSelectedFolderName(created.name);
    } catch (e) {
      onToast('폴더 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    const folderInfo: DriveFolderInfo = {
      id: selectedFolderId,
      name: selectedFolderName,
      path: `/${selectedFolderName}`,
    };
    googleDriveService.setSavedSsotFolder(folderInfo);
    onSelectFolder(folderInfo);
    onToast(`Google Drive SSOT 폴더가 [${selectedFolderName}] (으)로 설정되었습니다.`);
    onClose();
  };

  if (!isOpen) return null;

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="relative bg-[#18181b] border border-[#27272a] rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans max-h-[85vh] flex flex-col">
        {/* Minimal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition cursor-pointer"
          title="닫기 (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 pt-1 shrink-0">
          <h2 className="text-base font-normal text-slate-300">Select Google Drive Folder</h2>
          <p className="text-xs text-slate-400">워크스페이스 문서를 동기화할 대상 폴더를 선택합니다.</p>
        </div>

        {/* Current Active Target Banner */}
        <div className="bg-[#27272a]/60 border border-[#3f3f46] rounded px-3 py-2 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-300 truncate">
            <HardDrive className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            <span className="text-slate-400 text-xs shrink-0">선택 대상:</span>
            <span className="font-mono text-slate-200 truncate flex items-center gap-1">
              <FolderOpen className="w-3 h-3 text-[#38bdf8]" />
              {selectedFolderName}
            </span>
          </div>
          <button
            type="button"
            onClick={loadFolders}
            className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
            title="새로고침"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#38bdf8]' : ''}`} />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="폴더 이름 검색..."
              className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-2.5 py-1.5 pl-8 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#38bdf8] transition"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            className="px-2.5 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 text-xs rounded transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>새 폴더</span>
          </button>
        </div>

        {/* New Folder Form */}
        {isCreatingFolder && (
          <form onSubmit={handleCreateFolder} className="p-2 bg-[#27272a]/60 border border-[#3f3f46] rounded flex items-center gap-2 shrink-0">
            <FolderPlus className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="새 폴더 이름 입력..."
              autoFocus
              className="flex-1 bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#38bdf8]"
            />
            <button
              type="submit"
              disabled={!newFolderName.trim() || isLoading}
              className="px-2.5 py-1 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white text-xs rounded transition cursor-pointer"
            >
              생성
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded cursor-pointer"
            >
              취소
            </button>
          </form>
        )}

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-[160px] pr-1">
          {/* Root Choice */}
          <div
            onClick={() => {
              setSelectedFolderId('root');
              setSelectedFolderName('Google Drive Root');
            }}
            className={`flex items-center justify-between p-2 rounded cursor-pointer border transition ${
              selectedFolderId === 'root'
                ? 'bg-[#27272a] border-[#38bdf8] text-white'
                : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a]/50 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-[#38bdf8]" />
              <div>
                <div className="text-xs font-normal">Google Drive 루트 (Root Directory)</div>
                <div className="text-[0.625rem] text-slate-500 font-mono">최상위 디렉토리</div>
              </div>
            </div>
            {selectedFolderId === 'root' && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            )}
          </div>

          {filteredFolders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <div
                key={folder.id}
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setSelectedFolderName(folder.name);
                }}
                className={`flex items-center justify-between p-2 rounded cursor-pointer border transition ${
                  isSelected
                    ? 'bg-[#27272a] border-[#38bdf8] text-white'
                    : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a]/50 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Folder className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-normal truncate">{folder.name}</div>
                    <div className="text-[0.625rem] text-slate-500 font-mono">ID: {folder.id}</div>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                )}
              </div>
            );
          })}

          {filteredFolders.length === 0 && !isLoading && (
            <div className="py-6 text-center text-slate-500 text-xs">
              <p>일치하는 폴더가 없습니다.</p>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(true)}
                className="mt-1 text-[#38bdf8] hover:underline text-xs cursor-pointer"
              >
                새 폴더를 만드시겠습니까?
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#27272a] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-[#27272a] transition cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded text-xs font-medium bg-[#0284c7] hover:bg-[#0369a1] text-white transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>폴더 지정</span>
          </button>
        </div>
      </div>
    </div>
  );
};
