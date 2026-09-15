import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileJson,
  Pencil,
  Trash2,
  GripVertical,
} from 'lucide-react';

export interface TreeFileItem {
  id: string; // Full relative path or file key
  name: string; // File name (e.g. abstract.md)
  path: string; // Full relative path
  extension: string;
}

export interface TreeDirectoryNode {
  id: string; // Directory full path or name
  name: string; // Display name
  path: string; // Full path
  files: TreeFileItem[];
  subdirectories: TreeDirectoryNode[];
}

export interface RenameTarget {
  id: string; // e.g. "session:123" | "folder:net-to-dot/sub" | "file:path.txt"
  type: 'session' | 'folder' | 'file';
  name: string;
  path: string;
  sessionId?: string;
}

export const InlineRenameInput: React.FC<{
  initialValue: string;
  isFolder?: boolean;
  onCommit: (val: string) => void;
  onCancel: () => void;
}> = ({ initialValue, isFolder = false, onCommit, onCancel }) => {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      const dotIndex = initialValue.lastIndexOf('.');
      if (!isFolder && dotIndex > 0) {
        inputRef.current.setSelectionRange(0, dotIndex);
      } else {
        inputRef.current.select();
      }
    }
  }, [initialValue, isFolder]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(val);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onCommit(val)}
      onClick={(e) => e.stopPropagation()}
      className="bg-[#09090b] border border-[#6366f1] rounded px-1.5 py-0.5 text-xs text-white outline-none ring-1 ring-[#6366f1] min-w-0 w-full font-sans shadow-inner z-10"
    />
  );
};

interface RecursiveFolderTreeProps {
  node: TreeDirectoryNode;
  level?: number;
  sessionTitle?: string;
  sessionId?: string;
  currentActiveFile: string;
  isCurrentFileDirty: boolean;
  draggedType: string | null;
  draggedId: string | null;
  searchQuery: string;
  focusedTreeItemId?: string | null;
  editingTreeItemId?: string | null;
  openFolders?: Record<string, boolean>;
  onToggleFolder?: (folderKey: string) => void;
  onSetFocusedItem?: (id: string) => void;
  onStartRename?: (target: RenameTarget) => void;
  onCommitRename?: (newName: string) => void;
  onCancelRename?: () => void;
  onOpenFile: (filePath: string) => void;
  onRenameFile?: (filePath: string) => void;
  onDeleteFile?: (filePath: string) => void;
  onDeleteFolder?: (folderPath: string) => void;
  onDragStart?: (e: React.DragEvent, filePath: string) => void;
  onDragEnd?: () => void;
}

export const RecursiveFolderTree: React.FC<RecursiveFolderTreeProps> = ({
  node,
  level = 0,
  sessionTitle = 'root',
  sessionId,
  currentActiveFile,
  isCurrentFileDirty,
  draggedType,
  draggedId,
  searchQuery,
  focusedTreeItemId,
  editingTreeItemId,
  openFolders,
  onToggleFolder,
  onSetFocusedItem,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onOpenFile,
  onRenameFile,
  onDeleteFile,
  onDeleteFolder,
  onDragStart,
  onDragEnd,
}) => {
  // Local fallback open state if controlled openFolders is not provided
  const [localIsOpen, setLocalIsOpen] = useState(true);

  const isLevelZero = level === 0;
  const folderKey = `${sessionTitle}/${node.path}`;
  const isOpen = openFolders ? (openFolders[folderKey] ?? true) : localIsOpen;

  const handleToggle = () => {
    if (onToggleFolder) {
      onToggleFolder(folderKey);
    } else {
      setLocalIsOpen(!localIsOpen);
    }
  };

  const getFileIcon = (fileName: string, isSelected: boolean) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
      return (
        <FileText
          className={`w-3.5 h-3.5 shrink-0 ${
            isSelected ? 'text-[#6366f1]' : 'text-slate-400'
          }`}
        />
      );
    }
    if (lower.endsWith('.csv')) {
      return (
        <FileSpreadsheet
          className={`w-3.5 h-3.5 shrink-0 ${
            isSelected ? 'text-emerald-400' : 'text-emerald-500/80'
          }`}
        />
      );
    }
    if (lower.endsWith('.json')) {
      return (
        <FileJson
          className={`w-3.5 h-3.5 shrink-0 ${
            isSelected ? 'text-amber-400' : 'text-amber-500/80'
          }`}
        />
      );
    }
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      return <FileCode className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  const subfolderItemId = `folder:${sessionTitle}/${node.path}`;
  const isSubfolderFocused = focusedTreeItemId === subfolderItemId;
  const isEditingThisSubfolder = editingTreeItemId === subfolderItemId;

  return (
    <div className="flex flex-col">
      {/* Subfolder Header (if level > 0) */}
      {!isLevelZero && (
        <div
          id={`tree-item-${subfolderItemId}`}
          onClick={() => {
            if (onSetFocusedItem) onSetFocusedItem(subfolderItemId);
            handleToggle();
          }}
          className={`group flex items-center justify-between px-2 h-[26px] cursor-pointer transition-colors rounded-xs ${
            isSubfolderFocused
              ? 'bg-[#1c1c20] text-white ring-1 ring-[#6366f1] font-medium'
              : 'text-slate-300 hover:bg-[#121214]/70 hover:text-slate-100'
          }`}
          style={{ paddingLeft: `${Math.max(level * 10, 8)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              className="text-slate-400 group-hover:text-slate-200 transition shrink-0 p-0.5"
            >
              {isOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}

            {isEditingThisSubfolder && onCommitRename && onCancelRename ? (
              <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <InlineRenameInput
                  initialValue={node.name}
                  isFolder={true}
                  onCommit={onCommitRename}
                  onCancel={onCancelRename}
                />
              </div>
            ) : (
              <span className="truncate text-[0.75rem] font-medium tracking-tight text-slate-300 group-hover:text-slate-100">
                {node.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[0.625rem] font-mono text-slate-400 group-hover:hidden">
              {node.files.length + node.subdirectories.length}
            </span>

            {/* Subfolder Hover Actions */}
            <div className="hidden group-hover:flex items-center gap-0.5 text-slate-300">
              {onStartRename && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSetFocusedItem) onSetFocusedItem(subfolderItemId);
                    onStartRename({
                      id: subfolderItemId,
                      type: 'folder',
                      name: node.name,
                      path: node.path,
                      sessionId,
                    });
                  }}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-slate-100 transition cursor-pointer"
                  title="폴더 이름 변경"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {onDeleteFolder && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(node.path);
                  }}
                  className="p-1 rounded-xs hover:bg-[#18181b] hover:text-rose-400 transition cursor-pointer"
                  title="폴더 삭제"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Children: Subdirectories and Files */}
      {(isLevelZero || isOpen) && (
        <div
          className={
            !isLevelZero
              ? 'relative pl-2.5 before:absolute before:left-[14px] before:top-0 before:bottom-1 before:w-[1px] before:bg-[#222226]'
              : ''
          }
        >
          {/* Subdirectories */}
          {node.subdirectories.map((subNode) => (
            <RecursiveFolderTree
              key={subNode.id}
              node={subNode}
              level={level + 1}
              sessionTitle={sessionTitle}
              sessionId={sessionId}
              currentActiveFile={currentActiveFile}
              isCurrentFileDirty={isCurrentFileDirty}
              draggedType={draggedType}
              draggedId={draggedId}
              searchQuery={searchQuery}
              focusedTreeItemId={focusedTreeItemId}
              editingTreeItemId={editingTreeItemId}
              openFolders={openFolders}
              onToggleFolder={onToggleFolder}
              onSetFocusedItem={onSetFocusedItem}
              onStartRename={onStartRename}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              onOpenFile={onOpenFile}
              onRenameFile={onRenameFile}
              onDeleteFile={onDeleteFile}
              onDeleteFolder={onDeleteFolder}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}

          {/* Files */}
          {node.files.map((file) => {
            const isSelectedFile = currentActiveFile === file.path;
            const fileItemId = `file:${file.path}`;
            const isFocused = focusedTreeItemId === fileItemId;
            const isEditingThisFile = editingTreeItemId === fileItemId;
            const isDraggingFile =
              draggedType === 'file' && draggedId === file.path;

            return (
              <div
                key={file.path}
                id={`tree-item-${fileItemId}`}
                draggable={!!onDragStart}
                onDragStart={
                  onDragStart ? (e) => onDragStart(e, file.path) : undefined
                }
                onDragEnd={onDragEnd}
                onClick={() => {
                  if (onSetFocusedItem) onSetFocusedItem(fileItemId);
                  onOpenFile(file.path);
                }}
                className={`group flex items-center justify-between pr-2 h-[26px] cursor-pointer transition-colors rounded-xs ${
                  isDraggingFile
                    ? 'opacity-40 bg-[#18181b]'
                    : isFocused
                    ? 'bg-[#1c1c20] text-white ring-1 ring-[#6366f1] font-medium'
                    : isSelectedFile
                    ? 'bg-[#121214]/90 text-indigo-300 font-medium border-l-2 border-[#6366f1]'
                    : 'text-slate-300 hover:bg-[#121214]/70 hover:text-slate-100'
                }`}
                style={{
                  paddingLeft: isLevelZero
                    ? '8px'
                    : `${Math.max(level * 8 + 4, 12)}px`,
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <GripVertical className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-100 cursor-grab transition shrink-0" />

                  {getFileIcon(file.name, isSelectedFile)}

                  {isEditingThisFile && onCommitRename && onCancelRename ? (
                    <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <InlineRenameInput
                        initialValue={file.name}
                        isFolder={false}
                        onCommit={onCommitRename}
                        onCancel={onCancelRename}
                      />
                    </div>
                  ) : (
                    <span className="truncate text-xs text-slate-200 group-hover:text-white">
                      {file.name}
                    </span>
                  )}

                  {isSelectedFile && isCurrentFileDirty && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 ml-1"
                      title="수정됨 (저장되지 않음)"
                    />
                  )}
                </div>

                {/* File Action Icons */}
                <div className="hidden group-hover:flex items-center gap-0.5 text-slate-300 shrink-0">
                  {onStartRename ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSetFocusedItem) onSetFocusedItem(fileItemId);
                        onStartRename({
                          id: fileItemId,
                          type: 'file',
                          name: file.name,
                          path: file.path,
                          sessionId,
                        });
                      }}
                      className="p-1 rounded-xs hover:bg-[#18181b] hover:text-slate-100 transition cursor-pointer"
                      title="파일명 변경"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  ) : onRenameFile ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRenameFile(file.path);
                      }}
                      className="p-1 rounded-xs hover:bg-[#18181b] hover:text-slate-100 transition cursor-pointer"
                      title="파일명 변경"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  ) : null}

                  {onDeleteFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(file.path);
                      }}
                      className="p-1 rounded-xs hover:bg-[#18181b] hover:text-rose-400 transition cursor-pointer"
                      title="파일 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Utility function to convert flat relative path strings into recursive TreeDirectoryNode
export function buildFileTreeFromPaths(
  filePaths: string[],
  rootName: string = 'root'
): TreeDirectoryNode {
  const rootNode: TreeDirectoryNode = {
    id: rootName,
    name: rootName,
    path: '',
    files: [],
    subdirectories: [],
  };

  // Sort paths to keep deterministic order
  const sorted = [...filePaths].sort((a, b) => a.localeCompare(b));

  for (const fullPath of sorted) {
    const parts = fullPath.split('/');
    let currentNode = rootNode;
    let accumulatedPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      if (i === parts.length - 1) {
        // It's a file
        const extMatch = part.match(/\.([^.]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';
        currentNode.files.push({
          id: fullPath,
          name: part,
          path: fullPath,
          extension: ext,
        });
      } else {
        // It's a subdirectory
        let subDir = currentNode.subdirectories.find((d) => d.name === part);
        if (!subDir) {
          subDir = {
            id: accumulatedPath,
            name: part,
            path: accumulatedPath,
            files: [],
            subdirectories: [],
          };
          currentNode.subdirectories.push(subDir);
        }
        currentNode = subDir;
      }
    }
  }

  return rootNode;
}

// Helper to flatten a TreeDirectoryNode into ordered visible items based on openFolders state
export function flattenTreeDirectoryNode(
  node: TreeDirectoryNode,
  sessionTitle: string,
  sessionId?: string,
  openFolders?: Record<string, boolean>
): Array<{
  id: string;
  type: 'folder' | 'file';
  name: string;
  path: string;
  sessionId?: string;
  isOpen?: boolean;
}> {
  const result: Array<{
    id: string;
    type: 'folder' | 'file';
    name: string;
    path: string;
    sessionId?: string;
    isOpen?: boolean;
  }> = [];

  for (const sub of node.subdirectories) {
    const folderKey = `${sessionTitle}/${sub.path}`;
    const isOpen = openFolders ? (openFolders[folderKey] ?? true) : true;
    result.push({
      id: `folder:${folderKey}`,
      type: 'folder',
      name: sub.name,
      path: sub.path,
      sessionId,
      isOpen,
    });
    if (isOpen) {
      result.push(
        ...flattenTreeDirectoryNode(sub, sessionTitle, sessionId, openFolders)
      );
    }
  }

  for (const f of node.files) {
    result.push({
      id: `file:${f.path}`,
      type: 'file',
      name: f.name,
      path: f.path,
      sessionId,
    });
  }

  return result;
}
