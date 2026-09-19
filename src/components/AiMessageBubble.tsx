import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { renderMarkdownToHtml, cleanAiContentText, sanitizeHtml } from '../utils/markdownParser';
import type { ChatMessage } from '../types';

interface AiMessageBubbleProps {
  msg: ChatMessage;
  selectedModel: string;
  onCopy: (text: string) => void;
  onDiff: (text: string, model?: string) => void;
  onSendToEditor: (text: string) => void;
  onActionChipClick?: (chipType: 'gemini-key' | 'ollama-guide' | 'demo-knowledge') => void;
  onOpenSettings?: (tab?: 'ai-engine') => void;
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
  onCopy,
  onDiff,
  onSendToEditor,
  onActionChipClick,
  onOpenSettings,
}) => {
  // Micro Fade-In transition: initial opacity-0 translate-y-1 -> rendered opacity-100 translate-y-0
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const cleanedText = useMemo(() => cleanAiContentText(msg.text), [msg.text]);

  // Memoized rendered markdown HTML for maximum streaming performance
  const renderedHtml = useMemo(() => {
    return renderAiMessageHtml(msg.text, msg.isStreaming);
  }, [msg.text, msg.isStreaming]);

  return (
    <div
      className={`flex gap-2.5 items-start select-text transition-all duration-200 ease-out ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      }`}
    >
      {/* Minimalist flat bot icon indicator without bulky box or border */}
      <div className="w-5 h-5 flex items-center justify-center text-indigo-400 text-xs shrink-0 mt-0.5 select-none bg-transparent border-0">
        <Bot className={`w-4 h-4 ${msg.isStreaming ? 'animate-pulse text-indigo-400' : 'text-indigo-400/90'}`} />
      </div>

      {/* AI Response Container: completely removed box, border, and background color per user request */}
      <div className="flex-1 text-xs leading-relaxed space-y-1.5 select-text cursor-text bg-transparent border-0 shadow-none text-slate-200 py-0.5">
        {/* Model header & action toolbar - flat, borderless design */}
        <div className="flex items-center justify-between pb-1 select-none">
          <span className="font-semibold text-[#6366f1] flex items-center text-xs">
            <span className="text-[0.6875rem] text-indigo-300 font-mono font-medium flex items-center gap-1.5">
              {msg.model || selectedModel}
              {msg.isStreaming && (
                <span className="text-[0.625rem] text-indigo-400/90 font-sans font-normal flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                  답변 작성 중
                </span>
              )}
            </span>
          </span>

          <div className="flex items-center gap-1">
            {/* Copy button */}
            <button
              type="button"
              onClick={() => onCopy(cleanedText)}
              disabled={msg.isStreaming && !msg.text}
              className="p-1 rounded-xs hover:bg-[#18181b] text-slate-400 hover:text-slate-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="클립보드에 복사 (아이콘 제외 순수 텍스트)"
            >
              <Copy className="w-3 h-3" />
            </button>
            {/* Diff compare button */}
            <button
              type="button"
              onClick={() => onDiff(cleanedText, msg.model)}
              disabled={msg.isStreaming}
              className="p-1 rounded-xs hover:bg-[#18181b] text-emerald-400 hover:text-emerald-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="현재 문서와 차이 비교 및 스마트 반영"
            >
              <GitCompare className="w-3 h-3" />
            </button>
            {/* Send to editor button */}
            <button
              type="button"
              onClick={() => onSendToEditor(cleanedText)}
              disabled={msg.isStreaming}
              className="p-1 rounded-xs hover:bg-[#18181b] text-[#6366f1] hover:text-[#818cf8] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="에디터로 내용 전송 (아이콘 제외 순수 텍스트)"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Message Markdown Content: Uniform Single Font Size with Bold-Only Headings & Smooth Stream Transition */}
        <div
          className={`markdown-chat-content font-sans text-xs leading-relaxed select-text cursor-text ${
            msg.isStreaming ? 'stream-text-active' : ''
          }`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderedHtml) }}
        />

        {/* Initial Action Chips (온보딩 인터랙티브 칩) */}
        {msg.showOnboardingChips && onActionChipClick && (
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-col gap-2 select-none">
            <div className="text-[0.6875rem] font-semibold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>빠른 온보딩 인터랙션 가이드</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onActionChipClick('gemini-key')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#121214] hover:bg-[#18181b] border border-[#222226] hover:border-[#6366f1]/80 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Gemini API 키 등록 방법</span>
              </button>
              <button
                type="button"
                onClick={() => onActionChipClick('ollama-guide')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#121214] hover:bg-[#18181b] border border-[#222226] hover:border-[#6366f1]/80 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Ollama 로컬 AI 연결 가이드</span>
              </button>
              <button
                type="button"
                onClick={() => onActionChipClick('demo-knowledge')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#121214] hover:bg-[#18181b] border border-[#222226] hover:border-[#6366f1]/80 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                <span>가상 지식 정리 체험</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons for Onboarding responses */}
        {msg.actionButtons && msg.actionButtons.length > 0 && !msg.isStreaming && (
          <div className="mt-2.5 pt-2 border-t border-[#222226] flex flex-wrap gap-2 select-none">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-medium transition cursor-pointer shadow-xs active:scale-[0.98] ${
                  btn.actionType === 'insert-editor'
                    ? 'bg-[#6366f1] hover:bg-[#4f46e5] text-white border border-[#6366f1]'
                    : 'bg-[#121214] hover:bg-[#18181b] border border-[#222226] hover:border-[#6366f1] text-indigo-300 hover:text-white'
                }`}
              >
                {btn.actionType === 'open-settings-ai' ? (
                  <Settings className="w-3.5 h-3.5" />
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
          <div className="mt-2.5 pt-2 border-t border-[#222226]/80 flex flex-col gap-1.5 select-none">
            <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-[#38bdf8]">
              <Globe className="w-3 h-3 text-[#38bdf8]" />
              <span>Google 실시간 웹 검색 출처 ({msg.groundingSources.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {msg.groundingSources.map((source, sIdx) => (
                <a
                  key={sIdx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[0.625rem] px-2 py-0.5 rounded bg-[#1e293b]/70 hover:bg-[#1e293b] text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                  title={source.url}
                >
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                  <span className="truncate max-w-[220px]">{source.title || source.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Token Accounting & Inference Cost */}
        {msg.tokens && (
          <div className="mt-2 text-[0.5625rem] text-slate-400 flex items-center gap-2 font-mono select-none">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              {msg.tokens.total} 토큰 (입력 {msg.tokens.prompt} / 생성 {msg.tokens.completion})
            </span>
            {msg.tokens.costEstimate && (
              <span className="text-emerald-400 font-semibold">• {msg.tokens.costEstimate}</span>
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
    prevProps.msg.showOnboardingChips === nextProps.msg.showOnboardingChips &&
    prevProps.msg.groundingSources === nextProps.msg.groundingSources &&
    prevProps.msg.tokens === nextProps.msg.tokens &&
    prevProps.msg.actionButtons === nextProps.msg.actionButtons
  );
});
