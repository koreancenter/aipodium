/**
 * ChatPanel Component (Phase 3.1 Layout Deconstruction)
 * Encapsulates:
 * - Real-time streaming AI message list view
 * - Auto-scroll management with user scroll-up lock/release
 * - Bottom-Flush UniversalPromptInput
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  ArrowDown,
  Link2,
  FileText,
  Ghost,
  Globe,
  Loader2,
  ChevronRight,
  MessageSquare,
  Quote,
  Pin,
  X,
  History,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type {
  ChatMessage,
  ChatAttachment,
  GhostWriterLevel,
  MentionItem,
  EditorSelectionContext,
  PinnedReferenceAnchor,
  SessionRewriteHistoryItem,
} from '../../types';
import { AiMessageBubble } from '../AiMessageBubble';
import { WebLlmBanner } from '../WebLlmBanner';
import { UniversalPromptInput } from './UniversalPromptInput';
import { AIThinkingIndicator } from './AIThinkingIndicator';
import { WEB_LLM_MODEL_ID, WEB_LLM_MODEL_DISPLAY_NAME } from '../../utils/webllmService';

import { useTranslation } from '../../context/LanguageContext';
import { useOptionalEditorEventBus } from '../../context/EditorEventBusContext';
import { buildSessionRewriteHistoryItems } from '../../utils/rewriteHistory';

export interface ChatActivityRailProps {
  onOpen: () => void;
  isEngineActive?: boolean;
  className?: string;
}

export const ChatActivityRail: React.FC<ChatActivityRailProps> = ({
  onOpen,
  isEngineActive = true,
  className = ''
}) => {
  const { t: dict } = useTranslation();
  const t = dict.core.chat;

  return (
    <div
      id="chat-activity-rail"
      className={`w-10 shrink-0 bg-[#121214] border-r border-[#222226] flex flex-col items-center py-3 justify-between z-20 select-none transition-all duration-200 h-full ${className}`}
    >
      {/* Top item: Clean ghost button with MessageSquare */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          id="chat-rail-open-btn"
          onClick={onOpen}
          className="p-2 rounded-md hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          title={t.open}
          aria-label={t.open}
        >
          <MessageSquare className="w-4 h-4 text-zinc-400 hover:text-zinc-100" />
        </button>
      </div>

      {/* Bottom item: Active engine status indicator dot */}
      <div className="flex flex-col items-center gap-2 pb-1" title={t.engineActive}>
        <span
          className={`w-2 h-2 rounded-full ${
            isEngineActive ? 'bg-emerald-400' : 'bg-zinc-600'
          }`}
        />
      </div>
    </div>
  );
};

export interface ChatPanelProps {
  // Project Drawer slot & Container
  projectDrawer?: React.ReactNode;
  children?: React.ReactNode;
  isProjectDrawerOpen?: boolean;
  onToggleProjectDrawer?: () => void;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  header?: React.ReactNode;


  // Session & Message Data
  activeSessionId: string;
  sessionTitle?: string;
  messages: ChatMessage[];
  isAiLoading: boolean;

  // Prompt Input & Attachments
  chatInput: string;
  onChatInputChange: (val: string) => void;
  chatAttachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAddAttachment: (att: ChatAttachment) => void;
  onAddFiles?: (files: FileList | File[]) => void;
  onSendMessage: (overrideText?: string, meta?: any) => void;
  editorSelection?: EditorSelectionContext | null;
  onClearEditorSelection?: () => void;
  pinnedAnchors?: PinnedReferenceAnchor[];
  onUnpinAnchor?: (id: string) => void;
  onClearPinnedAnchors?: () => void;

  // Message & Rewrite History Actions
  onSendToEditor: (text: string) => void;
  onDiff: (text: string, model?: string) => void;
  sessionRewriteHistory?: SessionRewriteHistoryItem[];
  onApplyRewrite?: (historyOrMsgId: string, rewrittenText: string) => void;
  onRevertRewrite?: (historyOrMsgId: string, previousText?: string) => void;
  onActionChipClick?: (chipType: string) => void;
  onOpenSettings?: (tab?: string) => void;
  onTranslate?: (msgId: string, text: string) => Promise<string> | void;
  onToast: (msg: string, type?: 'info' | 'warn' | 'error' | 'success') => void;

  // Mentions
  allMentionItems?: MentionItem[];
  renderFormattedMessageText?: (text: string) => React.ReactNode;

  // Engine & Model State
  selectedModel: string;
  onSelectModel: (model: string) => void;
  selectedMultiModels: string[];
  onSelectMultiModels: (models: string[]) => void;
  mode: 'single' | 'multi' | 'routing';
  onModeChange: (mode: 'single' | 'multi' | 'routing') => void;
  availableChatModels: any[];
  provider: 'cloud' | 'local-pc' | 'local-server' | string;
  activeProvider?: 'webllm' | 'cloud' | 'local-pc' | string;
  onSelectProvider: (provider: any) => void;
  onRefreshOllama?: () => Promise<void>;
  localEndpointAddress?: string;
  onSelectDefaultLocalTag?: (tag: string) => void;
  onOpenRoleModal?: () => void;
  apiKeys?: Record<string, string>;
  isOnboardingMode?: boolean;

  // WebLLM State
  webllmProgress?: {
    isSupported?: boolean;
    isLoading: boolean;
    isReady: boolean;
    progressText: string;
    progressPercent?: number;
  };
  onStartWebLlmDownload?: () => void;
  isWebLlmBannerDismissed?: boolean;
  onDismissWebLlmBanner?: () => void;

  // Ghost Writer State
  ghostWriterLevel?: GhostWriterLevel;
  ghostTargetEnglish?: string;
  ghostTemplateText?: string;
  ghostUserInput?: string;
  ghostShowFullAnswer?: boolean;
  isGhostLoading?: boolean;
  onGenerateGhostText?: () => void;
  onGhostUserInputChange?: (val: string) => void;
  onGhostInputKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendGhostMessage?: () => void;
  onSetGhostTargetEnglish?: (val: string) => void;
  onSetGhostTemplateText?: (val: string) => void;
  onSetGhostUserInput?: (val: string) => void;
  onSetGhostShowFullAnswer?: (val: boolean) => void;

  // Focus & Ref
  chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onInputFocus?: () => void;
  className?: string;

  // Collapsible Activity Rail Support
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  projectDrawer,
  children,
  isProjectDrawerOpen,
  onToggleProjectDrawer,
  headerLeft,
  headerRight,
  header,

  activeSessionId,
  sessionTitle,
  messages,
  isAiLoading,
  chatInput,
  onChatInputChange,
  chatAttachments,
  onRemoveAttachment,
  onAddAttachment,
  onAddFiles,
  onSendMessage,
  editorSelection,
  onClearEditorSelection,
  onSendToEditor,
  onDiff,
  sessionRewriteHistory,
  onApplyRewrite,
  onRevertRewrite,
  onActionChipClick,
  onOpenSettings,
  onTranslate,
  onToast,
  allMentionItems = [],
  renderFormattedMessageText = (t) => t,
  selectedModel,
  onSelectModel,
  selectedMultiModels,
  onSelectMultiModels,
  mode,
  onModeChange,
  availableChatModels,
  provider,
  activeProvider,
  onSelectProvider,
  onRefreshOllama,
  localEndpointAddress,
  onSelectDefaultLocalTag,
  onOpenRoleModal,
  apiKeys,
  isOnboardingMode = false,
  webllmProgress,
  onStartWebLlmDownload,
  isWebLlmBannerDismissed = false,
  onDismissWebLlmBanner,
  ghostWriterLevel = 'off',
  ghostTargetEnglish = '',
  ghostTemplateText = '',
  ghostUserInput = '',
  ghostShowFullAnswer = false,
  isGhostLoading = false,
  onGenerateGhostText,
  onGhostUserInputChange,
  onGhostInputKeyDown,
  onSendGhostMessage,
  onSetGhostTargetEnglish,
  onSetGhostTemplateText,
  onSetGhostUserInput,
  onSetGhostShowFullAnswer,
  chatInputRef,
  onInputFocus,
  pinnedAnchors: propPinnedAnchors,
  onUnpinAnchor: propOnUnpinAnchor,
  onClearPinnedAnchors: propOnClearPinnedAnchors,
  className = '',
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { t: dict, language } = useTranslation();
  const t = dict.core.chat;
  const eventBus = useOptionalEditorEventBus();
  const pinnedAnchors = propPinnedAnchors ?? eventBus?.pinnedAnchors ?? [];
  const handleUnpinAnchor = propOnUnpinAnchor ?? eventBus?.unpinAnchor;
  const handleClearPinnedAnchors = propOnClearPinnedAnchors ?? eventBus?.clearPinnedAnchors;
  const [expandedAnchorIds, setExpandedAnchorIds] = useState<Record<string, boolean>>({});
  const rewriteHistoryItems = useMemo(
    () => buildSessionRewriteHistoryItems(messages, sessionRewriteHistory, activeSessionId),
    [messages, sessionRewriteHistory, activeSessionId]
  );
  const [isRewriteHistoryOpen, setIsRewriteHistoryOpen] = useState<boolean>(
    () => rewriteHistoryItems.length > 0
  );
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});
  const prevHistoryMetaRef = useRef<{ sessionId: string; count: number }>({
    sessionId: activeSessionId,
    count: rewriteHistoryItems.length,
  });

  useEffect(() => {
    const prev = prevHistoryMetaRef.current;
    if (prev.sessionId !== activeSessionId) {
      setIsRewriteHistoryOpen(rewriteHistoryItems.length > 0);
      setExpandedHistoryIds({});
    } else if (rewriteHistoryItems.length > prev.count) {
      setIsRewriteHistoryOpen(true);
    }
    prevHistoryMetaRef.current = {
      sessionId: activeSessionId,
      count: rewriteHistoryItems.length,
    };
  }, [activeSessionId, rewriteHistoryItems.length]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const [isScrolledUp, setIsScrolledUp] = useState<boolean>(false);

  const scrollToThreadMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`chat-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Smart Auto scroll chat: locks to bottom during generation, releases if user scrolls up
  const handleChatScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > 40) {
      isUserScrolledUpRef.current = true;
      setIsScrolledUp(true);
    } else {
      isUserScrolledUpRef.current = false;
      setIsScrolledUp(false);
    }
  }, []);

  const scrollToChatBottom = useCallback((smooth = false) => {
    const container = chatContainerRef.current;
    if (!container) return;
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!isUserScrolledUpRef.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isAiLoading, activeSessionId]);

  if (isCollapsed) {
    return (
      <ChatActivityRail
        onOpen={onToggleCollapse || (() => {})}
        isEngineActive={!isAiLoading}
        className={className}
      />
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden h-full ${className}`}>
      {/* Top Header: Rendered only when explicit header is provided */}
      {header !== undefined ? header : null}

      {/* Pinned Reference Anchors Docked at Top of Chat Panel */}
      {pinnedAnchors.length > 0 && (
        <div
          id="chat-pinned-anchors"
          className="shrink-0 bg-[#0c0c0e] border-b border-[#222226] px-3 py-2 flex flex-col gap-1.5 select-none z-10"
        >
          <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Pin className="w-3 h-3 text-[#6366f1] shrink-0" />
              <span className="font-medium text-indigo-300 truncate">{t.pinnedAnchorTitle}</span>
              <span className="text-[0.625rem] font-mono text-zinc-400 bg-[#121214] border border-[#222226] px-1.5 py-0.2 rounded-xs shrink-0">
                {t.pinnedAnchorCount(pinnedAnchors.length)}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[0.625rem] text-zinc-500 hidden sm:inline">{t.pinnedAnchorIncluded}</span>
              {pinnedAnchors.length > 1 && handleClearPinnedAnchors && (
                <button
                  type="button"
                  onClick={handleClearPinnedAnchors}
                  className="text-[0.625rem] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  {t.clearAllPinnedAnchors}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar">
            {pinnedAnchors.map((anchor) => {
              const isExpanded = Boolean(expandedAnchorIds[anchor.id]);
              return (
                <div
                  key={anchor.id}
                  data-pinned-anchor-id={anchor.id}
                  className="bg-[#121214] border border-[#222226] border-l-2 border-l-[#6366f1] rounded-xs px-2 py-1 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAnchorIds((prev) => ({ ...prev, [anchor.id]: !prev[anchor.id] }))
                      }
                      className="flex items-center gap-1.5 min-w-0 flex-1 text-left text-[0.6875rem] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {anchor.fileName && (
                        <span className="text-[0.625rem] font-mono text-zinc-400 bg-[#09090b] border border-[#222226] px-1 rounded-xs truncate max-w-[110px] shrink-0">
                          {anchor.fileName}
                        </span>
                      )}
                      {!isExpanded && (
                        <span className="truncate text-zinc-300 font-sans">
                          {anchor.text.replace(/\s+/g, ' ')}
                        </span>
                      )}
                      {isExpanded && (
                        <span className="text-[0.625rem] font-mono text-indigo-300">
                          {t.selectionChars(anchor.text.length)}
                        </span>
                      )}
                    </button>
                    {handleUnpinAnchor && (
                      <button
                        type="button"
                        onClick={() => handleUnpinAnchor(anchor.id)}
                        className="text-zinc-400 hover:text-rose-400 p-0.5 rounded-xs hover:bg-[#18181b] transition-colors cursor-pointer shrink-0"
                        title={t.unpinAnchor}
                        aria-label={t.unpinAnchor}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="max-h-20 overflow-y-auto custom-scrollbar text-[0.6875rem] text-zinc-200 whitespace-pre-wrap break-words font-sans leading-relaxed select-text border-t border-[#222226] pt-1">
                      {anchor.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Session-Scoped Rewrite with AI History View */}
      {rewriteHistoryItems.length > 0 && (
        <div
          id="chat-rewrite-history"
          className="shrink-0 bg-[#0c0c0e] border-b border-[#222226] px-3 py-1.5 flex flex-col gap-1.5 select-none z-10"
        >
          <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
            <button
              type="button"
              id="chat-rewrite-history-toggle"
              onClick={() => setIsRewriteHistoryOpen((prev) => !prev)}
              className="flex items-center gap-1.5 min-w-0 flex-1 text-left hover:text-white transition-colors cursor-pointer"
            >
              <History className="w-3 h-3 text-[#6366f1] shrink-0" />
              <span className="font-medium text-indigo-300 truncate">{t.rewriteHistoryTitle}</span>
              <span className="text-[0.625rem] font-mono text-zinc-400 bg-[#121214] border border-[#222226] px-1.5 py-0.2 rounded-xs shrink-0">
                {t.rewriteHistoryCount(rewriteHistoryItems.length)}
              </span>
              {isRewriteHistoryOpen ? (
                <ChevronUp className="w-3 h-3 text-zinc-400 shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
              )}
            </button>

            {!isRewriteHistoryOpen && onRevertRewrite && !rewriteHistoryItems[0].isStreaming && (
              <button
                type="button"
                data-revert-history-id={rewriteHistoryItems[0].id}
                onClick={() =>
                  onRevertRewrite(
                    rewriteHistoryItems[0].id,
                    rewriteHistoryItems[0].originalText
                  )
                }
                title={t.revertRewriteAction}
                aria-label={t.revertRewriteAction}
                className="h-5 px-1.5 rounded-xs bg-[#121214] hover:bg-[#18181b] border border-[#222226] hover:border-amber-500/60 text-zinc-300 hover:text-amber-200 text-[0.625rem] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                <span>{t.revertShortAction}</span>
              </button>
            )}
          </div>

          {isRewriteHistoryOpen && (
            <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto custom-scrollbar pb-0.5">
              {rewriteHistoryItems.map((item) => {
                const isExpanded = Boolean(expandedHistoryIds[item.id]);
                const isReverted = Boolean(item.revertedAt);
                const isApplied = !isReverted && (item.appliedCount || 0) > 0;
                return (
                  <div
                    key={item.id}
                    data-history-entry-id={item.id}
                    data-history-source={item.source}
                    className="bg-[#121214] border border-[#222226] rounded-xs px-2 py-1.5 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[0.625rem]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="font-mono text-zinc-400 shrink-0">{item.timestamp}</span>
                        <span className="px-1 rounded-xs bg-[#09090b] border border-[#222226] text-zinc-400 shrink-0">
                          {item.source === 'inline' ? t.rewriteSourceInline : t.rewriteSourceChat}
                        </span>
                        {item.fileName && (
                          <span className="font-mono text-zinc-400 bg-[#09090b] border border-[#222226] px-1 rounded-xs truncate max-w-[100px]">
                            {item.fileName}
                          </span>
                        )}
                        <span
                          className={`px-1 rounded-xs border font-medium shrink-0 ${
                            isReverted
                              ? 'border-amber-500/40 text-amber-300'
                              : isApplied
                              ? 'border-emerald-500/40 text-emerald-300'
                              : 'border-[#222226] text-zinc-400'
                          }`}
                        >
                          {isReverted
                            ? t.rewriteStatusReverted
                            : isApplied
                            ? t.rewriteStatusApplied
                            : t.rewriteStatusReady}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.msgId && (
                          <button
                            type="button"
                            onClick={() => scrollToThreadMessage(item.msgId!)}
                            className="text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer"
                          >
                            {t.jumpToMessage}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHistoryIds((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                          className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          {t.toggleRewriteCompare}
                        </button>
                      </div>
                    </div>

                    {item.prompt && (
                      <div className="text-[0.625rem] text-indigo-300/90 truncate font-sans">
                        {item.prompt}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHistoryIds((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="text-left text-[0.6875rem] text-zinc-400 font-sans cursor-pointer hover:text-zinc-200 transition-colors"
                    >
                      <div className={isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}>
                        <span className="text-zinc-500 mr-1">{t.rewriteOriginalLabel}:</span>
                        <span className="text-zinc-300">
                          {isExpanded ? item.originalText : item.originalText.replace(/\s+/g, ' ')}
                        </span>
                      </div>
                      {isExpanded && item.rewrittenText && (
                        <div className="mt-1 pt-1 border-t border-[#222226] whitespace-pre-wrap break-words">
                          <span className="text-indigo-400/90 mr-1">{t.rewriteResultLabel}:</span>
                          <span className="text-zinc-200">{item.rewrittenText}</span>
                        </div>
                      )}
                    </button>

                    {!item.isStreaming && (
                      <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {onRevertRewrite && (
                            <button
                              type="button"
                              data-revert-history-id={item.id}
                              onClick={() => onRevertRewrite(item.id, item.originalText)}
                              title={t.revertRewriteAction}
                              aria-label={t.revertRewriteAction}
                              className="h-5 px-2 rounded-xs bg-[#09090b] hover:bg-[#18181b] border border-[#222226] hover:border-amber-500/60 text-zinc-200 hover:text-amber-200 text-[0.625rem] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                              <span>{t.revertShortAction}</span>
                            </button>
                          )}
                          {onApplyRewrite && item.rewrittenText && (
                            <button
                              type="button"
                              data-apply-history-id={item.id}
                              onClick={() => onApplyRewrite(item.id, item.rewrittenText)}
                              className="h-5 px-1.5 rounded-xs bg-[#09090b] hover:bg-[#18181b] border border-[#6366f1]/50 hover:border-[#6366f1] text-indigo-200 hover:text-white text-[0.625rem] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Check className="w-2.5 h-2.5 text-[#6366f1]" />
                              <span>{t.applyRewriteAction}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* Middle Message Viewport & Confined Project Drawer Flex Container */}
      <div className="flex-1 min-h-0 relative flex flex-row overflow-hidden">
        {/* Confined Project Drawer Container / Aside */}
        <div className="relative shrink-0 h-full z-20 flex">
          {projectDrawer || children}
          {/* Bookmark tab protruding from the drawer's right edge: always visible */}
          {projectDrawer && onToggleProjectDrawer && (
            <button
              type="button"
              id="project-drawer-edge-tab"
              onClick={onToggleProjectDrawer}
              className={`absolute left-full top-3 w-4 h-12 flex items-center justify-center rounded-r-md border border-l-0 border-[#222226] transition-colors duration-200 cursor-pointer hover:w-5 ${
                isProjectDrawerOpen
                  ? 'bg-[#121214] text-indigo-400 hover:text-indigo-300'
                  : 'bg-[#18181b] text-zinc-400 hover:text-indigo-400'
              }`}
              title={t.toggleProjectDrawer}
              aria-label={t.toggleProjectDrawer}
              aria-pressed={!!isProjectDrawerOpen}
            >
              <ChevronRight className={`w-3 h-3 transition-transform duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${isProjectDrawerOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>
          )}
        </div>

        {/* Scrollable Message List View */}
        <div
          id="chat-messages"
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 min-w-0 h-full overflow-y-auto p-3 select-text custom-scrollbar"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSessionId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="space-y-3 select-text max-w-3xl mx-auto w-full"
            >
              {messages.length === 0 ? (
                webllmProgress?.isLoading ? (
                  <div
                    id="webllm-chat-download-progress"
                    className="flex flex-col items-center justify-center min-h-[360px] h-full text-center px-6 py-12 select-none max-w-md mx-auto w-full animate-in fade-in duration-200"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-[#6366f1]">
                      <Loader2 className="w-6 h-6 animate-spin text-[#6366f1]" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 mb-1">
                      {t.downloadTitle}
                    </h3>
                    <p className="text-xs text-zinc-400 mb-5 leading-relaxed break-keep">
                      {t.downloadDescription}
                    </p>

                    {/* 0~100% 게이지 바 */}
                    <div className="w-full bg-[#09090b] border border-[#222226] rounded-full h-2 overflow-hidden mb-2.5">
                      <div
                        className="bg-[#6366f1] h-full w-full rounded-full origin-left transition-transform duration-200 ease-out"
                        style={{ transform: `scaleX(${Math.max(0.02, Math.min(1, (webllmProgress.progressPercent ?? 0) / 100))})` }}
                      />
                    </div>

                    <div className="flex items-center justify-between w-full text-xs text-zinc-400 font-mono">
                      <span className="truncate max-w-[75%] text-left text-[11px]" title={webllmProgress.progressText}>
                        {webllmProgress.progressText || t.downloadProgress}
                      </span>
                      <span className="font-bold text-[#6366f1] text-xs shrink-0">
                        {webllmProgress.progressPercent ?? 0}%
                      </span>
                    </div>
                    <div className="mt-3 text-[10px] text-zinc-500 font-mono">
                      {t.memoryRecommendation}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[360px] h-full text-center px-4 py-16 select-none">
                    <p className="text-sm font-medium text-zinc-300">
                      {t.startConversation}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1.5 max-w-xs leading-relaxed">
                      {t.supportedTasks}
                    </p>
                  </div>
                )
              ) : (
                <>
                  {webllmProgress?.isLoading && (
                    <div className="p-3 bg-[#121214] border border-[#222226] rounded-md select-none mb-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5 text-zinc-200 font-medium">
                          <Loader2 className="w-3.5 h-3.5 text-[#6366f1] animate-spin" />
                          {t.downloading}
                        </span>
                        <span className="font-mono font-bold text-[#6366f1]">
                          {webllmProgress.progressPercent ?? 0}%
                        </span>
                      </div>
                      <div className="w-full bg-[#09090b] border border-[#222226] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#6366f1] h-full w-full rounded-full origin-left transition-transform duration-200 ease-out"
                          style={{ transform: `scaleX(${Math.max(0.02, Math.min(1, (webllmProgress.progressPercent ?? 0) / 100))})` }}
                        />
                      </div>
                    </div>
                  )}
                  {messages.map((msg) =>
                  msg.sender === 'ai' ? (
                    <div key={msg.id} id={`chat-msg-${msg.id}`}>
                      <AiMessageBubble
                        msg={msg}
                        language={language}
                        selectedModel={
                          selectedModel === WEB_LLM_MODEL_ID
                            ? WEB_LLM_MODEL_DISPLAY_NAME
                            : isOnboardingMode
                            ? t.onboardingAssistant
                            : selectedModel
                        }
                        onCopy={(text) => {
                          navigator.clipboard.writeText(text);
                          onToast(t.copySuccess);
                        }}
                        onDiff={(text, model) => {
                          onDiff(text, model);
                        }}
                        onSendToEditor={(text) => onSendToEditor(text)}
                        onApplyRewrite={onApplyRewrite}
                        onRevertRewrite={onRevertRewrite}
                        onActionChipClick={(chipType) => onActionChipClick?.(chipType)}
                        onOpenSettings={(tab) => onOpenSettings?.(tab)}
                        onTranslate={onTranslate}
                      />
                    </div>
                  ) : (
                    <div key={msg.id} id={`chat-msg-${msg.id}`} className="flex gap-2.5 items-start select-text justify-end">
                      <div className="rounded-md p-3 text-xs leading-relaxed space-y-2 select-text cursor-text bg-[#18181f] border border-white/[0.08] text-slate-100 max-w-[85%]">
                        {/* Attachment Rendering */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5 border-b border-white/[0.06] pb-1.5 select-none">
                            {msg.attachments.map((att) => (
                              <div
                                key={att.id}
                                className="rounded overflow-hidden border border-white/[0.06] bg-black/40 p-1 flex items-center gap-1.5 max-w-full"
                              >
                                {att.type === 'image' && att.url ? (
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="max-h-36 rounded border border-white/[0.06] object-cover"
                                  />
                                ) : att.type === 'link' ? (
                                  <div className="flex items-center gap-1.5 px-1 text-[0.6875rem] text-slate-300 font-mono">
                                    <Link2 className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
                                    <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                                    <span className="text-[0.625rem] text-slate-400">({att.size})</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-1 text-[0.6875rem] text-slate-300 font-mono">
                                    <FileText className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />
                                    <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                                    <span className="text-[0.625rem] text-slate-400">({att.size})</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Ghost Writer Level Indicator */}
                        {msg.ghostWriterLevel && msg.ghostWriterLevel !== 'off' && (
                          <div className="flex flex-col gap-1 pb-1.5 mb-1.5 border-b border-white/[0.06] select-none">
                            <div className="flex items-center justify-between gap-2 text-[0.625rem]">
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-200 bg-emerald-950/80 px-1.5 py-0.5 rounded text-[0.5625rem] border border-emerald-800/60">
                                <Ghost className="w-3 h-3 text-emerald-300" />
                                Ghost Writer {msg.ghostWriterLevel}%
                              </span>
                              <span className="text-[0.625rem] text-[#38bdf8] font-mono flex items-center gap-1">
                                <Globe className="w-3 h-3 text-[#0ea5e9]" />
                                {t.englishPrompt}
                              </span>
                            </div>
                            {msg.originalText && msg.originalText !== msg.text && (
                              <div className="text-[0.6875rem] text-slate-300 flex items-start gap-1 font-sans pt-0.5">
                                <span className="font-medium text-slate-400 shrink-0">{t.koreanOriginal}</span>
                                <span className="italic text-slate-200">{msg.originalText}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.selectionContext?.text && (
                          <div className="bg-[#121214] border border-[#222226] border-l-2 border-l-[#6366f1] rounded-xs px-2.5 py-1.5 text-[0.6875rem] text-slate-300 space-y-1">
                            <div className="flex items-center gap-1.5 text-[0.625rem] text-indigo-300 font-medium">
                              <Quote className="w-3 h-3 text-[#6366f1] shrink-0" />
                              <span>{t.selectionContextLabel}</span>
                              {msg.selectionContext.fileName && (
                                <span className="font-mono text-slate-400 truncate max-w-[160px]">
                                  {msg.selectionContext.fileName}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-300/90 whitespace-pre-wrap line-clamp-3 font-sans leading-snug">
                              {msg.selectionContext.text}
                            </div>
                          </div>
                        )}

                        <div className="whitespace-pre-wrap font-sans space-y-1 select-text cursor-text selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)]">
                          {renderFormattedMessageText(msg.text)}
                        </div>
                      </div>

                      <div className="w-6 h-6 rounded-md bg-[#121214] border border-[#222226] flex items-center justify-center text-slate-200 text-xs shrink-0 mt-0.5 select-none shadow-xs">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )
                )}
              </>
            )}

              {/* Minimalist AI Thinking State (Zero decorative icons, subtle shimmer) */}
              {isAiLoading && !messages.some((m) => m.isStreaming) && (
                <div className="py-1 px-1 select-none">
                  <AIThinkingIndicator isThinking={true} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Scroll to Bottom Button */}
        {isScrolledUp && (
          <button
            type="button"
            onClick={() => {
              isUserScrolledUpRef.current = false;
              setIsScrolledUp(false);
              scrollToChatBottom(true);
            }}
            className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121214]/95 border border-[#222226] text-[0.6875rem] text-slate-300 hover:text-white shadow-lg hover:border-[#6366f1] transition-colors cursor-pointer group select-none"
          >
            <ArrowDown className="w-3 h-3 text-[#6366f1] group-hover:translate-y-0.5 transition-transform" />
            <span>{t.scrollDown}</span>
          </button>
        )}
      </div>

      {/* Persistently Mounted Bottom UniversalPromptInput across the Full Width */}
      <UniversalPromptInput
        className="w-full shrink-0 border-t border-[#222226]"
        chatInput={chatInput}
        onChatInputChange={onChatInputChange}
        chatAttachments={chatAttachments}
        onRemoveAttachment={onRemoveAttachment}
        onAddAttachment={onAddAttachment}
        onAddFiles={onAddFiles}
        onSendMessage={onSendMessage}
        isAiLoading={isAiLoading}
        editorSelection={editorSelection}
        onClearEditorSelection={onClearEditorSelection}
        allMentionItems={allMentionItems}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        selectedMultiModels={selectedMultiModels}
        onSelectMultiModels={onSelectMultiModels}
        mode={mode}
        onModeChange={onModeChange}
        availableChatModels={availableChatModels}
        provider={provider}
        onSelectProvider={onSelectProvider}
        onRefreshOllama={onRefreshOllama}
        localEndpointAddress={localEndpointAddress}
        onSelectDefaultLocalTag={onSelectDefaultLocalTag}
        onOpenRoleModal={onOpenRoleModal}
        onOpenSettings={onOpenSettings}
        apiKeys={apiKeys}
        ghostWriterLevel={ghostWriterLevel}
        ghostTargetEnglish={ghostTargetEnglish}
        ghostTemplateText={ghostTemplateText}
        ghostUserInput={ghostUserInput}
        ghostShowFullAnswer={ghostShowFullAnswer}
        isGhostLoading={isGhostLoading}
        onGenerateGhostText={onGenerateGhostText}
        onGhostUserInputChange={onGhostUserInputChange}
        onGhostInputKeyDown={onGhostInputKeyDown}
        onSendGhostMessage={onSendGhostMessage}
        onSetGhostTargetEnglish={onSetGhostTargetEnglish}
        onSetGhostTemplateText={onSetGhostTemplateText}
        onSetGhostUserInput={onSetGhostUserInput}
        onSetGhostShowFullAnswer={onSetGhostShowFullAnswer}
        onToast={onToast}
        onFocus={onInputFocus}
        chatInputRef={chatInputRef}
      />
    </div>
  );
};
