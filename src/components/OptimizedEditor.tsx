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
    icon: <List className="w-3.5 h-3.5 text-emerald-400" />,
    category: 'lists',
    insertText: '- 항목 1\n- 항목 2\n- 항목 3\n',
    cursorOffset: 2
  },
  {
    id: 'numbered',
    label: '1. 번호 매기기 목록',
    sublabel: '순서가 있는 순차 목록',
    icon: <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />,
    category: 'lists',
    insertText: '1. 첫 번째 항목\n2. 두 번째 항목\n3. 세 번째 항목\n',
    cursorOffset: 3
  },
  {
    id: 'task',
    label: '- [ ] 할 일 체크박스',
    sublabel: '인터랙티브 태스크 목록',
    icon: <CheckSquare className="w-3.5 h-3.5 text-blue-400" />,
    category: 'lists',
    insertText: '- [ ] 할 일 1\n- [ ] 할 일 2\n- [x] 완료된 일\n',
    cursorOffset: 6
  },
  {
    id: 'codeblock',
    label: '``` 코드 블록',
    sublabel: '문법 하이라이팅 코드 블록',
    icon: <Code className="w-3.5 h-3.5 text-amber-400" />,
    category: 'blocks',
    insertText: '```typescript\n// 코드를 작성하세요\nconsole.log("Hello, World!");\n```\n',
    cursorOffset: 15
  },
  {
    id: 'table',
    label: '| 표 (Table)',
    sublabel: '3x3 마크다운 데이터 표',
    icon: <TableIcon className="w-3.5 h-3.5 text-cyan-400" />,
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
    icon: <Sparkles className="w-3.5 h-3.5 text-blue-400" />,
    category: 'blocks',
    insertText: '> [!NOTE]\n> 중요한 정보나 참고 사항을 작성하세요.\n',
    cursorOffset: 12
  },
  {
    id: 'tip',
    label: '> [!TIP] 유용한 팁',
    sublabel: 'GitHub 스타일 팁 알림',
    icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
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

    // 1. SMART ENTER KEY (List Continuation & Auto-Increment)
    if (key === 'Enter' && !shiftKey) {
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

    // 2. SMART TAB & SHIFT+TAB (Multi-line Indent & List Outdent)
    if (key === 'Tab') {
      e.preventDefault();

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
      className="absolute z-50 w-72 max-h-72 flex flex-col bg-[#18181b]/98 backdrop-blur-md border border-[#3f3f46] rounded-lg shadow-2xl p-1.5 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
      onMouseDown={(e) => e.preventDefault()} // Prevent textarea blur on click
    >
      <div className="shrink-0 px-2 py-1 mb-1 border-b border-[#27272a] flex items-center justify-between text-[0.625rem] text-zinc-400 font-semibold uppercase tracking-wider">
        <span className="flex items-center gap-1 text-sky-300">
          <Sparkles className="w-3 h-3 text-amber-400" />
          마크다운 자동 완성
        </span>
        <span className="font-mono text-[0.5625rem] text-zinc-500">↑↓ 이동 · ↵ 선택</span>
      </div>

      {filteredCommands.length === 0 ? (
        <div className="p-3 text-center text-zinc-500 italic text-[0.6875rem]">
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
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-left transition-colors ${
                  isSelected
                    ? 'bg-sky-600 text-white font-medium shadow-xs'
                    : 'text-zinc-300 hover:bg-[#27272a] hover:text-zinc-100'
                }`}
              >
                <span className="shrink-0">{cmd.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs leading-tight truncate">{cmd.label}</div>
                  <div className={`text-[0.625rem] truncate ${isSelected ? 'text-sky-200' : 'text-zinc-400'}`}>
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
          className="w-full h-full border-none bg-[#1e1e22]"
          sandbox="allow-scripts allow-same-origin allow-modals"
        />
      );
    }

    return (
      <div
        id="markdown-preview"
        className="w-full h-full bg-[#1e1e22] p-4 overflow-y-auto text-xs text-zinc-200 leading-normal font-sans select-text break-words [word-break:break-word] [overflow-wrap:anywhere] markdown-preview prose prose-invert max-w-none custom-scrollbar"
        dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(localValue) }}
      />
    );
  }

  if (editorTab === 'split') {
    return (
      <div className="relative w-full h-full flex flex-row overflow-hidden bg-[#1e1e22]">
        {/* Left 50%: Editor Textarea */}
        <div className="w-1/2 h-full flex flex-col relative border-r border-[#27272a] min-w-0">
          <textarea
            id="markdown-editor"
            ref={refToUse}
            value={localValue}
            onFocus={onFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            placeholder={placeholder || "마크다운을 입력하세요. '/'를 입력하여 자동 완성 메뉴를 열거나 단축키를 사용할 수 있습니다."}
            spellCheck={true}
            className="w-full flex-1 bg-[#1e1e22] text-zinc-200 font-mono text-xs p-3.5 resize-none border-none focus:outline-none leading-relaxed selection:bg-sky-500/25 selection:text-white placeholder:text-zinc-600 whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] custom-scrollbar"
          />

          {/* Floating Slash Command / Markdown Autocomplete Menu */}
          {showSlashMenu && renderSlashMenu()}
        </div>

        {/* Right 50%: Live Synchronous Preview */}
        <div className="w-1/2 h-full flex flex-col bg-[#1e1e22] min-w-0">
          <div className="px-3 py-1 bg-[#18181b] border-b border-[#27272a] text-[0.625rem] text-sky-300 font-semibold flex items-center justify-between shrink-0 select-none">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-sky-400" />
              <span>실시간 미리보기 (Live Preview)</span>
            </span>
            <span className="text-[0.5625rem] text-zinc-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>동기화 스크롤 On</span>
            </span>
          </div>

          {isHtmlDoc ? (
            <iframe
              id="html-preview-frame-split"
              srcDoc={localValue}
              title="Interactive Document Preview"
              className="w-full flex-1 border-none bg-[#1e1e22]"
              sandbox="allow-scripts allow-same-origin allow-modals"
            />
          ) : (
            <div
              id="markdown-preview-split"
              ref={previewContainerRef}
              className="flex-1 w-full p-3.5 overflow-y-auto text-xs text-zinc-200 leading-normal font-sans select-text break-words [word-break:break-word] [overflow-wrap:anywhere] markdown-preview prose prose-invert max-w-none custom-scrollbar"
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(localValue) }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-[#1e1e22]">
      <textarea
        id="markdown-editor"
        ref={refToUse}
        value={localValue}
        onFocus={onFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        placeholder={placeholder || "마크다운을 입력하세요. '/'를 입력하여 자동 완성 메뉴를 열거나 단축키를 사용할 수 있습니다."}
        spellCheck={true}
        className="w-full flex-1 bg-[#1e1e22] text-zinc-200 font-mono text-xs p-3.5 resize-none border-none focus:outline-none leading-relaxed selection:bg-sky-500/25 selection:text-white placeholder:text-zinc-600 whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere] custom-scrollbar"
      />

      {/* Floating Slash Command / Markdown Autocomplete Menu */}
      {showSlashMenu && renderSlashMenu()}
    </div>
  );
});

OptimizedEditor.displayName = 'OptimizedEditor';
