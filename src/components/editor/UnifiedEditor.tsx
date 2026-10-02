/**
 * UnifiedEditor Component
 * Consolidates Tiptap WYSIWYG, Markdown source editor, Table helpers, and Freeform drawing overlay
 * into a single controlled component adhering to Phase 2 modularization.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { OptimizedEditor } from './OptimizedEditor';
import { FreeformDrawingOverlay } from './FreeformDrawingOverlay';
import { TableGridPicker } from './TableGridPicker';
import { TiptapWysiwygEditorRef } from './TiptapWysiwygEditor';

export interface UnifiedEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  mode: 'wysiwyg' | 'markdown' | string;
  onModeChange?: (mode: 'wysiwyg' | 'markdown') => void;
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
  isDrawingOpen?: boolean;
  onCloseDrawing?: () => void;
  showTablePicker?: boolean;
  onCloseTablePicker?: () => void;
  tableAnchorRef?: React.RefObject<HTMLElement | null>;
  onInsertTable?: (rows: number, cols: number) => void;
  onToast?: (message: string, type?: 'info' | 'warn' | 'error' | 'success') => void;
  className?: string;
}

export const UnifiedEditor: React.FC<UnifiedEditorProps> = ({
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
  renderMarkdownToHtml = (md) => md,
  onFocus,
  editorRef,
  tiptapRef,
  isDrawingOpen = false,
  onCloseDrawing,
  showTablePicker = false,
  onCloseTablePicker,
  tableAnchorRef,
  onInsertTable,
  onToast,
  className = '',
}) => {
  // Map UnifiedEditor mode ('wysiwyg' | 'markdown') to underlying tab ('wysiwyg' | 'edit' | 'split' | 'preview')
  const mappedEditorTab: 'wysiwyg' | 'edit' | 'split' | 'preview' =
    mode === 'wysiwyg'
      ? 'wysiwyg'
      : mode === 'split'
      ? 'split'
      : mode === 'preview'
      ? 'preview'
      : 'edit';

  // Compute cursor metadata and fire onCursorActivity
  const handleCursorActivity = useCallback(() => {
    if (!onCursorActivity) return;
    const text = value || '';
    const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

    let line = 1;
    let col = 1;

    if (editorRef?.current) {
      const pos = editorRef.current.selectionStart || 0;
      const textBefore = text.slice(0, pos);
      const lines = textBefore.split('\n');
      line = lines.length;
      col = (lines[lines.length - 1]?.length || 0) + 1;
    }

    onCursorActivity({ line, col, wordCount });
  }, [value, editorRef, onCursorActivity]);

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
        editorRef={editorRef}
        tiptapRef={tiptapRef}
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
