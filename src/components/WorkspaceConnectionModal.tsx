import React, { useState, useEffect, useRef } from 'react';
import {
  FilePlus2,
  FileUp,
  Folder,
  GitFork,
  Radio,
  Sparkles,
  X,
  Cloud,
  Server,
  Database,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import {
  ActiveWorkspace,
  pickLocalDirectory,
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

const INITIAL_FALLBACK_RECENTS: RecentWorkspaceItem[] = [
  {
    id: 'rec-aipodium',
    name: 'aipodium',
    path: '~/Developer',
    type: 'folder',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'rec-vibecanvas',
    name: 'vibecanvas',
    path: '~/Developer',
    type: 'folder',
    timestamp: Date.now() - 7200000,
  },
  {
    id: 'rec-goguma-lm',
    name: 'goguma-lm',
    path: '~/Developer/goguma-bat',
    type: 'folder',
    timestamp: Date.now() - 10800000,
  },
  {
    id: 'rec-goguma-dev',
    name: 'goguma-lm',
    path: '~/Developer/dev/goguma-bat',
    type: 'folder',
    timestamp: Date.now() - 14400000,
  },
  {
    id: 'rec-kwavemission',
    name: 'kwavemission',
    path: '~/Developer/dev',
    type: 'folder',
    timestamp: Date.now() - 18000000,
  },
];

export const WorkspaceConnectionModal: React.FC<WorkspaceConnectionModalProps> = ({
  isOpen,
  onClose,
  activeWorkspace,
  onSelectWorkspace,
  currentFiles,
  currentFolders,
  onToast,
  onNewFile,
  onOpenFileContent,
  onOpenSSOTGenerator,
  githubConfig,
  remoteConfig,
  onOpenSettings,
}) => {
  const [connectToSubmenu, setConnectToSubmenu] = useState<boolean>(false);
  const [cloneGitPrompt, setCloneGitPrompt] = useState<boolean>(false);
  const [gitRepoInput, setGitRepoInput] = useState<string>('aipodium/vibe-canvas');
  const [showAllRecents, setShowAllRecents] = useState<boolean>(false);
  const [savedVaults, setSavedVaults] = useState<StoredVaultItem[]>([]);
  
  const [recentList, setRecentList] = useState<RecentWorkspaceItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RECENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load recent workspaces from localStorage:', e);
    }
    return INITIAL_FALLBACK_RECENTS;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const isFsSupported = isFileSystemAccessSupported();

  // Helper to persist updated recents
  const saveRecentItem = (newItem: RecentWorkspaceItem) => {
    setRecentList((prev) => {
      const filtered = prev.filter((item) => !(item.name === newItem.name && item.path === newItem.path));
      const updated = [newItem, ...filtered].slice(0, 25);
      try {
        localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    if (isOpen) {
      setConnectToSubmenu(false);
      setCloneGitPrompt(false);

      // Load stored recents from localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY_RECENTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecentList(parsed);
          }
        }
      } catch (e) {
        console.warn(e);
      }

      // Merge saved vaults from IndexedDB
      listIndexedDBVaults()
        .then((vaults) => {
          setSavedVaults(vaults);
          if (vaults.length > 0) {
            const vaultRecents: RecentWorkspaceItem[] = vaults.map((v) => ({
              id: `vault-${v.id}`,
              name: v.name,
              path: `~/Vault/${v.name}`,
              type: 'indexeddb',
              vaultId: v.id,
              timestamp: Date.now(),
            }));
            setRecentList((prev) => {
              const keys = new Set(prev.map((p) => `${p.name}_${p.path}`));
              const uniqueNew = vaultRecents.filter((vr) => !keys.has(`${vr.name}_${vr.path}`));
              const merged = [...uniqueNew, ...prev];
              try {
                localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        })
        .catch(console.warn);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. New File...
  const handleNewFile = () => {
    onClose();
    if (onNewFile) {
      onNewFile();
    } else {
      onToast('📝 새 문서 탭이 생성되었습니다.', 'info');
    }
  };

  // 2. Open File...
  const handleTriggerOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    if (fileList.length === 1) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = (ev.target?.result as string) || '';
        const updated = { ...currentFiles, [file.name]: content };
        const folders = { ...currentFolders, [file.name]: 'Opened Files' };

        if (onOpenFileContent) {
          onOpenFileContent(file.name, content);
        } else {
          onSelectWorkspace(
            {
              ...activeWorkspace,
              fileCount: Object.keys(updated).length,
            },
            updated,
            folders
          );
        }

        saveRecentItem({
          id: `file-${Date.now()}`,
          name: file.name,
          path: `~/Developer/${file.name}`,
          type: 'file',
          timestamp: Date.now(),
          files: { [file.name]: content },
          fileFolders: { [file.name]: 'Opened Files' },
        });

        onToast(`📄 '${file.name}' 파일을 열었습니다.`, 'success');
        onClose();
      };
      reader.readAsText(file);
    } else {
      // Multiple files batch load
      const loadedFiles: Record<string, string> = { ...currentFiles };
      const loadedFolders: Record<string, string> = { ...currentFolders };
      let processed = 0;
      const total = fileList.length;

      Array.from(fileList).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = (ev.target?.result as string) || '';
          loadedFiles[file.name] = content;
          loadedFolders[file.name] = 'Opened Files';
          processed++;

          if (processed === total) {
            const firstFileName = fileList[0].name;
            onSelectWorkspace(
              {
                ...activeWorkspace,
                fileCount: Object.keys(loadedFiles).length,
              },
              loadedFiles,
              loadedFolders
            );
            if (onOpenFileContent) {
              onOpenFileContent(firstFileName, loadedFiles[firstFileName]);
            }

            saveRecentItem({
              id: `files-${Date.now()}`,
              name: `${total}개 파일 모음`,
              path: `~/Developer/Opened Files`,
              type: 'folder',
              timestamp: Date.now(),
              fileCount: total,
              files: loadedFiles,
              fileFolders: loadedFolders,
            });

            onToast(`📄 ${total}개 파일을 열었습니다.`, 'success');
            onClose();
          }
        };
        reader.readAsText(file);
      });
    }
  };

  // 3. Open Folder...
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
        onToast(`📁 로컬 폴더 '${wsName}' (${Object.keys(files).length}개 파일)을 열었습니다.`, 'success');
        onClose();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('File System Access API error, fallback to folder input:', err);
      }
    }

    // Fallback: directory picker via input
    folderInputRef.current?.click();
  };

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
      if (parts.length > 1) {
        folderName = parts[0];
      }
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
          onToast(`📁 로컬 폴더 '${folderName}' (${total}개 파일)을 열었습니다.`, 'success');
          onClose();
        }
      };
      reader.readAsText(file);
    });
  };

  // 4. Clone Git Repository...
  const handleCloneGit = async () => {
    let repo = gitRepoInput.trim();
    if (!repo) {
      onToast('Git 저장소 주소(예: owner/repo 또는 https://github.com/...)를 입력해주세요.', 'warn');
      return;
    }

    repo = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const parts = repo.split('/');
    const owner = parts.length > 1 ? parts[0] : 'origin';
    const repoName = parts.length > 1 ? parts[1] : parts[0];
    const wsPath = `~/Developer/${repoName}`;

    const newWs: ActiveWorkspace = {
      id: `git-${Date.now()}`,
      name: repoName,
      type: 'github',
      path: `github.com/${owner}/${repoName}`,
      githubOwner: owner,
      githubRepo: repoName,
      githubBranch: 'main',
      status: 'connected',
      lastSynced: '방금',
      fileCount: Object.keys(currentFiles).length,
    };

    let sampleFiles: Record<string, string> | undefined;
    let sampleFolders: Record<string, string> | undefined;

    try {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/main/README.md`);
      if (res.ok) {
        const readme = await res.text();
        sampleFiles = { ...currentFiles, 'README.md': readme };
        sampleFolders = { ...currentFolders, 'README.md': repoName };
        onSelectWorkspace(newWs, sampleFiles, sampleFolders);
        if (onOpenFileContent) onOpenFileContent('README.md', readme);
      } else {
        onSelectWorkspace(newWs);
      }
    } catch {
      onSelectWorkspace(newWs);
    }

    saveRecentItem({
      id: newWs.id,
      name: repoName,
      path: wsPath,
      type: 'github',
      timestamp: Date.now(),
      githubOwner: owner,
      githubRepo: repoName,
      files: sampleFiles,
      fileFolders: sampleFolders,
    });

    onToast(`🐙 Git 저장소 '${owner}/${repoName}' 워크스페이스가 준비되었습니다.`, 'success');
    onClose();
  };

  // 5. Connect to... (Google Drive, Remote SSH, Browser Vault)
  const handleConnectOption = async (option: 'gdrive' | 'ssh' | 'vault') => {
    if (option === 'gdrive') {
      const status = googleDriveService.getTokenStatus();
      if (status !== 'connected') {
        onToast('환경설정(My Preference)에서 Google 계정을 먼저 연동해주세요.', 'warn');
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
      onToast(`☁️ Google Drive 워크스페이스로 연결되었습니다.`, 'success');
      onClose();
    } else if (option === 'ssh') {
      if (!remoteConfig?.host) {
        onToast('환경설정(My Preference)에서 Remote SSH 서버를 먼저 설정해주세요.', 'warn');
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
      onToast(`🌐 Remote SSH '${remoteConfig.host}' 워크스페이스로 연결되었습니다.`, 'success');
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
      onToast(`💾 오프라인 브라우저 Vault로 전환되었습니다.`, 'success');
      onClose();
    }
  };

  // 6. Generate New Workspace...
  const handleGenerateWorkspace = () => {
    onClose();
    if (onOpenSSOTGenerator) {
      onOpenSSOTGenerator();
    } else {
      onToast('✨ 새 SSOT 워크스페이스가 생성되었습니다.', 'success');
    }
  };

  // Recent item click
  const handleSelectRecent = async (item: RecentWorkspaceItem) => {
    // 1. IndexedDB Vault
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
          onToast(`💾 '${item.name}' 워크스페이스를 열었습니다.`, 'success');
          onClose();
          return;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    // 2. Cached files available
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
      onToast(`📂 '${item.name}' (${item.path}) 워크스페이스를 열었습니다.`, 'success');
      onClose();
      return;
    }

    // 3. Fallback switch
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
    onToast(`📂 '${item.name}' (${item.path}) 워크스페이스로 전환되었습니다.`, 'success');
    onClose();
  };

  const displayedRecents = showAllRecents ? recentList : recentList.slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      {/* Hidden File Input for Single/Multi File Open */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Hidden Folder Input for Directory Selection */}
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

      {/* VS Code Clean Start Menu Modal */}
      <div className="relative bg-[#18181b] border border-[#27272a] rounded-lg max-w-md w-full p-6 shadow-2xl space-y-6 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
        
        {/* Top-Right Minimal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition cursor-pointer"
          title="닫기 (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* SECTION 1: START */}
        <div className="space-y-3 pt-1">
          <h2 className="text-base font-normal text-slate-300">Start</h2>

          <div className="space-y-2 text-[0.875rem]">
            {/* 1. New File... */}
            <button
              type="button"
              onClick={handleNewFile}
              className="w-full flex items-center gap-3 text-left group hover:text-white transition cursor-pointer text-[#38bdf8]"
            >
              <FilePlus2 className="w-4 h-4 text-[#38bdf8] shrink-0" />
              <span className="group-hover:underline">New File...</span>
            </button>

            {/* 2. Open File... */}
            <button
              type="button"
              onClick={handleTriggerOpenFile}
              className="w-full flex items-center gap-3 text-left group hover:text-white transition cursor-pointer text-[#38bdf8]"
            >
              <FileUp className="w-4 h-4 text-[#38bdf8] shrink-0" />
              <span className="group-hover:underline">Open File...</span>
            </button>

            {/* 3. Open Folder... */}
            <button
              type="button"
              onClick={handleOpenFolder}
              className="w-full flex items-center gap-3 text-left group hover:text-white transition cursor-pointer text-[#38bdf8]"
            >
              <Folder className="w-4 h-4 text-[#38bdf8] shrink-0" />
              <span className="group-hover:underline">Open Folder...</span>
            </button>

            {/* 4. Clone Git Repository... */}
            {!cloneGitPrompt ? (
              <button
                type="button"
                onClick={() => setCloneGitPrompt(true)}
                className="w-full flex items-center gap-3 text-left group hover:text-white transition cursor-pointer text-[#38bdf8]"
              >
                <GitFork className="w-4 h-4 text-[#38bdf8] shrink-0" />
                <span className="group-hover:underline">Clone Git Repository...</span>
              </button>
            ) : (
              <div className="bg-[#27272a]/60 border border-[#3f3f46] rounded p-2 space-y-2 animate-in fade-in duration-100">
                <div className="flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-[#38bdf8] shrink-0" />
                  <input
                    type="text"
                    value={gitRepoInput}
                    onChange={(e) => setGitRepoInput(e.target.value)}
                    placeholder="예: owner/repository"
                    className="flex-1 bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#38bdf8]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCloneGit();
                      if (e.key === 'Escape') setCloneGitPrompt(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCloneGit}
                    className="px-2.5 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs rounded font-medium cursor-pointer"
                  >
                    열기
                  </button>
                </div>
              </div>
            )}

            {/* 5. Connect to... */}
            {!connectToSubmenu ? (
              <button
                type="button"
                onClick={() => setConnectToSubmenu(true)}
                className="w-full flex items-center gap-3 text-left group hover:text-white transition cursor-pointer text-[#38bdf8]"
              >
                <Radio className="w-4 h-4 text-[#38bdf8] shrink-0" />
                <span className="group-hover:underline">Connect to...</span>
              </button>
            ) : (
              <div className="bg-[#27272a]/60 border border-[#3f3f46] rounded p-2 space-y-1.5 animate-in fade-in duration-100">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-[#3f3f46]">
                  <span>연결 대상 선택:</span>
                  <button
                    type="button"
                    onClick={() => setConnectToSubmenu(false)}
                    className="hover:text-white text-[0.625rem] cursor-pointer"
                  >
                    취소
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleConnectOption('gdrive')}
                  className="w-full text-left text-xs py-1 px-1.5 rounded hover:bg-[#3f3f46] text-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Google Drive</span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => handleConnectOption('ssh')}
                  className="w-full text-left text-xs py-1 px-1.5 rounded hover:bg-[#3f3f46] text-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Remote SSH Server</span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => handleConnectOption('vault')}
                  className="w-full text-left text-xs py-1 px-1.5 rounded hover:bg-[#3f3f46] text-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Browser Vault (IndexedDB)</span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            )}

            {/* 6. Generate New Workspace... */}
            <button
              type="button"
              onClick={handleGenerateWorkspace}
              className="w-full flex items-center gap-3 text-left group hover:text-white transition cursor-pointer text-[#38bdf8]"
            >
              <Sparkles className="w-4 h-4 text-[#38bdf8] shrink-0" />
              <span className="group-hover:underline">Generate New Workspace...</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: RECENT */}
        <div className="space-y-3 pt-2">
          <h2 className="text-base font-normal text-slate-300">Recent</h2>

          <div className="space-y-2 text-[0.875rem]">
            {displayedRecents.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectRecent(item)}
                className="flex items-baseline justify-between group cursor-pointer text-left py-0.5 hover:opacity-90 transition truncate"
              >
                <div className="flex items-baseline gap-4 truncate min-w-0">
                  <span className="text-[#38bdf8] font-normal group-hover:underline shrink-0">
                    {item.name}
                  </span>
                  <span className="text-slate-400 text-xs font-mono truncate">
                    {item.path}
                  </span>
                </div>
              </div>
            ))}

            {/* More... Link */}
            {!showAllRecents && recentList.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllRecents(true)}
                className="text-[#38bdf8] text-[0.875rem] hover:underline pt-1 block cursor-pointer"
              >
                More...
              </button>
            )}

            {showAllRecents && (
              <button
                type="button"
                onClick={() => setShowAllRecents(false)}
                className="text-slate-400 text-xs hover:text-slate-200 pt-1 block cursor-pointer"
              >
                접기
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
