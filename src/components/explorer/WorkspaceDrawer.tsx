/**
 * WorkspaceDrawer Component (Phase 3.2 Layout Deconstruction)
 * Encapsulates the complete right-side workspace project file explorer:
 * - VS Code standard file tree with recursive folder support
 * - Workspace header actions (New File, New Folder, SSOT Generator, Drift Auditor)
 * - Cloud & Git badges (Google Drive, GitHub sync)
 * - Context menu and inline rename handlers
 * - LocalStorage state synchronization ('aipodium_drawer_collapsed')
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  FolderPlus,
  FilePlus,
  FolderOpen,
  Folder,
  Globe,
  FileUp,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Sparkles,
  Pencil,
  Trash2,
  ShieldCheck,
  Search,
  X,
  FileText,
  FolderTree
} from 'lucide-react';
import type { ChatSession } from '../../types';
import type { GoogleUserProfile } from '../../services/googleDriveService';
import type { GithubConfig } from '../GithubIntegrationModal';
import type { GitHubSyncStatus } from '../GithubSyncStatusIndicator';
import { useTranslation } from '../../context/LanguageContext';

export interface WorkspaceActivityRailProps {
  onOpen: () => void;
  className?: string;
}

export const WorkspaceActivityRail: React.FC<WorkspaceActivityRailProps> = ({
  onOpen,
  className = ''
}) => {
  const { t: dict } = useTranslation();
  const t = dict.core.explorer;

  return (
    <div
      id="explorer-activity-rail"
      className={`w-10 h-full flex flex-col items-center py-3 justify-between select-none ${className}`}
    >
      {/* Top items: Ghost button with FolderTree */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          id="explorer-rail-open-btn"
          onClick={onOpen}
          className="p-2 rounded-md hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          title={t.open}
          aria-label={t.open}
        >
          <FolderTree className="w-4 h-4 text-zinc-400 hover:text-zinc-100" />
        </button>
      </div>

      {/* Middle/Bottom items: Quick action button with FileText */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          id="explorer-rail-file-btn"
          onClick={onOpen}
          className="p-2 rounded-md hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
          title={t.browseDocuments}
          aria-label={t.browseDocuments}
        >
          <FileText className="w-4 h-4 text-zinc-500 hover:text-zinc-200" />
        </button>
      </div>
    </div>
  );
};
import {
  RecursiveFolderTree,
  buildFileTreeFromPaths,
  InlineRenameInput,
  RenameTarget
} from '../RecursiveFolderTree';
import {
  FileTreeContextMenu,
  FileTreeContextMenuTarget
} from '../FileTreeContextMenu';

export interface WorkspaceDrawerProps {
  files: Record<string, string>;
  currentFile: string;
  onSelectFile: (fileName: string) => void;
  onCreateFile: (fileName?: string) => void;
  onDeleteFile: (fileName: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onOpenSSOTModal: (folderOrTitle?: string) => void;
  onOpenDriftModal?: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  width?: number;
  isMobile?: boolean;
  isResizing?: boolean;
  className?: string;

  // Integrated Workspace State Props
  sessions?: ChatSession[];
  activeSessionId?: string;
  onSelectSession?: (sessionId: string) => void;
  onCreateSession?: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
  fileFolders?: Record<string, string>;
  isCurrentFileDirty?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  googleUser?: GoogleUserProfile | null;
  onOpenGoogleDrive?: (mode: 'open' | 'save') => void;
  onOpenWorkspaceModal?: () => void;
  githubConfig?: GithubConfig;
  githubSyncStatus?: GitHubSyncStatus;
  openFolders?: Record<string, boolean>;
  onToggleFolder?: (folderKey: string) => void;
  docFileInputRef?: React.RefObject<HTMLInputElement | null>;
  onImportDocumentFiles?: (files: File[]) => void;
  onContextMenu?: (e: React.MouseEvent, target: FileTreeContextMenuTarget) => void;
}

export const WorkspaceDrawer: React.FC<WorkspaceDrawerProps> = ({
  files,
  currentFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onOpenSSOTModal,
  onOpenDriftModal,
  isOpen,
  onToggleOpen,
  width = 240,
  isMobile = false,
  isResizing = false,
  className = '',
  sessions = [],
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  fileFolders = {},
  isCurrentFileDirty = false,
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
  googleUser,
  onOpenGoogleDrive,
  onOpenWorkspaceModal,
  githubConfig,
  githubSyncStatus,
  openFolders: externalOpenFolders,
  onToggleFolder: onExternalToggleFolder,
  docFileInputRef,
  onImportDocumentFiles,
  onContextMenu: externalContextMenu,
}) => {
  const { t: dict } = useTranslation();
  const t = dict.core.explorer;

  // Sync collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aipodium_right_drawer_open', String(isOpen));

      localStorage.setItem('aipodium_drawer_collapsed', String(!isOpen));
      localStorage.setItem('aipodium_right_panel_visible', String(isOpen));
    } catch {}
  }, [isOpen]);

  // Local search filter state if not externally controlled
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const activeSearchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const handleSearchChange = (val: string) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(val);
    } else {
      setInternalSearchQuery(val);
    }
  };

  // Open/closed state of directory nodes
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('aipodium_open_folders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_open_folders', JSON.stringify(openFolders));
    } catch {}
  }, [openFolders]);

  // Auto-expand folder when currentFile is selected or created inside a folder
  useEffect(() => {
    let folderToOpen: string | null = null;
    if (currentFile && currentFile.includes('/')) {
      folderToOpen = currentFile.split('/')[0];
    } else if (currentFile && fileFolders && fileFolders[currentFile]) {
      folderToOpen = fileFolders[currentFile];
    }
    if (folderToOpen) {
      setOpenFolders((prev) => {
        if (prev[folderToOpen!] === true) return prev;
        const next = { ...prev, [folderToOpen!]: true };
        try {
          localStorage.setItem('aipodium_open_folders', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [currentFile, fileFolders]);

  // Sync external openFolders if provided
  useEffect(() => {
    if (externalOpenFolders) {
      setOpenFolders((prev) => ({ ...prev, ...externalOpenFolders }));
    }
  }, [externalOpenFolders]);

  const fileTreeRef = useRef<HTMLDivElement>(null);
  const [focusedTreeItemId, setFocusedTreeItemId] = useState<string | null>(null);
  const [editingTreeTarget, setEditingTreeTarget] = useState<RenameTarget | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    target: FileTreeContextMenuTarget | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    target: null,
  });

  const handleOpenContextMenu = useCallback((e: React.MouseEvent, target: FileTreeContextMenuTarget) => {
    e.preventDefault();
    e.stopPropagation();
    if (externalContextMenu) {
      externalContextMenu(e, target);
      return;
    }
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      target,
    });
  }, [externalContextMenu]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Drag and drop states
  const [draggedType, setDraggedType] = useState<'project' | 'file' | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [dragDropPosition, setDragDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const handleDragEnd = useCallback(() => {
    setDraggedType(null);
    setDraggedId(null);
    setDragOverTargetId(null);
    setDragDropPosition(null);
  }, []);

  const handleCommitRename = useCallback(
    (newVal: string) => {
      if (!editingTreeTarget) return;
      const target = editingTreeTarget;
      setEditingTreeTarget(null);

      if (target.type === 'session' && target.sessionId) {
        onRenameSession?.(target.sessionId, newVal);
      } else if (target.type === 'file') {
        onRenameFile(target.path, newVal);
      }
    },
    [editingTreeTarget, onRenameSession, onRenameFile]
  );

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  return (
    <>
      {/* Mobile / Tablet Overlay Backdrop for Right Pane (< lg) */}
      {isOpen && !isMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onToggleOpen}
          aria-hidden="true"
        />
      )}

      {/* Explorer Drawer Container */}
      <section
        style={{ width: isMobile ? '100%' : isOpen ? `${width}px` : '40px' }}
        className={`h-full min-h-0 flex flex-col bg-[#121214] shrink-0 max-w-[calc(100vw-32px)] sm:max-w-none ${
          isMobile ? '!relative !w-full !max-w-none !flex-1 !shrink !shadow-none !border-l-0 ' : ''
        }${
          isResizing ? 'transition-none' : 'transition-[width] duration-200 ease-out'
        } z-40 lg:z-10 ${
          isOpen
            ? 'opacity-100 pointer-events-auto border-l border-[#222226] fixed lg:relative inset-y-0 right-0 shadow-2xl shadow-black/80 lg:shadow-none'
            : 'relative w-10 shrink-0 bg-[#121214] border-l border-[#222226] flex flex-col items-center py-3 justify-between z-20 select-none transition-all duration-200'
        } ${className}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            onImportDocumentFiles?.(Array.from(e.dataTransfer.files));
          }
        }}
      >
        {/* Persistent toggle: same top-right slot in both open and collapsed states */}
        {!isMobile && (
          <button
            type="button"
            id="workspace-drawer-toggle-btn"
            onClick={onToggleOpen}
            className="absolute top-[5px] right-2 z-10 w-6 h-6 rounded-xs hover:bg-[#18181b] transition flex items-center justify-center cursor-pointer"
            title={isOpen ? t.collapse : t.expand}
            aria-label={isOpen ? t.collapse : t.expand}
          >
            {isOpen ? (
              <PanelRightClose className="w-4 h-4 text-zinc-400 hover:text-zinc-100" />
            ) : (
              <PanelRightOpen className="w-4 h-4 text-zinc-400 hover:text-indigo-400" />
            )}
          </button>
        )}
        {!isOpen ? (
          <WorkspaceActivityRail onOpen={onToggleOpen} className="!pt-10" />
        ) : (
          <div style={{ width: `${width}px` }} className="max-w-full h-full flex flex-col min-h-0 overflow-hidden">
            {/* Explorer Header Toolbar (Row 1 - perfectly aligned with Editor Multi-Tab Bar & Chat Header) */}
            <div className={`flex items-center justify-between h-[34px] pl-2 ${isMobile ? 'pr-2' : 'pr-9'} bg-[#0c0c0e] border-b border-white/5 shrink-0 text-slate-300 select-none`}>
            <div className="flex items-center gap-1 shrink-0 ml-auto">

              {/* [📁+ New Folder] */}
              <button
                type="button"
                onClick={() => onCreateSession?.()}
                className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer"
                title={t.addFolder}
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              {/* [📄+ New File] */}
              <button
                type="button"
                onClick={() => onCreateFile()}
                className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer"
                title={t.addFile}
              >
                <FilePlus className="w-3.5 h-3.5 text-[#6366f1]" />
              </button>

              {/* [📂 Manage Workspace Folder] */}
              <button
                type="button"
                onClick={() => onOpenWorkspaceModal?.()}
                className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer"
                title={t.manageWorkspace}
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-300" />
              </button>

              {/* [✨ SSOT Generator] */}
              <button
                type="button"
                onClick={() => onOpenSSOTModal(activeSession?.title)}
                className="p-1 rounded-xs hover:bg-[#18181b] hover:text-[#6366f1] transition cursor-pointer"
                title={t.createSsot}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#6366f1]" />
              </button>

              {/* [🛡️ SSOT Drift Auditor] */}
              {onOpenDriftModal && (
                <button
                  type="button"
                  onClick={onOpenDriftModal}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-amber-400 transition cursor-pointer"
                  title={t.auditDocuments}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                </button>
              )}

              {/* [☁️ Google Drive Picker] */}
              {onOpenGoogleDrive && (
                <button
                  type="button"
                  onClick={() => onOpenGoogleDrive('open')}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer relative group"
                  title={t.googleDrive}
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
                  {googleUser && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              )}

              {/* [📄⬆️ Import Document] */}
              {docFileInputRef && (
                <button
                  type="button"
                  onClick={() => docFileInputRef.current?.click()}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-white transition cursor-pointer relative group"
                  title={t.importOfficePdf}
                >
                  <FileUp className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
                </button>
              )}
            </div>
          </div>

          {/* Search Filter Bar (Row 2) */}
          <div className="px-2 py-1.5 bg-[#0f0f12] border-b border-white/5 shrink-0">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={activeSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-[#121214] border border-[#222226] focus:border-[#6366f1] rounded pl-6 pr-6 py-0.5 text-[0.6875rem] text-slate-200 placeholder:text-slate-500 outline-none transition"
              />
              {activeSearchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                  title={t.clearSearch}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

          </div>

          {/* Continuous Tree Structure */}
          <div
            id="file-tree"
            ref={fileTreeRef}
            tabIndex={0}
            onContextMenu={(e) => {
              e.preventDefault();
              handleOpenContextMenu(e, {
                type: 'root',
                path: activeSession?.title || 'docs',
                name: activeSession?.title || t.title,
                sessionId: activeSession?.id,
                folder: activeSession?.title || 'docs',
              });
            }}
            className="flex-1 overflow-y-auto py-1 text-xs select-none bg-transparent custom-scrollbar focus:outline-none"
          >
            {activeSearchQuery.trim() &&
              Object.keys(files).filter((f) =>
                f.toLowerCase().includes(activeSearchQuery.trim().toLowerCase())
              ).length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                  <p>{t.noResults(activeSearchQuery)}</p>
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="text-[#6366f1] hover:underline text-xs cursor-pointer"
                  >
                    {t.resetSearch}
                  </button>
                </div>
              )}

            {/* Project / Workspace Folders */}
            {sessions.map((session) => {
              const isFolderOpen = openFolders[session.title] ?? true;
              const isCurrentActiveSession = session.id === activeSessionId;
              const memoFileName = session.fileName || `${session.title}.md`;

              const folderFiles = Object.keys(files).filter((f) => {
                if (
                  f.startsWith('01_SSOT_Sources/') ||
                  f.startsWith('02_Studio_Outputs/') ||
                  f.startsWith('.podium/')
                ) {
                  return false;
                }
                if (f === 'welcome.md' || f === 'ai_guide.md' || fileFolders[f] === '가이드 & 도움말') {
                  return false;
                }
                if (fileFolders[f] === session.title) return true;
                if (fileFolders[f] && fileFolders[f] !== session.title) return false;
                if (f.startsWith(`${session.title}/`)) return true;
                if (f === memoFileName || (session.fileName && f === session.fileName)) {
                  const isOtherSessionMemo = sessions.some(
                    (s) => s.id !== session.id && (s.fileName === f || f === `${s.title}.md`)
                  );
                  return !isOtherSessionMemo;
                }
                return false;
              });

              const matchingFiles = folderFiles.filter(
                (f) => !activeSearchQuery.trim() || f.toLowerCase().includes(activeSearchQuery.trim().toLowerCase())
              );

              return (
                <div key={session.id} className="relative transition-colors">
                  {/* Folder Item Row */}
                  <div
                    id={`tree-item-session:${session.id}`}
                    onClick={() => {
                      setFocusedTreeItemId(`session:${session.id}`);
                      fileTreeRef.current?.focus({ preventScroll: true });
                      setOpenFolders((prev) => ({ ...prev, [session.title]: !isFolderOpen }));
                      if (session.id !== activeSessionId) {
                        onSelectSession?.(session.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      handleOpenContextMenu(e, {
                        type: 'session',
                        path: session.title,
                        name: session.title,
                        sessionId: session.id,
                        folder: session.title,
                      });
                    }}
                    className={`flex items-center justify-between px-2 h-7 cursor-pointer group transition-colors rounded-xs ${
                      focusedTreeItemId === `session:${session.id}`
                        ? 'bg-[#1c1c20] text-white ring-1 ring-indigo-500/70 font-medium shadow-xs'
                        : isCurrentActiveSession
                        ? 'text-indigo-300 font-medium bg-white/5 border-l-2 border-indigo-500 hover:bg-white/[0.08]'
                        : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {/* Folder Chevron */}
                      {isFolderOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}

                      {/* Folder Icon */}
                      {isFolderOpen ? (
                        <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-indigo-400/80 shrink-0" />
                      )}

                      {/* Folder Title */}
                      {editingTreeTarget?.id === `session:${session.id}` ? (
                        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <InlineRenameInput
                            initialValue={session.title}
                            isFolder={true}
                            onCommit={handleCommitRename}
                            onCancel={() => setEditingTreeTarget(null)}
                          />
                        </div>
                      ) : (
                        <span className="truncate text-xs text-slate-200 group-hover:text-white">
                          {session.title}
                        </span>
                      )}
                    </div>

                    {/* Right Folder Actions & Badge */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[0.625rem] text-slate-400 font-mono group-hover:hidden">
                        {matchingFiles.length}
                      </span>

                      {/* Hover Action Icons */}
                      <div className="hidden group-hover:flex items-center gap-0.5 text-slate-300">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSSOTModal(session.title);
                          }}
                          className="p-1 rounded-xs hover:bg-[#18181b] hover:text-[#6366f1] transition cursor-pointer"
                          title={t.createSsot}
                        >
                          <Sparkles className="w-3 h-3 text-[#6366f1]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedTreeItemId(`session:${session.id}`);
                            setEditingTreeTarget({
                              id: `session:${session.id}`,
                              type: 'session',
                              name: session.title,
                              path: session.title,
                              sessionId: session.id,
                            });
                          }}
                          className="p-1 rounded-xs hover:bg-[#18181b] hover:text-slate-100 transition cursor-pointer"
                          title={t.rename}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession?.(session.id);
                          }}
                          className="p-1 rounded-xs hover:bg-[#18181b] hover:text-rose-400 transition cursor-pointer"
                          title={t.delete}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nested Files / Subdirectories */}
                  {isFolderOpen && (
                    <div className="relative pl-5 before:absolute before:left-3 before:top-0 before:bottom-1 before:w-[1px] before:bg-[#222226]">
                      {matchingFiles.length === 0 ? (
                        <div className="text-[0.6875rem] text-slate-500 py-1 pl-3 font-mono select-none">
                          {t.noDocuments}
                        </div>
                      ) : (
                        (() => {
                          const treeRoot = buildFileTreeFromPaths(matchingFiles, session.title);
                          return (
                            <div className="py-0.5">
                              <RecursiveFolderTree
                                node={treeRoot}
                                level={0}
                                sessionTitle={session.title}
                                sessionId={session.id}
                                currentActiveFile={currentFile}
                                isCurrentFileDirty={isCurrentFileDirty}
                                draggedType={draggedType}
                                draggedId={draggedId}
                                searchQuery={activeSearchQuery}
                                focusedTreeItemId={focusedTreeItemId}
                                editingTreeItemId={editingTreeTarget?.id}
                                openFolders={openFolders}
                                onToggleFolder={(folderKey) =>
                                  setOpenFolders((prev) => ({
                                    ...prev,
                                    [folderKey]: !(prev[folderKey] ?? true),
                                  }))
                                }
                                onSetFocusedItem={(id) => {
                                  setFocusedTreeItemId(id);
                                  fileTreeRef.current?.focus({ preventScroll: true });
                                }}
                                onStartRename={(target) => setEditingTreeTarget(target)}
                                onCommitRename={handleCommitRename}
                                onCancelRename={() => setEditingTreeTarget(null)}
                                onDeleteFolder={(folderPath) => {
                                  // Find files under this folder and delete
                                  Object.keys(files).forEach((f) => {
                                    if (f.startsWith(`${folderPath}/`)) {
                                      onDeleteFile(f);
                                    }
                                  });
                                }}
                                onOpenFile={(fpath) => {
                                  if (session.id !== activeSessionId) {
                                    onSelectSession?.(session.id);
                                  }
                                  onSelectFile(fpath);
                                }}
                                onRenameFile={(fpath) => {
                                  const parts = fpath.split('/');
                                  const name = parts[parts.length - 1];
                                  setEditingTreeTarget({
                                    id: `file:${fpath}`,
                                    type: 'file',
                                    name,
                                    path: fpath,
                                  });
                                }}
                                onDeleteFile={onDeleteFile}
                                onDragStart={(_e, fpath) => {
                                  setDraggedType('file');
                                  setDraggedId(fpath);
                                }}
                                onDragEnd={handleDragEnd}
                                onContextMenu={handleOpenContextMenu}
                              />
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Dedicated "가이드 & 도움말" Section */}
            {(() => {
              const guideFiles = Object.keys(files).filter(
                (f) => f === 'welcome.md' || f === 'ai_guide.md' || fileFolders[f] === '가이드 & 도움말'
              );
              if (guideFiles.length === 0) return null;
              const isHelpSectionOpen = openFolders['가이드 & 도움말'] ?? true;
              const guideTree = buildFileTreeFromPaths(guideFiles, '가이드 & 도움말');

              return (
                <div className="mt-2 pt-2 border-t border-[#222226]">
                  <div
                    id="tree-item-section:guide-help"
                    onClick={() => {
                      setOpenFolders((prev) => ({
                        ...prev,
                        '가이드 & 도움말': !isHelpSectionOpen,
                      }));
                    }}
                    onContextMenu={(e) => {
                      handleOpenContextMenu(e, {
                        type: 'folder',
                        path: '가이드 & 도움말',
                        name: '가이드 & 도움말',
                        folder: '가이드 & 도움말',
                      });
                    }}
                    className="flex items-center justify-between px-2 h-7 cursor-pointer group transition-colors rounded-xs text-slate-300 hover:bg-white/5 hover:text-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {isHelpSectionOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      {isHelpSectionOpen ? (
                        <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-indigo-400/80 shrink-0" />
                      )}
                      <span className="truncate text-xs font-medium text-slate-200 group-hover:text-white">
                        {t.guideHelp}
                      </span>
                    </div>
                    <span className="text-[0.625rem] text-slate-400 font-mono">
                      {guideFiles.length}
                    </span>
                  </div>

                  {isHelpSectionOpen && (
                    <div className="relative pl-5 before:absolute before:left-3 before:top-0 before:bottom-1 before:w-[1px] before:bg-[#222226] py-0.5">
                      <RecursiveFolderTree
                        node={guideTree}
                        level={0}
                        sessionTitle="가이드 & 도움말"
                        currentActiveFile={currentFile}
                        isCurrentFileDirty={isCurrentFileDirty}
                        draggedType={draggedType}
                        draggedId={draggedId}
                        searchQuery={activeSearchQuery}
                        focusedTreeItemId={focusedTreeItemId}
                        editingTreeItemId={editingTreeTarget?.id}
                        openFolders={openFolders}
                        onToggleFolder={(folderKey) =>
                          setOpenFolders((prev) => ({
                            ...prev,
                            [folderKey]: !(prev[folderKey] ?? true),
                          }))
                        }
                        onSetFocusedItem={(id) => {
                          setFocusedTreeItemId(id);
                          fileTreeRef.current?.focus({ preventScroll: true });
                        }}
                        onStartRename={(target) => setEditingTreeTarget(target)}
                        onCommitRename={handleCommitRename}
                        onCancelRename={() => setEditingTreeTarget(null)}
                        onDeleteFolder={() => {}}
                        onOpenFile={onSelectFile}
                        onRenameFile={(fpath) => {
                          const parts = fpath.split('/');
                          const name = parts[parts.length - 1];
                          setEditingTreeTarget({
                            id: `file:${fpath}`,
                            type: 'file',
                            name,
                            path: fpath,
                          });
                        }}
                        onDeleteFile={onDeleteFile}
                        onDragStart={(_e, fpath) => {
                          setDraggedType('file');
                          setDraggedId(fpath);
                        }}
                        onDragEnd={handleDragEnd}
                        onContextMenu={handleOpenContextMenu}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Loose/Unassigned Files */}
            {(() => {
              const allProjectTitles = new Set(sessions.map((s) => s.title));
              const allSessionMemoFiles = new Set(
                sessions.flatMap((s) => [s.fileName, `${s.title}.md`].filter(Boolean) as string[])
              );
              const unassignedFiles = Object.keys(files).filter((f) => {
                if (
                  f.startsWith('01_SSOT_Sources/') ||
                  f.startsWith('02_Studio_Outputs/') ||
                  f.startsWith('.podium/')
                ) {
                  return false;
                }
                if (f === 'welcome.md' || f === 'ai_guide.md' || fileFolders[f] === '가이드 & 도움말') {
                  return false;
                }
                if (allSessionMemoFiles.has(f)) return false;
                const folder = fileFolders[f];
                if (folder && allProjectTitles.has(folder)) return false;
                return true;
              });

              if (unassignedFiles.length === 0) return null;
              const unassignedTree = buildFileTreeFromPaths(unassignedFiles, 'OTHER FILES');

              return (
                <div className="mt-2 pt-2 border-t border-[#222226]">
                  <div
                    onContextMenu={(e) => {
                      handleOpenContextMenu(e, {
                        type: 'folder',
                        path: '기타 파일',
                        name: '기타 파일',
                        folder: '기타 파일',
                      });
                    }}
                    className="px-3 py-1 text-[0.625rem] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:text-slate-200"
                  >
                    <Folder className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.otherFilesCount(unassignedFiles.length)}</span>
                  </div>
                  <div className="mt-0.5 px-1">
                    <RecursiveFolderTree
                      node={unassignedTree}
                      level={0}
                      sessionTitle="OTHER FILES"
                      currentActiveFile={currentFile}
                      isCurrentFileDirty={isCurrentFileDirty}
                      draggedType={draggedType}
                      draggedId={draggedId}
                      searchQuery={activeSearchQuery}
                      focusedTreeItemId={focusedTreeItemId}
                      editingTreeItemId={editingTreeTarget?.id}
                      openFolders={openFolders}
                      onToggleFolder={(folderKey) =>
                        setOpenFolders((prev) => ({
                          ...prev,
                          [folderKey]: !(prev[folderKey] ?? true),
                        }))
                      }
                      onSetFocusedItem={(id) => {
                        setFocusedTreeItemId(id);
                        fileTreeRef.current?.focus({ preventScroll: true });
                      }}
                      onStartRename={(target) => setEditingTreeTarget(target)}
                      onCommitRename={handleCommitRename}
                      onCancelRename={() => setEditingTreeTarget(null)}
                      onDeleteFolder={() => {}}
                      onOpenFile={onSelectFile}
                      onRenameFile={(fpath) => {
                        const parts = fpath.split('/');
                        const name = parts[parts.length - 1];
                        setEditingTreeTarget({
                          id: `file:${fpath}`,
                          type: 'file',
                          name,
                          path: fpath,
                        });
                      }}
                      onDeleteFile={onDeleteFile}
                      onDragStart={(_e, fpath) => {
                        setDraggedType('file');
                        setDraggedId(fpath);
                      }}
                      onDragEnd={handleDragEnd}
                      onContextMenu={handleOpenContextMenu}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        )}

        {/* Context Menu Overlay */}
        <FileTreeContextMenu
          isOpen={contextMenu.isOpen}
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onClose={handleCloseContextMenu}
          onNewFile={(targetFolder) => {
            handleCloseContextMenu();
            onCreateFile(targetFolder ? `${targetFolder}/${t.newDocument}.md` : undefined);
          }}
          onNewFolder={() => {
            handleCloseContextMenu();
            onCreateSession?.();
          }}
          onRename={(target) => {
            handleCloseContextMenu();
            setEditingTreeTarget({
              id: target.id,
              type: target.type,
              name: target.name,
              path: target.path,
              sessionId: target.sessionId,
            });
          }}
          onDelete={(target) => {
            handleCloseContextMenu();
            if (target.type === 'session' && target.sessionId) {
              onDeleteSession?.(target.sessionId);
            } else if (target.type === 'file') {
              onDeleteFile(target.path);
            }
          }}
          onCopyPath={(p) => {
            navigator.clipboard.writeText(p);
          }}
          onOpenSSOTGenerator={(sessionTitle) => {
            handleCloseContextMenu();
            onOpenSSOTModal(sessionTitle);
          }}
        />
      </section>
    </>
  );
};
