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

export interface TiptapWysiwygEditorRef {
  executeCommand: (formatType: string) => void;
  insertTable: (rows?: number, cols?: number) => void;
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

export const TiptapWysiwygEditor = memo(
  forwardRef<TiptapWysiwygEditorRef, TiptapWysiwygEditorProps>(
    ({ value, onChange, onFocus, placeholder, className, fontSize }, ref) => {
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
            placeholder: placeholder || '워드프로세서처럼 자유롭게 내용을 작성하세요...',
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
        content: value,
        editorProps: {
          attributes: {
            class: 'tiptap-prosemirror-body focus:outline-none min-h-[500px] leading-relaxed text-sm'
          }
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
                editor.chain().focus().toggleStrike().run();
                break;
              case 'code':
                editor.chain().focus().toggleCode().run();
                break;
              case 'codeblock':
                editor.chain().focus().toggleCodeBlock().run();
                break;
              case 'bullet':
                editor.chain().focus().toggleBulletList().run();
                break;
              case 'number':
                editor.chain().focus().toggleOrderedList().run();
                break;
              case 'task':
                editor.chain().focus().toggleTaskList().run();
                break;
              case 'quote':
                editor.chain().focus().toggleBlockquote().run();
                break;
              case 'rule':
                editor.chain().focus().setHorizontalRule().run();
                break;
              case 'link': {
                const { from, to } = editor.state.selection;
                const text = editor.state.doc.textBetween(from, to, ' ');
                editor.chain().focus().insertContent(`[${text || '링크'}](https://)`).run();
                break;
              }
              case 'image':
                editor.chain().focus().insertContent('![이미지](https://)').run();
                break;
              default:
                break;
            }
          },
          insertTable: (rows = 3, cols = 3) => {
            if (!editor) return;
            editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
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
          if (value !== currentMd) {
            editor.commands.setContent(value, { emitUpdate: false });
          }
        } catch (err) {
          console.error('Failed to set markdown content in Tiptap:', err);
        }
      }, [value, editor]);

      if (!editor) {
        return (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
            에디터를 불러오는 중입니다...
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
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-color)'
              }}
              className="sticky top-2 z-20 mx-auto px-3 py-1 rounded-xs border shadow-lg flex items-center gap-1.5 select-none shrink-0 text-xs animate-in fade-in"
            >
              <span className="text-[0.6875rem] text-indigo-400 font-medium mr-1 flex items-center gap-1">
                <TableIcon className="w-3.5 h-3.5" /> 표 편집
              </span>
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="text-slate-300 hover:text-white px-1.5 py-0.5 text-xs hover:bg-[#18181b] rounded-xs cursor-pointer flex items-center gap-1"
                title="아래에 행 추가"
              >
                <Rows className="w-3.5 h-3.5 text-emerald-400" />
                <span>행 추가</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="text-slate-300 hover:text-white px-1.5 py-0.5 text-xs hover:bg-[#18181b] rounded-xs cursor-pointer flex items-center gap-1"
                title="우측에 열 추가"
              >
                <Columns className="w-3.5 h-3.5 text-sky-400" />
                <span>열 추가</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="text-slate-400 hover:text-rose-400 px-1.5 py-0.5 text-xs hover:bg-[#18181b] rounded-xs cursor-pointer"
                title="현재 행 삭제"
              >
                행 삭제
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="text-slate-400 hover:text-rose-400 px-1.5 py-0.5 text-xs hover:bg-[#18181b] rounded-xs cursor-pointer"
                title="현재 열 삭제"
              >
                열 삭제
              </button>
              <div className="h-3 w-px bg-[#222226] mx-0.5 shrink-0" />
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="text-rose-400 hover:text-rose-300 px-1.5 py-0.5 text-xs hover:bg-[#18181b] rounded-xs cursor-pointer flex items-center gap-1"
                title="표 전체 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>표 삭제</span>
              </button>
            </div>
          )}

          {/* Main Document Body (Clean, Full Viewport) */}
          <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
            <div
              className="max-w-3xl mx-auto px-6 py-8 min-h-full"
              style={{ fontSize: fontSize ? `${fontSize}px` : 'var(--editor-font-size, 15px)' }}
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

