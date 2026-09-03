import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Table as TableIcon,
  Sigma,
  ChevronDown,
  Minus,
  Link,
  ImageIcon,
  Sparkles,
  Highlighter,
  HelpCircle,
  X,
  Eye,
  Columns
} from 'lucide-react';
import {
  MarkdownTableInfo,
  getTableAtCursor,
  formatMarkdownTable,
  insertTableRow,
  deleteTableRow,
  insertTableColumn,
  deleteTableColumn,
  setTableColumnAlign,
  findCellOffsetInTable,
  splitTableRow
} from '../utils/markdownTableHelper';
import { TableContextBar } from './TableContextBar';
import { VisualTableModal } from './VisualTableModal';

interface OptimizedEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  onFocus?: () => void;
  editorRef?: React.RefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
  editorTab: 'edit' | 'split' | 'preview';
  renderMarkdownToHtml: (md: string) => string;
}

interface SlashCommandItem {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  category: 'headings' | 'lists' | 'blocks' | 'inline';
  insertText: string;
  cursorOffset?: number; // Relative cursor position from start of inserted text
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'h1',
    label: '# 제목 1 (H1)',
    sublabel: '가장 큰 대제목',
    icon: <Heading1 className="w-3.5 h-3.5 text-sky-400" />,
    category: 'headings',
    insertText: '# 제목\n',
    cursorOffset: 2
  },
  {
    id: 'h2',
    label: '## 제목 2 (H2)',
    sublabel: '중간 크기 섹션 제목',
    icon: <Heading2 className="w-3.5 h-3.5 text-sky-400" />,
    category: 'headings',
    insertText: '## 제목\n',
    cursorOffset: 3
  },
  {
    id: 'h3',
    label: '### 제목 3 (H3)',
    sublabel: '소제목 및 하위 항목',
    icon: <Heading3 className="w-3.5 h-3.5 text-sky-400" />,
    category: 'headings',
    insertText: '### 제목\n',
    cursorOffset: 4
  },
  {
    id: 'bullet',
    label: '- 글머리 기호 목록',
    sublabel: '순서 없는 불릿 목록',
    icon: <List className="w-3.5 h-3.5 text-indigo-400" />,
    category: 'lists',
    insertText: '- 항목 1\n- 항목 2\n- 항목 3\n',
    cursorOffset: 2
  },
  {
    id: 'numbered',
    label: '1. 번호 매기기 목록',
    sublabel: '순서가 있는 순차 목록',
    icon: <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />,
    category: 'lists',
    insertText: '1. 첫 번째 항목\n2. 두 번째 항목\n3. 세 번째 항목\n',
    cursorOffset: 3
  },
  {
    id: 'task',
    label: '- [ ] 할 일 체크박스',
    sublabel: '인터랙티브 태스크 목록',
    icon: <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />,
    category: 'lists',
    insertText: '- [ ] 할 일 1\n- [ ] 할 일 2\n- [x] 완료된 일\n',
    cursorOffset: 6
  },
  {
    id: 'codeblock',
    label: '``` 코드 블록',
    sublabel: '문법 하이라이팅 코드 블록',
    icon: <Code className="w-3.5 h-3.5 text-amber-400/80" />,
    category: 'blocks',
    insertText: '```typescript\n// 코드를 작성하세요\nconsole.log("Hello, World!");\n```\n',
    cursorOffset: 15
  },
  {
    id: 'table',
    label: '| 표 (Table)',
    sublabel: '3x3 마크다운 데이터 표',
    icon: <TableIcon className="w-3.5 h-3.5 text-indigo-400" />,
    category: 'blocks',
    insertText: '| 헤더 1 | 헤더 2 | 헤더 3 |\n| :--- | :---: | ---: |\n| 내용 A | 내용 B | 내용 C |\n| 항목 1 | 항목 2 | 항목 3 |\n',
    cursorOffset: 2
  },
  {
    id: 'quote',
    label: '> 인용문 (Quote)',
    sublabel: '강조 인용 문구',
    icon: <Quote className="w-3.5 h-3.5 text-purple-400" />,
    category: 'blocks',
    insertText: '> 인용문을 여기에 작성하세요.\n',
    cursorOffset: 2
  },
  {
    id: 'note',
    label: '> [!NOTE] 알림창',
    sublabel: 'GitHub 스타일 안내 알림',
    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />,
    category: 'blocks',
    insertText: '> [!NOTE]\n> 중요한 정보나 참고 사항을 작성하세요.\n',
    cursorOffset: 12
  },
  {
    id: 'tip',
    label: '> [!TIP] 유용한 팁',
    sublabel: 'GitHub 스타일 팁 알림',
    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-300" />,
    category: 'blocks',
    insertText: '> [!TIP]\n> 권장하는 유용한 팁을 작성하세요.\n',
    cursorOffset: 11
  },
  {
    id: 'math',
    label: '$$ 수식 블록 (KaTeX)',
    sublabel: 'LaTeX 수학 공식 렌더링',
    icon: <Sigma className="w-3.5 h-3.5 text-rose-400" />,
    category: 'blocks',
    insertText: '$$\nE = mc^2\n$$\n',
    cursorOffset: 3
  },
  {
    id: 'details',
    label: '<details> 접기/펼치기',
    sublabel: '아코디언 형태 상세 내용',
    icon: <ChevronDown className="w-3.5 h-3.5 text-slate-300" />,
    category: 'blocks',
    insertText: '<details>\n<summary>상세 내용 보기 (클릭)</summary>\n\n여기에 숨겨진 상세 내용을 입력하세요.\n</details>\n',
    cursorOffset: 19
  },
  {
    id: 'hr',
    label: '--- 구분선',
    sublabel: '단락 구분 가로줄',
    icon: <Minus className="w-3.5 h-3.5 text-slate-400" />,
    category: 'blocks',
    insertText: '\n---\n\n',
    cursorOffset: 5
  },
  {
    id: 'link',
    label: '[텍스트](URL) 링크',
    sublabel: '하이퍼링크 삽입',
    icon: <Link className="w-3.5 h-3.5 text-sky-400" />,
    category: 'inline',
    insertText: '[링크 텍스트](https://example.com)',
    cursorOffset: 1
  },
  {
    id: 'image',
    label: '![설명](URL) 이미지',
    sublabel: '이미지 태그 삽입',
    icon: <ImageIcon className="w-3.5 h-3.5 text-sky-400" />,
    category: 'inline',
    insertText: '![이미지 설명](https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600)',
    cursorOffset: 2
  },
  {
    id: 'highlight',
    label: '==형광펜 강조==',
    sublabel: '노란색 하이라이트 텍스트',
    icon: <Highlighter className="w-3.5 h-3.5 text-amber-300" />,
    category: 'inline',
    insertText: '==강조할 텍스트==',
    cursorOffset: 2
  }
];

export const OptimizedEditor: React.FC<OptimizedEditorProps> = memo(({
  value,
  onChange,
  onFocus,
  editorRef: externalRef,
  placeholder,
  editorTab,
  renderMarkdownToHtml
}) => {
  const [localValue, setLocalValue] = useState(value);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const refToUse = externalRef || internalRef;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Slash Command (/ autocomplete) State
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashPosition, setSlashPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const slashTriggerPos = useRef<number>(-1);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Sync with external value changes (e.g., project change or AI send to editor)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced parent state update (150ms)
  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onChange(newValue);
      }, 150);
    },
    [onChange]
  );

  // Table Context State (Active Table Detection & Management)
  const [currentTableInfo, setCurrentTableInfo] = useState<MarkdownTableInfo | null>(null);
  const [isVisualModalOpen, setIsVisualModalOpen] = useState(false);

  const updateTableContext = useCallback((text: string, cursorPos: number) => {
    const info = getTableAtCursor(text, cursorPos);
    setCurrentTableInfo(info);
  }, []);

  const handleInsertRow = useCallback((position: 'above' | 'below') => {
    if (!currentTableInfo) return;
    const textarea = refToUse.current;
    const res = insertTableRow(currentTableInfo, position);
    const nextVal =
      localValue.slice(0, currentTableInfo.startOffset) +
      res.formatted +
      localValue.slice(currentTableInfo.endOffset);
    setLocalValue(nextVal);
    debouncedOnChange(nextVal);

    const newOffset = currentTableInfo.startOffset + findCellOffsetInTable(res.formatted, res.newCursorRow, res.newCursorCol);
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newOffset, newOffset);
        updateTableContext(nextVal, newOffset);
      }
    }, 20);
  }, [currentTableInfo, localValue, debouncedOnChange, refToUse, updateTableContext]);

  const handleDeleteRow = useCallback(() => {
    if (!currentTableInfo) return;
    const textarea = refToUse.current;
    const res = deleteTableRow(currentTableInfo);
    if (!res) return;
    const nextVal =
      localValue.slice(0, currentTableInfo.startOffset) +
      res.formatted +
      localValue.slice(currentTableInfo.endOffset);
    setLocalValue(nextVal);
    debouncedOnChange(nextVal);

    const newOffset = Math.min(nextVal.length, currentTableInfo.startOffset);
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newOffset, newOffset);
        updateTableContext(nextVal, newOffset);
      }
    }, 20);
  }, [currentTableInfo, localValue, debouncedOnChange, refToUse, updateTableContext]);

  const handleInsertCol = useCallback((position: 'left' | 'right') => {
    if (!currentTableInfo) return;
    const textarea = refToUse.current;
    const res = insertTableColumn(currentTableInfo, position);
    const nextVal =
      localValue.slice(0, currentTableInfo.startOffset) +
      res.formatted +
      localValue.slice(currentTableInfo.endOffset);
    setLocalValue(nextVal);
    debouncedOnChange(nextVal);

    const newOffset = currentTableInfo.startOffset + findCellOffsetInTable(res.formatted, currentTableInfo.cursorRowIndex, res.newCursorCol);
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newOffset, newOffset);
        updateTableContext(nextVal, newOffset);
      }
    }, 20);
  }, [currentTableInfo, localValue, debouncedOnChange, refToUse, updateTableContext]);

  const handleDeleteCol = useCallback(() => {
    if (!currentTableInfo) return;
    const textarea = refToUse.current;
    const res = deleteTableColumn(currentTableInfo);
    if (!res) return;
    const nextVal =
      localValue.slice(0, currentTableInfo.startOffset) +
      res.formatted +
      localValue.slice(currentTableInfo.endOffset);
    setLocalValue(nextVal);
    debouncedOnChange(nextVal);

    const newOffset = Math.min(nextVal.length, currentTableInfo.startOffset);
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newOffset, newOffset);
        updateTableContext(nextVal, newOffset);
      }
    }, 20);
  }, [currentTableInfo, localValue, debouncedOnChange, refToUse, updateTableContext]);

  const handleSetAlign = useCallback((align: 'left' | 'center' | 'right') => {
    if (!currentTableInfo) return;
    const textarea = refToUse.current;
    const formatted = setTableColumnAlign(currentTableInfo, align);
    const nextVal =
      localValue.slice(0, currentTableInfo.startOffset) +
      formatted +
      localValue.slice(currentTableInfo.endOffset);
    setLocalValue(nextVal);
    debouncedOnChange(nextVal);

    const curPos = textarea ? textarea.selectionStart : currentTableInfo.startOffset;
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(curPos, curPos);
        updateTableContext(nextVal, curPos);
      }
    }, 20);
  }, [currentTableInfo, localValue, debouncedOnChange, refToUse, updateTableContext]);

  const handleFormatTable = useCallback(() => {
    if (!currentTableInfo) return;
    const textarea = refToUse.current;
    const formatted = formatMarkdownTable(
      currentTableInfo.headers,
      currentTableInfo.alignments,
      currentTableInfo.rows
    );
    const nextVal =
      localValue.slice(0, currentTableInfo.startOffset) +
      formatted +
      localValue.slice(currentTableInfo.endOffset);
    setLocalValue(nextVal);
    debouncedOnChange(nextVal);

    const newOffset = currentTableInfo.startOffset + findCellOffsetInTable(
      formatted,
      currentTableInfo.cursorRowIndex,
      currentTableInfo.cursorColIndex
    );
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newOffset, newOffset);
        updateTableContext(nextVal, newOffset);
      }
    }, 20);
  }, [currentTableInfo, localValue, debouncedOnChange, refToUse, updateTableContext]);

  const handleApplyVisualModal = useCallback((newTableMarkdown: string) => {
    if (!currentTableInfo) return;
    const textarea = refToUse.current;
    const nextVal =
      localValue.slice(0, currentTableInfo.startOffset) +
      newTableMarkdown +
      localValue.slice(currentTableInfo.endOffset);
    setLocalValue(nextVal);
    debouncedOnChange(nextVal);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const pos = currentTableInfo.startOffset + 2;
        textarea.setSelectionRange(pos, pos);
        updateTableContext(nextVal, pos);
      }
    }, 20);
  }, [currentTableInfo, localValue, debouncedOnChange, refToUse, updateTableContext]);

  // Automatically scroll the selected item into view on keyboard navigation
  useEffect(() => {
    if (showSlashMenu && itemRefs.current[slashIndex]) {
      itemRefs.current[slashIndex]?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'auto'
      });
    }
  }, [slashIndex, showSlashMenu]);

  // Reset selected index when filter query changes
  useEffect(() => {
    setSlashIndex(0);
  }, [slashFilter]);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const isSyncScrolling = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronous scrolling in Split View Mode
  useEffect(() => {
    if (editorTab !== 'split') return;

    const editorEl = refToUse.current;
    const previewEl = previewContainerRef.current;
    if (!editorEl || !previewEl) return;

    const handleEditorScroll = () => {
      if (isSyncScrolling.current === 'preview') return;
      const maxEditor = editorEl.scrollHeight - editorEl.clientHeight;
      if (maxEditor <= 0) return;
      const ratio = editorEl.scrollTop / maxEditor;
      const maxPreview = previewEl.scrollHeight - previewEl.clientHeight;
      
      isSyncScrolling.current = 'editor';
      previewEl.scrollTop = ratio * maxPreview;

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isSyncScrolling.current = null;
      }, 40);
    };

    const handlePreviewScroll = () => {
      if (isSyncScrolling.current === 'editor') return;
      const maxPreview = previewEl.scrollHeight - previewEl.clientHeight;
      if (maxPreview <= 0) return;
      const ratio = previewEl.scrollTop / maxPreview;
      const maxEditor = editorEl.scrollHeight - editorEl.clientHeight;

      isSyncScrolling.current = 'preview';
      editorEl.scrollTop = ratio * maxEditor;

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isSyncScrolling.current = null;
      }, 40);
    };

    editorEl.addEventListener('scroll', handleEditorScroll, { passive: true });
    previewEl.addEventListener('scroll', handlePreviewScroll, { passive: true });

    return () => {
      editorEl.removeEventListener('scroll', handleEditorScroll);
      previewEl.removeEventListener('scroll', handlePreviewScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [editorTab, refToUse]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    debouncedOnChange(val);

    const cursor = e.target.selectionStart;
    updateTableContext(val, cursor);
    // Check if user just typed `/` at start of line or after whitespace
    const textBefore = val.slice(0, cursor);
    const lastSlashIdx = textBefore.lastIndexOf('/');

    if (lastSlashIdx !== -1 && (lastSlashIdx === 0 || /\s/.test(val[lastSlashIdx - 1]))) {
      const query = textBefore.slice(lastSlashIdx + 1);
      if (!query.includes('\n') && query.length <= 15) {
        slashTriggerPos.current = lastSlashIdx;
        setSlashFilter(query);
        setShowSlashMenu(true);
        setSlashIndex(0);

        // Approximate popover position near cursor
        if (refToUse.current) {
          const lines = textBefore.split('\n');
          const lineIndex = lines.length;
          const approxTop = Math.min(refToUse.current.clientHeight - 240, Math.max(10, (lineIndex - 1) * 20 + 20));
          setSlashPosition({ top: approxTop, left: 16 });
        }
        return;
      }
    }

    if (showSlashMenu) {
      setShowSlashMenu(false);
    }
  };

  const handleBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onChange(localValue);
    // Delay closing slash menu to allow clicking
    setTimeout(() => {
      setShowSlashMenu(false);
    }, 200);
  };

  // Insert a slash command snippet
  const executeSlashCommand = useCallback((item: SlashCommandItem) => {
    const textarea = refToUse.current;
    if (!textarea) return;

    const currentVal = localValue;
    const triggerPos = slashTriggerPos.current >= 0 ? slashTriggerPos.current : textarea.selectionStart;
    const cursorPos = textarea.selectionStart;

    // Remove the `/query` text
    const beforeSlash = currentVal.slice(0, triggerPos);
    const afterCursor = currentVal.slice(cursorPos);
    const nextVal = beforeSlash + item.insertText + afterCursor;

    setLocalValue(nextVal);
    debouncedOnChange(nextVal);
    setShowSlashMenu(false);
    slashTriggerPos.current = -1;

    setTimeout(() => {
      if (refToUse.current) {
        refToUse.current.focus();
        const offset = item.cursorOffset !== undefined ? item.cursorOffset : item.insertText.length;
        const newPos = triggerPos + offset;
        refToUse.current.setSelectionRange(newPos, newPos);
      }
    }, 20);
  }, [localValue, debouncedOnChange, refToUse]);

  const filteredCommands = SLASH_COMMANDS.filter((cmd) => {
    if (!slashFilter.trim()) return true;
    const q = slashFilter.toLowerCase();
    return (
      cmd.id.toLowerCase().includes(q) ||
      cmd.label.toLowerCase().includes(q) ||
      cmd.sublabel.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { key, shiftKey } = e;
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd } = textarea;
    const currentVal = localValue;

    // Handle Slash Menu Navigation when open
    if (showSlashMenu && filteredCommands.length > 0) {
      if (key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (key === 'Enter' || key === 'Tab') {
        e.preventDefault();
        if (filteredCommands[slashIndex]) {
          executeSlashCommand(filteredCommands[slashIndex]);
        }
        return;
      }
      if (key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    // 1. SMART ENTER KEY (Table, List Continuation & Auto-Increment)
    if (key === 'Enter' && !shiftKey) {
      // (0) Smart Table Enter: create new row below, or exit table if row is empty
      const tableInfo = getTableAtCursor(currentVal, selectionStart);
      if (tableInfo) {
        e.preventDefault();
        const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
        let lineEnd = currentVal.indexOf('\n', selectionStart);
        if (lineEnd === -1) lineEnd = currentVal.length;
        const currentLine = currentVal.slice(lineStart, lineEnd);
        const cells = splitTableRow(currentLine);
        const isBlankRow = !tableInfo.isHeader && !tableInfo.isSeparator && cells.every((c) => c.trim() === '');

        if (isBlankRow) {
          // Exit table cleanly
          const beforeTableLine = currentVal.slice(0, lineStart);
          const afterTableLine = currentVal.slice(lineEnd);
          const nextVal = beforeTableLine + '\n' + (afterTableLine.startsWith('\n') ? afterTableLine.slice(1) : afterTableLine);
          setLocalValue(nextVal);
          debouncedOnChange(nextVal);
          setTimeout(() => {
            if (refToUse.current) {
              refToUse.current.setSelectionRange(lineStart, lineStart);
              updateTableContext(nextVal, lineStart);
            }
          }, 0);
          return;
        }

        // Insert new row below
        const res = insertTableRow(tableInfo, 'below');
        const nextVal =
          currentVal.slice(0, tableInfo.startOffset) +
          res.formatted +
          currentVal.slice(tableInfo.endOffset);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            const newPos =
              tableInfo.startOffset +
              findCellOffsetInTable(res.formatted, res.newCursorRow, 0);
            refToUse.current.setSelectionRange(newPos, newPos);
            updateTableContext(nextVal, newPos);
          }
        }, 0);
        return;
      }

      // Find the current line before the cursor
      const lastNewline = currentVal.lastIndexOf('\n', selectionStart - 1);
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
      const currentLine = currentVal.slice(lineStart, selectionStart);

      // (A) Task List Item: `- [ ] `, `- [x] `, `[ ] `, `[x] `
      const taskMatch = currentLine.match(/^(\s*)(?:[-*+]\s+)?\[([ xXvVoO\u2713\u2714\u2611\u25A0\u25CF])\]\s*(.*)$/);
      if (taskMatch) {
        e.preventDefault();
        const indent = taskMatch[1];
        const taskContent = taskMatch[3];

        // If the task line is empty, pressing Enter cleans the line (exits task list)
        if (!taskContent.trim()) {
          const nextVal = currentVal.slice(0, lineStart) + indent + currentVal.slice(selectionStart);
          setLocalValue(nextVal);
          debouncedOnChange(nextVal);
          setTimeout(() => {
            if (refToUse.current) {
              refToUse.current.setSelectionRange(lineStart + indent.length, lineStart + indent.length);
            }
          }, 0);
          return;
        }

        // Auto-continue with an unchecked item: `- [ ] `
        const continuation = `\n${indent}- [ ] `;
        const nextVal = currentVal.slice(0, selectionStart) + continuation + currentVal.slice(selectionEnd);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            const newPos = selectionStart + continuation.length;
            refToUse.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }

      // (B) Numbered List Item: `1. `, `2) `, `10. `
      const numMatch = currentLine.match(/^(\s*)(\d+)([.)])\s+(.*)$/);
      if (numMatch) {
        e.preventDefault();
        const indent = numMatch[1];
        const numVal = parseInt(numMatch[2], 10);
        const delimiter = numMatch[3];
        const itemContent = numMatch[4];

        // If the numbered line is empty, pressing Enter exits the list
        if (!itemContent.trim()) {
          const nextVal = currentVal.slice(0, lineStart) + indent + currentVal.slice(selectionStart);
          setLocalValue(nextVal);
          debouncedOnChange(nextVal);
          setTimeout(() => {
            if (refToUse.current) {
              refToUse.current.setSelectionRange(lineStart + indent.length, lineStart + indent.length);
            }
          }, 0);
          return;
        }

        // Auto-increment number
        const nextNum = numVal + 1;
        const continuation = `\n${indent}${nextNum}${delimiter} `;
        const nextVal = currentVal.slice(0, selectionStart) + continuation + currentVal.slice(selectionEnd);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            const newPos = selectionStart + continuation.length;
            refToUse.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }

      // (C) Unordered Bullet List: `- `, `* `, `+ `
      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bulletChar = bulletMatch[2];
        const itemContent = bulletMatch[3];

        // If empty bullet line, exit list
        if (!itemContent.trim()) {
          const nextVal = currentVal.slice(0, lineStart) + indent + currentVal.slice(selectionStart);
          setLocalValue(nextVal);
          debouncedOnChange(nextVal);
          setTimeout(() => {
            if (refToUse.current) {
              refToUse.current.setSelectionRange(lineStart + indent.length, lineStart + indent.length);
            }
          }, 0);
          return;
        }

        // Auto-continue bullet item
        const continuation = `\n${indent}${bulletChar} `;
        const nextVal = currentVal.slice(0, selectionStart) + continuation + currentVal.slice(selectionEnd);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            const newPos = selectionStart + continuation.length;
            refToUse.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }

      // (D) Blockquote: `> `
      const quoteMatch = currentLine.match(/^(\s*)(>+)\s?(.*)$/);
      if (quoteMatch) {
        e.preventDefault();
        const indent = quoteMatch[1];
        const quotes = quoteMatch[2];
        const quoteContent = quoteMatch[3];

        if (!quoteContent.trim()) {
          const nextVal = currentVal.slice(0, lineStart) + indent + currentVal.slice(selectionStart);
          setLocalValue(nextVal);
          debouncedOnChange(nextVal);
          setTimeout(() => {
            if (refToUse.current) {
              refToUse.current.setSelectionRange(lineStart + indent.length, lineStart + indent.length);
            }
          }, 0);
          return;
        }

        const continuation = `\n${indent}${quotes} `;
        const nextVal = currentVal.slice(0, selectionStart) + continuation + currentVal.slice(selectionEnd);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            const newPos = selectionStart + continuation.length;
            refToUse.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }

      // (E) Standard Indented Code / Text Line: preserve leading indentation
      const indentMatch = currentLine.match(/^(\s{2,})(.*)$/);
      if (indentMatch) {
        e.preventDefault();
        const indent = indentMatch[1];
        const continuation = `\n${indent}`;
        const nextVal = currentVal.slice(0, selectionStart) + continuation + currentVal.slice(selectionEnd);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            const newPos = selectionStart + continuation.length;
            refToUse.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }
    }

    // 2. SMART TAB & SHIFT+TAB (Table Cell Nav, Multi-line Indent & List Outdent)
    if (key === 'Tab') {
      e.preventDefault();

      // (0) Smart Table Cell Navigation
      const tableInfo = getTableAtCursor(currentVal, selectionStart);
      if (tableInfo) {
        const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
        let lineEnd = currentVal.indexOf('\n', selectionStart);
        if (lineEnd === -1) lineEnd = currentVal.length;
        const currentLine = currentVal.slice(lineStart, lineEnd);
        const relPos = selectionStart - lineStart;

        if (shiftKey) {
          // Shift+Tab: Previous cell
          let prevPipeRel = -1;
          for (let i = relPos - 1; i >= 0; i--) {
            if (currentLine[i] === '|' && (i === 0 || currentLine[i - 1] !== '\\')) {
              prevPipeRel = i;
              break;
            }
          }

          if (prevPipeRel > 0) {
            let startOfPrevCell = 0;
            for (let i = prevPipeRel - 1; i >= 0; i--) {
              if (currentLine[i] === '|' && (i === 0 || currentLine[i - 1] !== '\\')) {
                startOfPrevCell = i + 1;
                break;
              }
            }
            if (currentLine[startOfPrevCell] === ' ') startOfPrevCell++;
            const newPos = lineStart + startOfPrevCell;
            refToUse.current?.setSelectionRange(newPos, newPos);
            updateTableContext(currentVal, newPos);
          } else if (tableInfo.cursorRowIndex > 0) {
            const prevRowIdx = tableInfo.cursorRowIndex === 2 ? 0 : tableInfo.cursorRowIndex - 1;
            const newPos =
              tableInfo.startOffset +
              findCellOffsetInTable(
                tableInfo.lines.join('\n'),
                prevRowIdx,
                tableInfo.totalCols - 1
              );
            refToUse.current?.setSelectionRange(newPos, newPos);
            updateTableContext(currentVal, newPos);
          }
          return;
        } else {
          // Tab: Next cell
          let nextPipeRel = -1;
          for (let i = relPos; i < currentLine.length; i++) {
            if (currentLine[i] === '|' && (i === 0 || currentLine[i - 1] !== '\\')) {
              nextPipeRel = i;
              break;
            }
          }

          const hasMoreCellsInLine =
            nextPipeRel !== -1 &&
            currentLine.slice(nextPipeRel + 1).includes('|');

          if (hasMoreCellsInLine) {
            let nextCellStart = nextPipeRel + 1;
            if (currentLine[nextCellStart] === ' ') nextCellStart++;
            const newPos = lineStart + nextCellStart;
            refToUse.current?.setSelectionRange(newPos, newPos);
            updateTableContext(currentVal, newPos);
          } else {
            // Next row or auto-insert new row at end
            if (tableInfo.cursorRowIndex + 1 < tableInfo.lines.length) {
              const nextRowIdx =
                tableInfo.cursorRowIndex === 0 ? 2 : tableInfo.cursorRowIndex + 1;
              const newPos =
                tableInfo.startOffset +
                findCellOffsetInTable(tableInfo.lines.join('\n'), nextRowIdx, 0);
              refToUse.current?.setSelectionRange(newPos, newPos);
              updateTableContext(currentVal, newPos);
            } else {
              // Auto-insert row below at end of table
              const res = insertTableRow(tableInfo, 'below');
              const nextVal =
                currentVal.slice(0, tableInfo.startOffset) +
                res.formatted +
                currentVal.slice(tableInfo.endOffset);
              setLocalValue(nextVal);
              debouncedOnChange(nextVal);
              setTimeout(() => {
                if (refToUse.current) {
                  const newPos =
                    tableInfo.startOffset +
                    findCellOffsetInTable(res.formatted, res.newCursorRow, 0);
                  refToUse.current.setSelectionRange(newPos, newPos);
                  updateTableContext(nextVal, newPos);
                }
              }, 0);
            }
          }
          return;
        }
      }

      // Multi-line or Single-line block indent/outdent
      const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
      let lineEnd = currentVal.indexOf('\n', selectionEnd);
      if (lineEnd === -1) lineEnd = currentVal.length;

      const lines = currentVal.slice(lineStart, lineEnd).split('\n');

      if (shiftKey) {
        // Shift+Tab: Unindent (remove up to 2 leading spaces)
        let removedChars = 0;
        const newLines = lines.map((line) => {
          if (line.startsWith('  ')) {
            removedChars += 2;
            return line.slice(2);
          }
          if (line.startsWith(' ')) {
            removedChars += 1;
            return line.slice(1);
          }
          return line;
        });
        const replacedBlock = newLines.join('\n');
        const nextVal = currentVal.slice(0, lineStart) + replacedBlock + currentVal.slice(lineEnd);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            refToUse.current.setSelectionRange(
              Math.max(lineStart, selectionStart - (selectionStart === lineStart ? 0 : 2)),
              Math.max(lineStart, selectionEnd - removedChars)
            );
          }
        }, 0);
        return;
      } else {
        // Tab: If selection spans multiple lines, indent all selected lines
        if (lines.length > 1 || selectionStart !== selectionEnd) {
          const newLines = lines.map((line) => '  ' + line);
          const replacedBlock = newLines.join('\n');
          const nextVal = currentVal.slice(0, lineStart) + replacedBlock + currentVal.slice(lineEnd);
          setLocalValue(nextVal);
          debouncedOnChange(nextVal);
          setTimeout(() => {
            if (refToUse.current) {
              refToUse.current.setSelectionRange(selectionStart + 2, selectionEnd + lines.length * 2);
            }
          }, 0);
          return;
        }

        // Single cursor Tab: insert 2 spaces
        const nextVal = currentVal.slice(0, selectionStart) + '  ' + currentVal.slice(selectionEnd);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            refToUse.current.selectionStart = selectionStart + 2;
            refToUse.current.selectionEnd = selectionStart + 2;
          }
        }, 0);
        return;
      }
    }

    // 3. SMART BACKSPACE (Smart Pair Deletion & List Prefix Quick Removal)
    if (key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
      const charBefore = currentVal[selectionStart - 1];
      const charAfter = currentVal[selectionStart];

      // Auto-pair deletion: () [] {} "" '' `` ** ~~ == $$
      const pairMap: Record<string, string> = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
        '`': '`',
        '*': '*',
        '~': '~',
        '=': '=',
        '$': '$'
      };

      if (pairMap[charBefore] === charAfter) {
        e.preventDefault();
        const nextVal = currentVal.slice(0, selectionStart - 1) + currentVal.slice(selectionStart + 1);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            refToUse.current.setSelectionRange(selectionStart - 1, selectionStart - 1);
          }
        }, 0);
        return;
      }

      // Check if cursor is right after an empty list prefix (e.g. `- `, `1. `, `- [ ] `, `> `)
      const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = currentVal.slice(lineStart, selectionStart);
      const emptyListPrefixMatch = currentLine.match(/^(\s*)(?:[-*+]\s+|\d+[.)]\s+|>\s*|(?:[-*+]\s+)?\[[ xX]\]\s+)$/);
      if (emptyListPrefixMatch) {
        e.preventDefault();
        const indent = emptyListPrefixMatch[1];
        const nextVal = currentVal.slice(0, lineStart) + indent + currentVal.slice(selectionStart);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);
        setTimeout(() => {
          if (refToUse.current) {
            refToUse.current.setSelectionRange(lineStart + indent.length, lineStart + indent.length);
          }
        }, 0);
        return;
      }
    }

    // 4. SMART PAIR AUTO-COMPLETION
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`',
      '*': '*',
      '~': '~',
      '=': '=',
      '$': '$'
    };

    if (pairs[key]) {
      const closingSymbol = pairs[key];
      // Only complete single-character wrap if text selected or appropriate
      if (selectionStart !== selectionEnd) {
        e.preventDefault();
        const selectedText = currentVal.slice(selectionStart, selectionEnd);
        const nextVal =
          currentVal.slice(0, selectionStart) +
          key +
          selectedText +
          closingSymbol +
          currentVal.slice(selectionEnd);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);

        setTimeout(() => {
          if (refToUse.current) {
            refToUse.current.selectionStart = selectionStart + 1;
            refToUse.current.selectionEnd = selectionEnd + 1;
          }
        }, 0);
        return;
      } else if (['(', '[', '{', '"', "'", '`', '$'].includes(key)) {
        e.preventDefault();
        const nextVal =
          currentVal.slice(0, selectionStart) +
          key +
          closingSymbol +
          currentVal.slice(selectionStart);
        setLocalValue(nextVal);
        debouncedOnChange(nextVal);

        setTimeout(() => {
          if (refToUse.current) {
            refToUse.current.selectionStart = selectionStart + 1;
            refToUse.current.selectionEnd = selectionStart + 1;
          }
        }, 0);
        return;
      }
    }
  };

  const renderSlashMenu = () => (
    <div
      id="slash-autocomplete-menu"
      style={{ top: `${slashPosition.top}px`, left: `${slashPosition.left}px` }}
      className="absolute z-50 w-72 max-h-72 flex flex-col bg-[#1e202b]/98 backdrop-blur-md border border-[#2e3142] rounded-xl shadow-2xl p-1.5 text-xs text-[#e2e8f0] animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
      onMouseDown={(e) => e.preventDefault()} // Prevent textarea blur on click
    >
      <div className="shrink-0 px-2 py-1 mb-1 border-b border-[#2e3142] flex items-center justify-between text-[0.625rem] text-[#94a3b8] font-semibold uppercase tracking-wider">
        <span className="flex items-center gap-1 text-[#6366f1]">
          <Sparkles className="w-3 h-3 text-[#6366f1]" />
          마크다운 자동 완성
        </span>
        <span className="font-mono text-[0.5625rem] text-[#94a3b8]/60">↑↓ 이동 · ↵ 선택</span>
      </div>

      {filteredCommands.length === 0 ? (
        <div className="p-3 text-center text-[#94a3b8]/60 italic text-[0.6875rem]">
          일치하는 마크다운 명령어가 없습니다.
        </div>
      ) : (
        <div ref={listContainerRef} className="flex-1 overflow-y-auto space-y-0.5 max-h-56 pr-0.5 custom-scrollbar">
          {filteredCommands.map((cmd, idx) => {
            const isSelected = idx === slashIndex;
            return (
              <button
                key={cmd.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => executeSlashCommand(cmd)}
                onMouseEnter={() => setSlashIndex(idx)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'bg-[#6366f1] text-white font-medium shadow-xs'
                    : 'text-[#e2e8f0] hover:bg-[#282a38] hover:text-white'
                }`}
              >
                <span className="shrink-0">{cmd.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs leading-tight truncate">{cmd.label}</div>
                  <div className={`text-[0.625rem] truncate ${isSelected ? 'text-indigo-100' : 'text-[#94a3b8]'}`}>
                    {cmd.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const trimmed = (localValue || '').trim();
  const isHtmlDoc =
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    (trimmed.startsWith('<div') && trimmed.includes('class="sheet-card"'));

  if (editorTab === 'preview') {
    if (isHtmlDoc) {
      return (
        <iframe
          id="html-preview-frame"
          srcDoc={localValue}
          title="Interactive Document Preview"
          style={{ background: 'var(--bg-editor)' }}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-modals"
        />
      );
    }

    return (
      <div
        id="markdown-preview"
        style={{
          background: 'var(--bg-editor)',
          color: 'var(--text-primary)'
        }}
        className="w-full h-full p-4 overflow-y-auto text-xs leading-normal font-sans select-text break-words [word-break:break-word] [overflow-wrap:anywhere] markdown-preview prose prose-invert max-w-none custom-scrollbar"
        dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(localValue) }}
      />
    );
  }

  if (editorTab === 'split') {
    return (
      <div
        style={{ background: 'var(--bg-editor)' }}
        className="relative w-full h-full flex flex-row overflow-hidden"
      >
        {/* Left 50%: Editor Textarea */}
        <div
          style={{ borderColor: 'var(--border-color)' }}
          className="w-1/2 h-full flex flex-col relative border-r min-w-0"
        >
          {currentTableInfo && (
            <TableContextBar
              tableInfo={currentTableInfo}
              onInsertRow={handleInsertRow}
              onDeleteRow={handleDeleteRow}
              onInsertCol={handleInsertCol}
              onDeleteCol={handleDeleteCol}
              onSetAlign={handleSetAlign}
              onFormatTable={handleFormatTable}
              onOpenVisualModal={() => setIsVisualModalOpen(true)}
            />
          )}

          <textarea
            id="markdown-editor"
            ref={refToUse}
            value={localValue}
            onFocus={(e) => {
              onFocus?.();
              updateTableContext(localValue, e.currentTarget.selectionStart);
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onClick={(e) => updateTableContext(localValue, e.currentTarget.selectionStart)}
            onKeyUp={(e) => updateTableContext(localValue, e.currentTarget.selectionStart)}
            onSelect={(e) => updateTableContext(localValue, e.currentTarget.selectionStart)}
            placeholder={placeholder || "마크다운을 입력하세요. '/'를 입력하여 자동 완성 메뉴를 열거나 단축키를 사용할 수 있습니다."}
            spellCheck={false}
            style={{
              background: 'var(--bg-editor)',
              color: 'var(--text-main)'
            }}
            className="w-full flex-1 font-mono text-xs p-3.5 resize-none border-none focus:outline-none leading-relaxed selection:bg-[#6366f1]/40 selection:text-white placeholder:opacity-40 whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] custom-scrollbar"
          />

          {/* Floating Slash Command / Markdown Autocomplete Menu */}
          {showSlashMenu && renderSlashMenu()}
        </div>

        {/* Right 50%: Live Synchronous Preview */}
        <div
          style={{ background: 'var(--bg-editor)' }}
          className="w-1/2 h-full flex flex-col min-w-0"
        >
          <div
            style={{
              background: 'var(--bg-panel)',
              borderColor: 'var(--border-color)'
            }}
            className="px-3 py-1 backdrop-blur-md border-b text-[0.625rem] font-semibold flex items-center justify-between shrink-0 select-none"
          >
            <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <Eye className="w-3 h-3" />
              <span>실시간 미리보기 (Live Preview)</span>
            </span>
            <span className="text-[0.5625rem] opacity-75 font-mono flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-pulse" />
              <span>동기화 스크롤 On</span>
            </span>
          </div>

          {isHtmlDoc ? (
            <iframe
              id="html-preview-frame-split"
              srcDoc={localValue}
              title="Interactive Document Preview"
              style={{ background: 'var(--bg-editor)' }}
              className="w-full flex-1 border-none"
              sandbox="allow-scripts allow-same-origin allow-modals"
            />
          ) : (
            <div
              id="markdown-preview-split"
              ref={previewContainerRef}
              style={{
                background: 'var(--bg-editor)',
                color: 'var(--text-primary)'
              }}
              className="flex-1 w-full p-3.5 overflow-y-auto text-xs leading-normal font-sans select-text break-words [word-break:break-word] [overflow-wrap:anywhere] markdown-preview prose prose-invert max-w-none custom-scrollbar"
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(localValue) }}
            />
          )}
        </div>

        {/* Visual Table Modal if opened in split mode */}
        {isVisualModalOpen && currentTableInfo && (
          <VisualTableModal
            tableInfo={currentTableInfo}
            onApply={handleApplyVisualModal}
            onClose={() => setIsVisualModalOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      style={{ background: 'var(--bg-editor)' }}
      className="relative w-full h-full flex flex-col"
    >
      {currentTableInfo && (
        <TableContextBar
          tableInfo={currentTableInfo}
          onInsertRow={handleInsertRow}
          onDeleteRow={handleDeleteRow}
          onInsertCol={handleInsertCol}
          onDeleteCol={handleDeleteCol}
          onSetAlign={handleSetAlign}
          onFormatTable={handleFormatTable}
          onOpenVisualModal={() => setIsVisualModalOpen(true)}
        />
      )}

      <textarea
        id="markdown-editor"
        ref={refToUse}
        value={localValue}
        onFocus={(e) => {
          onFocus?.();
          updateTableContext(localValue, e.currentTarget.selectionStart);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onClick={(e) => updateTableContext(localValue, e.currentTarget.selectionStart)}
        onKeyUp={(e) => updateTableContext(localValue, e.currentTarget.selectionStart)}
        onSelect={(e) => updateTableContext(localValue, e.currentTarget.selectionStart)}
        placeholder={placeholder || "마크다운을 입력하세요. '/'를 입력하여 자동 완성 메뉴를 열거나 단축키를 사용할 수 있습니다."}
        spellCheck={false}
        style={{
          background: 'var(--bg-editor)',
          color: 'var(--text-main)'
        }}
        className="w-full flex-1 font-mono text-xs p-3.5 resize-none border-none focus:outline-none leading-relaxed selection:bg-[#6366f1]/40 selection:text-white placeholder:opacity-40 whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] custom-scrollbar"
      />

      {/* Floating Slash Command / Markdown Autocomplete Menu */}
      {showSlashMenu && renderSlashMenu()}

      {/* Visual Table Modal if opened in edit mode */}
      {isVisualModalOpen && currentTableInfo && (
        <VisualTableModal
          tableInfo={currentTableInfo}
          onApply={handleApplyVisualModal}
          onClose={() => setIsVisualModalOpen(false)}
        />
      )}
    </div>
  );
});

OptimizedEditor.displayName = 'OptimizedEditor';
