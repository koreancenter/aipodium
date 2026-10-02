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
  Globe
} from 'lucide-react';
import type { ChatAttachment, GhostWriterLevel, MentionItem } from '../../types';
import { InlineModelSelector } from '../InlineModelSelector';
import { LinkAttachmentInput } from '../LinkAttachmentInput';

export interface UniversalPromptInputProps {
  chatInput: string;
  onChatInputChange: (val: string) => void;
  chatAttachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAddAttachment: (att: ChatAttachment) => void;
  onAddFiles?: (files: FileList | File[]) => void;
  onSendMessage: (overrideText?: string, meta?: any) => void;
  isAiLoading: boolean;

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

  // Bidirectional Math.max height synchronization for dual-pane Ghost Writer
  const [koreanHeight, setKoreanHeight] = useState<number>(53);
  const [englishHeight, setEnglishHeight] = useState<number>(53);

  const syncedHeight = useMemo(() => {
    return Math.min(Math.max(koreanHeight, englishHeight, 53), 264);
  }, [koreanHeight, englishHeight]);

  const adjustHeights = useCallback(() => {
    let kH = 53;
    let eH = 53;

    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
      kH = chatInputRef.current.scrollHeight;
    }
    if (ghostInputRef.current) {
      ghostInputRef.current.style.height = 'auto';
      eH = ghostInputRef.current.scrollHeight;
    }

    setKoreanHeight(kH);
    setEnglishHeight(eH);

    const targetHeight = Math.min(Math.max(kH, eH, 53), 264);
    if (chatInputRef.current) {
      chatInputRef.current.style.height = `${targetHeight}px`;
    }
    if (ghostInputRef.current) {
      ghostInputRef.current.style.height = `${targetHeight}px`;
    }
  }, [chatInputRef]);

  useEffect(() => {
    if (!chatInput) {
      setKoreanHeight(53);
      setEnglishHeight(53);
      if (chatInputRef.current) chatInputRef.current.style.height = '53px';
      if (ghostInputRef.current) ghostInputRef.current.style.height = '53px';
    } else {
      adjustHeights();
    }
  }, [chatInput, ghostUserInput, ghostTargetEnglish, adjustHeights, chatInputRef]);

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

      onToast(`🔗 워크스페이스 ${item.type === 'folder' ? '폴더' : '파일'} '${item.name}' 참조 추가됨`);

      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
          const nextPos = start + tag.length;
          chatInputRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 15);
    },
    [chatInput, mentionStartIndex, onChatInputChange, onToast, chatInputRef]
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
    <div className={`bg-[#09090b] border-t border-[#222226] flex flex-col relative shrink-0 ${className}`}>
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
        <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1 border-b border-[#222226]/60 bg-[#0c0c0e]">
          {chatAttachments.map((att) => (
            <div
              key={att.id}
              className="group flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] rounded px-2 py-0.5 text-[0.6875rem] text-slate-200 select-none shadow-xs"
            >
              {att.isParsing ? (
                <RotateCw className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />
              ) : att.type === 'link' ? (
                <Link2 className="w-3 h-3 text-[#6366f1] shrink-0" />
              ) : (
                <Paperclip className="w-3 h-3 text-indigo-400 shrink-0" />
              )}
              <span className="truncate max-w-[140px] font-mono">{att.name}</span>
              <span className="text-[0.625rem] text-slate-400 font-mono">({att.size})</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition cursor-pointer ml-0.5"
                title="첨부 파일 제거"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention Autocomplete Dropdown Popover */}
      <AnimatePresence>
        {showMentionMenu && (
          <motion.div
            ref={mentionDropdownRef}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-3 mb-2 w-80 max-h-72 bg-[#121214] border border-[#222226] rounded-md shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header / Filter Chips */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#222226] bg-[#0c0c0e]">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-[#6366f1]" />
                <span>참조 추가</span>
              </span>
              <div className="flex items-center gap-1">
                {(['all', 'file', 'folder'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMentionFilterType(t)}
                    className={`px-1.5 py-0.5 text-[0.625rem] rounded transition cursor-pointer ${
                      mentionFilterType === t
                        ? 'bg-[#6366f1] text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {t === 'all' ? '전체' : t === 'file' ? '문서' : '폴더'}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar text-xs">
              {filteredMentionItems.length === 0 ? (
                <div className="py-6 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <Info className="w-4 h-4 text-zinc-500" />
                  <span>'{mentionQuery}'에 해당하는 항목이 없습니다.</span>
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
                        isSelected ? 'bg-white/10 text-zinc-100' : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                        {item.type === 'folder' ? (
                          <Folder className="w-4 h-4 text-zinc-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                        <span className="text-xs truncate font-medium">{item.name}</span>
                      </div>
                      <span className="text-[0.6875rem] font-mono text-zinc-500">{item.detail}</span>
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
                      onToast('⚠️ 한국어 질문 또는 개념을 먼저 입력해주세요.', 'warn');
                    }
                    return;
                  }
                  handleChatInputKeyDown(e);
                }}
                placeholder="한국어로 입력 (예: REST API vs GraphQL)... Enter로 영작 생성"
                className="w-full bg-transparent p-0 text-[0.625rem] text-slate-100 placeholder:text-slate-400 border-0 focus:ring-0 focus:outline-none resize-none min-h-[53px] max-h-[264px] overflow-y-auto outline-none font-sans leading-relaxed transition"
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
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2 select-none text-slate-400 gap-2">
                      <Sparkles className="w-4 h-4 text-[#6366f1] animate-spin" />
                      <span className="text-[0.625rem] text-emerald-300 font-medium animate-pulse">Ghost Text 생성 중...</span>
                    </div>
                  ) : ghostTargetEnglish ? (
                    <div>
                      {ghostShowFullAnswer || ghostWriterLevel === '100' ? (
                        <span className="text-[#6366f1] font-medium">{ghostTargetEnglish}</span>
                      ) : (
                        <span className="text-teal-200/70">{ghostTemplateText}</span>
                      )}
                    </div>
                  ) : chatInput.trim() ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2 select-none text-slate-400 gap-1.5 pointer-events-auto">
                      <div className="flex items-center gap-1.5 text-emerald-300 text-[0.625rem] font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-[#6366f1] animate-pulse" />
                        <span>한국어 입력 완료 대기 중</span>
                      </div>
                      <button
                        type="button"
                        onClick={onGenerateGhostText}
                        disabled={isGhostLoading}
                        className="mt-0.5 px-2 py-0.5 rounded-xs bg-indigo-600 hover:bg-indigo-500 text-white text-[0.625rem] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Ghost className="w-2.5 h-2.5" />
                        <span>지금 Ghost Text 생성</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-2 select-none text-slate-400 gap-1">
                      <Ghost className="w-4 h-4 text-slate-500 mb-0.5" />
                      <p className="text-[0.625rem] text-slate-400 font-sans">
                        왼쪽에 한국어 프롬프트를 입력하면 여기에 영작 고스트 텍스트가 표시됩니다.
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
          placeholder="질문 또는 요청 입력, '@'로 워크스페이스 폴더 및 문서 참조..."
          className="w-full bg-transparent px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-400 resize-none min-h-[53px] max-h-[264px] overflow-y-auto outline-none font-sans leading-relaxed border-0 focus:ring-0"
        />
      )}

      {/* Bottom Action Bar - Bottom-Flush Clean IDE Style */}
      <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5 bg-transparent">
        <div className="flex items-center gap-1">
          {/* File Attach Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 rounded transition flex items-center justify-center cursor-pointer"
            title="이미지 또는 파일 첨부하기"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {/* Web/Repo Link Button */}
          <button
            type="button"
            onClick={() => setIsLinkInputOpen((prev) => !prev)}
            className={`p-1 hover:bg-white/[0.06] rounded transition flex items-center justify-center cursor-pointer ${
              isLinkInputOpen ? 'bg-white/[0.1] text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="웹 링크 또는 GitHub URL 첨부"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          {/* Workspace Reference Button */}
          <button
            type="button"
            onClick={handleTriggerMention}
            className="p-1 hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 rounded transition flex items-center justify-center cursor-pointer"
            title="워크스페이스 폴더 및 파일 참조"
          >
            <AtSign className="w-3.5 h-3.5" />
          </button>

          {/* Divider */}
          <div className="h-3.5 w-[1px] bg-white/[0.1] mx-0.5" />

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
                onToast('✨ 영작 자동 완성');
              }}
              className="px-1.5 py-0.5 rounded hover:bg-white/[0.06] text-indigo-400 hover:text-indigo-300 text-[0.625rem] font-mono flex items-center gap-1 transition cursor-pointer border border-white/[0.08]"
              title="정답 문장 자동 완성"
            >
              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
              <span>Tab 완성</span>
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
              className="hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 h-6 w-6 flex items-center justify-center rounded transition cursor-pointer"
              title="한국어 원문으로 직접 전송"
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
            className={`h-6 px-2.5 rounded transition flex items-center justify-center ${
              isAiLoading || chatAttachments.some((a) => a.isParsing) || (!chatInput.trim() && chatAttachments.length === 0)
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/40 cursor-not-allowed'
                : 'bg-indigo-600/80 hover:bg-indigo-600 active:bg-indigo-700 text-white border border-indigo-500/40 cursor-pointer'
            }`}
            title={
              chatAttachments.some((a) => a.isParsing)
                ? '파일 분석 중...'
                : ghostWriterLevel !== 'off'
                ? '영작된 영어 프롬프트로 AI 전송'
                : '메시지 전송'
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
