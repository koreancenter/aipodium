/**
 * ChatPanel Component (Phase 3.1 Layout Deconstruction)
 * Encapsulates:
 * - Real-time streaming AI message list view
 * - Auto-scroll management with user scroll-up lock/release
 * - Bottom-Flush UniversalPromptInput
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Bot,
  User,
  ArrowDown,
  Link2,
  FileText,
  Ghost,
  Globe
} from 'lucide-react';
import type { ChatMessage, ChatAttachment, GhostWriterLevel, MentionItem } from '../../types';
import { AiMessageBubble } from '../AiMessageBubble';
import { WebLlmBanner } from '../WebLlmBanner';
import { UniversalPromptInput } from './UniversalPromptInput';
import { WEB_LLM_MODEL_ID, WEB_LLM_MODEL_DISPLAY_NAME } from '../../utils/webllmService';

export interface ChatPanelProps {
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

  // Message Actions
  onSendToEditor: (text: string) => void;
  onDiff: (text: string, model?: string) => void;
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
  onSelectProvider: (provider: any) => void;
  onRefreshOllama?: () => Promise<void>;
  localEndpointAddress?: string;
  onSelectDefaultLocalTag?: (tag: string) => void;
  onOpenRoleModal?: () => void;
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
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
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
  onSendToEditor,
  onDiff,
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
  onSelectProvider,
  onRefreshOllama,
  localEndpointAddress,
  onSelectDefaultLocalTag,
  onOpenRoleModal,
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
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const [isScrolledUp, setIsScrolledUp] = useState<boolean>(false);

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

  return (
    <div className={`flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden h-full ${className}`}>
      {/* Scrollable Message List View */}
      <div
        id="chat-messages"
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 overflow-y-auto p-3 select-text custom-scrollbar"
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
            {/* Active WebLLM progress banner if downloading */}
            {webllmProgress?.isLoading && !isWebLlmBannerDismissed && (
              <WebLlmBanner
                isSupported={webllmProgress.isSupported}
                isLoading={webllmProgress.isLoading}
                isReady={webllmProgress.isReady}
                progressText={webllmProgress.progressText}
                progressPercent={webllmProgress.progressPercent}
                onStartDownload={onStartWebLlmDownload || (() => {})}
                onSelectModel={() => {
                  onSelectModel(WEB_LLM_MODEL_ID);
                  onSelectProvider('local-pc');
                  onToast('✓ Qwen2.5-0.5B 브라우저 로컬 AI가 선택되었습니다.');
                }}
                onDismiss={onDismissWebLlmBanner || (() => {})}
              />
            )}

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[360px] h-full text-center px-4 py-16 select-none">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-3 text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-zinc-300">
                  AI 어시스턴트와 대화를 시작하거나 프롬프트를 입력하세요
                </p>
                <p className="text-xs text-zinc-500 mt-1.5 max-w-xs leading-relaxed">
                  질문, 문서 요약, 코드 생성 및 번역 작업을 지원합니다
                </p>
              </div>
            ) : (
              messages.map((msg) =>
                msg.sender === 'ai' ? (
                  <AiMessageBubble
                    key={msg.id}
                    msg={msg}
                    selectedModel={
                      selectedModel === WEB_LLM_MODEL_ID
                        ? WEB_LLM_MODEL_DISPLAY_NAME
                        : isOnboardingMode
                        ? 'AI 지식 비서'
                        : selectedModel
                    }
                    onCopy={(text) => {
                      navigator.clipboard.writeText(text);
                      onToast('✓ AI 답변 내용이 클립보드에 복사되었습니다.');
                    }}
                    onDiff={(text, model) => {
                      onDiff(text, model);
                    }}
                    onSendToEditor={(text) => onSendToEditor(text)}
                    onActionChipClick={(chipType) => onActionChipClick?.(chipType)}
                    onOpenSettings={(tab) => onOpenSettings?.(tab)}
                    onTranslate={onTranslate}
                  />
                ) : (
                  <div key={msg.id} className="flex gap-2.5 items-start select-text justify-end">
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
                              영문 프롬프트
                            </span>
                          </div>
                          {msg.originalText && msg.originalText !== msg.text && (
                            <div className="text-[0.6875rem] text-slate-300 flex items-start gap-1 font-sans pt-0.5">
                              <span className="font-medium text-slate-400 shrink-0">🇰🇷 한국어 원문:</span>
                              <span className="italic text-slate-200">{msg.originalText}</span>
                            </div>
                          )}
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
              )
            )}

            {/* Preparation Indicator */}
            {isAiLoading && !messages.some((m) => m.isStreaming) && (
              <div className="flex gap-2.5 items-center py-1 bg-transparent border-0 select-none">
                <div className="w-5 h-5 flex items-center justify-center text-indigo-400 text-xs shrink-0 select-none bg-transparent border-0">
                  <Bot className="w-4 h-4 animate-pulse text-indigo-400" />
                </div>
                <div className="bg-transparent border-0 px-1 py-1 text-xs text-slate-400 flex items-center gap-2 font-sans shadow-none">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-slate-400 text-xs">
                    {isOnboardingMode
                      ? 'AI 지식 비서가 답변을 준비하고 있습니다...'
                      : 'AI 모델이 응답을 준비하고 있습니다...'}
                  </span>
                </div>
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
          className="absolute bottom-16 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121214]/95 border border-[#222226] text-[0.6875rem] text-slate-300 hover:text-white shadow-lg hover:border-[#6366f1] transition-all cursor-pointer group select-none"
        >
          <ArrowDown className="w-3 h-3 text-[#6366f1] group-hover:translate-y-0.5 transition-transform" />
          <span>아래로 스크롤</span>
        </button>
      )}

      {/* Bottom-Flush UniversalPromptInput */}
      <UniversalPromptInput
        chatInput={chatInput}
        onChatInputChange={onChatInputChange}
        chatAttachments={chatAttachments}
        onRemoveAttachment={onRemoveAttachment}
        onAddAttachment={onAddAttachment}
        onAddFiles={onAddFiles}
        onSendMessage={onSendMessage}
        isAiLoading={isAiLoading}
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
