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
  FileText,
  Upload,
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
import { convertDocumentToMarkdown } from '../services/documentConverterService';
import type { GithubConfig } from './GithubIntegrationModal';
import { useLanguage } from '../context/LanguageContext';
import { getConnectionTranslations } from '../locales/connectionLocale';

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
  onImportDocumentFiles?: (files: File[]) => void;
  googleUser?: any;
  githubConfig?: GithubConfig | null;
  onOpenSettings?: (tab?: any) => void;
}

const STORAGE_KEY_RECENTS = 'aipodium_recent_workspaces';

// Filter out old mock items
const isMockItem = (item: any): boolean => {
  if (!item || !item.name) return true;
  if (typeof item.id === 'string' && item.id.startsWith('rec-')) return true;
  const mockNames = ['aipodium', 'goguma-lm', 'kwavemission'];
  if (mockNames.includes(item.name) && (!item.files || Object.keys(item.files).length === 0)) {
    return true;
  }
  return false;
};

// Relative time formatter
const formatRelativeTime = (
  timestamp: number,
  t: ReturnType<typeof getConnectionTranslations>['workspace']
): string => {
  if (!timestamp) return t.recent;
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return t.justNow;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t.minutesAgo(diffMin);
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t.hoursAgo(diffHour);
  const diffDay = Math.floor(diffHour / 24);
  return t.daysAgo(diffDay);
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
  onImportDocumentFiles,
  onOpenSettings,
}) => {
  const { language } = useLanguage();
  const t = getConnectionTranslations(language).workspace;
  const [showRemoteOptions, setShowRemoteOptions] = useState<boolean>(false);
  const [isRescanning, setIsRescanning] = useState<boolean>(false);
  const [savedVaults, setSavedVaults] = useState<StoredVaultItem[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);

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
    onToast(t.toastRecentRemoved, 'info');
  };

  const handleClearAllRecents = () => {
    setRecentList([]);
    try {
      localStorage.removeItem(STORAGE_KEY_RECENTS);
    } catch {}
    onToast(t.toastRecentsCleared, 'info');
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
        onToast(t.toastLocalConnected(wsName, Object.keys(files).length), 'success');
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

    // Filter for knowledge/document files only
    const validFiles: File[] = [];
    Array.from(fileList).forEach((file: File) => {
      const relPath = (file as any).webkitRelativePath || file.name;
      const lowerPath = relPath.toLowerCase();

      // Check if it's in an ignored directory
      const parts = relPath.split('/');
      const isIgnoredDir = parts.some((p: string) =>
        p.startsWith('.') ||
        p === 'node_modules' ||
        p === 'dist' ||
        p === 'build' ||
        p === 'out' ||
        p === 'coverage'
      );
      if (isIgnoredDir) return;

      const isSupportedDoc =
        lowerPath.endsWith('.md') ||
        lowerPath.endsWith('.markdown') ||
        lowerPath.endsWith('.txt') ||
        lowerPath.endsWith('.json') ||
        lowerPath.endsWith('.csv') ||
        lowerPath.endsWith('.pdf') ||
        lowerPath.endsWith('.docx') ||
        lowerPath.endsWith('.xlsx') ||
        lowerPath.endsWith('.xls') ||
        lowerPath.endsWith('.pptx');

      if (isSupportedDoc) {
        validFiles.push(file);
      }
    });

    if (validFiles.length === 0) {
      onToast(t.toastNoDocuments, 'warn');
      return;
    }

    const total = validFiles.length;
    onToast(t.toastConverting(total), 'info');

    (async () => {
      try {
        for (const file of validFiles) {
          const fullRelPath = (file as any).webkitRelativePath || file.name;
          const parts = fullRelPath.split('/');
          if (parts.length > 1) folderName = parts[0];
          let relPath = parts.length > 1 ? parts.slice(1).join('/') : file.name;

          const lower = file.name.toLowerCase();
          const isOfficeOrPdf =
            lower.endsWith('.pdf') ||
            lower.endsWith('.docx') ||
            lower.endsWith('.xlsx') ||
            lower.endsWith('.xls') ||
            lower.endsWith('.pptx');

          if (isOfficeOrPdf) {
            const { markdown } = await convertDocumentToMarkdown(file);
            relPath = relPath.replace(/\.[^/.]+$/, '') + '.md';
            loadedFiles[relPath] = markdown;
          } else {
            const text = await file.text();
            loadedFiles[relPath] = text;
          }
          loadedFolders[relPath] = folderName;
        }

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
          fileCount: Object.keys(loadedFiles).length,
          files: loadedFiles,
          fileFolders: loadedFolders,
        });

        onSelectWorkspace(newWs, loadedFiles, loadedFolders);
        onToast(t.toastFolderConverted(folderName, Object.keys(loadedFiles).length), 'success');
        onClose();
      } catch (err: any) {
        onToast(t.toastDocumentError(err.message), 'error');
      }
    })();
  };

  // Rescan Current Directory
  const handleRescanCurrentDirectory = async () => {
    if (!memoryHandle) {
      onToast(t.toastReopenFolder, 'warn');
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
      onToast(t.toastRefreshed(count), 'success');
    } catch (e: any) {
      console.error(e);
      onToast(t.toastRefreshFailed, 'error');
    } finally {
      setIsRescanning(false);
    }
  };

  // Connect to Google Drive / Vault
  const handleConnectOption = async (option: 'gdrive' | 'vault') => {
    if (option === 'gdrive') {
      let status = googleDriveService.getTokenStatus();
      if (status !== 'connected') {
        try {
          onToast(t.toastDriveConnecting, 'info');
          await googleDriveService.signIn();
          status = googleDriveService.getTokenStatus();
        } catch (e: any) {
          onToast(t.toastDriveFailed(e.message || t.authError), 'warn');
          return;
        }
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
      onToast(t.toastDriveConnected, 'success');
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
            onToast(t.toastVaultLoaded(topVault.name), 'success');
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
      onToast(t.toastBrowserVault, 'success');
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
          onToast(t.toastProjectOpenedVault(item.name), 'success');
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
      onToast(t.toastProjectOpened(item.name), 'success');
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
    onToast(t.toastProjectSwitched(item.name), 'success');
    onClose();
  };

  const handleDocInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    if (onImportDocumentFiles) {
      onImportDocumentFiles(filesArray);
      onClose();
    }
    if (e.target) e.target.value = '';
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

      {/* Hidden Document Input for Office / PDF / Text */}
      <input
        type="file"
        ref={docInputRef}
        accept=".pdf,.docx,.xlsx,.xls,.pptx,.ppt,.md,.markdown,.txt,.csv"
        multiple
        onChange={handleDocInputChange}
        className="hidden"
      />

      {/* Main Dialog: Clean, Minimal, Unboxed */}
      <div className="relative bg-[#0c0c0e] border border-[#222226] rounded-md max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222226]/70">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">{t.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-[#18181b] transition cursor-pointer"
            title={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Area */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleOpenFolder}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-md font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>{t.openLocalFolder}</span>
          </button>

          {/* Document Converter Action Button */}
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            className="w-full bg-[#202230] hover:bg-[#282a3c] text-indigo-300 hover:text-indigo-200 border border-[#222226] py-2 px-4 rounded-md font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <FileText className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>{t.importDocuments}</span>
          </button>

          {/* Current Project Info & Rescan (Single subtle row) */}
          <div className="flex items-center justify-between text-[0.75rem] text-slate-400 px-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-400 shrink-0">{t.current}</span>
              <span className="text-slate-200 font-medium truncate" title={activeWorkspace.path}>
                {activeWorkspace.name}
              </span>
              <span className="text-slate-400 font-mono text-[0.6875rem] shrink-0">
                ({t.fileCount(Object.keys(currentFiles).length)})
              </span>
            </div>

            {memoryHandle && activeWorkspace.type === 'local' && (
              <button
                type="button"
                onClick={handleRescanCurrentDirectory}
                disabled={isRescanning}
                className="flex items-center gap-1 text-[0.6875rem] text-indigo-400 hover:text-indigo-300 transition cursor-pointer shrink-0 disabled:opacity-50 ml-2"
                title={t.refreshFolder}
              >
                <RefreshCw className={`w-3 h-3 ${isRescanning ? 'animate-spin' : ''}`} />
                <span>{t.refresh}</span>
              </button>
            )}
          </div>
        </div>

        {/* Recent Projects List */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {t.recentProjects}
            </span>
            {recentList.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllRecents}
                className="text-[0.625rem] text-slate-400 hover:text-rose-400 transition cursor-pointer"
              >
                {t.clearAll}
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto rounded bg-[#09090b] border border-[#222226]/70 divide-y divide-[#222226]/40 custom-scrollbar">
            {recentList.length === 0 ? (
              <div className="py-7 text-center text-xs text-slate-400 space-y-1">
                <p>{t.noRecents}</p>
                <p className="text-[0.6875rem] text-slate-400">
                  {t.noRecentsHint}
                </p>
              </div>
            ) : (
              recentList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectRecent(item)}
                  className="px-3 py-2 flex items-center justify-between hover:bg-[#121214] transition cursor-pointer group select-none"
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
                            · {t.fileCountShort(item.fileCount)}
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
                      {formatRelativeTime(item.timestamp, t)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRecent(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                      title={t.removeRecent}
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
        <div className="pt-2 border-t border-[#222226]/60">
          <button
            type="button"
            onClick={() => setShowRemoteOptions(!showRemoteOptions)}
            className="flex items-center justify-between w-full text-[0.6875rem] text-slate-400 hover:text-slate-200 transition cursor-pointer px-1 py-0.5"
          >
            <span>{t.connectRemote}</span>
            {showRemoteOptions ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {showRemoteOptions && (
            <div className="pt-2 grid grid-cols-2 gap-1.5 animate-in fade-in duration-100">
              <button
                type="button"
                onClick={() => handleConnectOption('gdrive')}
                className="py-1.5 px-2 rounded bg-[#09090b] hover:bg-[#121214] border border-[#222226]/60 flex items-center justify-center gap-1.5 text-slate-300 hover:text-white text-xs transition cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[0.6875rem]">Google Drive</span>
              </button>

              <button
                type="button"
                onClick={() => handleConnectOption('vault')}
                className="py-1.5 px-2 rounded bg-[#09090b] hover:bg-[#121214] border border-[#222226]/60 flex items-center justify-center gap-1.5 text-slate-300 hover:text-white text-xs transition cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[0.6875rem]">{t.browserVault}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
