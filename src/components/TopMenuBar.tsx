import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Check, RotateCcw } from 'lucide-react';
import type { MenuType, GhostWriterLevel } from '../types';

export type SubmenuType =
  | 'export'
  | 'inject-prompts'
  | 'font-size'
  | 'compactness'
  | 'ai-model'
  | 'ghost-writer'
  | null;

export interface TopMenuBarProps {
  // File Actions
  handleCreateNewSession: () => void;
  handleCreateNewFile: () => void;
  handleTriggerOpenLocalFile: () => void;
  handleTriggerDocImport: () => void;
  handleSaveDocument: () => void;
  handleSaveAsFile: () => void;
  handleExportPdf: () => void;
  handleExportDocx: () => void;
  handleExportPptx: () => void;
  handleExportCsv: () => void;
  setIsWorkspaceModalOpen: (open: boolean) => void;
  activeWorkspace: { type: string };
  handleOpenGoogleDrive: (mode: 'open' | 'save') => void;
  googleUser: any;
  setIsTrashOpen: (open: boolean) => void;
  trashSessionsCount: number;

  // Edit Actions
  handleCopyToClipboard: () => void;
  handleFormatDocument: () => void;
  effectivePrompts: Array<{ id: string; title: string; description?: string; content?: string; category?: string }>;
  handleInstantInjectPrompt: (prompt: any) => void;
  setIsPromptLibraryModalOpen: (open: boolean) => void;
  handleClearChat: () => void;
  messagesCount: number;
  handleDeleteFile: (filename: string) => void;
  currentActiveFile: string;

  // View Actions
  isSection1Collapsed: boolean;
  setIsSection1Collapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isSection3Collapsed: boolean;
  setIsSection3Collapsed: React.Dispatch<React.SetStateAction<boolean>>;
  applyDefaultPanelsForCurrentDevice: () => void;
  isTocOpen: boolean;
  setIsTocOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editorTab: 'wysiwyg' | 'edit' | 'split' | 'preview';
  setEditorTab?: (tab: any) => void;
  onUpdateSessionEditorTab: (tab: 'wysiwyg' | 'edit') => void;
  editorFontSize: number;
  handleEditorZoomIn: () => void;
  handleEditorZoomOut: () => void;
  handleEditorZoomReset: () => void;
  preferences: any;
  handleQuickFontSize: (size: 'sm' | 'md' | 'lg' | 'xl') => void;
  handleQuickCompactness: (compact: 'dense' | 'spacious') => void;

  // SSOT Actions
  handleOpenSSOTGeneratorModal: (title: string) => void;
  activeSessionTitle?: string;
  setIsSsotAuditorOpen: (open: boolean) => void;
  ssotAuditScore: number;
  setIsCouncilModalOpen: (open: boolean) => void;
  councilScore: number;

  // PDF Actions
  pdfViewerRef?: React.RefObject<any>;
  handleOpenFile: (file: string) => void;
  setPreferencesInitialTab: (tab: any) => void;
  setIsPreferencesModalOpen: (open: boolean) => void;

  // Settings Triggers
  setIsAiRoleModalOpen: (open: boolean) => void;
  provider: string;
  currentModelName: string;
  sidebarModels: Array<{ id: string; name: string }>;
  selectedModel: string;
  handleQuickDefaultModel: (id: string, name: string) => void;
  ghostWriterLevel: GhostWriterLevel;
  currentGhostLabel: string;
  handleQuickGhostWriter: (level: GhostWriterLevel) => void;
  lockNow: () => void;

  // Help Triggers
  setIsShortcutsModalOpen: (open: boolean) => void;
  setIsAboutModalOpen: (open: boolean) => void;

  // Notification
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  handleCreateNewSession,
  handleCreateNewFile,
  handleTriggerOpenLocalFile,
  handleTriggerDocImport,
  handleSaveDocument,
  handleSaveAsFile,
  handleExportPdf,
  handleExportDocx,
  handleExportPptx,
  handleExportCsv,
  setIsWorkspaceModalOpen,
  activeWorkspace,
  handleOpenGoogleDrive,
  googleUser,
  setIsTrashOpen,
  trashSessionsCount,

  handleCopyToClipboard,
  handleFormatDocument,
  effectivePrompts,
  handleInstantInjectPrompt,
  setIsPromptLibraryModalOpen,
  handleClearChat,
  messagesCount,
  handleDeleteFile,
  currentActiveFile,

  isSection1Collapsed,
  setIsSection1Collapsed,
  isSection3Collapsed,
  setIsSection3Collapsed,
  applyDefaultPanelsForCurrentDevice,
  isTocOpen,
  setIsTocOpen,
  editorTab,
  onUpdateSessionEditorTab,
  editorFontSize,
  handleEditorZoomIn,
  handleEditorZoomOut,
  handleEditorZoomReset,
  preferences,
  handleQuickFontSize,
  handleQuickCompactness,

  handleOpenSSOTGeneratorModal,
  activeSessionTitle,
  setIsSsotAuditorOpen,
  ssotAuditScore,
  setIsCouncilModalOpen,
  councilScore,

  pdfViewerRef,
  handleOpenFile,
  setPreferencesInitialTab,
  setIsPreferencesModalOpen,

  setIsAiRoleModalOpen,
  provider,
  currentModelName,
  sidebarModels,
  selectedModel,
  handleQuickDefaultModel,
  ghostWriterLevel,
  currentGhostLabel,
  handleQuickGhostWriter,
  lockNow,

  setIsShortcutsModalOpen,
  setIsAboutModalOpen,

  showToast,
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuType>(null);
  const [isExportSubmenuOpen, setIsExportSubmenuOpen] = useState<boolean>(false);
  const topMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside or on Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (topMenuRef.current && !topMenuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setActiveSubmenu(null);
        setIsExportSubmenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setActiveSubmenu(null);
        setIsExportSubmenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const closeAllMenus = () => {
    setActiveMenu(null);
    setActiveSubmenu(null);
    setIsExportSubmenuOpen(false);
  };

  return (
    <nav ref={topMenuRef} className="flex items-center gap-0.5 text-xs text-slate-300">
      {/* 1. 파일 메뉴 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveMenu(activeMenu === 'file' ? null : 'file');
            setIsExportSubmenuOpen(false);
            setActiveSubmenu(null);
          }}
          onMouseEnter={() => {
            if (activeMenu) {
              setActiveMenu('file');
              setIsExportSubmenuOpen(false);
              setActiveSubmenu(null);
            }
          }}
          className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
            activeMenu === 'file'
              ? 'text-zinc-100 bg-white/[0.08] font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
          }`}
        >
          <span>파일</span>
        </button>

        {activeMenu === 'file' && (
          <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300 z-50 animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onClick={() => {
                handleCreateNewSession();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
            >
              <span>새 프로젝트</span>
              <span className="text-[11px] text-zinc-500 font-mono">Alt+N</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleCreateNewFile();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
            >
              <span>새 마크다운 노트</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+N</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleTriggerOpenLocalFile();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
            >
              <span>로컬 파일 불러오기...</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+O</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleTriggerDocImport();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
            >
              <span>오피스 / PDF 문서 변환...</span>
              <span className="text-[11px] text-zinc-500 font-mono">PDF/DOCX</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleSaveDocument();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
            >
              <span>저장</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+S</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleSaveAsFile();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
            >
              <span>다른 이름으로 저장...</span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />

            {/* 내보내기 서브메뉴 */}
            <div
              className="relative"
              onMouseEnter={() => {
                setActiveSubmenu('export');
                setIsExportSubmenuOpen(true);
              }}
              onMouseMove={() => {
                if (activeSubmenu !== 'export') {
                  setActiveSubmenu('export');
                  setIsExportSubmenuOpen(true);
                }
              }}
              onMouseLeave={() => {
                setActiveSubmenu(null);
                setIsExportSubmenuOpen(false);
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const next = activeSubmenu !== 'export' && !isExportSubmenuOpen;
                  setActiveSubmenu(next ? 'export' : null);
                  setIsExportSubmenuOpen(next);
                }}
                className={`w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer group ${
                  activeSubmenu === 'export' || isExportSubmenuOpen
                    ? 'bg-white/[0.06] text-zinc-100 font-medium'
                    : 'hover:bg-white/[0.06] hover:text-zinc-100'
                }`}
              >
                <span>내보내기</span>
                <div
                  className={`flex items-center gap-1 text-[11px] ${
                    activeSubmenu === 'export' || isExportSubmenuOpen
                      ? 'text-zinc-100'
                      : 'text-zinc-500 group-hover:text-zinc-200'
                  }`}
                >
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </div>
              </button>

              {(activeSubmenu === 'export' || isExportSubmenuOpen) && (
                <div className="absolute left-full top-0 pl-1.5 -ml-1 w-52 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300">
                    <button
                      type="button"
                      onClick={() => {
                        handleExportPdf();
                        closeAllMenus();
                      }}
                      className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
                    >
                      <span>인쇄 및 PDF 출력</span>
                      <span className="text-[11px] text-zinc-500 font-mono">Ctrl+P</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportDocx();
                        closeAllMenus();
                      }}
                      className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
                    >
                      <span>DOCX 문서 내보내기</span>
                      <span className="text-[11px] text-zinc-500 font-mono">DOCX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportPptx();
                        closeAllMenus();
                      }}
                      className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
                    >
                      <span>PPTX 슬라이드 내보내기</span>
                      <span className="text-[11px] text-zinc-500 font-mono">PPTX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportCsv();
                        closeAllMenus();
                      }}
                      className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer group"
                    >
                      <span>CSV 데이터 내보내기</span>
                      <span className="text-[11px] text-zinc-500 font-mono">CSV</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="my-1 border-t border-white/[0.08]" />

            <button
              type="button"
              onClick={() => {
                setIsWorkspaceModalOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>프로젝트 폴더 연결 / 관리...</span>
              <span className="text-[10px] bg-white/[0.06] text-zinc-400 px-1.5 py-0.5 rounded border border-white/[0.08] font-mono uppercase">
                {activeWorkspace.type}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleOpenGoogleDrive('open');
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span className="whitespace-nowrap">구글 드라이브...</span>
              <span className="text-[10px] bg-white/[0.06] text-zinc-400 px-1.5 py-0.5 rounded border border-white/[0.08] font-mono shrink-0 whitespace-nowrap">
                {googleUser ? '연동' : '단독'}
              </span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />

            <button
              type="button"
              onClick={() => {
                setIsTrashOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-rose-300 px-2.5 py-1.5 rounded-md hover:bg-rose-950/40 hover:text-rose-200 flex items-center justify-between transition cursor-pointer"
            >
              <span>휴지통 열기</span>
              {trashSessionsCount > 0 && (
                <span className="bg-rose-800/80 text-rose-100 text-[10px] px-1.5 py-0.5 rounded border border-rose-700/40 font-mono">
                  {trashSessionsCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 2. 편집 메뉴 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveMenu(activeMenu === 'edit' ? null : 'edit');
            setActiveSubmenu(null);
          }}
          onMouseEnter={() => {
            if (activeMenu) {
              setActiveMenu('edit');
              setActiveSubmenu(null);
            }
          }}
          className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
            activeMenu === 'edit'
              ? 'text-zinc-100 bg-white/[0.08] font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
          }`}
        >
          <span>편집</span>
        </button>

        {activeMenu === 'edit' && (
          <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300 z-50 animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                document.execCommand('undo');
                showToast('실행 취소');
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>실행 취소</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+Z</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                document.execCommand('redo');
                showToast('다시 실행');
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>다시 실행</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+Y</span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />

            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                handleCopyToClipboard();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>전체 복사</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+C</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                document.execCommand('cut');
                showToast('잘라내기 완료');
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>잘라내기</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+X</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                showToast('💡 에디터나 대화창에서 Ctrl+V 키로 붙여넣으세요.');
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>붙여넣기</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+V</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                handleFormatDocument();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>문서 서식 자동 정리</span>
              <span className="text-[11px] text-zinc-500 font-mono">Shift+Alt+F</span>
            </button>

            {/* 프롬프트 주입 서브메뉴 */}
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('inject-prompts')}
              onMouseMove={() => {
                if (activeSubmenu !== 'inject-prompts') setActiveSubmenu('inject-prompts');
              }}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu('inject-prompts')}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSubmenu(activeSubmenu === 'inject-prompts' ? null : 'inject-prompts');
                }}
                className={`w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer ${
                  activeSubmenu === 'inject-prompts'
                    ? 'bg-white/[0.06] text-zinc-100 font-medium'
                    : 'hover:bg-white/[0.06] hover:text-zinc-100'
                }`}
              >
                <span>프롬프트 주입</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {activeSubmenu === 'inject-prompts' && (
                <div className="absolute left-full top-0 pl-1.5 -ml-1 w-64 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300">
                    <div className="px-2.5 py-1 text-[0.5625rem] font-medium text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-white/[0.08] mb-1">
                      <span>프롬프트 목록</span>
                      <span className="text-[0.5625rem] text-indigo-400 font-medium">1클릭 주입</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {effectivePrompts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            handleInstantInjectPrompt(p);
                            closeAllMenus();
                          }}
                          className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-start gap-1.5 transition cursor-pointer group"
                          title={p.description || p.title}
                        >
                          <span className="text-zinc-500 group-hover:text-zinc-200 text-[0.625rem] shrink-0 mt-0.5">▶</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{p.title}</div>
                            {p.description && (
                              <div className="text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate">
                                {p.description}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="my-1 border-t border-white/[0.08]" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsPromptLibraryModalOpen(true);
                        closeAllMenus();
                      }}
                      className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer font-medium"
                    >
                      <span>프롬프트 관리...</span>
                      <span className="text-[11px] text-zinc-500 font-mono">Alt+P</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="my-1 border-t border-white/[0.08]" />

            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                const searchInput = document.querySelector('input[placeholder*="파일"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
                showToast('탐색기 파일 검색 창에 포커스되었습니다.');
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>찾기 및 검색</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+F</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                if (!messagesCount || messagesCount === 0) {
                  showToast('현재 세션에 초기화할 대화 내역이 없습니다.', 'info');
                } else {
                  handleClearChat();
                }
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-rose-300 px-2.5 py-1.5 rounded-md hover:bg-rose-950/40 hover:text-rose-200 flex items-center justify-between transition cursor-pointer"
            >
              <span>대화 내역 초기화</span>
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                handleDeleteFile(currentActiveFile);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-rose-300 px-2.5 py-1.5 rounded-md hover:bg-rose-950/40 hover:text-rose-200 flex items-center justify-between transition cursor-pointer"
            >
              <span>현재 파일 삭제</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. 보기 메뉴 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveMenu(activeMenu === 'view' ? null : 'view');
            setActiveSubmenu(null);
          }}
          onMouseEnter={() => {
            if (activeMenu) {
              setActiveMenu('view');
              setActiveSubmenu(null);
            }
          }}
          className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
            activeMenu === 'view'
              ? 'text-zinc-100 bg-white/[0.08] font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
          }`}
        >
          <span>보기</span>
        </button>

        {activeMenu === 'view' && (
          <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">사이드바 토글</div>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                setIsSection1Collapsed((prev) => !prev);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>좌측 AI 대화 패널</span>
              <span className="text-[11px] text-zinc-500 font-mono">{isSection1Collapsed ? '열기' : '숨김'}</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                setIsSection3Collapsed((prev) => !prev);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>우측 탐색기 패널</span>
              <span className="text-[11px] text-zinc-500 font-mono">{isSection3Collapsed ? '열기' : '숨김'}</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                setIsSection1Collapsed(true);
                setIsSection3Collapsed(true);
                showToast('🎯 집중 모드 (모든 사이드바 숨김)');
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>집중 모드 (사이드바 숨김)</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                applyDefaultPanelsForCurrentDevice();
                showToast('패널 레이아웃이 복원되었습니다.');
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>전체 패널 복원</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                setIsTocOpen((prev) => !prev);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>제목 목차 보기</span>
              <span className="text-[11px] text-zinc-500 font-mono">{isTocOpen ? '숨김' : '표시'}</span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />
            <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">에디터 모드 전환</div>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                onUpdateSessionEditorTab('wysiwyg');
                closeAllMenus();
              }}
              className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer ${
                editorTab === 'wysiwyg'
                  ? 'bg-white/[0.06] text-zinc-100 font-medium'
                  : 'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100'
              }`}
            >
              <span>서식 모드</span>
              {editorTab === 'wysiwyg' && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                onUpdateSessionEditorTab('edit');
                closeAllMenus();
              }}
              className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer ${
                editorTab === 'edit'
                  ? 'bg-white/[0.06] text-zinc-100 font-medium'
                  : 'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100'
              }`}
            >
              <span>마크다운 소스</span>
              {editorTab === 'edit' && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </button>

            <div className="my-1 border-t border-white/[0.08]" />
            <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>에디터 폰트 크기</span>
              <span className="font-mono text-indigo-400">{editorFontSize}px</span>
            </div>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                handleEditorZoomIn();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>확대</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl + +</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                handleEditorZoomOut();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>축소</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl + -</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                handleEditorZoomReset();
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>기본 크기 복원</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl + 0</span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />
            <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">인터페이스 스타일</div>

            {/* 글꼴 크기 서브메뉴 */}
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('font-size')}
              onMouseMove={() => {
                if (activeSubmenu !== 'font-size') setActiveSubmenu('font-size');
              }}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu('font-size')}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSubmenu(activeSubmenu === 'font-size' ? null : 'font-size');
                }}
                className={`w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer group ${
                  activeSubmenu === 'font-size' ? 'bg-white/[0.06] text-zinc-100 font-medium' : 'hover:bg-white/[0.06] hover:text-zinc-100'
                }`}
              >
                <span>글꼴 크기</span>
                <div
                  className={`flex items-center gap-1 text-[11px] ${
                    activeSubmenu === 'font-size' ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-200'
                  }`}
                >
                  <span>
                    {preferences.fontSize === 'sm'
                      ? '작게'
                      : preferences.fontSize === 'lg'
                      ? '크게'
                      : preferences.fontSize === 'xl'
                      ? '아주 크게'
                      : '보통'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </div>
              </button>
              {activeSubmenu === 'font-size' && (
                <div className="absolute left-full top-0 pl-1.5 -ml-1 w-36 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300">
                    {[
                      { id: 'sm', label: '작게 (14px)' },
                      { id: 'md', label: '보통 (16px)' },
                      { id: 'lg', label: '크게 (18px)' },
                      { id: 'xl', label: '아주 크게 (20px)' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleQuickFontSize(item.id as any);
                          closeAllMenus();
                        }}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer group ${
                          (preferences.fontSize || 'md') === item.id
                            ? 'bg-white/[0.06] text-zinc-100 font-medium'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100'
                        }`}
                      >
                        <span>{item.label}</span>
                        {(preferences.fontSize || 'md') === item.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 레이아웃 밀도 서브메뉴 */}
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('compactness')}
              onMouseMove={() => {
                if (activeSubmenu !== 'compactness') setActiveSubmenu('compactness');
              }}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu('compactness')}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSubmenu(activeSubmenu === 'compactness' ? null : 'compactness');
                }}
                className={`w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer group ${
                  activeSubmenu === 'compactness' ? 'bg-white/[0.06] text-zinc-100 font-medium' : 'hover:bg-white/[0.06] hover:text-zinc-100'
                }`}
              >
                <span>레이아웃 밀도</span>
                <div
                  className={`flex items-center gap-1 text-[11px] ${
                    activeSubmenu === 'compactness' ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-200'
                  }`}
                >
                  <span>{preferences.compactness === 'dense' ? '조밀하게' : '여유롭게'}</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </div>
              </button>
              {activeSubmenu === 'compactness' && (
                <div className="absolute left-full top-0 pl-1.5 -ml-1 w-32 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300">
                    {[
                      { id: 'dense', label: '조밀하게' },
                      { id: 'spacious', label: '여유롭게' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleQuickCompactness(item.id as any);
                          closeAllMenus();
                        }}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer group ${
                          (preferences.compactness || 'spacious') === item.id
                            ? 'bg-white/[0.06] text-zinc-100 font-medium'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100'
                        }`}
                      >
                        <span>{item.label}</span>
                        {(preferences.compactness || 'spacious') === item.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. 기준 문서 메뉴 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveMenu(activeMenu === 'ssot' ? null : 'ssot');
            setActiveSubmenu(null);
          }}
          onMouseEnter={() => {
            if (activeMenu) {
              setActiveMenu('ssot');
              setActiveSubmenu(null);
            }
          }}
          className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
            activeMenu === 'ssot'
              ? 'text-zinc-100 bg-white/[0.08] font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
          }`}
        >
          <span>기준 문서</span>
        </button>

        {activeMenu === 'ssot' && (
          <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300 z-50 animate-in fade-in zoom-in-95 duration-100">
            {/* 기준 문서 생성기 */}
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                handleOpenSSOTGeneratorModal(activeSessionTitle || 'Main Project');
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>기준 문서 생성기...</span>
              <span className="text-[11px] text-zinc-500 font-mono">Alt+C</span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />

            {/* 문서 정합성 감사 */}
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                setIsSsotAuditorOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>문서 정합성 감사</span>
              <span className="text-[11px] text-zinc-500 font-mono">{ssotAuditScore}%</span>
            </button>

            {/* 다관점 비평위원회 */}
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                setIsCouncilModalOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>다관점 비평위원회</span>
              <span className="text-[11px] text-zinc-500 font-mono">{councilScore}점</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. PDF 도구 메뉴 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveMenu(activeMenu === 'pdf' ? null : 'pdf');
            setActiveSubmenu(null);
          }}
          onMouseEnter={() => {
            if (activeMenu) {
              setActiveMenu('pdf');
              setActiveSubmenu(null);
            }
          }}
          className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
            activeMenu === 'pdf'
              ? 'text-zinc-100 bg-white/[0.08] font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
          }`}
        >
          <span>PDF</span>
        </button>

        {activeMenu === 'pdf' && (
          <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300 z-50 animate-in fade-in zoom-in-95 duration-100">
            {/* Extraction & Parsing Group */}
            <button
              type="button"
              disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
              onClick={() => {
                closeAllMenus();
                pdfViewerRef?.current?.extractToMarkdown();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none group"
            >
              <span>마크다운 추출 실행</span>
              <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300">즉시 변환</span>
            </button>

            <button
              type="button"
              disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
              onClick={() => {
                closeAllMenus();
                pdfViewerRef?.current?.clearCacheAndReparse();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none group"
            >
              <span>캐시 초기화 및 재파싱</span>
              <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300">캐시 삭제</span>
            </button>

            <button
              type="button"
              disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
              onClick={() => {
                closeAllMenus();
                pdfViewerRef?.current?.openReducerModal();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none group"
            >
              <span>PDF 최적화 및 경량화...</span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />

            {/* View Controls */}
            <button
              type="button"
              disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
              onClick={() => {
                closeAllMenus();
                pdfViewerRef?.current?.toggleSplitView();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <span>단일 뷰 및 분할 편집 전환</span>
            </button>

            <button
              type="button"
              disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
              onClick={() => {
                closeAllMenus();
                pdfViewerRef?.current?.fitWidth();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <span>너비 맞춤</span>
            </button>

            <button
              type="button"
              disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
              onClick={() => {
                closeAllMenus();
                pdfViewerRef?.current?.rotate();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <span>시계 방향 90도 회전</span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />

            {/* File Actions */}
            <button
              type="button"
              onClick={() => {
                closeAllMenus();
                if (currentActiveFile.toLowerCase().endsWith('.pdf') && pdfViewerRef?.current) {
                  pdfViewerRef.current.openFilePicker();
                } else {
                  handleTriggerDocImport();
                }
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>새 PDF 파일 열기...</span>
            </button>

            <button
              type="button"
              disabled={!currentActiveFile.toLowerCase().endsWith('.pdf')}
              onClick={() => {
                closeAllMenus();
                pdfViewerRef?.current?.downloadPdf();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <span>현재 PDF 다운로드</span>
            </button>

            {!currentActiveFile.toLowerCase().endsWith('.pdf') && (
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  handleOpenFile('sample_document.pdf');
                }}
                className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
              >
                <span>샘플 PDF 열기</span>
              </button>
            )}

            <div className="my-1 border-t border-white/[0.08]" />

            {/* Engine Settings */}
            <button
              type="button"
              onClick={() => {
                setPreferencesInitialTab('ai-engine');
                setIsPreferencesModalOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>PDF 파서 및 AI 엔진 설정...</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. 설정 메뉴 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveMenu(activeMenu === 'settings' ? null : 'settings');
            setActiveSubmenu(null);
          }}
          onMouseEnter={() => {
            if (activeMenu) {
              setActiveMenu('settings');
              setActiveSubmenu(null);
            }
          }}
          className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
            activeMenu === 'settings'
              ? 'text-zinc-100 bg-white/[0.08] font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
          }`}
        >
          <span>설정</span>
        </button>

        {activeMenu === 'settings' && (
          <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300 z-50 animate-in fade-in zoom-in-95 duration-100">
            {/* 역할별 AI 모델명 지정 */}
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                setIsAiRoleModalOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer mb-0.5"
            >
              <span>역할별 AI 모델명 지정...</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                4개 역할
              </span>
            </button>

            <div className="my-1 border-t border-white/[0.08]" />

            {/* 대화 AI 모델 서브메뉴 */}
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('ai-model')}
              onMouseMove={() => {
                if (activeSubmenu !== 'ai-model') setActiveSubmenu('ai-model');
              }}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu('ai-model')}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSubmenu(activeSubmenu === 'ai-model' ? null : 'ai-model');
                }}
                className={`w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer group ${
                  activeSubmenu === 'ai-model' ? 'bg-white/[0.06] text-zinc-100 font-medium' : 'hover:bg-white/[0.06] hover:text-zinc-100'
                }`}
              >
                <span>대화 AI 모델</span>
                <div
                  className={`flex items-center gap-1 text-[11px] ${
                    activeSubmenu === 'ai-model' ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate max-w-[80px]">{currentModelName}</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </div>
              </button>
              {activeSubmenu === 'ai-model' && (
                <div className="absolute left-full top-0 pl-1.5 -ml-1 w-56 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300 max-h-72 overflow-y-auto">
                    <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                      {provider.startsWith('local') ? '로컬 AI 모델' : 'AI 모델 선택'}
                    </div>
                    {sidebarModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          handleQuickDefaultModel(m.id, m.name);
                          closeAllMenus();
                        }}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer group ${
                          (preferences.defaultModel || selectedModel) === m.id
                            ? 'bg-white/[0.06] text-zinc-100 font-medium'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100'
                        }`}
                      >
                        <span className="truncate">{m.name}</span>
                        {(preferences.defaultModel || selectedModel) === m.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 고스트 라이터 서브메뉴 */}
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('ghost-writer')}
              onMouseMove={() => {
                if (activeSubmenu !== 'ghost-writer') setActiveSubmenu('ghost-writer');
              }}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu('ghost-writer')}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSubmenu(activeSubmenu === 'ghost-writer' ? null : 'ghost-writer');
                }}
                className={`w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer group ${
                  activeSubmenu === 'ghost-writer' ? 'bg-white/[0.06] text-zinc-100 font-medium' : 'hover:bg-white/[0.06] hover:text-zinc-100'
                }`}
              >
                <span>고스트 라이터</span>
                <div
                  className={`flex items-center gap-1 text-[11px] ${
                    activeSubmenu === 'ghost-writer' ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-200'
                  }`}
                >
                  <span>{currentGhostLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </div>
              </button>
              {activeSubmenu === 'ghost-writer' && (
                <div className="absolute left-full top-0 pl-1.5 -ml-1 w-52 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300">
                    <div className="space-y-0.5">
                      {[
                        { id: 'off', label: '끄기', desc: '비활성화' },
                        { id: '30', label: '30%', desc: '보수적 제안' },
                        { id: '50', label: '50%', desc: '균형 모드' },
                        { id: '70', label: '70%', desc: '적극적 보조' },
                        { id: '100', label: '100%', desc: '자동 완성 극대화' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            handleQuickGhostWriter(item.id as GhostWriterLevel);
                            closeAllMenus();
                          }}
                          className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between transition cursor-pointer group ${
                            (preferences.ghostWriterLevel || ghostWriterLevel) === item.id
                              ? 'bg-white/[0.06] text-zinc-100 font-medium'
                              : 'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs">{item.label}</span>
                            <span
                              className={`text-[11px] ${
                                (preferences.ghostWriterLevel || ghostWriterLevel) === item.id
                                  ? 'text-indigo-200'
                                  : 'text-zinc-500 group-hover:text-zinc-400'
                              }`}
                            >
                              {item.desc}
                            </span>
                          </div>
                          {(preferences.ghostWriterLevel || ghostWriterLevel) === item.id && (
                            <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="my-1 border-t border-white/[0.08]" />

            {/* 저장소 및 백업 관리 */}
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                setPreferencesInitialTab('storage');
                setIsPreferencesModalOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>저장소 및 백업 관리...</span>
              <span className="text-[10px] bg-white/[0.06] text-emerald-400 px-1.5 py-0.5 rounded border border-white/[0.08] font-mono">
                로컬 저장소
              </span>
            </button>

            {/* 워크스페이스 잠금 */}
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                closeAllMenus();
                lockNow();
                showToast('🔒 워크스페이스가 잠겼습니다.', 'info');
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>워크스페이스 잠금</span>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+L</span>
            </button>

            {/* 전체 환경설정 */}
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={() => {
                setPreferencesInitialTab('ai-engine');
                setIsPreferencesModalOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>전체 환경설정</span>
              <span className="text-[11px] text-zinc-500 font-mono">Alt+,</span>
            </button>
          </div>
        )}
      </div>

      {/* 7. 도움말 메뉴 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveMenu(activeMenu === 'help' ? null : 'help');
            setActiveSubmenu(null);
          }}
          onMouseEnter={() => {
            if (activeMenu) {
              setActiveMenu('help');
              setActiveSubmenu(null);
            }
          }}
          className={`text-xs px-2.5 py-1.5 rounded-md transition cursor-pointer ${
            activeMenu === 'help'
              ? 'text-zinc-100 bg-white/[0.08] font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08]'
          }`}
        >
          <span>도움말</span>
        </button>

        {activeMenu === 'help' && (
          <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#16181d]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 p-1.5 text-xs text-zinc-300 z-50 animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onClick={() => {
                setIsShortcutsModalOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>단축키 가이드</span>
              <span className="text-[11px] text-zinc-500 font-mono">F1</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAboutModalOpen(true);
                closeAllMenus();
              }}
              className="w-full text-left text-xs text-zinc-300 px-2.5 py-1.5 rounded-md hover:bg-white/[0.06] hover:text-zinc-100 flex items-center justify-between transition cursor-pointer"
            >
              <span>AI Podium 정보</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
