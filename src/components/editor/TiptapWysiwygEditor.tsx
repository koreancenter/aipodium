import React, { useEffect, useRef, forwardRef, useImperativeHandle, memo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import {
  Table as TableIcon,
  Trash2,
  Columns,
  Rows
} from 'lucide-react';
import { renderMarkdownToHtml } from '../../utils/markdownParser';
import { sanitizeHtml } from '../../utils/securitySanitizer';
import { useLanguage } from '../../context/LanguageContext';
import { getEditorTranslations } from '../../locales/editorLocale';

export interface TiptapWysiwygEditorRef {
  executeCommand: (formatType: string) => void;
  getEditor: () => any;
  insertTable: (rows?: number, cols?: number) => void;
  insertFormattedMarkdown: (markdownText: string, metadataTitle?: string) => string;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  isTableActive: () => boolean;
  addRowAfter: () => void;
  addColumnAfter: () => void;
  deleteRow: () => void;
  deleteColumn: () => void;
  deleteTable: () => void;
  focus: () => void;
}

export interface TiptapWysiwygEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  fontSize?: number;
}

const getInitialContent = (md: string): string => {
  if (!md || !md.trim()) return '';
  const trimmed = md.trim();
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    (trimmed.startsWith('<div') && !trimmed.startsWith('<div class="markdown-body'))
  ) {
    return sanitizeHtml(trimmed);
  }
  return renderMarkdownToHtml(trimmed);
};

export const TiptapWysiwygEditor = memo(
  forwardRef<TiptapWysiwygEditorRef, TiptapWysiwygEditorProps>(
    ({ value, onChange, onFocus, placeholder, className, fontSize }, ref) => {
      const { language } = useLanguage();
      const tt = getEditorTranslations(language).tiptap;
      const ttRef = useRef(tt);
      ttRef.current = tt;
      const isInternalUpdateRef = useRef(false);

      const editor = useEditor({
        extensions: [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3, 4]
            },
            bulletList: {
              keepMarks: true,
              keepAttributes: false
            },
            orderedList: {
              keepMarks: true,
              keepAttributes: false
            }
          }),
          Table.configure({
            resizable: true,
            HTMLAttributes: {
              class: 'tiptap-table'
            }
          }),
          TableRow,
          TableHeader,
          TableCell,
          TaskList.configure({
            HTMLAttributes: {
              class: 'tiptap-task-list'
            }
          }),
          TaskItem.configure({
            nested: true,
            HTMLAttributes: {
              class: 'tiptap-task-item'
            }
          }),
          Placeholder.configure({
            placeholder: () => placeholder || ttRef.current.placeholder,
            emptyEditorClass: 'is-editor-empty'
          }),
          Markdown.configure({
            html: true,
            tightLists: true,
            tightListClass: 'tight',
            bulletListMarker: '-',
            linkify: true,
            breaks: false,
            transformPastedText: true,
            transformCopiedText: true
          })
        ],
        content: getInitialContent(value),
        editorProps: {
          attributes: {
            class: 'tiptap-prosemirror-body focus:outline-none min-h-[500px] leading-relaxed text-xs'
          },
          transformPastedHTML: (html) => sanitizeHtml(html)
        },
        onUpdate: ({ editor: currentEditor }) => {
          isInternalUpdateRef.current = true;
          try {
            const md = (currentEditor.storage as any).markdown?.getMarkdown() ?? '';
            onChange(md);
          } catch (err) {
            console.error('Failed to get markdown from Tiptap:', err);
          }
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 30);
        },
        onFocus: () => {
          onFocus?.();
        }
      });

      // Expose imperative API for right vertical toolbar controls
      useImperativeHandle(
        ref,
        () => ({
          getEditor: () => editor,
          executeCommand: (formatType: string) => {
            if (!editor) return;
            switch (formatType) {
              case 'h1':
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                break;
              case 'h2':
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                break;
              case 'h3':
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                break;
              case 'bold':
                editor.chain().focus().toggleBold().run();
                break;
              case 'italic':
                editor.chain().focus().toggleItalic().run();
                break;
              case 'strike':
              case 'strikethrough':
                editor.chain().focus().toggleStrike().run();
                break;
              case 'code':
                editor.chain().focus().toggleCode().run();
                break;
              case 'codeblock':
              case 'codeBlock':
                editor.chain().focus().toggleCodeBlock().run();
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
              case 'rule':
                editor.chain().focus().setHorizontalRule().run();
                break;
              case 'table':
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                break;
              case 'link': {
                const { from, to } = editor.state.selection;
                const text = editor.state.doc.textBetween(from, to, ' ');
                editor.chain().focus().insertContent(`[${text || ttRef.current.linkText}](https://)`).run();
                break;
              }
              case 'image':
                editor.chain().focus().insertContent(`![${ttRef.current.imageAlt}](https://)`).run();
                break;
              default:
                break;
            }
          },
          insertTable: (rows = 3, cols = 3) => {
            if (!editor) return;
            editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
          },
          insertFormattedMarkdown: (markdownText: string, metadataTitle?: string): string => {
            if (!editor) return '';
            const trimmed = markdownText.trim();
            if (!trimmed) return '';

            // 마크다운 본문을 리치 텍스트 HTML로 변환
            const htmlBody = renderMarkdownToHtml(trimmed);
            const isDocEmpty = editor.isEmpty;
            const headerHtml = metadataTitle
              ? `${isDocEmpty ? '' : '<hr />'}<blockquote><p><strong>${metadataTitle}</strong></p></blockquote>`
              : '';
            const fullHtml = sanitizeHtml(headerHtml + htmlBody);

            // 포커스가 없으면 문서 끝으로 이동하여 자연스럽게 주입
            if (!editor.isFocused) {
              editor.commands.focus('end');
            }

            // 워드프로세서 서식 그대로 삽입
            editor.commands.insertContent(fullHtml);

            // 최신 마크다운 동기화
            let currentMd = '';
            try {
              currentMd = (editor.storage as any).markdown?.getMarkdown() ?? '';
              isInternalUpdateRef.current = true;
              onChange(currentMd);
              setTimeout(() => {
                isInternalUpdateRef.current = false;
              }, 60);
            } catch (err) {
              console.error('Failed to get markdown from Tiptap after insert:', err);
            }
            return currentMd;
          },
          undo: () => {
            if (!editor) return;
            editor.chain().focus().undo().run();
          },
          redo: () => {
            if (!editor) return;
            editor.chain().focus().redo().run();
          },
          canUndo: () => !!editor?.can().undo(),
          canRedo: () => !!editor?.can().redo(),
          isTableActive: () => !!editor?.isActive('table'),
          addRowAfter: () => {
            if (!editor) return;
            editor.chain().focus().addRowAfter().run();
          },
          addColumnAfter: () => {
            if (!editor) return;
            editor.chain().focus().addColumnAfter().run();
          },
          deleteRow: () => {
            if (!editor) return;
            editor.chain().focus().deleteRow().run();
          },
          deleteColumn: () => {
            if (!editor) return;
            editor.chain().focus().deleteColumn().run();
          },
          deleteTable: () => {
            if (!editor) return;
            editor.chain().focus().deleteTable().run();
          },
          focus: () => {
            if (!editor) return;
            editor.commands.focus();
          }
        }),
        [editor]
      );

      // Synchronize external changes to markdown content (e.g. file switch, AI response insertion)
      useEffect(() => {
        if (!editor) return;
        if (isInternalUpdateRef.current) return;

        try {
          const currentMd = (editor.storage as any).markdown?.getMarkdown() ?? '';
          const normValue = (value || '').trim();
          const normCurrent = currentMd.trim();
          if (normValue !== normCurrent) {
            const parsedHtml = normValue ? getInitialContent(value) : '';
            editor.commands.setContent(parsedHtml, { emitUpdate: false });
          }
        } catch (err) {
          console.error('Failed to set markdown content in Tiptap:', err);
        }
      }, [value, editor]);

      if (!editor) {
        return (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
            {tt.loading}
          </div>
        );
      }

      const isTableActive = editor.isActive('table');

      return (
        <div
          style={{ background: 'var(--bg-editor)' }}
          className={`relative w-full h-full flex flex-col ${className || ''}`}
        >
          {/* Contextual Table Floating Helper (only shown when user cursor is inside a table) */}
          {isTableActive && (
            <div
              style={{
                background: '#121216',
                borderColor: 'rgba(255, 255, 255, 0.08)'
              }}
              className="sticky top-2 z-20 mx-auto px-3 py-1 rounded-md border shadow-xl flex items-center gap-1.5 select-none shrink-0 text-xs animate-in fade-in"
            >
              <span className="text-[0.6875rem] text-indigo-400 font-medium mr-1 flex items-center gap-1">
                <TableIcon className="w-3.5 h-3.5" /> {tt.tableEdit}
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="text-slate-300 hover:text-white px-1.5 py-0.5 text-xs hover:bg-white/[0.06] rounded transition cursor-pointer flex items-center gap-1"
                title={tt.addRowTitle}
              >
                <Rows className="w-3.5 h-3.5 text-emerald-400" />
                <span>{tt.addRow}</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="text-slate-300 hover:text-white px-1.5 py-0.5 text-xs hover:bg-white/[0.06] rounded transition cursor-pointer flex items-center gap-1"
                title={tt.addColTitle}
              >
                <Columns className="w-3.5 h-3.5 text-sky-400" />
                <span>{tt.addCol}</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="text-slate-400 hover:text-rose-400 px-1.5 py-0.5 text-xs hover:bg-white/[0.06] rounded transition cursor-pointer"
                title={tt.delRowTitle}
              >
                {tt.delRow}
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="text-slate-400 hover:text-rose-400 px-1.5 py-0.5 text-xs hover:bg-white/[0.06] rounded transition cursor-pointer"
                title={tt.delColTitle}
              >
                {tt.delCol}
              </button>
              <div className="h-3 w-px bg-white/[0.08] mx-0.5 shrink-0" />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="text-rose-400 hover:text-rose-300 px-1.5 py-0.5 text-xs hover:bg-white/[0.06] rounded transition cursor-pointer flex items-center gap-1"
                title={tt.delTableTitle}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{tt.delTable}</span>
              </button>
            </div>
          )}

          {/* Main Document Body (Clean, Full Viewport) */}
          <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
            <div
              className="max-w-3xl mx-auto px-8 py-10 min-h-full"
              style={{ fontSize: fontSize ? `${fontSize}px` : 'var(--editor-font-size, 12px)' }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      );
    }
  )
);

TiptapWysiwygEditor.displayName = 'TiptapWysiwygEditor';

