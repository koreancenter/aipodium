import React, { useState, useRef, useEffect, useMemo, useCallback, RefObject } from 'react';
import { MentionItem, ChatSession } from '../types';

export function useMentionSystem({
  sessions,
  files,
  fileFolders,
  chatInput,
  setChatInput,
  chatInputRef,
  onSendMessage,
  showToast
}: {
  sessions: ChatSession[];
  files: Record<string, string>;
  fileFolders: Record<string, string>;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  chatInputRef: RefObject<HTMLTextAreaElement | null>;
  onSendMessage: () => void;
  showToast: (msg: string, type?: 'success' | 'warn' | 'info' | 'error') => void;
}) {
  const [showMentionMenu, setShowMentionMenu] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState<number>(0);
  const [mentionFilterType, setMentionFilterType] = useState<'all' | 'folders' | 'files'>('all');

  const mentionListRef = useRef<HTMLDivElement>(null);
  const mentionItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  const allMentionItems = useMemo<MentionItem[]>(() => {
    const items: MentionItem[] = [];
    const folderSet = new Set<string>();

    sessions.forEach((s) => {
      if (s.title) folderSet.add(s.title);
    });
    Object.values(fileFolders).forEach((f: string) => {
      if (f) folderSet.add(f);
    });
    folderSet.add('docs');
    folderSet.add('src');

    folderSet.forEach((folderName) => {
      const containedFiles = Object.keys(files).filter(
        (f) => (fileFolders[f] || folderName) === folderName || f === `${folderName}.md`
      );
      items.push({
        id: `folder-${folderName}`,
        type: 'folder',
        name: folderName,
        detail: `워크스페이스 폴더 • ${containedFiles.length}개 파일`,
        path: folderName
      });
    });

    Object.keys(files).forEach((fname) => {
      const parentFolder = fileFolders[fname] || 'docs';
      const fileContent = files[fname] || '';
      const lines = fileContent.split('\n').length;
      items.push({
        id: `file-${fname}`,
        type: 'file',
        name: fname,
        detail: `${parentFolder} • ${lines}줄 • ${(fileContent.length / 1024).toFixed(1)} KB`,
        folder: parentFolder,
        path: `${parentFolder}/${fname}`
      });
    });

    return items;
  }, [sessions, files, fileFolders]);

  const filteredMentionItems = useMemo(() => {
    let list = allMentionItems;
    if (mentionFilterType === 'folders') {
      list = list.filter((i) => i.type === 'folder');
    } else if (mentionFilterType === 'files') {
      list = list.filter((i) => i.type === 'file');
    }

    if (!mentionQuery.trim()) return list;

    const q = mentionQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.folder && item.folder.toLowerCase().includes(q)) ||
        (item.detail && item.detail.toLowerCase().includes(q))
    );
  }, [allMentionItems, mentionFilterType, mentionQuery]);

  const handleSelectMention = useCallback((item: MentionItem) => {
    const textarea = chatInputRef.current;
    const cursorPos = textarea ? textarea.selectionStart : chatInput.length;
    const start = mentionStartIndex !== -1 ? mentionStartIndex : cursorPos;

    const tag = item.type === 'folder' ? `@[📁 ${item.name}] ` : `@[📄 ${item.name}] `;
    const beforeAt = chatInput.slice(0, start);
    const afterCursor = chatInput.slice(cursorPos);
    const newText = beforeAt + tag + afterCursor;

    setChatInput(newText);
    setShowMentionMenu(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    showToast(`🔗 워크스페이스 ${item.type === 'folder' ? '폴더' : '파일'} '${item.name}' 참조 추가됨`);

    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
        const nextPos = start + tag.length;
        chatInputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 15);
  }, [chatInput, mentionStartIndex, chatInputRef, setChatInput, showToast]);

  const handleChatInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setChatInput(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

      if (/[\s\n]/.test(charBeforeAt) || lastAtIndex === 0) {
        if (!/[\n]/.test(textAfterAt) && textAfterAt.length <= 40) {
          setMentionStartIndex(lastAtIndex);
          setMentionQuery(textAfterAt);
          setShowMentionMenu(true);
          setMentionSelectedIndex(0);
          return;
        }
      }
    }

    setShowMentionMenu(false);
  }, [setChatInput]);

  const handleChatInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setShowMentionMenu(false);
      onSendMessage();
    }
  }, [showMentionMenu, filteredMentionItems, mentionSelectedIndex, handleSelectMention, onSendMessage]);

  const handleTriggerMention = useCallback(() => {
    const textarea = chatInputRef.current;
    const cursorPos = textarea ? textarea.selectionStart : chatInput.length;
    const before = chatInput.slice(0, cursorPos);
    const after = chatInput.slice(cursorPos);
    const newText = before + '@' + after;

    setChatInput(newText);
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
  }, [chatInput, chatInputRef, setChatInput]);

  useEffect(() => {
    if (showMentionMenu && mentionListRef.current) {
      const activeElement = mentionItemRefs.current[mentionSelectedIndex];
      if (activeElement) {
        activeElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [mentionSelectedIndex, showMentionMenu]);

  return {
    allMentionItems,
    filteredMentionItems,
    showMentionMenu,
    setShowMentionMenu,
    mentionQuery,
    setMentionQuery,
    mentionStartIndex,
    mentionSelectedIndex,
    setMentionSelectedIndex,
    mentionFilterType,
    setMentionFilterType,
    mentionListRef,
    mentionItemRefs,
    mentionDropdownRef,
    handleSelectMention,
    handleChatInputChange,
    handleChatInputKeyDown,
    handleTriggerMention
  };
}
