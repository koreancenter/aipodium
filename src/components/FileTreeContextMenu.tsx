import React, { useEffect, useRef, useState } from 'react';
import {
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
  Sparkles,
  Folder,
  FileText,
} from 'lucide-react';

export interface FileTreeContextMenuTarget {
  type: 'file' | 'folder' | 'session' | 'root';
  path: string; // e.g. "docs/readme.md" or "session:123"
  name: string; // display name e.g. "readme.md"
  sessionId?: string;
  folder?: string; // parent folder or session title
  folderKey?: string;
}

export interface FileTreeContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  target: FileTreeContextMenuTarget | null;
  onClose: () => void;
  onNewFile: (targetFolder?: string) => void;
  onNewFolder?: (targetFolder?: string) => void;
  onRename: (target: {
    id: string;
    type: 'file' | 'folder' | 'session';
    name: string;
    path: string;
    sessionId?: string;
  }) => void;
  onDelete: (target: {
    type: 'file' | 'folder' | 'session';
    path: string;
    name: string;
    sessionId?: string;
  }) => void;
  onCopyPath?: (path: string) => void;
  onOpenSSOTGenerator?: (sessionTitle: string) => void;
}

export const FileTreeContextMenu: React.FC<FileTreeContextMenuProps> = ({
  isOpen,
  x,
  y,
  target,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onCopyPath,
  onOpenSSOTGenerator,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x, y });

  // Clamp menu position to stay fully inside the viewport
  useEffect(() => {
    if (!isOpen) return;

    const menuWidth = 175;
    const menuHeight = 220;
    const padding = 8;

    const clampedX = Math.min(
      Math.max(padding, x),
      window.innerWidth - menuWidth - padding
    );
    const clampedY = Math.min(
      Math.max(padding, y),
      window.innerHeight - menuHeight - padding
    );

    setCoords({ x: clampedX, y: clampedY });
  }, [isOpen, x, y]);

  // Handle outside clicks and keyboard dismissals
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleDismiss = () => {
      onClose();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;

  const { type, path, name, sessionId, folder } = target;

  const targetFolder =
    type === 'folder'
      ? path
      : type === 'session'
      ? name
      : folder || undefined;

  const handleAction = (actionFn: () => void) => {
    actionFn();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="파일 탐색기 컨텍스트 메뉴"
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="fixed z-50 min-w-[170px] bg-[#121214] border border-[#222226] rounded-md shadow-2xl py-1 text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-75 font-sans"
    >
      {/* Target Title Header */}
      <div className="px-2.5 py-1 text-[11px] text-zinc-400 font-mono border-b border-[#222226] truncate max-w-[200px] flex items-center gap-1.5">
        {type === 'folder' || type === 'session' ? (
          <Folder className="w-3 h-3 text-indigo-400 shrink-0" />
        ) : type === 'file' ? (
          <FileText className="w-3 h-3 text-slate-400 shrink-0" />
        ) : null}
        <span className="truncate">{name || '파일 탐색기'}</span>
      </div>

      <div className="py-0.5">
        {/* Quick Action: New File */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handleAction(() => onNewFile(targetFolder))}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-200 hover:text-white hover:bg-[#18181b] cursor-pointer transition-colors w-full text-left"
        >
          <FilePlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>새 파일</span>
        </button>

        {/* Quick Action: New Folder */}
        {onNewFolder && (type === 'session' || type === 'folder' || type === 'root') && (
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(() => onNewFolder(targetFolder))}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-200 hover:text-white hover:bg-[#18181b] cursor-pointer transition-colors w-full text-left"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>새 폴더</span>
          </button>
        )}

        {/* Quick Action: Rename */}
        {type !== 'root' && (
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              handleAction(() => {
                const renameId =
                  type === 'session'
                    ? `session:${sessionId}`
                    : type === 'folder'
                    ? `folder:${folder ? `${folder}/${path}` : path}`
                    : `file:${path}`;

                onRename({
                  id: renameId,
                  type: type as 'file' | 'folder' | 'session',
                  name,
                  path,
                  sessionId,
                });
              })
            }
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-200 hover:text-white hover:bg-[#18181b] cursor-pointer transition-colors w-full text-left"
          >
            <Pencil className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>이름 변경</span>
          </button>
        )}

        {/* Quick Action: Copy Path */}
        {type === 'file' && onCopyPath && (
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(() => onCopyPath(path))}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-200 hover:text-white hover:bg-[#18181b] cursor-pointer transition-colors w-full text-left"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>경로 복사</span>
          </button>
        )}

        {/* Quick Action: SSOT Generator for Session */}
        {type === 'session' && onOpenSSOTGenerator && (
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(() => onOpenSSOTGenerator(name))}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-200 hover:text-white hover:bg-[#18181b] cursor-pointer transition-colors w-full text-left"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>통합 문서 생성</span>
          </button>
        )}

        {/* Quick Action: Delete */}
        {type !== 'root' && (
          <>
            <div className="h-px bg-[#222226] my-1" />
            <button
              type="button"
              role="menuitem"
              onClick={() =>
                handleAction(() => {
                  onDelete({
                    type: type as 'file' | 'folder' | 'session',
                    path,
                    name,
                    sessionId,
                  });
                })
              }
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-colors w-full text-left"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>삭제</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
