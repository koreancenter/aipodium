import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bot,
  Copy,
  GitCompare,
  ArrowRight,
  Sparkles,
  Key,
  Terminal,
  FileText,
  Settings,
  Globe,
  ExternalLink,
  Zap,
  Languages,
  RotateCw,
  X,
  History,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { renderMarkdownToHtml, cleanAiContentText, sanitizeHtml } from '../utils/markdownParser';
import type { ChatMessage } from '../types';
import { aiClient } from '../services/aiPodiumIntegration';
import { AIThinkingIndicator } from './chat/AIThinkingIndicator';
import { getCoreTranslations } from '../locales/coreLocale';
import { getActiveLanguage, type AppLanguage } from '../locales/language';


interface AiMessageBubbleProps {
  msg: ChatMessage;
  selectedModel: string;
  language?: AppLanguage;
  onCopy: (text: string) => void;
  onDiff: (text: string, model?: string) => void;
  onSendToEditor: (text: string) => void;
  onApplyRewrite?: (msgId: string, rewrittenText: string) => void;
  onRevertRewrite?: (msgId: string, previousText?: string) => void;
  onActionChipClick?: (chipType: 'gemini-key' | 'ollama-guide' | 'demo-knowledge') => void;
  onOpenSettings?: (tab?: 'ai-engine') => void;
  onTranslate?: (msgId: string, text: string) => Promise<string> | void;
}

/**
 * Prepares streaming text for markdown parsing by auto-closing incomplete code fences.
 */
function prepareStreamingMarkdown(text: string, isStreaming?: boolean): string {
  if (!isStreaming || !text) return text;
  const fenceMatches = text.match(/```/g);
  if (fenceMatches && fenceMatches.length % 2 === 1) {
    return text + '\n```';
  }
  return text;
}

/**
 * Renders markdown HTML with single font size (bold-only headings) and no decorative icons.
 * Injects a real-time smooth breathing caret at the end of the text while streaming.
 */
function renderAiMessageHtml(text: string, isStreaming?: boolean): string {
  const cursorHtml = `<span class="stream-caret-pulse" aria-hidden="true"></span>`;
  
  if (!text && isStreaming) {
    return cursorHtml;
  }
  
  // Strip decorative emojis and icons so they never appear in chat or editor
  const cleanText = cleanAiContentText(text);
  const safeText = prepareStreamingMarkdown(cleanText, isStreaming);
  // Render with isChat: true to enforce single font size with bold headings
  let html = renderMarkdownToHtml(safeText, { isChat: true });
  
  if (isStreaming) {
    // Find the last closing tag to place cursor inline at the end of the last word/line
    const lastClosingTagMatch = html.match(/(<\/(p|li|h[1-6]|td|pre|code|div|blockquote|span)>)(?!.*<\/(p|li|h[1-6]|td|pre|code|div|blockquote|span)>)/i);
    if (lastClosingTagMatch && lastClosingTagMatch.index !== undefined) {
      html = html.slice(0, lastClosingTagMatch.index) + cursorHtml + html.slice(lastClosingTagMatch.index);
    } else {
      html += cursorHtml;
    }
  }
  
  return sanitizeHtml(html);
}

export const AiMessageBubble: React.FC<AiMessageBubbleProps> = React.memo(({
  msg,
  selectedModel,
  language,
  onCopy,
  onDiff,
  onSendToEditor,
  onApplyRewrite,
  onRevertRewrite,
  onActionChipClick,
  onOpenSettings,
  onTranslate,
}) => {
  const chatLabels = getCoreTranslations(language || getActiveLanguage()).chat;
  // Micro Fade-In transition: initial opacity-0 translate-y-1 -> rendered opacity-100 translate-y-0
  const [isMounted, setIsMounted] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOnlyTranslation, setShowOnlyTranslation] = useState(false);
  const [isTranslationHidden, setIsTranslationHidden] = useState(false);
  const [localTranslatedText, setLocalTranslatedText] = useState(msg.translatedText || '');
  const [isRewriteCompareOpen, setIsRewriteCompareOpen] = useState(false);

  useEffect(() => {
    if (msg.translatedText) {
      setLocalTranslatedText(msg.translatedText);
    }
  }, [msg.translatedText]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const cleanedText = useMemo(() => cleanAiContentText(msg.text), [msg.text]);

  const activeTranslation = localTranslatedText || msg.translatedText;

  const onToggleTranslationView = useCallback(() => {
    if (showOnlyTranslation) {
      setShowOnlyTranslation(false);
    } else {
      setIsTranslationHidden((prev) => !prev);
    }
  }, [showOnlyTranslation]);

  const handleToggleTranslation = useCallback(async () => {
    if (activeTranslation) {
      if (isTranslationHidden) {
        setIsTranslationHidden(false);
      } else {
        setShowOnlyTranslation((prev) => !prev);
      }
      return;
    }

    // Trigger translation
    setIsTranslating(true);
    try {
      if (onTranslate) {
        const res = await onTranslate(msg.id, cleanedText);
        if (typeof res === 'string' && res.trim()) {
          setLocalTranslatedText(res);
          setIsTranslationHidden(false);
        }
      } else {
        const translated = await aiClient.translateText(cleanedText, 'ko');
        if (translated) {
          setLocalTranslatedText(translated);
          setIsTranslationHidden(false);
        }
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [activeTranslation, isTranslationHidden, onTranslate, msg.id, cleanedText]);

  // Memoized rendered markdown HTML for maximum streaming performance
  const renderedHtml = useMemo(() => {
    return renderAiMessageHtml(msg.text, msg.isStreaming);
  }, [msg.text, msg.isStreaming]);

  const renderedTranslatedHtml = useMemo(() => {
    if (!activeTranslation) return '';
    return renderMarkdownToHtml(cleanAiContentText(activeTranslation), { isChat: true });
  }, [activeTranslation]);

  return (
    <div
      className={`flex gap-2.5 items-start select-text transition-all duration-200 ease-out ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      }`}
    >
      {/* Minimalist flat bot icon indicator without bulky box or border */}
      <div className="w-5 h-5 flex items-center justify-center text-[var(--accent-primary)] text-xs shrink-0 mt-0.5 select-none bg-transparent border-0">
        <Bot className={`w-4 h-4 ${msg.isStreaming ? 'animate-pulse text-[var(--accent-primary)]' : 'text-[var(--accent-primary)]/80'}`} />
      </div>

      {/* AI Response Container: completely removed box, border, and background color per user request */}
      <div className="flex-1 text-xs leading-relaxed space-y-1.5 select-text cursor-text bg-transparent border-0 shadow-none text-[var(--text-main)] py-0.5">
        {/* Model header & action toolbar - flat, borderless design */}
        <div className="flex items-center justify-between pb-1 select-none">
          <span className="font-semibold text-[var(--accent-primary)] flex items-center text-xs">
            <span className="text-[0.6875rem] text-[var(--accent-primary)] font-mono font-medium flex items-center gap-1.5">
              {msg.model || selectedModel}
              {msg.isStreaming && (
                <span className="text-[0.625rem] text-[var(--text-muted)] font-sans font-normal flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-ping"></span>
                  답변 작성 중
                </span>
              )}
            </span>
          </span>

          <div className="flex items-center gap-1">
            {/* Inline One-Click Translation button (Languages icon or subtle pulse loader) */}
            {isTranslating ? (
              <span className="flex items-center gap-1 text-[var(--accent-primary)] animate-pulse text-[11px] px-1 select-none" title="번역 중...">
                <Languages className="w-3 h-3 animate-spin text-[var(--accent-primary)]" />
                <span className="font-mono text-[10px]">번역 중...</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleToggleTranslation}
                disabled={msg.isStreaming || isTranslating}
                className={`p-1 rounded transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTranslation && !isTranslationHidden
                    ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                    : 'hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title={
                  activeTranslation
                    ? showOnlyTranslation
                      ? '원문 보기'
                      : '한국어 번역 토글'
                    : '한국어로 실시간 번역'
                }
              >
                <Languages className="w-3 h-3" />
              </button>
            )}
            {/* Copy button */}
            <button
              type="button"
              onClick={() => onCopy(cleanedText)}
              disabled={msg.isStreaming && !msg.text}
              className="p-1 rounded hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="클립보드에 복사 (아이콘 제외 순수 텍스트)"
            >
              <Copy className="w-3 h-3" />
            </button>
            {/* Diff compare button */}
            <button
              type="button"
              onClick={() => onDiff(cleanedText, msg.model)}
              disabled={msg.isStreaming}
              className="p-1 rounded hover:bg-white/[0.06] text-[var(--secondary-accent)] hover:opacity-80 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="현재 문서와 차이 비교 및 스마트 반영"
            >
              <GitCompare className="w-3 h-3" />
            </button>
            {/* Send to editor button */}
            <button
              type="button"
              onClick={() => onSendToEditor(cleanedText)}
              disabled={msg.isStreaming}
              className="p-1 rounded hover:bg-white/[0.06] text-[var(--accent-primary)] hover:opacity-80 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="에디터로 내용 전송 (아이콘 제외 순수 텍스트)"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Thinking / Reasoning state indicator */}
        {(msg.isThinking || msg.thinking || (msg.isStreaming && !msg.text)) && (
          <div className="pb-1">
            <AIThinkingIndicator
              isThinking={Boolean(msg.isThinking || (msg.isStreaming && !msg.text))}
              thinkingContent={msg.thinking}
              durationSeconds={msg.thinkingDuration}
            />
          </div>
        )}

        {/* Message Markdown Content: Uniform Single Font Size with Bold-Only Headings & Smooth Stream Transition */}
        <div
          className={`markdown-chat-content font-sans text-xs leading-relaxed select-text cursor-text ${
            msg.isStreaming ? 'stream-text-active' : ''
          }`}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(showOnlyTranslation ? renderedTranslatedHtml : renderedHtml),
          }}
        />

        {/* Inline Rewrite with AI History & Quick Revert Card */}
        {msg.rewriteHistory && !msg.isStreaming && (
          <div
            data-rewrite-history-msg={msg.id}
            className="mt-2.5 bg-[var(--bg-editor)] border border-[var(--border-structural)] rounded-lg p-2.5 space-y-2 select-none"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <History className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                <span className="text-[0.6875rem] font-medium text-[var(--text-main)]">
                  {chatLabels.rewriteHistoryTitle}
                </span>
                {msg.rewriteHistory.fileName && (
                  <span className="text-[0.625rem] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded truncate max-w-[140px]">
                    {msg.rewriteHistory.fileName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[0.625rem] font-medium">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      msg.rewriteHistory.revertedAt
                        ? 'bg-amber-400'
                        : (msg.rewriteHistory.appliedCount || 0) > 0
                        ? 'bg-[var(--secondary-accent)]'
                        : 'bg-[var(--text-tertiary)]'
                    }`}
                  />
                  <span
                    className={
                      msg.rewriteHistory.revertedAt
                        ? 'text-amber-300'
                        : (msg.rewriteHistory.appliedCount || 0) > 0
                        ? 'text-[var(--secondary-accent)]'
                        : 'text-[var(--text-muted)]'
                    }
                  >
                    {msg.rewriteHistory.revertedAt
                      ? chatLabels.rewriteStatusReverted
                      : (msg.rewriteHistory.appliedCount || 0) > 0
                      ? chatLabels.rewriteStatusApplied
                      : chatLabels.rewriteStatusReady}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsRewriteCompareOpen((prev) => !prev)}
                className="flex items-center gap-1 text-[0.625rem] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <span>{chatLabels.toggleRewriteCompare}</span>
                {isRewriteCompareOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            {!isRewriteCompareOpen && (
              <div className="text-[0.6875rem] text-[var(--text-muted)] truncate font-sans">
                <span className="text-[var(--text-tertiary)] mr-1.5">{chatLabels.rewriteOriginalLabel}:</span>
                <span className="text-[var(--text-muted)]">
                  {msg.rewriteHistory.originalText.replace(/\s+/g, ' ')}
                </span>
              </div>
            )}

            {isRewriteCompareOpen && (
              <div className="space-y-1.5 pt-1 border-t border-[var(--border-structural)]">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-structural)] rounded-md p-2 space-y-1">
                  <div className="flex items-center justify-between text-[0.625rem] text-[var(--text-muted)] font-medium">
                    <span>{chatLabels.rewriteOriginalLabel}</span>
                    {onRevertRewrite && (
                      <button
                        type="button"
                        onClick={() => onRevertRewrite(msg.id, msg.rewriteHistory?.originalText)}
                        className="text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                      >
                        {chatLabels.restoreVersionAction}
                      </button>
                    )}
                  </div>
                  <div className="max-h-24 overflow-y-auto custom-scrollbar text-[0.6875rem] text-[var(--text-muted)] whitespace-pre-wrap break-words font-sans leading-relaxed select-text">
                    {msg.rewriteHistory.originalText}
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-structural)] rounded-md p-2 space-y-1">
                  <div className="flex items-center justify-between text-[0.625rem] text-[var(--accent-primary)] font-medium">
                    <span>{chatLabels.rewriteResultLabel}</span>
                    {onApplyRewrite && (
                      <button
                        type="button"
                        onClick={() =>
                          onApplyRewrite(
                            msg.id,
                            msg.rewriteHistory?.rewrittenText || cleanedText
                          )
                        }
                        className="text-[var(--accent-primary)] hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        {chatLabels.applyRewriteAction}
                      </button>
                    )}
                  </div>
                  <div className="max-h-24 overflow-y-auto custom-scrollbar text-[0.6875rem] text-[var(--text-main)] whitespace-pre-wrap break-words font-sans leading-relaxed select-text">
                    {msg.rewriteHistory.rewrittenText || cleanedText}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {onApplyRewrite && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyRewrite(msg.id, msg.rewriteHistory?.rewrittenText || cleanedText)
                  }
                  className="h-6 px-2.5 rounded-md bg-[#F1F5F9] hover:bg-white text-[#0F172A] text-[0.6875rem] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>{chatLabels.applyRewriteAction}</span>
                </button>
              )}
              {onRevertRewrite && (
                <button
                  type="button"
                  onClick={() => onRevertRewrite(msg.id, msg.rewriteHistory?.originalText)}
                  className="h-6 px-2.5 rounded-md bg-[var(--bg-elevated)] hover:bg-white/[0.08] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] text-[var(--text-muted)] hover:text-amber-200 text-[0.6875rem] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>{chatLabels.revertRewriteAction}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Expandable Translation Block beneath Original Text */}
        {activeTranslation && !isTranslationHidden && (
          <div className="mt-3 pt-2.5 border-t border-[var(--border-structural)] text-[var(--text-muted)] text-xs leading-relaxed bg-[var(--bg-editor)]/70 p-2.5 rounded-lg">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono mb-1.5 uppercase tracking-wider select-none">
              <span>🇰🇷 한국어 번역</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCopy(cleanAiContentText(activeTranslation))}
                  className="hover:text-[var(--text-main)] cursor-pointer"
                  title="번역본 복사"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => onSendToEditor(cleanAiContentText(activeTranslation))}
                  className="hover:opacity-80 text-[var(--accent-primary)] font-medium cursor-pointer"
                  title="번역본 에디터로 전송"
                >
                  에디터 전송
                </button>
                <button onClick={onToggleTranslationView} className="hover:text-[var(--text-main)] cursor-pointer">
                  {showOnlyTranslation ? '원문 보기' : '번역 접기'}
                </button>
              </div>
            </div>
            {!showOnlyTranslation ? (
              <div
                className="markdown-chat-content font-sans text-xs leading-relaxed select-text cursor-text text-[var(--text-main)]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderedTranslatedHtml) }}
              />
            ) : (
              <p className="whitespace-pre-wrap select-text text-[var(--text-main)]">{activeTranslation}</p>
            )}
          </div>
        )}

        {/* Initial Action Chips (온보딩 인터랙티브 칩) */}
        {msg.showOnboardingChips && onActionChipClick && (
          <div className="mt-2.5 pt-2 border-t border-[var(--border-structural)] flex flex-col gap-2 select-none">
            <div className="text-[0.6875rem] font-semibold text-[var(--text-main)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>빠른 온보딩 인터랙션 가이드</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onActionChipClick('gemini-key')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-editor)] hover:bg-[var(--bg-elevated)] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] text-[var(--text-main)] text-xs font-medium transition cursor-pointer active:scale-[0.98]"
              >
                <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Gemini API 키 등록 방법</span>
              </button>
              <button
                type="button"
                onClick={() => onActionChipClick('ollama-guide')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-editor)] hover:bg-[var(--bg-elevated)] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] text-[var(--text-main)] text-xs font-medium transition cursor-pointer active:scale-[0.98]"
              >
                <Terminal className="w-3.5 h-3.5 text-[var(--secondary-accent)] shrink-0" />
                <span>Ollama 로컬 AI 연결 가이드</span>
              </button>
              <button
                type="button"
                onClick={() => onActionChipClick('demo-knowledge')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-editor)] hover:bg-[var(--bg-elevated)] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] text-[var(--text-main)] text-xs font-medium transition cursor-pointer active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                <span>가상 지식 정리 체험</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons for Onboarding responses */}
        {msg.actionButtons && msg.actionButtons.length > 0 && !msg.isStreaming && (
          <div className="mt-2.5 pt-2 border-t border-[var(--border-structural)] flex flex-wrap gap-2 select-none">
            {msg.actionButtons.map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (btn.actionType === 'open-settings-ai') {
                    onOpenSettings?.('ai-engine');
                  } else if (btn.actionType === 'insert-editor') {
                    onSendToEditor(btn.payload || msg.text);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer active:scale-[0.98] ${
                  btn.actionType === 'insert-editor'
                    ? 'bg-[#F1F5F9] hover:bg-white text-[#0F172A]'
                    : 'bg-[var(--bg-editor)] hover:bg-[var(--bg-elevated)] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] text-[var(--text-main)]'
                }`}
              >
                {btn.actionType === 'open-settings-ai' ? (
                  <Settings className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Google Search Grounding Web Citations */}
        {msg.groundingSources && msg.groundingSources.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-[var(--border-structural)] flex flex-col gap-1.5 select-none">
            <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-[var(--accent-primary)]">
              <Globe className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>Google 실시간 웹 검색 출처 ({msg.groundingSources.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {msg.groundingSources.map((source, sIdx) => (
                <a
                  key={sIdx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[0.625rem] px-2 py-0.5 rounded bg-[var(--bg-editor)] hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] transition-colors"
                  title={source.url}
                >
                  <ExternalLink className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                  <span className="truncate max-w-[220px]">{source.title || source.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Token Accounting & Inference Cost */}
        {msg.tokens && (
          <div className="mt-2 text-[0.5625rem] text-[var(--text-muted)] flex items-center gap-2 font-mono select-none">
            <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              {msg.tokens.total} 토큰 (입력 {msg.tokens.prompt} / 생성 {msg.tokens.completion})
            </span>
            {msg.tokens.costEstimate && (
              <span className="text-[var(--secondary-accent)] font-semibold">• {msg.tokens.costEstimate}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.text === nextProps.msg.text &&
    prevProps.msg.isStreaming === nextProps.msg.isStreaming &&
    prevProps.selectedModel === nextProps.selectedModel &&
    prevProps.language === nextProps.language &&
    prevProps.msg.showOnboardingChips === nextProps.msg.showOnboardingChips &&
    prevProps.msg.groundingSources === nextProps.msg.groundingSources &&
    prevProps.msg.tokens === nextProps.msg.tokens &&
    prevProps.msg.actionButtons === nextProps.msg.actionButtons &&
    prevProps.msg.rewriteHistory === nextProps.msg.rewriteHistory
  );
});
