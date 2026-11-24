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
  SessionRewriteHistoryItem,
} from '../../types';
import { AiMessageBubble } from '../AiMessageBubble';
import { WebLlmBanner } from '../WebLlmBanner';
import { UniversalPromptInput } from './UniversalPromptInput';
import { AIThinkingIndicator } from './AIThinkingIndicator';
import { WEB_LLM_MODEL_ID, WEB_LLM_MODEL_DISPLAY_NAME } from '../../utils/webllmService';

import { useTranslation } from '../../context/LanguageContext';
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
      className={`w-10 shrink-0 bg-[var(--bg-surface)] season-shell border-r border-white/[0.06] flex flex-col items-center py-3 justify-between z-20 select-none transition-all duration-200 h-full ${className}`}
    >
      {/* Top item: Clean ghost button with MessageSquare */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          id="chat-rail-open-btn"
          onClick={onOpen}
          className="p-2 rounded-md hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          title={t.open}
          aria-label={t.open}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom item: Active engine status indicator dot */}
      <div className="flex flex-col items-center gap-2 pb-1" title={t.engineActive}>
        <span
          className={`w-2 h-2 rounded-full ${
            isEngineActive ? 'bg-[var(--secondary-accent)]' : 'bg-[#475569]'
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
  selectedContext?: string | null;
  editorSelection?: EditorSelectionContext | null;
  onClearEditorSelection?: () => void;

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
  selectedContext,
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
  className = '',
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { t: dict, language } = useTranslation();
  const t = dict.core.chat;
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

      {/* Collapsible Session-Scoped Rewrite with AI History View */}
      {rewriteHistoryItems.length > 0 && (
        <div
          id="chat-rewrite-history"
          className="shrink-0 bg-[var(--bg-editor)]/80 border-b border-white/[0.06] px-3 py-1.5 flex flex-col gap-1.5 select-none z-10"
        >
          <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
            <button
              type="button"
              id="chat-rewrite-history-toggle"
              onClick={() => setIsRewriteHistoryOpen((prev) => !prev)}
              className="flex items-center gap-1.5 min-w-0 flex-1 text-left hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <History className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
              <span className="font-medium text-[var(--text-main)] truncate">{t.rewriteHistoryTitle}</span>
              <span className="text-[0.625rem] font-mono text-[var(--text-muted)] shrink-0">
                · {t.rewriteHistoryCount(rewriteHistoryItems.length)}
              </span>
              {isRewriteHistoryOpen ? (
                <ChevronUp className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
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
                className="h-5 px-2 rounded-md bg-[var(--bg-elevated)] hover:bg-white/[0.08] border border-white/[0.08] text-[var(--text-muted)] hover:text-amber-200 text-[0.625rem] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
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
                    className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-md px-2.5 py-1.5 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[0.625rem]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="font-mono text-[var(--text-muted)] shrink-0">{item.timestamp}</span>
                        <span className="text-[var(--text-tertiary)] shrink-0">·</span>
                        <span className="text-[var(--text-muted)] shrink-0">
                          {item.source === 'inline' ? t.rewriteSourceInline : t.rewriteSourceChat}
                        </span>
                        {item.fileName && (
                          <span className="font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded truncate max-w-[100px]">
                            {item.fileName}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium shrink-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isReverted
                                ? 'bg-amber-400'
                                : isApplied
                                ? 'bg-[var(--secondary-accent)]'
                                : 'bg-[#475569]'
                            }`}
                          />
                          <span
                            className={
                              isReverted
                                ? 'text-amber-300'
                                : isApplied
                                ? 'text-[var(--secondary-accent)]'
                                : 'text-[var(--text-muted)]'
                            }
                          >
                            {isReverted
                              ? t.rewriteStatusReverted
                              : isApplied
                              ? t.rewriteStatusApplied
                              : t.rewriteStatusReady}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.msgId && (
                          <button
                            type="button"
                            onClick={() => scrollToThreadMessage(item.msgId!)}
                            className="text-[var(--accent-primary)] hover:opacity-85 transition-colors cursor-pointer"
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
                          className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                        >
                          {t.toggleRewriteCompare}
                        </button>
                      </div>
                    </div>

                    {item.prompt && (
                      <div className="text-[0.625rem] text-[var(--accent-primary)] truncate font-sans">
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
                      className="text-left text-[0.6875rem] text-[var(--text-muted)] font-sans cursor-pointer hover:text-[var(--text-main)] transition-colors"
                    >
                      <div className={isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}>
                        <span className="text-[var(--text-tertiary)] mr-1">{t.rewriteOriginalLabel}:</span>
                        <span className="text-[var(--text-muted)]">
                          {isExpanded ? item.originalText : item.originalText.replace(/\s+/g, ' ')}
                        </span>
                      </div>
                      {isExpanded && item.rewrittenText && (
                        <div className="mt-1 pt-1 border-t border-white/[0.06] whitespace-pre-wrap break-words">
                          <span className="text-[var(--accent-primary)] mr-1">{t.rewriteResultLabel}:</span>
                          <span className="text-[var(--text-main)]">{item.rewrittenText}</span>
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
                              className="h-5 px-2 rounded-md bg-[var(--bg-elevated)] hover:bg-white/[0.08] border border-white/[0.08] text-[var(--text-muted)] hover:text-amber-200 text-[0.625rem] font-medium flex items-center gap-1 transition-colors cursor-pointer"
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
                              className="h-5 px-2 rounded-md bg-[#F1F5F9] hover:bg-white text-[#0F172A] text-[0.625rem] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Check className="w-2.5 h-2.5" />
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
              className={`absolute left-full top-3 w-4 h-12 flex items-center justify-center rounded-r-md border border-l-0 border-white/[0.06] transition-colors duration-200 cursor-pointer hover:w-5 ${
                isProjectDrawerOpen
                  ? 'bg-[var(--bg-editor)] text-[var(--accent-primary)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)]'
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
                    <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-[var(--accent-primary)]/30 flex items-center justify-center mb-4 text-[var(--accent-primary)]">
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--text-main)] mb-1">
                      {t.downloadTitle}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed break-keep">
                      {t.downloadDescription}
                    </p>

                    {/* 0~100% 게이지 바 */}
                    <div className="w-full bg-[var(--bg-editor)] border border-white/[0.06] rounded-full h-2 overflow-hidden mb-2.5">
                      <div
                        className="bg-[var(--accent-primary)] h-full w-full rounded-full origin-left transition-transform duration-200 ease-out"
                        style={{ transform: `scaleX(${Math.max(0.02, Math.min(1, (webllmProgress.progressPercent ?? 0) / 100))})` }}
                      />
                    </div>

                    <div className="flex items-center justify-between w-full text-xs text-[var(--text-muted)] font-mono">
                      <span className="truncate max-w-[75%] text-left text-[11px]" title={webllmProgress.progressText}>
                        {webllmProgress.progressText || t.downloadProgress}
                      </span>
                      <span className="font-bold text-[var(--accent-primary)] text-xs shrink-0">
                        {webllmProgress.progressPercent ?? 0}%
                      </span>
                    </div>
                    <div className="mt-3 text-[10px] text-[var(--text-tertiary)] font-mono">
                      {t.memoryRecommendation}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[360px] h-full text-center px-4 py-16 select-none">
                    <p className="text-sm font-medium text-[var(--text-main)]">
                      {t.startConversation}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs leading-relaxed">
                      {t.supportedTasks}
                    </p>
                  </div>
                )
              ) : (
                <>
                  {webllmProgress?.isLoading && (
                    <div className="p-3 bg-[var(--bg-editor)] border border-white/[0.06] rounded-lg select-none mb-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5 text-[var(--text-main)] font-medium">
                          <Loader2 className="w-3.5 h-3.5 text-[var(--accent-primary)] animate-spin" />
                          {t.downloading}
                        </span>
                        <span className="font-mono font-bold text-[var(--accent-primary)]">
                          {webllmProgress.progressPercent ?? 0}%
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-main)] border border-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[var(--accent-primary)] h-full w-full rounded-full origin-left transition-transform duration-200 ease-out"
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
                      <div className="rounded-lg p-3 text-xs leading-relaxed space-y-2 select-text cursor-text bg-[var(--bg-elevated)] border border-white/[0.06] text-[var(--text-main)] max-w-[85%]">
                        {/* Attachment Rendering */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5 border-b border-white/[0.06] pb-1.5 select-none">
                            {msg.attachments.map((att) => (
                              <div
                                key={att.id}
                                className="rounded-md overflow-hidden border border-white/[0.06] bg-[var(--bg-surface)] p-1 flex items-center gap-1.5 max-w-full"
                              >
                                {att.type === 'image' && att.url ? (
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="max-h-36 rounded border border-white/[0.06] object-cover"
                                  />
                                ) : att.type === 'link' ? (
                                  <div className="flex items-center gap-1.5 px-1 text-[0.6875rem] text-[var(--text-main)] font-mono">
                                    <Link2 className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                                    <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                                    <span className="text-[0.625rem] text-[var(--text-muted)]">({att.size})</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-1 text-[0.6875rem] text-[var(--text-main)] font-mono">
                                    <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                                    <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                                    <span className="text-[0.625rem] text-[var(--text-muted)]">({att.size})</span>
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
                              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--secondary-accent)] text-[0.625rem]">
                                <Ghost className="w-3 h-3 text-[var(--secondary-accent)]" />
                                Ghost Writer {msg.ghostWriterLevel}%
                              </span>
                              <span className="text-[0.625rem] text-[var(--accent-primary)] font-mono flex items-center gap-1">
                                <Globe className="w-3 h-3 text-[var(--accent-primary)]" />
                                {t.englishPrompt}
                              </span>
                            </div>
                            {msg.originalText && msg.originalText !== msg.text && (
                              <div className="text-[0.6875rem] text-[var(--text-muted)] flex items-start gap-1 font-sans pt-0.5">
                                <span className="font-medium text-[var(--text-tertiary)] shrink-0">{t.koreanOriginal}</span>
                                <span className="italic text-[var(--text-main)]">{msg.originalText}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.selectionContext?.text && (
                          <div className="bg-[var(--bg-editor)] border border-white/[0.06] rounded-md px-2.5 py-1.5 text-[0.6875rem] text-[var(--text-muted)] space-y-1">
                            <div className="flex items-center gap-1.5 text-[0.625rem] text-[var(--text-main)] font-medium">
                              <Quote className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
                              <span>{t.selectionContextLabel}</span>
                              {msg.selectionContext.fileName && (
                                <span className="font-mono text-[var(--text-muted)] truncate max-w-[160px]">
                                  {msg.selectionContext.fileName}
                                </span>
                              )}
                            </div>
                            <div className="text-[var(--text-muted)] whitespace-pre-wrap line-clamp-3 font-sans leading-snug">
                              {msg.selectionContext.text}
                            </div>
                          </div>
                        )}

                        <div className="whitespace-pre-wrap font-sans space-y-1 select-text cursor-text selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)]">
                          {renderFormattedMessageText(msg.text)}
                        </div>
                      </div>

                      <div className="w-6 h-6 rounded-md bg-[var(--bg-editor)] border border-white/[0.06] flex items-center justify-center text-[var(--text-muted)] text-xs shrink-0 mt-0.5 select-none">
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
            className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-white/[0.08] text-[0.6875rem] text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-lg hover:border-[var(--accent-primary)]/50 transition-colors cursor-pointer group select-none"
          >
            <ArrowDown className="w-3 h-3 text-[var(--accent-primary)] group-hover:translate-y-0.5 transition-transform" />
            <span>{t.scrollDown}</span>
          </button>
        )}
      </div>

      {/* Persistently Mounted Bottom UniversalPromptInput across the Full Width */}
      <UniversalPromptInput
        className="w-full shrink-0 border-t border-white/[0.06]"
        chatInput={chatInput}
        onChatInputChange={onChatInputChange}
        chatAttachments={chatAttachments}
        onRemoveAttachment={onRemoveAttachment}
        onAddAttachment={onAddAttachment}
        onAddFiles={onAddFiles}
        onSendMessage={onSendMessage}
        isAiLoading={isAiLoading}
        selectedContext={selectedContext}
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
