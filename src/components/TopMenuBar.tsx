import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  Check,
  ZoomIn,
  ZoomOut,
  Settings
} from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { getCoreTranslations } from '../locales/coreLocale';

export interface TopMenuBarProps {
  handleCreateNewSession: () => void;
  handleCreateNewFile: () => void;
  handleTriggerOpenLocalFile: () => void;
  handleTriggerDocImport: () => void;
  handleSaveDocument: () => void;
  handleSaveAsFile: (format: 'markdown' | 'html' | 'txt' | 'json') => void;
  handleExportPdf: () => void;
  handleExportDocx: () => void;
  handleExportPptx: () => void;
  handleExportCsv: () => void;
  setIsWorkspaceModalOpen: (open: boolean) => void;
  activeWorkspace: any;
  handleOpenGoogleDrive: () => void;
  googleUser: any;
  setIsTrashOpen: (open: boolean) => void;
  trashSessionsCount: number;
  handleCopyToClipboard: () => void;
  handleFormatDocument: () => void;
  effectivePrompts?: any[];
  handleInstantInjectPrompt?: (prompt: any) => void;
  setIsPromptLibraryModalOpen: (open: boolean) => void;
  handleClearChat: () => void;
  messagesCount: number;
  handleDeleteFile: (fileName: string) => void;
  currentActiveFile: string;
  isSection1Collapsed: boolean;
  setIsSection1Collapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
  isSection3Collapsed: boolean;
  setIsSection3Collapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
  applyDefaultPanelsForCurrentDevice: () => void;
  isTocOpen: boolean;
  setIsTocOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  editorTab: any;
  setEditorTab?: (tab: any) => void;
  onUpdateSessionEditorTab: (tab: any) => void;
  editorFontSize: any;
  handleEditorZoomIn: () => void;
  handleEditorZoomOut: () => void;
  handleEditorZoomReset: () => void;
  preferences: any;
  handleQuickFontSize: (size: 'sm' | 'md' | 'lg' | 'xl') => void;
  handleQuickCompactness: (compactness: 'dense' | 'spacious') => void;
  handleOpenSSOTGeneratorModal: (title?: string) => void;
  activeSessionTitle?: string;
  setIsSsotAuditorOpen: (open: boolean) => void;
  ssotAuditScore?: number;
  setIsCouncilModalOpen: (open: boolean) => void;
  councilScore?: number;
  pdfViewerRef: any;
  handleOpenFile: (file: string) => void;
  setPreferencesInitialTab: (tab: any) => void;
  setIsPreferencesModalOpen: (open: boolean) => void;
  setIsAiRoleModalOpen: (open: boolean) => void;
  provider?: any;
  currentModelName?: string;
  sidebarModels?: any[];
  selectedModel?: string;
  handleQuickDefaultModel?: (id: string, name: string) => void;
  ghostWriterLevel: any;
  currentGhostLabel?: string;
  handleQuickGhostWriter: (level: any) => void;
  lockNow: () => void;
  setIsShortcutsModalOpen: (open: boolean) => void;
  setIsAboutModalOpen: (open: boolean) => void;
  showToast: (msg: string, type?: any) => void;
  mode?: 'single' | 'routing' | 'multi';
  onModeChange?: (mode: 'single' | 'routing' | 'multi') => void;
}

type MenuKey = 'file' | 'edit' | 'view' | 'tools' | 'ai' | 'settings' | 'help' | null;

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
  preferences,
  handleQuickFontSize,
  handleQuickCompactness,
  handleOpenSSOTGeneratorModal,
  activeSessionTitle,
  setIsSsotAuditorOpen,
  setIsCouncilModalOpen,
  pdfViewerRef,
  handleOpenFile,
  setPreferencesInitialTab,
  setIsPreferencesModalOpen,
  setIsAiRoleModalOpen,
  ghostWriterLevel,
  handleQuickGhostWriter,
  lockNow,
  setIsShortcutsModalOpen,
  setIsAboutModalOpen,
  showToast,
  mode = 'single',
  onModeChange,
}) => {
  const { t: dict, language } = useTranslation();
  const t = dict?.core?.menu ?? getCoreTranslations(language).menu;
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setActiveSubmenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setActiveSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const closeMenu = () => {
    setActiveMenu(null);
    setActiveSubmenu(null);
  };

  const handleMenuClick = (key: MenuKey) => {
    setActiveMenu(activeMenu === key ? null : key);
    setActiveSubmenu(null);
  };

  const handleMenuHover = (key: MenuKey) => {
    if (activeMenu !== null) {
      setActiveMenu(key);
      setActiveSubmenu(null);
    }
  };



const MENU_POPOVER_CLASS =
  'absolute left-0 top-full mt-1 min-w-[220px] bg-[#16181d] border border-white/[0.08] rounded-lg shadow-2xl p-1 z-50 text-xs text-zinc-300';
const SUBMENU_POPOVER_CLASS =
  'absolute top-0 left-full ml-1 min-w-[190px] bg-[#16181d] border border-white/[0.08] rounded-lg shadow-2xl p-1 z-50 text-xs text-zinc-300';
const MENU_ITEM_CLASS =
  'w-full flex items-center justify-between gap-6 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100 text-left transition-colors cursor-pointer';
const MENU_ITEM_ACTIVE_CLASS =
  'w-full flex items-center justify-between gap-6 px-2.5 py-1.5 rounded-md text-xs bg-white/[0.06] text-zinc-100 font-medium text-left transition-colors cursor-pointer';
const MENU_HEADER_CLASS =
  'px-2.5 py-1 text-[10px] text-zinc-500 font-medium select-none';
const MENU_DIVIDER_CLASS =
  'h-px bg-white/[0.06] my-1';

  if (windowWidth < 768) {
    return (
      <button
        type="button"
        onClick={() => {
          setPreferencesInitialTab('ai-engine');
          setIsPreferencesModalOpen(true);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
        title={t.settings}
        aria-label={t.settings}
      >
        <Settings className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="flex items-center select-none text-xs gap-0.5">
      {/* 1. File */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('file')}
          onMouseEnter={() => handleMenuHover('file')}
          className={`px-2.5 py-1 rounded-md transition-colors duration-150 ${
            activeMenu === 'file'
              ? 'bg-[#222226] text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
          }`}
        >
          {t.file}
        </button>

        {activeMenu === 'file' && (
          <div
            className={MENU_POPOVER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleCreateNewSession();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.newProject}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Ctrl+Shift+N</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleCreateNewFile();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.newMarkdown}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Ctrl+N</span>
            </button>

            <div className={MENU_DIVIDER_CLASS} />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleTriggerOpenLocalFile();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.openLocalFile}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Ctrl+O</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleTriggerDocImport();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.importDocuments}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleSaveDocument();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.saveDocument}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Ctrl+S</span>
            </button>

            {/* Export submenu */}
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('export')}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <div className="w-full flex items-center justify-between gap-6 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100 text-left cursor-pointer transition-colors">
                <span>{t.exportOther}</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              </div>

              {activeSubmenu === 'export' && (
                <div className={SUBMENU_POPOVER_CLASS}>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleSaveAsFile('markdown');
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <span>{t.markdownDocument}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleSaveAsFile('html');
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <span>{t.htmlDocument}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleSaveAsFile('txt');
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <span>{t.textFile}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleSaveAsFile('json');
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <span>{t.jsonData}</span>
                  </button>
                  <div className={MENU_DIVIDER_CLASS} />
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleExportPdf();
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <span>{t.pdfDocument}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleExportDocx();
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <span>{t.wordDocument}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleExportPptx();
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <span>{t.slides}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleExportCsv();
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <span>{t.spreadsheet}</span>
                  </button>
                </div>
              )}
            </div>

            <div className={MENU_DIVIDER_CLASS} />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsWorkspaceModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.workspaceIntegration}</span>
              <span className="text-[10px] text-zinc-500 shrink-0">{activeWorkspace?.type || t.local}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleOpenGoogleDrive();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>Google Drive</span>
              {googleUser && <span className="text-[10px] text-emerald-400 shrink-0">{t.connected}</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsTrashOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.openTrash}</span>
              {trashSessionsCount > 0 && (
                <span className="text-[10px] text-zinc-500 shrink-0">{t.count(trashSessionsCount)}</span>
              )}
            </button>

            {currentActiveFile && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  handleDeleteFile(currentActiveFile);
                }}
                className="w-full flex items-center justify-between gap-6 px-2.5 py-1.5 rounded-md text-xs hover:bg-rose-950/40 hover:text-rose-300 text-left text-rose-400 transition-colors cursor-pointer"
              >
                <span>{t.currentFileDelete}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Edit */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('edit')}
          onMouseEnter={() => handleMenuHover('edit')}
          className={`px-2.5 py-1 rounded-md transition-colors duration-150 ${
            activeMenu === 'edit'
              ? 'bg-[#222226] text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
          }`}
        >
          {t.edit}
        </button>

        {activeMenu === 'edit' && (
          <div
            className={MENU_POPOVER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleCopyToClipboard();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.copyBody}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Ctrl+A, Ctrl+C</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleFormatDocument();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.formatMarkdown}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Alt+Shift+F</span>
            </button>

            <div className={MENU_DIVIDER_CLASS} />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsPromptLibraryModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.promptLibrary}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Alt+P</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleClearChat();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.clearChat}</span>
              {messagesCount > 0 && (
                <span className="text-[10px] text-zinc-500 shrink-0">{t.count(messagesCount)}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 3. View */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('view')}
          onMouseEnter={() => handleMenuHover('view')}
          className={`px-2.5 py-1 rounded-md transition-colors duration-150 ${
            activeMenu === 'view'
              ? 'bg-[#222226] text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
          }`}
        >
          {t.view}
        </button>

        {activeMenu === 'view' && (
          <div
            className={MENU_POPOVER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsSection1Collapsed((prev: boolean) => !prev);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.leftChatPanel}</span>
              <span className="text-[10px] text-zinc-500 shrink-0">{isSection1Collapsed ? t.hide : t.show}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsSection3Collapsed((prev: boolean) => !prev);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.rightExplorerPanel}</span>
              <span className="text-[10px] text-zinc-500 shrink-0">{isSection3Collapsed ? t.hide : t.show}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsTocOpen((prev: boolean) => !prev);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.documentToc}</span>
              <span className="text-[10px] text-zinc-500 shrink-0">{isTocOpen ? t.open : t.closed}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                applyDefaultPanelsForCurrentDevice();
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.restoreLayout}</span>
            </button>

            <div className={MENU_DIVIDER_CLASS} />

            <div className={MENU_HEADER_CLASS}>
              {t.editorViewMode}
            </div>

            {[
              { id: 'wysiwyg', label: t.wysiwygEditor },
              { id: 'markdown', label: t.markdownEditor },
              { id: 'split', label: t.splitEditor },
              { id: 'vibe', label: t.vibeCanvas },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  closeMenu();
                  onUpdateSessionEditorTab(tab.id as any);
                }}
                className={editorTab === tab.id ? MENU_ITEM_ACTIVE_CLASS : MENU_ITEM_CLASS}
              >
                <span>{tab.label}</span>
                {editorTab === tab.id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
              </button>
            ))}

            <div className={MENU_DIVIDER_CLASS} />

            <div className={MENU_HEADER_CLASS}>
              {t.fontSize}
            </div>

            <div className="flex items-center justify-between px-2.5 py-1">
              <button
                type="button"
                onClick={handleEditorZoomOut}
                className="p-1 hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-100 rounded-md transition-colors cursor-pointer"
                title={t.decreaseFont}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-zinc-300 font-mono text-[11px]">
                {editorFontSize === 'sm' ? '14px' : editorFontSize === 'md' ? '16px' : editorFontSize === 'lg' ? '18px' : '20px'}
              </span>
              <button
                type="button"
                onClick={handleEditorZoomIn}
                className="p-1 hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-100 rounded-md transition-colors cursor-pointer"
                title={t.increaseFont}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  closeMenu();
                  handleQuickFontSize(size);
                }}
                className={editorFontSize === size ? MENU_ITEM_ACTIVE_CLASS : MENU_ITEM_CLASS}
              >
                <span>
                  {size === 'sm' ? t.small : size === 'md' ? t.normal : size === 'lg' ? t.large : t.extraLarge}
                </span>
                {editorFontSize === size && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
              </button>
            ))}

            <div className={MENU_DIVIDER_CLASS} />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleQuickCompactness(preferences?.compactness === 'dense' ? 'spacious' : 'dense');
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.layoutDensity}</span>
              <span className="text-[10px] text-zinc-500 shrink-0">
                {preferences?.compactness === 'dense' ? t.compact : t.spacious}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Tools */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('tools')}
          onMouseEnter={() => handleMenuHover('tools')}
          className={`px-2.5 py-1 rounded-md transition-colors duration-150 ${
            activeMenu === 'tools'
              ? 'bg-[#222226] text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
          }`}
        >
          {t.tools}
        </button>

        {activeMenu === 'tools' && (
          <div
            className={MENU_POPOVER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleOpenSSOTGeneratorModal(activeSessionTitle || 'Main Project');
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.ssotGenerator}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Alt+C</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsSsotAuditorOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.documentAudit}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsCouncilModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.councilReview}</span>
            </button>

            <div className={MENU_DIVIDER_CLASS} />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                if (pdfViewerRef?.current?.triggerOptimize) {
                  pdfViewerRef.current.triggerOptimize();
                } else {
                  showToast(t.pdfViewerRequired, 'info');
                }
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.pdfOptimize}</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. AI */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('ai')}
          onMouseEnter={() => handleMenuHover('ai')}
          className={`px-2.5 py-1 rounded-md transition-colors duration-150 ${
            activeMenu === 'ai'
              ? 'bg-[#222226] text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
          }`}
        >
          AI
        </button>

        {activeMenu === 'ai' && (
          <div
            className={MENU_POPOVER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsAiRoleModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.aiRoles}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setPreferencesInitialTab('ai');
                setIsPreferencesModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.aiEngine}</span>
            </button>

            <div className="border-t border-white/5 my-1" />

            {/* Ghostwriter submenu and toggle */}
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu('ghost-writer')}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <div
                onClick={() => {
                  closeMenu();
                  const isOff = !ghostWriterLevel || ghostWriterLevel === 'off';
                  const nextLevel = isOff ? '50' : 'off';
                  handleQuickGhostWriter(nextLevel);
                  showToast(
                    isOff ? t.ghostWriterOn : t.ghostWriterOff,
                    'info'
                  );
                }}
                className="w-full flex items-center justify-between gap-6 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{t.ghostWriter}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {ghostWriterLevel && ghostWriterLevel !== 'off' ? t.enabled : t.disabled}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              </div>

              {activeSubmenu === 'ghost-writer' && (
                <div className={SUBMENU_POPOVER_CLASS}>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleQuickGhostWriter('off');
                      showToast(t.ghostWriterOff, 'info');
                    }}
                    className={!ghostWriterLevel || ghostWriterLevel === 'off' ? MENU_ITEM_ACTIVE_CLASS : MENU_ITEM_CLASS}
                  >
                    <span>{t.turnOff}</span>
                    {(!ghostWriterLevel || ghostWriterLevel === 'off') && (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleQuickGhostWriter('50');
                      showToast(t.ghostWriterOn, 'info');
                    }}
                    className={ghostWriterLevel && ghostWriterLevel !== 'off' ? MENU_ITEM_ACTIVE_CLASS : MENU_ITEM_CLASS}
                  >
                    <span>{t.turnOn}</span>
                    {ghostWriterLevel && ghostWriterLevel !== 'off' && (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Settings */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('settings')}
          onMouseEnter={() => handleMenuHover('settings')}
          className={`px-2.5 py-1 rounded-md transition-colors duration-150 ${
            activeMenu === 'settings'
              ? 'bg-[#222226] text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
          }`}
        >
          {t.settings}
        </button>

        {activeMenu === 'settings' && (
          <div
            className={MENU_POPOVER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                setPreferencesInitialTab('general');
                setIsPreferencesModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.preferences}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Ctrl+,</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setPreferencesInitialTab('language');
                setIsPreferencesModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.languagePreference}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setPreferencesInitialTab('ai-engine');
                setIsPreferencesModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.aiEngine}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setPreferencesInitialTab('storage');
                setIsPreferencesModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.storageBackup}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setPreferencesInitialTab('security');
                setIsPreferencesModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.securityPin}</span>
            </button>

            <div className={MENU_DIVIDER_CLASS} />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                lockNow();
              }}
              className="w-full flex items-center justify-between gap-6 px-2.5 py-1.5 rounded-md text-xs hover:bg-amber-950/40 hover:text-amber-300 text-left text-amber-400 transition-colors cursor-pointer"
            >
              <span>{t.lockWorkspace}</span>
            </button>
          </div>
        )}
      </div>

      {/* 7. Help */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('help')}
          onMouseEnter={() => handleMenuHover('help')}
          className={`px-2.5 py-1 rounded-md transition-colors duration-150 ${
            activeMenu === 'help'
              ? 'bg-[#222226] text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
          }`}
        >
          {t.help}
        </button>

        {activeMenu === 'help' && (
          <div
            className={MENU_POPOVER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsShortcutsModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.shortcuts}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">Ctrl+/</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleOpenFile('welcome.md');
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.startGuide}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleOpenFile('ai_guide.md');
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.aiGuide}</span>
            </button>

            <div className={MENU_DIVIDER_CLASS} />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsAboutModalOpen(true);
              }}
              className={MENU_ITEM_CLASS}
            >
              <span>{t.about}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">v0.1.0</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
