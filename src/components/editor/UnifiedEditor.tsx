/**
 * UnifiedEditor Component
 * Consolidates Tiptap WYSIWYG, Markdown source editor, Table helpers, and Freeform drawing overlay
 * into a single controlled component adhering to Phase 2 modularization.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Pen,
  BookOpen,
  Split,
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote
} from 'lucide-react';
import { OptimizedEditor } from './OptimizedEditor';
import { FreeformDrawingOverlay } from './FreeformDrawingOverlay';
import { TableGridPicker } from './TableGridPicker';
import { TiptapWysiwygEditorRef } from './TiptapWysiwygEditor';
import { renderMarkdownToHtml as defaultRenderMarkdownToHtml } from '../../utils/markdownParser';

export interface UnifiedEditorRef {
  applyFormat: (action: string) => void;
  focus?: () => void;
  getMode?: () => string;
  setMode?: (mode: string) => void;
}

export interface UnifiedEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  mode: 'wysiwyg' | 'markdown' | string;
  onModeChange?: (mode: 'wysiwyg' | 'markdown' | string) => void;
  readOnly?: boolean;
  fontSize?: number;
  theme?: string;
  onSave?: (content: string) => void;
  onCursorActivity?: (meta: { line: number; col: number; wordCount: number }) => void;

  // Extended optional properties for rich IDE workspace integration
  placeholder?: string;
  renderMarkdownToHtml?: (md: string) => string;
  onFocus?: () => void;
  editorRef?: React.RefObject<HTMLTextAreaElement | null>;
  tiptapRef?: React.Ref<TiptapWysiwygEditorRef>;
  ref?: React.Ref<UnifiedEditorRef>;
  apiRef?: React.Ref<UnifiedEditorRef>;
  isDrawingOpen?: boolean;
  onCloseDrawing?: () => void;
  showTablePicker?: boolean;
  onCloseTablePicker?: () => void;
  tableAnchorRef?: React.RefObject<HTMLElement | null>;
  onInsertTable?: (rows: number, cols: number) => void;
  onToast?: (message: string, type?: 'info' | 'warn' | 'error' | 'success') => void;
  className?: string;
}

export const UnifiedEditor: React.FC<UnifiedEditorProps> = (props) => {
  const {
    value,
    onChange,
    mode,
    onModeChange,
    readOnly = false,
    fontSize = 14,
    theme,
    onSave,
    onCursorActivity,
    placeholder = '# 마크다운 노트\n\n내용을 작성하세요...',
    renderMarkdownToHtml = defaultRenderMarkdownToHtml,
    onFocus,
    editorRef,
    tiptapRef,
    ref,
    apiRef,
    isDrawingOpen = false,
    onCloseDrawing,
    showTablePicker = false,
    onCloseTablePicker,
    tableAnchorRef,
    onInsertTable,
    onToast,
    className = '',
  } = props;
  const [internalMode, setInternalMode] = useState<string>(mode || 'wysiwyg');
  const internalEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const internalTiptapRef = useRef<TiptapWysiwygEditorRef | null>(null);

  const activeEditorRef = editorRef || internalEditorRef;

  // Keep internal mode in sync with incoming mode prop
  useEffect(() => {
    if (mode && mode !== internalMode) {
      setInternalMode(mode);
    }
  }, [mode]);

  const handleModeSelect = useCallback(
    (newMode: 'wysiwyg' | 'markdown' | 'split') => {
      setInternalMode(newMode);
      onModeChange?.(newMode);
    },
    [onModeChange]
  );

  const handleTiptapRef = useCallback(
    (instance: TiptapWysiwygEditorRef | null) => {
      internalTiptapRef.current = instance;
      if (typeof tiptapRef === 'function') {
        tiptapRef(instance);
      } else if (tiptapRef && 'current' in tiptapRef) {
        (tiptapRef as any).current = instance;
      }
    },
    [tiptapRef]
  );

  // Map UnifiedEditor mode to underlying tab
  const mappedEditorTab: 'wysiwyg' | 'edit' | 'split' | 'preview' =
    internalMode === 'wysiwyg'
      ? 'wysiwyg'
      : internalMode === 'split'
      ? 'split'
      : internalMode === 'preview'
      ? 'preview'
      : 'edit';

  // Dual-Mode formatting handler
  const applyFormat = useCallback(
    (action: string) => {
      const isWysiwyg = internalMode === 'wysiwyg';

      if (isWysiwyg) {
        const tiptap = internalTiptapRef.current;
        if (tiptap) {
          const editor = tiptap.getEditor ? tiptap.getEditor() : null;
          if (editor) {
            switch (action) {
              case 'bold':
                editor.chain().focus().toggleBold().run();
                break;
              case 'italic':
                editor.chain().focus().toggleItalic().run();
                break;
              case 'h1':
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                break;
              case 'h2':
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                break;
              case 'h3':
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                break;
              case 'bullet':
              case 'bulletList':
                editor.chain().focus().toggleBulletList().run();
                break;
              case 'number':
              case 'orderedList':
                editor.chain().focus().toggleOrderedList().run();
                break;
              case 'task':
              case 'taskList':
                editor.chain().focus().toggleTaskList().run();
                break;
              case 'quote':
              case 'blockquote':
                editor.chain().focus().toggleBlockquote().run();
                break;
              case 'codeblock':
              case 'codeBlock':
                editor.chain().focus().toggleCodeBlock().run();
                break;
              case 'code':
                editor.chain().focus().toggleCode().run();
                break;
              case 'rule':
              case 'horizontalRule':
                editor.chain().focus().setHorizontalRule().run();
                break;
              case 'strike':
              case 'strikethrough':
                editor.chain().focus().toggleStrike().run();
                break;
              default:
                tiptap.executeCommand(action);
                break;
            }
          } else {
            tiptap.executeCommand(action);
          }
        }
        return;
      }

      // Markdown mode: OptimizedEditor / textarea is active
      const textarea = activeEditorRef.current;
      const currentVal = textarea ? textarea.value : (value || '');
      const start = textarea ? textarea.selectionStart : 0;
      const end = textarea ? textarea.selectionEnd : 0;
      const selectedText = currentVal.slice(start, end);

      let newText = currentVal;
      let newStart = start;
      let newEnd = end;

      if (action === 'bold') {
        if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
          const unwrapped = selectedText.slice(2, -2);
          newText = currentVal.slice(0, start) + unwrapped + currentVal.slice(end);
          newStart = start;
          newEnd = start + unwrapped.length;
        } else {
          const inner = selectedText || '굵은 텍스트';
          const wrapped = `**${inner}**`;
          newText = currentVal.slice(0, start) + wrapped + currentVal.slice(end);
          newStart = start + 2;
          newEnd = start + 2 + inner.length;
        }
      } else if (action === 'italic') {
        if (selectedText.startsWith('*') && selectedText.endsWith('*') && selectedText.length >= 2) {
          const unwrapped = selectedText.slice(1, -1);
          newText = currentVal.slice(0, start) + unwrapped + currentVal.slice(end);
          newStart = start;
          newEnd = start + unwrapped.length;
        } else {
          const inner = selectedText || '기울임 텍스트';
          const wrapped = `*${inner}*`;
          newText = currentVal.slice(0, start) + wrapped + currentVal.slice(end);
          newStart = start + 1;
          newEnd = start + 1 + inner.length;
        }
      } else if (action === 'h1' || action === 'h2' || action === 'h3') {
        const level = action === 'h1' ? 1 : action === 'h2' ? 2 : 3;
        const prefix = '#'.repeat(level) + ' ';
        const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = currentVal.indexOf('\n', start);
        if (lineEnd === -1) lineEnd = currentVal.length;

        const currentLine = currentVal.slice(lineStart, lineEnd);
        const headingPrefixRegex = /^#{1,6}\s+/;
        const cleaned = currentLine.replace(headingPrefixRegex, '');
        const newLine = `${prefix}${cleaned || '제목'}`;

        newText = currentVal.slice(0, lineStart) + newLine + currentVal.slice(lineEnd);
        newStart = lineStart + prefix.length;
        newEnd = lineStart + newLine.length;
      } else if (action === 'quote' || action === 'blockquote') {
        const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = currentVal.indexOf('\n', start);
        if (lineEnd === -1) lineEnd = currentVal.length;

        const currentLine = currentVal.slice(lineStart, lineEnd);
        const quotePrefixRegex = /^>\s+/;
        const cleaned = currentLine.replace(quotePrefixRegex, '');
        const newLine = `> ${cleaned || '인용문'}`;

        newText = currentVal.slice(0, lineStart) + newLine + currentVal.slice(lineEnd);
        newStart = lineStart + 2;
        newEnd = lineStart + newLine.length;
      } else if (action === 'code') {
        if (selectedText.includes('\n')) {
          const inner = selectedText || '// 코드를 작성하세요';
          const wrapped = `\`\`\`\n${inner}\n\`\`\`\n`;
          newText = currentVal.slice(0, start) + wrapped + currentVal.slice(end);
          newStart = start + 4;
          newEnd = start + 4 + inner.length;
        } else {
          if (selectedText.startsWith('`') && selectedText.endsWith('`') && selectedText.length >= 2) {
            const unwrapped = selectedText.slice(1, -1);
            newText = currentVal.slice(0, start) + unwrapped + currentVal.slice(end);
            newStart = start;
            newEnd = start + unwrapped.length;
          } else {
            const inner = selectedText || '코드';
            const wrapped = `\`${inner}\``;
            newText = currentVal.slice(0, start) + wrapped + currentVal.slice(end);
            newStart = start + 1;
            newEnd = start + 1 + inner.length;
          }
        }
      } else if (action === 'codeblock' || action === 'codeBlock') {
        const inner = selectedText || '// 코드를 작성하세요';
        const wrapped = `\`\`\`\n${inner}\n\`\`\`\n`;
        newText = currentVal.slice(0, start) + wrapped + currentVal.slice(end);
        newStart = start + 4;
        newEnd = start + 4 + inner.length;
      } else if (action === 'bullet' || action === 'bulletList') {
        const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = currentVal.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = currentVal.length;

        const lines = currentVal.slice(lineStart, lineEnd).split('\n');
        const newLines = lines.map((line) => {
          const cleaned = line.replace(/^(\s*)[-*+]\s+/, '$1');
          if (line.trim().startsWith('- ')) return cleaned;
          return `- ${line || '목록 항목'}`;
        });
        const replaced = newLines.join('\n');
        newText = currentVal.slice(0, lineStart) + replaced + currentVal.slice(lineEnd);
        newStart = lineStart;
        newEnd = lineStart + replaced.length;
      } else if (action === 'number' || action === 'orderedList') {
        const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = currentVal.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = currentVal.length;

        const lines = currentVal.slice(lineStart, lineEnd).split('\n');
        let counter = 1;
        const newLines = lines.map((line) => {
          const cleaned = line.replace(/^(\s*)\d+[.)]\s+/, '$1');
          if (/^\s*\d+[.)]\s+/.test(line)) return cleaned;
          const res = `${counter}. ${line || '목록 항목'}`;
          counter++;
          return res;
        });
        const replaced = newLines.join('\n');
        newText = currentVal.slice(0, lineStart) + replaced + currentVal.slice(lineEnd);
        newStart = lineStart;
        newEnd = lineStart + replaced.length;
      } else if (action === 'task' || action === 'taskList') {
        const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = currentVal.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = currentVal.length;

        const lines = currentVal.slice(lineStart, lineEnd).split('\n');
        const newLines = lines.map((line) => {
          const cleaned = line.replace(/^(\s*)[-*+]\s+\[[ xX]\]\s+/, '$1');
          if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(line)) return cleaned;
          return `- [ ] ${line || '할 일 항목'}`;
        });
        const replaced = newLines.join('\n');
        newText = currentVal.slice(0, lineStart) + replaced + currentVal.slice(lineEnd);
        newStart = lineStart;
        newEnd = lineStart + replaced.length;
      } else if (action === 'rule' || action === 'horizontalRule') {
        const replacement = '\n---\n';
        newText = currentVal.slice(0, start) + replacement + currentVal.slice(end);
        newStart = start + replacement.length;
        newEnd = start + replacement.length;
      } else if (action === 'strike' || action === 'strikethrough') {
        if (selectedText.startsWith('~~') && selectedText.endsWith('~~') && selectedText.length >= 4) {
          const unwrapped = selectedText.slice(2, -2);
          newText = currentVal.slice(0, start) + unwrapped + currentVal.slice(end);
          newStart = start;
          newEnd = start + unwrapped.length;
        } else {
          const inner = selectedText || '취소선 텍스트';
          const wrapped = `~~${inner}~~`;
          newText = currentVal.slice(0, start) + wrapped + currentVal.slice(end);
          newStart = start + 2;
          newEnd = start + 2 + inner.length;
        }
      } else if (action === 'link') {
        const inner = selectedText || '링크 텍스트';
        const wrapped = `[${inner}](https://)`;
        newText = currentVal.slice(0, start) + wrapped + currentVal.slice(end);
        newStart = start + 1;
        newEnd = start + 1 + inner.length;
      } else if (action === 'image') {
        const inner = selectedText || '이미지 설명';
        const wrapped = `![${inner}](https://)`;
        newText = currentVal.slice(0, start) + wrapped + currentVal.slice(end);
        newStart = start + 2;
        newEnd = start + 2 + inner.length;
      }

      // Immediately trigger onChange
      onChange(newText);

      // Restore updated cursor/selection
      if (textarea) {
        textarea.value = newText;
        textarea.focus();
        textarea.setSelectionRange(newStart, newEnd);
      }
      setTimeout(() => {
        if (activeEditorRef.current) {
          activeEditorRef.current.focus();
          activeEditorRef.current.setSelectionRange(newStart, newEnd);
        }
      }, 10);
    },
    [internalMode, internalTiptapRef, activeEditorRef, value, onChange]
  );

  // Expose imperative API through ref or apiRef prop
  useEffect(() => {
    const effectiveRef = ref || apiRef;
    if (!effectiveRef) return;
    const api: UnifiedEditorRef = {
      applyFormat,
      focus: () => {
        if (internalMode === 'wysiwyg' && internalTiptapRef.current) {
          internalTiptapRef.current.focus?.();
        } else if (activeEditorRef.current) {
          activeEditorRef.current.focus?.();
        }
      },
      getMode: () => internalMode,
      setMode: (m) => handleModeSelect(m as any)
    };
    if (typeof effectiveRef === 'function') {
      effectiveRef(api);
    } else if (effectiveRef && 'current' in effectiveRef) {
      (effectiveRef as any).current = api;
    }
  }, [ref, apiRef, applyFormat, internalMode, handleModeSelect, activeEditorRef]);

  // Compute cursor metadata and fire onCursorActivity
  const handleCursorActivity = useCallback(() => {
    if (!onCursorActivity) return;
    const text = value || '';
    const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

    let line = 1;
    let col = 1;

    if (activeEditorRef.current) {
      const pos = activeEditorRef.current.selectionStart || 0;
      const textBefore = text.slice(0, pos);
      const lines = textBefore.split('\n');
      line = lines.length;
      col = (lines[lines.length - 1]?.length || 0) + 1;
    }

    onCursorActivity({ line, col, wordCount });
  }, [value, activeEditorRef, onCursorActivity]);

  useEffect(() => {
    handleCursorActivity();
  }, [value, handleCursorActivity]);

  // Handle drawing insertion directly into editor markdown
  const handleInsertDrawing = useCallback(
    (dataUrl: string) => {
      const imageMd = `\n\n![필기 노트](${dataUrl})\n\n`;
      onChange(value ? `${value}${imageMd}` : imageMd);
      if (onToast) {
        onToast('✓ 캔버스 필기 그림이 에디터 본문에 삽입되었습니다.', 'success');
      }
      if (onCloseDrawing) {
        onCloseDrawing();
      }
    },
    [value, onChange, onToast, onCloseDrawing]
  );

  // Global Ctrl+S handler when inside editor
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.(value);
      }
    },
    [onSave, value]
  );

  return (
    <div
      className={`relative w-full h-full flex flex-col flex-1 overflow-hidden ${className}`}
      style={{ '--editor-font-size': `${fontSize}px` } as React.CSSProperties}
      onKeyDown={handleKeyDown}
      onKeyUp={handleCursorActivity}
      onClick={handleCursorActivity}
    >
      {/* Top Toolbar: Mode toggle (Pen / BookOpen / Split) and quick formatting buttons */}
      <div
        id="unified-editor-top-toolbar"
        className="shrink-0 h-8 px-2 bg-[#121214] border-b border-[#222226] flex items-center justify-between select-none z-10 text-xs"
      >
        {/* Mode Toggle Group (Pen / BookOpen / Split) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleModeSelect('wysiwyg')}
            className={`h-6 px-2 rounded-xs text-xs flex items-center gap-1.5 transition cursor-pointer select-none ${
              internalMode === 'wysiwyg'
                ? 'bg-[#18181b] text-indigo-400 border border-[#6366f1]/50 font-medium'
                : 'text-slate-400 hover:text-white hover:bg-[#18181b] border border-transparent'
            }`}
            title="서식 모드"
            aria-label="서식 모드"
          >
            <Pen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">서식 모드</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleModeSelect('markdown')}
            className={`h-6 px-2 rounded-xs text-xs flex items-center gap-1.5 transition cursor-pointer select-none ${
              internalMode === 'markdown' || internalMode === 'edit'
                ? 'bg-[#18181b] text-white border border-[#6366f1]/50 font-medium'
                : 'text-slate-400 hover:text-white hover:bg-[#18181b] border border-transparent'
            }`}
            title="마크다운 모드"
            aria-label="마크다운 모드"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">마크다운 모드</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleModeSelect('split')}
            className={`h-6 px-2 rounded-xs text-xs flex items-center gap-1.5 transition cursor-pointer select-none ${
              internalMode === 'split'
                ? 'bg-[#18181b] text-white border border-[#6366f1]/50 font-medium'
                : 'text-slate-400 hover:text-white hover:bg-[#18181b] border border-transparent'
            }`}
            title="분할 모드"
            aria-label="분할 모드"
          >
            <Split className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">분할 모드</span>
          </button>
        </div>

        {/* Quick Formatting Actions with onMouseDown preventDefault */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('h1')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white font-semibold text-xs font-mono transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="제목 1"
            aria-label="Heading 1"
          >
            h1
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('h2')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white font-semibold text-xs font-mono transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="제목 2"
            aria-label="Heading 2"
          >
            h2
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('h3')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white font-semibold text-xs font-mono transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="제목 3"
            aria-label="Heading 3"
          >
            h3
          </button>

          <div className="h-3.5 w-px bg-[#222226] mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('bold')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white font-bold transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="굵게"
            aria-label="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('italic')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white italic transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="기울임"
            aria-label="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('code')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white font-mono text-xs transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="코드"
            aria-label="Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[#222226] mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('bullet')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="글머리 기호 목록"
            aria-label="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('number')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="번호 목록"
            aria-label="Numbered list"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('task')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="할 일 목록"
            aria-label="Task list"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('quote')}
            className="h-6 w-6 rounded-xs hover:bg-[#18181b] hover:text-white transition flex items-center justify-center cursor-pointer select-none text-slate-300"
            title="인용구"
            aria-label="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <OptimizedEditor
        value={value}
        onChange={(val) => {
          if (!readOnly) {
            onChange(val);
          }
        }}
        onFocus={() => {
          onFocus?.();
          handleCursorActivity();
        }}
        editorRef={activeEditorRef}
        tiptapRef={handleTiptapRef}
        placeholder={placeholder}
        editorTab={mappedEditorTab}
        renderMarkdownToHtml={renderMarkdownToHtml}
        fontSize={fontSize}
      />

      {/* Freeform Drawing Canvas Overlay encapsulated within editor layer */}
      {isDrawingOpen && (
        <FreeformDrawingOverlay
          isOpen={isDrawingOpen}
          onClose={onCloseDrawing || (() => {})}
          onInsertImageToEditor={handleInsertDrawing}
          onToast={onToast || (() => {})}
        />
      )}

      {/* Table Grid Picker encapsulated within editor layer */}
      {showTablePicker && (
        <TableGridPicker
          anchorRef={tableAnchorRef}
          onInsertTable={(r, c) => {
            onInsertTable?.(r, c);
            onCloseTablePicker?.();
          }}
          onClose={onCloseTablePicker || (() => {})}
        />
      )}
    </div>
  );
};

UnifiedEditor.displayName = 'UnifiedEditor';
