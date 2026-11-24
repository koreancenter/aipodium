/**
 * UniversalPromptInput Component
 * Bottom-Flush Flat Prompt Input with:
 * - Dual-pane Ghost Writer mode with Math.max height synchronization
 * - Drag-and-drop & paste file attachments
 * - @ Mention workspace reference autocompletion
 * - Inline Model Selector & provider controls
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Paperclip,
  Link2,
  AtSign,
  Send,
  RotateCw,
  Sparkles,
  Ghost,
  X,
  Info,
  Folder,
  FileText,
  Languages,
  Square,
  Globe,
  Quote
} from 'lucide-react';
import type { ChatAttachment, GhostWriterLevel, MentionItem, EditorSelectionContext } from '../../types';
import { InlineModelSelector } from '../InlineModelSelector';
import { LinkAttachmentInput } from '../LinkAttachmentInput';
import { useTranslation } from '../../context/LanguageContext';

export interface UniversalPromptInputProps {
  chatInput: string;
  onChatInputChange: (val: string) => void;
  chatAttachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAddAttachment: (att: ChatAttachment) => void;
  onAddFiles?: (files: FileList | File[]) => void;
  onSendMessage: (overrideText?: string, meta?: any) => void;
  isAiLoading: boolean;
  selectedContext?: string | null;
  editorSelection?: EditorSelectionContext | null;
  onClearEditorSelection?: () => void;

  // Workspace Mentions
  allMentionItems?: MentionItem[];

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
  onOpenSettings?: (tab?: string) => void;
  apiKeys?: Record<string, string>;

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

  // Toast & Focus
  onToast: (msg: string, type?: 'info' | 'warn' | 'error' | 'success') => void;
  onFocus?: () => void;
  chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

export const UniversalPromptInput: React.FC<UniversalPromptInputProps> = ({
  chatInput,
  onChatInputChange,
  chatAttachments,
  onRemoveAttachment,
  onAddAttachment,
  onAddFiles,
  onSendMessage,
  isAiLoading,
  selectedContext,
  editorSelection,
  onClearEditorSelection,
  allMentionItems = [],
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
  onOpenSettings,
  apiKeys,
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
  onToast,
  onFocus,
  chatInputRef: externalChatInputRef,
  className = '',
}) => {
  const { t: dict } = useTranslation();
  const t = dict.core.chat;
  const internalChatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatInputRef = externalChatInputRef || internalChatInputRef;
  const ghostInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const mentionItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [mentionFilterType, setMentionFilterType] = useState<'all' | 'file' | 'folder'>('all');
  const [isSelectionExpanded, setIsSelectionExpanded] = useState(false);

  useEffect(() => {
    const shouldExpand = Boolean(editorSelection?.autoExpand);
    setIsSelectionExpanded(shouldExpand);
    if (shouldExpand && chatInputRef.current) {
      requestAnimationFrame(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
          const len = chatInputRef.current.value.length;
          chatInputRef.current.setSelectionRange(len, len);
        }
      });
    }
  }, [editorSelection?.updatedAt, editorSelection?.autoExpand, chatInputRef]);

  // Bidirectional Math.max height synchronization for dual-pane Ghost Writer
  const [koreanHeight, setKoreanHeight] = useState<number>(72);
  const [englishHeight, setEnglishHeight] = useState<number>(72);

  const syncedHeight = useMemo(() => {
    return Math.min(Math.max(koreanHeight, englishHeight, 72), 260);
  }, [koreanHeight, englishHeight]);

  const adjustChatInputHeight = useCallback(() => {
    let leftScroll = 72;
    let rightScroll = 72;

    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
      leftScroll = chatInputRef.current.scrollHeight;
    }
    if (ghostInputRef.current) {
      ghostInputRef.current.style.height = 'auto';
      rightScroll = ghostInputRef.current.scrollHeight;
    }

    setKoreanHeight(leftScroll);
    setEnglishHeight(rightScroll);

    const nextHeight = Math.min(Math.max(leftScroll, rightScroll, 88), 260);
    if (chatInputRef.current) {
      chatInputRef.current.style.height = `${nextHeight}px`;
    }
    if (ghostInputRef.current) {
      ghostInputRef.current.style.height = `${nextHeight}px`;
    }
  }, [chatInputRef]);

  // Maintain adjustHeights alias for JSX event handlers
  const adjustHeights = adjustChatInputHeight;

  useEffect(() => {
    if (!chatInput) {
      setKoreanHeight(72);
      setEnglishHeight(72);
      if (chatInputRef.current) chatInputRef.current.style.height = '72px';
      if (ghostInputRef.current) ghostInputRef.current.style.height = '72px';
    } else {
      adjustChatInputHeight();
    }
  }, [chatInput, ghostUserInput, ghostTargetEnglish, adjustChatInputHeight, chatInputRef]);

  // Mention menu outside click dismissal
  useEffect(() => {
    const handleMentionClickOutside = (e: MouseEvent) => {
      if (
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(e.target as Node) &&
        chatInputRef.current &&
        !chatInputRef.current.contains(e.target as Node)
      ) {
        setShowMentionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleMentionClickOutside);
    return () => document.removeEventListener('mousedown', handleMentionClickOutside);
  }, [chatInputRef]);

  // Filter mention items
  const filteredMentionItems = useMemo(() => {
    let list = allMentionItems;
    if (mentionFilterType === 'file') {
      list = list.filter((i) => i.type === 'file');
    } else if (mentionFilterType === 'folder') {
      list = list.filter((i) => i.type === 'folder');
    }
    const q = mentionQuery.toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.folder && item.folder.toLowerCase().includes(q)) ||
        (item.detail && item.detail.toLowerCase().includes(q))
    );
  }, [allMentionItems, mentionFilterType, mentionQuery]);

  // Insert mention tag into chat input
  const handleSelectMention = useCallback(
    (item: MentionItem) => {
      const textarea = chatInputRef.current;
      const cursorPos = textarea ? textarea.selectionStart : chatInput.length;
      const start = mentionStartIndex !== -1 ? mentionStartIndex : cursorPos;

      const tag = item.type === 'folder' ? `@[📁 ${item.name}] ` : `@[📄 ${item.name}] `;
      const beforeAt = chatInput.slice(0, start);
      const afterCursor = chatInput.slice(cursorPos);
      const newText = beforeAt + tag + afterCursor;

      onChatInputChange(newText);
      setShowMentionMenu(false);
      setMentionQuery('');
      setMentionStartIndex(-1);

      onToast(t.referenceAdded(item.type, item.name));

      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
          const nextPos = start + tag.length;
          chatInputRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 15);
    },
    [chatInput, mentionStartIndex, onChatInputChange, onToast, chatInputRef, t]
  );

  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChatInputChange(val);
    adjustHeights();

    // Check for @ trigger
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      const charBeforeAt = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : ' ';
      const isWordBoundary = /\s/.test(charBeforeAt) || lastAtIdx === 0;

      if (isWordBoundary) {
        const queryCandidate = textBeforeCursor.slice(lastAtIdx + 1);
        if (!/\s/.test(queryCandidate)) {
          setMentionStartIndex(lastAtIdx);
          setMentionQuery(queryCandidate);
          setShowMentionMenu(true);
          setMentionSelectedIndex(0);
          return;
        }
      }
    }

    if (showMentionMenu) {
      setShowMentionMenu(false);
    }
  };

  const handleTriggerMention = () => {
    const textarea = chatInputRef.current;
    const cursorPos = textarea ? textarea.selectionStart : chatInput.length;
    const before = chatInput.slice(0, cursorPos);
    const after = chatInput.slice(cursorPos);
    const newText = before + '@' + after;

    onChatInputChange(newText);
    setMentionStartIndex(cursorPos);
    setMentionQuery('');
    setShowMentionMenu(true);
    setMentionSelectedIndex(0);

    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
        chatInputRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
      }
    }, 15);
  };

  const handleChatInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && filteredMentionItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % filteredMentionItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev - 1 + filteredMentionItems.length) % filteredMentionItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMentionItems[mentionSelectedIndex];
        if (selected) {
          handleSelectMention(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
        return;
      }
    }

    // Ctrl+Enter or Cmd+Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setShowMentionMenu(false);
      onSendMessage();
      return;
    }

    // Enter without Shift/Ctrl/Cmd sends message when not in Ghost mode
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && ghostWriterLevel === 'off') {
      e.preventDefault();
      setShowMentionMenu(false);
      onSendMessage();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      onAddFiles?.(e.clipboardData.files);
    }
  };

  return (
    <div className={`bg-[var(--bg-surface)] season-shell border-t border-white/[0.06] flex flex-col relative shrink-0 overflow-visible ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddFiles?.(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Attached Files List Pills */}
      {chatAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1 border-b border-white/[0.06] bg-[var(--bg-editor)]/60">
          {chatAttachments.map((att) => (
            <div
              key={att.id}
              className="group flex items-center gap-1.5 bg-[var(--bg-elevated)] border border-white/[0.06] rounded-md px-2 py-0.5 text-[0.6875rem] text-[var(--text-main)] select-none"
            >
              {att.isParsing ? (
                <RotateCw className="w-3 h-3 text-[var(--accent-primary)] animate-spin shrink-0" />
              ) : att.type === 'link' ? (
                <Link2 className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
              ) : (
                <Paperclip className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
              )}
              <span className="truncate max-w-[140px] font-mono">{att.name}</span>
              <span className="text-[0.625rem] text-[var(--text-muted)] font-mono">({att.size})</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                className="text-[var(--text-muted)] hover:text-rose-400 p-0.5 rounded transition cursor-pointer ml-0.5"
                title={t.attachmentRemoved}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Editor Selection Context Bar */}
      {(() => {
        const rawSelectionText = (selectedContext ?? editorSelection?.text ?? '').trim();
        if (!rawSelectionText) return null;
        const normalizedExcerpt = rawSelectionText.replace(/\s+/g, ' ');
        const truncatedExcerpt =
          normalizedExcerpt.length > 35
            ? `${normalizedExcerpt.slice(0, 35)}...`
            : normalizedExcerpt;
        return (
          <div
            id="editor-selection-context-bar"
            className="mx-2.5 mt-2 flex flex-col gap-1.5 rounded-lg bg-[var(--bg-editor)] border border-white/[0.1] px-2.5 py-1.5 text-[0.6875rem] select-none"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsSelectionExpanded((prev) => !prev)}
                className="flex items-center gap-1.5 min-w-0 flex-1 text-left hover:text-[var(--text-main)] transition-colors cursor-pointer"
                title={rawSelectionText}
              >
                <Quote className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
                <span className="font-medium text-[var(--text-main)] truncate">
                  {t.selectionExcerpt(truncatedExcerpt)}
                </span>
                {editorSelection?.fileName && (
                  <span className="text-[0.625rem] font-mono text-[var(--text-muted)] truncate max-w-[110px] bg-[var(--bg-elevated)] border border-white/[0.06] px-1.5 py-0.5 rounded shrink-0">
                    {editorSelection.fileName}
                  </span>
                )}
                <span className="text-[0.625rem] font-mono text-[var(--text-tertiary)] shrink-0">
                  {t.selectionChars(rawSelectionText.length)}
                </span>
              </button>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[0.625rem] text-[var(--text-tertiary)] hidden sm:inline">
                  {t.selectionIncluded}
                </span>
                {onClearEditorSelection && (
                  <button
                    type="button"
                    id="editor-selection-clear-btn"
                    onClick={onClearEditorSelection}
                    className="text-[var(--text-muted)] hover:text-rose-400 p-0.5 rounded hover:bg-white/[0.06] transition cursor-pointer"
                    title={t.clearSelectionContext}
                    aria-label={t.clearSelectionContext}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            {isSelectionExpanded && (
              <div className="max-h-24 overflow-y-auto custom-scrollbar bg-[var(--bg-surface)] border border-white/[0.06] rounded-md px-2.5 py-1.5 text-[0.6875rem] text-[var(--text-main)] whitespace-pre-wrap break-words font-sans leading-relaxed select-text">
                {rawSelectionText}
              </div>
            )}
          </div>
        );
      })()}

      {/* Mention Autocomplete Dropdown Popover */}
      <AnimatePresence>
        {showMentionMenu && (
          <motion.div
            ref={mentionDropdownRef}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-3 mb-2 w-80 max-h-72 bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header / Filter Chips */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-[var(--bg-surface)]/60">
              <span className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>{t.addReference}</span>
              </span>
              <div className="flex items-center gap-1">
                {(['all', 'file', 'folder'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    type="button"
                    onClick={() => setMentionFilterType(filterType)}
                    className={`px-1.5 py-0.5 text-[0.625rem] rounded transition cursor-pointer ${
                      mentionFilterType === filterType
                        ? 'bg-[#F1F5F9] text-[#0F172A] font-medium'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06]'
                    }`}
                  >
                    {filterType === 'all'
                      ? t.allReferences
                      : filterType === 'file'
                      ? t.documentReference
                      : t.folderReference}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar text-xs">
              {filteredMentionItems.length === 0 ? (
                <div className="py-6 text-center text-[var(--text-tertiary)] text-xs flex flex-col items-center gap-2">
                  <Info className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span>{t.noMatchingReferences(mentionQuery)}</span>
                </div>
              ) : (
                filteredMentionItems.map((item, index) => {
                  const isSelected = index === mentionSelectedIndex;
                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        mentionItemRefs.current[index] = el;
                      }}
                      onClick={() => handleSelectMention(item)}
                      onMouseEnter={() => setMentionSelectedIndex(index)}
                      className={`group flex items-center justify-between px-3 py-1.5 h-8 rounded-md cursor-pointer transition-colors ${
                        isSelected ? 'bg-white/[0.08] text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                        {item.type === 'folder' ? (
                          <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs truncate font-medium">{item.name}</span>
                      </div>
                      <span className="text-[0.6875rem] font-mono text-[var(--text-tertiary)]">{item.detail}</span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Textarea Area (Dual-Pane Ghost Writer or Single Bottom-Flush Textarea) */}
      {ghostWriterLevel !== 'off' ? (
        <div className="flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] bg-transparent">
            {/* Left: Native Korean Prompt Input */}
            <div className="flex flex-col px-3 py-2.5 relative bg-transparent">
              <textarea
                id="chat-input"
                ref={chatInputRef}
                style={{ height: `${syncedHeight}px` }}
                value={chatInput}
                onFocus={onFocus}
                onInput={adjustHeights}
                onChange={(e) => {
                  handleChatInputChange(e);
                  if (ghostTargetEnglish || ghostTemplateText || ghostUserInput) {
                    onSetGhostTargetEnglish?.('');
                    onSetGhostTemplateText?.('');
                    onSetGhostUserInput?.('');
                    onSetGhostShowFullAnswer?.(false);
                  }
                }}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey)) {
                    e.preventDefault();
                    if (chatInput.trim()) {
                      onGenerateGhostText?.();
                    } else {
                      onToast(`⚠️ ${t.koreanPromptRequired}`, 'warn');
                    }
                    return;
                  }
                  handleChatInputKeyDown(e);
                }}
                placeholder={t.koreanPromptPlaceholder}
                className="w-full bg-transparent p-0 text-[0.625rem] text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] border-0 focus:ring-0 focus:outline-none resize-none min-h-[72px] max-h-[260px] overflow-y-auto outline-none font-sans leading-relaxed transition"
              />
            </div>

            {/* Right: Ghost Practice Canvas */}
            <div className="flex flex-col px-3 py-2.5 relative bg-transparent">
              <div
                style={{ height: `${syncedHeight}px` }}
                className="relative w-full bg-transparent border-0 overflow-hidden"
              >
                <div className="absolute inset-0 p-0 text-[0.625rem] font-mono leading-relaxed select-none pointer-events-none whitespace-pre-wrap break-words overflow-y-auto">
                  {isGhostLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2 select-none text-[var(--text-muted)] gap-2">
                      <Sparkles className="w-4 h-4 text-[var(--accent-primary)] animate-spin" />
                      <span className="text-[0.625rem] text-[var(--secondary-accent)] font-medium animate-pulse">{t.ghostGenerating}</span>
                    </div>
                  ) : ghostTargetEnglish ? (
                    <div>
                      {ghostShowFullAnswer || ghostWriterLevel === '100' ? (
                        <span className="text-[var(--accent-primary)] font-medium">{ghostTargetEnglish}</span>
                      ) : (
                        <span className="text-teal-200/70">{ghostTemplateText}</span>
                      )}
                    </div>
                  ) : chatInput.trim() ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2 select-none text-[var(--text-muted)] gap-1.5 pointer-events-auto">
                      <div className="flex items-center gap-1.5 text-[var(--secondary-accent)] text-[0.625rem] font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>{t.waitingForKorean}</span>
                      </div>
                      <button
                        type="button"
                        onClick={onGenerateGhostText}
                        disabled={isGhostLoading}
                        className="mt-0.5 px-2.5 py-0.5 rounded bg-[#F1F5F9] hover:bg-white text-[#0F172A] text-[0.625rem] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Ghost className="w-2.5 h-2.5" />
                        <span>{t.generateGhostNow}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2 select-none text-[var(--text-muted)] gap-1">
                      <Ghost className="w-4 h-4 text-[var(--text-tertiary)] mb-0.5" />
                      <p className="text-[0.625rem] text-[var(--text-tertiary)] font-sans">
                        {t.ghostWriterHint}
                      </p>
                    </div>
                  )}
                </div>

                {ghostTargetEnglish && (
                  <textarea
                    ref={ghostInputRef}
                    value={ghostUserInput}
                    onChange={(e) => onGhostUserInputChange?.(e.target.value)}
                    onKeyDown={onGhostInputKeyDown}
                    placeholder=""
                    className="absolute inset-0 w-full h-full p-0 text-[0.625rem] font-mono leading-relaxed bg-transparent text-emerald-100 placeholder:text-transparent outline-none border-0 resize-none z-10 selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)]"
                    spellCheck={false}
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <textarea
          id="chat-input"
          ref={chatInputRef}
          style={{ height: `${syncedHeight}px` }}
          value={chatInput}
          onFocus={onFocus}
          onInput={adjustHeights}
          onChange={handleChatInputChange}
          onPaste={handlePaste}
          onKeyDown={handleChatInputKeyDown}
          placeholder={t.promptPlaceholder}
          className="w-full bg-transparent px-3 py-2.5 text-xs text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] resize-none min-h-[72px] max-h-[260px] overflow-y-auto outline-none font-sans leading-relaxed border-0 focus:ring-0"
        />
      )}

      {/* Bottom Action Bar - Bottom-Flush Clean IDE Style */}
      <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5 bg-transparent overflow-visible">
        <div className="flex items-center gap-1 overflow-visible">
          {/* File Attach Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition flex items-center justify-center cursor-pointer"
            title={t.attachFile}
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {/* Web/Repo Link Button */}
          <button
            type="button"
            onClick={() => setIsLinkInputOpen((prev) => !prev)}
            className={`p-1 hover:bg-white/[0.06] rounded transition flex items-center justify-center cursor-pointer ${
              isLinkInputOpen ? 'bg-white/[0.08] text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
            title={t.attachLink}
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          {/* Workspace Reference Button */}
          <button
            type="button"
            onClick={handleTriggerMention}
            className="p-1 hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition flex items-center justify-center cursor-pointer"
            title={t.referenceWorkspace}
          >
            <AtSign className="w-3.5 h-3.5" />
          </button>

          {/* Divider */}
          <div className="h-3.5 w-[1px] bg-white/[0.08] mx-0.5" />

          {/* Inline Model Selector */}
          <InlineModelSelector
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
            selectedMultiModels={selectedMultiModels}
            onSelectMultiModels={onSelectMultiModels}
            mode={mode}
            onModeChange={onModeChange}
            availableChatModels={availableChatModels}
            onOpenRoleModal={onOpenRoleModal}
            onOpenSettings={onOpenSettings}
            apiKeys={apiKeys}
            onShowToast={onToast}
            provider={provider as any}
            onSelectProvider={onSelectProvider}
            onRefreshOllama={onRefreshOllama}
            localEndpoint={localEndpointAddress}
            onSelectDefaultLocalTag={onSelectDefaultLocalTag}
          />

          {/* External Link Modal Popover */}
          <LinkAttachmentInput
            isOpen={isLinkInputOpen}
            onClose={() => setIsLinkInputOpen(false)}
            onAddAttachment={onAddAttachment}
            onShowToast={onToast}
          />

          {/* Ghost Writer Auto-Complete Button */}
          {ghostWriterLevel !== 'off' && ghostTargetEnglish && (
            <button
              type="button"
              onClick={() => {
                onSetGhostUserInput?.(ghostTargetEnglish);
                onToast(`✨ ${t.ghostWriterComplete}`);
              }}
              className="px-1.5 py-0.5 rounded hover:bg-white/[0.06] text-[var(--accent-primary)] text-[0.625rem] font-mono flex items-center gap-1 transition cursor-pointer border border-white/[0.08]"
              title={t.completeAnswer}
            >
              <Sparkles className="w-2.5 h-2.5 text-[var(--accent-primary)]" />
              <span>{t.tabComplete}</span>
            </button>
          )}
        </div>

        {/* Right Send Action Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {ghostWriterLevel !== 'off' && (
            <button
              type="button"
              disabled={isAiLoading || chatAttachments.some((a) => a.isParsing) || (!chatInput.trim() && chatAttachments.length === 0)}
              onClick={() => {
                if (chatInput.trim() || chatAttachments.length > 0) {
                  onSendMessage(chatInput.trim(), {
                    originalText: chatInput.trim(),
                    ghostWriterLevel: 'off',
                  });
                }
              }}
              className="hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-muted)] hover:text-slate-200 h-6 w-6 flex items-center justify-center rounded transition cursor-pointer"
              title={t.sendKoreanOriginal}
            >
              <Languages className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={isAiLoading || chatAttachments.some((a) => a.isParsing) || (!chatInput.trim() && chatAttachments.length === 0)}
            onClick={() => {
              if (ghostWriterLevel !== 'off') {
                onSendGhostMessage?.();
              } else {
                onSendMessage();
              }
            }}
            className={`h-6 px-2.5 rounded-md transition flex items-center justify-center ${
              isAiLoading || chatAttachments.some((a) => a.isParsing) || (!chatInput.trim() && chatAttachments.length === 0)
                ? 'bg-white/[0.04] text-[var(--text-tertiary)] border border-white/[0.04] cursor-not-allowed'
                : 'bg-[#F1F5F9] hover:bg-white active:bg-slate-200 text-[#0F172A] cursor-pointer shadow-xs'
            }`}
            title={
              chatAttachments.some((a) => a.isParsing)
                ? t.analyzingFile
                : ghostWriterLevel !== 'off'
                ? t.sendEnglishPrompt
                : t.sendMessage
            }
          >
            {chatAttachments.some((a) => a.isParsing) ? (
              <RotateCw className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
