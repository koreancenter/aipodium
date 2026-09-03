import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Folder,
  X,
  Cloud,
  Server,
  Database,
  Trash2,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ActiveWorkspace,
  pickLocalDirectory,
  rescanLocalDirectory,
  getMemoryDirectoryHandle,
  isFileSystemAccessSupported,
  listIndexedDBVaults,
  loadVaultFromIndexedDB,
  StoredVaultItem,
} from '../services/workspaceStorageService';
import { googleDriveService } from '../services/googleDriveService';
import type { RemoteConfig } from './RemoteWorkspaceModal';
import type { GithubConfig } from './GithubIntegrationModal';

export interface RecentWorkspaceItem {
  id: string;
  name: string;
  path: string;
  type: 'local' | 'folder' | 'file' | 'gdrive' | 'github' | 'remote' | 'indexeddb';
  timestamp: number;
  vaultId?: string;
  githubOwner?: string;
  githubRepo?: string;
  fileCount?: number;
  files?: Record<string, string>;
  fileFolders?: Record<string, string>;
}

interface WorkspaceConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspace: ActiveWorkspace;
  onSelectWorkspace: (
    workspace: ActiveWorkspace,
    loadedFiles?: Record<string, string>,
    loadedFolders?: Record<string, string>
  ) => void;
  currentFiles: Record<string, string>;
  currentFolders: Record<string, string>;
  onToast: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  onNewFile?: () => void;
  onOpenFileContent?: (fileName: string, content: string) => void;
  onOpenSSOTGenerator?: () => void;
  googleUser?: any;
  githubConfig?: GithubConfig | null;
  remoteConfig?: RemoteConfig | null;
  onOpenSettings?: (tab?: any) => void;
}

const STORAGE_KEY_RECENTS = 'aipodium_recent_workspaces';

// Filter out old mock items
const isMockItem = (item: any): boolean => {
  if (!item || !item.name) return true;
  if (typeof item.id === 'string' && item.id.startsWith('rec-')) return true;
  const mockNames = ['aipodium', 'vibecanvas', 'goguma-lm', 'kwavemission'];
  if (mockNames.includes(item.name) && (!item.files || Object.keys(item.files).length === 0)) {
    return true;
  }
  return false;
};

// Relative time formatter
const formatRelativeTime = (timestamp: number): string => {
  if (!timestamp) return '최근';
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return '방금 전';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
};

export const WorkspaceConnectionModal: React.FC<WorkspaceConnectionModalProps> = ({
  isOpen,
  onClose,
  activeWorkspace,
  onSelectWorkspace,
  currentFiles,
  currentFolders,
  onToast,
  onOpenFileContent,
  remoteConfig,
  onOpenSettings,
}) => {
  const [showRemoteOptions, setShowRemoteOptions] = useState<boolean>(false);
  const [isRescanning, setIsRescanning] = useState<boolean>(false);
  const [savedVaults, setSavedVaults] = useState<StoredVaultItem[]>([]);

  const [recentList, setRecentList] = useState<RecentWorkspaceItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RECENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => !isMockItem(item));
        }
      }
    } catch (e) {
      console.warn('Failed to load recent workspaces:', e);
    }
    return [];
  });

  const folderInputRef = useRef<HTMLInputElement>(null);
  const isFsSupported = isFileSystemAccessSupported();
  const memoryHandle = getMemoryDirectoryHandle();

  const saveRecentItem = (newItem: RecentWorkspaceItem) => {
    setRecentList((prev) => {
      const filtered = prev.filter(
        (item) => !(item.name === newItem.name && item.path === newItem.path) && !isMockItem(item)
      );
      const updated = [newItem, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeleteRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRecentList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    onToast('최근 기록에서 삭제되었습니다.', 'info');
  };

  const handleClearAllRecents = () => {
    setRecentList([]);
    try {
      localStorage.removeItem(STORAGE_KEY_RECENTS);
    } catch {}
    onToast('최근 프로젝트 기록이 모두 삭제되었습니다.', 'info');
  };

  useEffect(() => {
    if (isOpen) {
      setShowRemoteOptions(false);
      try {
        const stored = localStorage.getItem(STORAGE_KEY_RECENTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((item) => !isMockItem(item));
            setRecentList(cleaned);
            localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(cleaned));
          }
        }
      } catch (e) {
        console.warn(e);
      }

      listIndexedDBVaults()
        .then((vaults) => setSavedVaults(vaults))
        .catch(console.warn);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Open Local Folder
  const handleOpenFolder = async () => {
    if (isFsSupported) {
      try {
        const { name, files, fileFolders } = await pickLocalDirectory();
        const wsName = name || 'Local Workspace';
        const wsPath = `~/Developer/${wsName}`;

        const newWs: ActiveWorkspace = {
          id: `local-${Date.now()}`,
          name: wsName,
          type: 'local',
          path: wsPath,
          status: 'connected',
          lastSynced: '방금',
          fileCount: Object.keys(files).length,
        };

        saveRecentItem({
          id: newWs.id,
          name: wsName,
          path: wsPath,
          type: 'folder',
          timestamp: Date.now(),
          fileCount: Object.keys(files).length,
          files,
          fileFolders,
        });

        onSelectWorkspace(newWs, files, fileFolders);
        onToast(`📁 로컬 프로젝트 '${wsName}' (${Object.keys(files).length}개 파일)을 연결했습니다.`, 'success');
        onClose();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('File System Access API fallback:', err);
      }
    }

    folderInputRef.current?.click();
  };

  // Fallback for directory upload
  const handleFolderInputFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const loadedFiles: Record<string, string> = {};
    const loadedFolders: Record<string, string> = {};
    let folderName = 'Local Project';
    let processed = 0;
    const total = fileList.length;

    Array.from(fileList).forEach((file: File) => {
      const relPath = (file as any).webkitRelativePath || file.name;
      const parts = relPath.split('/');
      if (parts.length > 1) folderName = parts[0];
      const fName = parts[parts.length - 1];

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        loadedFiles[fName] = text;
        loadedFolders[fName] = folderName;
        processed++;

        if (processed === total) {
          const wsPath = `~/Developer/${folderName}`;
          const newWs: ActiveWorkspace = {
            id: `local-${Date.now()}`,
            name: folderName,
            type: 'local',
            path: wsPath,
            status: 'connected',
            lastSynced: '방금',
            fileCount: Object.keys(loadedFiles).length,
          };

          saveRecentItem({
            id: newWs.id,
            name: folderName,
            path: wsPath,
            type: 'folder',
            timestamp: Date.now(),
            fileCount: total,
            files: loadedFiles,
            fileFolders: loadedFolders,
          });

          onSelectWorkspace(newWs, loadedFiles, loadedFolders);
          onToast(`📁 로컬 폴더 '${folderName}' (${total}개 파일)을 불러왔습니다.`, 'success');
          onClose();
        }
      };
      reader.readAsText(file);
    });
  };

  // Rescan Current Directory
  const handleRescanCurrentDirectory = async () => {
    if (!memoryHandle) {
      onToast('폴더 연결을 갱신하려면 [내 PC 폴더 열기]를 눌러주세요.', 'warn');
      return;
    }
    setIsRescanning(true);
    try {
      const { files, fileFolders } = await rescanLocalDirectory(memoryHandle);
      const count = Object.keys(files).length;
      onSelectWorkspace(
        {
          ...activeWorkspace,
          fileCount: count,
          lastSynced: '방금',
        },
        files,
        fileFolders
      );
      onToast(`🔄 폴더 내 ${count}개 파일을 새로고침했습니다.`, 'success');
    } catch (e: any) {
      console.error(e);
      onToast('폴더 새로고침 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsRescanning(false);
    }
  };

  // Connect to Google Drive / SSH / Vault
  const handleConnectOption = async (option: 'gdrive' | 'ssh' | 'vault') => {
    if (option === 'gdrive') {
      const status = googleDriveService.getTokenStatus();
      if (status !== 'connected') {
        onToast('환경설정에서 Google 계정을 먼저 연동해주세요.', 'warn');
        if (onOpenSettings) onOpenSettings('integrations');
        onClose();
        return;
      }
      const newWs: ActiveWorkspace = {
        id: `gdrive-${Date.now()}`,
        name: 'Google Drive',
        type: 'gdrive',
        path: 'Google Drive:/My Drive',
        status: 'connected',
        lastSynced: '방금',
        fileCount: Object.keys(currentFiles).length,
      };
      saveRecentItem({
        id: newWs.id,
        name: 'Google Drive',
        path: 'Google Drive:/My Drive',
        type: 'gdrive',
        timestamp: Date.now(),
      });
      onSelectWorkspace(newWs);
      onToast(`☁️ Google Drive로 연결되었습니다.`, 'success');
      onClose();
    } else if (option === 'ssh') {
      if (!remoteConfig?.host) {
        onToast('환경설정에서 Remote SSH 서버를 먼저 설정해주세요.', 'warn');
        if (onOpenSettings) onOpenSettings('integrations');
        onClose();
        return;
      }
      const sshPath = `ssh://${remoteConfig.username || 'user'}@${remoteConfig.host}:${remoteConfig.remotePath || '~/workspace'}`;
      const newWs: ActiveWorkspace = {
        id: `ssh-${Date.now()}`,
        name: remoteConfig.host,
        type: 'remote',
        path: sshPath,
        status: 'connected',
        lastSynced: '방금',
        fileCount: Object.keys(currentFiles).length,
      };
      saveRecentItem({
        id: newWs.id,
        name: remoteConfig.host,
        path: `~/Remote/${remoteConfig.host}`,
        type: 'remote',
        timestamp: Date.now(),
      });
      onSelectWorkspace(newWs);
      onToast(`🌐 Remote SSH '${remoteConfig.host}'로 연결되었습니다.`, 'success');
      onClose();
    } else if (option === 'vault') {
      if (savedVaults.length > 0) {
        const topVault = savedVaults[0];
        try {
          const vaultData = await loadVaultFromIndexedDB(topVault.id);
          if (vaultData) {
            const newWs: ActiveWorkspace = {
              id: `vault-${topVault.id}`,
              name: topVault.name,
              type: 'indexeddb',
              path: `~/Vault/${topVault.name}`,
              vaultId: topVault.id,
              status: 'connected',
              lastSynced: '방금',
              fileCount: Object.keys(vaultData.files || {}).length,
            };
            saveRecentItem({
              id: newWs.id,
              name: topVault.name,
              path: `~/Vault/${topVault.name}`,
              type: 'indexeddb',
              vaultId: topVault.id,
              timestamp: Date.now(),
            });
            onSelectWorkspace(newWs, vaultData.files, vaultData.fileFolders);
            onToast(`💾 Vault '${topVault.name}'를 불러왔습니다.`, 'success');
            onClose();
            return;
          }
        } catch (e) {
          console.warn(e);
        }
      }

      const newWs: ActiveWorkspace = {
        id: `vault-${Date.now()}`,
        name: 'Personal Vault',
        type: 'indexeddb',
        path: '~/Vault/Personal Vault',
        status: 'connected',
        lastSynced: '방금',
        fileCount: Object.keys(currentFiles).length,
      };
      saveRecentItem({
        id: newWs.id,
        name: 'Personal Vault',
        path: '~/Vault/Personal Vault',
        type: 'indexeddb',
        timestamp: Date.now(),
      });
      onSelectWorkspace(newWs);
      onToast(`💾 브라우저 로컬 Vault로 전환되었습니다.`, 'success');
      onClose();
    }
  };

  // Select Recent Item
  const handleSelectRecent = async (item: RecentWorkspaceItem) => {
    if (item.type === 'indexeddb' && item.vaultId) {
      try {
        const vaultData = await loadVaultFromIndexedDB(item.vaultId);
        if (vaultData) {
          const newWs: ActiveWorkspace = {
            id: `vault-${item.vaultId}`,
            name: item.name,
            type: 'indexeddb',
            path: item.path,
            vaultId: item.vaultId,
            status: 'connected',
            lastSynced: '방금',
            fileCount: Object.keys(vaultData.files || {}).length,
          };
          onSelectWorkspace(newWs, vaultData.files, vaultData.fileFolders);
          saveRecentItem({ ...item, timestamp: Date.now() });
          onToast(`💾 '${item.name}' 프로젝트를 열었습니다.`, 'success');
          onClose();
          return;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    if (item.files && Object.keys(item.files).length > 0) {
      const newWs: ActiveWorkspace = {
        id: item.id || `ws-${Date.now()}`,
        name: item.name,
        type: (item.type === 'folder' || item.type === 'file' ? 'local' : item.type) as any,
        path: item.path,
        status: 'connected',
        lastSynced: '방금',
        fileCount: Object.keys(item.files).length,
      };
      onSelectWorkspace(newWs, item.files, item.fileFolders || {});
      if (item.type === 'file' && onOpenFileContent && item.files[item.name]) {
        onOpenFileContent(item.name, item.files[item.name]);
      }
      saveRecentItem({ ...item, timestamp: Date.now() });
      onToast(`📂 '${item.name}' 프로젝트를 열었습니다.`, 'success');
      onClose();
      return;
    }

    const newWs: ActiveWorkspace = {
      id: item.id || `ws-${Date.now()}`,
      name: item.name,
      type: (item.type === 'folder' || item.type === 'file' ? 'local' : item.type) as any,
      path: item.path,
      status: 'connected',
      lastSynced: '방금',
      fileCount: Object.keys(currentFiles).length,
    };
    onSelectWorkspace(newWs);
    saveRecentItem({ ...item, timestamp: Date.now() });
    onToast(`📂 '${item.name}' 프로젝트로 전환되었습니다.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      {/* Hidden Folder Input Fallback */}
      <input
        type="file"
        ref={folderInputRef}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFolderInputFallback}
        className="hidden"
      />

      {/* Main Dialog: Clean, Minimal, Unboxed */}
      <div className="relative bg-[#16171e] border border-[#2e3142] rounded-md max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2e3142]/70">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">프로젝트 폴더 관리</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#282a38] transition cursor-pointer"
            title="닫기 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Area */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleOpenFolder}
            className="w-full bg-[#6366f1] hover:bg-[#5254e0] text-white py-2.5 px-4 rounded font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>내 PC 폴더 열기... (Open Folder)</span>
          </button>

          {/* Current Project Info & Rescan (Single subtle row) */}
          <div className="flex items-center justify-between text-[0.75rem] text-slate-400 px-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-400 shrink-0">현재:</span>
              <span className="text-slate-200 font-medium truncate" title={activeWorkspace.path}>
                {activeWorkspace.name}
              </span>
              <span className="text-slate-400 font-mono text-[0.6875rem] shrink-0">
                ({Object.keys(currentFiles).length}개 파일)
              </span>
            </div>

            {memoryHandle && activeWorkspace.type === 'local' && (
              <button
                type="button"
                onClick={handleRescanCurrentDirectory}
                disabled={isRescanning}
                className="flex items-center gap-1 text-[0.6875rem] text-indigo-400 hover:text-indigo-300 transition cursor-pointer shrink-0 disabled:opacity-50 ml-2"
                title="폴더 새로고침"
              >
                <RefreshCw className={`w-3 h-3 ${isRescanning ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
            )}
          </div>
        </div>

        {/* Recent Projects List */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              최근 프로젝트
            </span>
            {recentList.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllRecents}
                className="text-[0.625rem] text-slate-400 hover:text-rose-400 transition cursor-pointer"
              >
                전체 삭제
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto rounded bg-[#121318] border border-[#2e3142]/70 divide-y divide-[#2e3142]/40 custom-scrollbar">
            {recentList.length === 0 ? (
              <div className="py-7 text-center text-xs text-slate-400 space-y-1">
                <p>최근 열었던 프로젝트 폴더가 없습니다.</p>
                <p className="text-[0.6875rem] text-slate-400">
                  위의 [내 PC 폴더 열기] 버튼을 눌러 프로젝트를 시작하세요.
                </p>
              </div>
            ) : (
              recentList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectRecent(item)}
                  className="px-3 py-2 flex items-center justify-between hover:bg-[#1e202b] transition cursor-pointer group select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-4 h-4 text-indigo-400 shrink-0 group-hover:scale-105 transition-transform" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 truncate">
                          {item.name}
                        </span>
                        {item.fileCount !== undefined && (
                          <span className="text-[0.625rem] text-slate-400 font-mono">
                            · {item.fileCount}개
                          </span>
                        )}
                      </div>
                      <div className="text-[0.6875rem] text-slate-400 font-mono truncate">
                        {item.path}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[0.625rem] text-slate-400 font-mono">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRecent(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                      title="이 기록 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Remote & Other Storages (Subtle text dropdown at bottom) */}
        <div className="pt-2 border-t border-[#2e3142]/60">
          <button
            type="button"
            onClick={() => setShowRemoteOptions(!showRemoteOptions)}
            className="flex items-center justify-between w-full text-[0.6875rem] text-slate-400 hover:text-slate-200 transition cursor-pointer px-1 py-0.5"
          >
            <span>☁️ Google Drive / 원격 저장소 연결...</span>
            {showRemoteOptions ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {showRemoteOptions && (
            <div className="pt-2 grid grid-cols-3 gap-1.5 animate-in fade-in duration-100">
              <button
                type="button"
                onClick={() => handleConnectOption('gdrive')}
                className="py-1.5 px-2 rounded bg-[#121318] hover:bg-[#1e202b] border border-[#2e3142]/60 flex items-center justify-center gap-1.5 text-slate-300 hover:text-white text-xs transition cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[0.6875rem]">Google Drive</span>
              </button>

              <button
                type="button"
                onClick={() => handleConnectOption('ssh')}
                className="py-1.5 px-2 rounded bg-[#121318] hover:bg-[#1e202b] border border-[#2e3142]/60 flex items-center justify-center gap-1.5 text-slate-300 hover:text-white text-xs transition cursor-pointer"
              >
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[0.6875rem]">Remote SSH</span>
              </button>

              <button
                type="button"
                onClick={() => handleConnectOption('vault')}
                className="py-1.5 px-2 rounded bg-[#121318] hover:bg-[#1e202b] border border-[#2e3142]/60 flex items-center justify-center gap-1.5 text-slate-300 hover:text-white text-xs transition cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[0.6875rem]">브라우저 Vault</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
