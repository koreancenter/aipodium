import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { getDocModalsTranslations, type DocModalsTranslations } from '../locales/docModalsLocale';
import {
  HelpCircle,
  X,
  Sparkles,
  Heading,
  Bold,
  Italic,
  List,
  CheckSquare,
  Quote,
  Code,
  Table as TableIcon,
  Link,
  ImageIcon,
  Sigma,
  Copy,
  Check,
  Plus
} from 'lucide-react';

type MarkdownHelpText = DocModalsTranslations['markdownHelp'];

interface MarkdownHelpPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  onInsertSnippet?: (snippet: string) => void;
}

interface HelpItem {
  label: string;
  syntax: string;
  description: string;
  exampleSnippet: string;
}

const buildHelpCategories = (t: MarkdownHelpText): { id: string; category: string; icon: React.ReactNode; items: HelpItem[] }[] => [
  {
    id: 'headings',
    category: t.categories.headings,
    icon: <Heading className="w-3.5 h-3.5 text-sky-400" />,
    items: [
      { label: t.items.h1.label, syntax: '# 제목 1', description: t.items.h1.description, exampleSnippet: '# 제목 1\n' },
      { label: t.items.h2.label, syntax: '## 제목 2', description: t.items.h2.description, exampleSnippet: '## 제목 2\n' },
      { label: t.items.h3.label, syntax: '### 제목 3', description: t.items.h3.description, exampleSnippet: '### 제목 3\n' },
      { label: t.items.h4.label, syntax: '#### 제목 4', description: t.items.h4.description, exampleSnippet: '#### 제목 4\n' }
    ]
  },
  {
    id: 'formatting',
    category: t.categories.formatting,
    icon: <Bold className="w-3.5 h-3.5 text-[var(--accent-primary)]" />,
    items: [
      { label: t.items.bold.label, syntax: '**굵은 텍스트**', description: t.items.bold.description, exampleSnippet: '**굵은 텍스트**' },
      { label: t.items.italic.label, syntax: '*기울임 텍스트*', description: t.items.italic.description, exampleSnippet: '*기울임 텍스트*' },
      { label: t.items.strike.label, syntax: '~~취소선 텍스트~~', description: t.items.strike.description, exampleSnippet: '~~취소선 텍스트~~' },
      { label: t.items.highlight.label, syntax: '==형광펜 텍스트==', description: t.items.highlight.description, exampleSnippet: '==형광펜 강조==' },
      { label: t.items.inlineCode.label, syntax: '`코드`', description: t.items.inlineCode.description, exampleSnippet: '`console.log()`' }
    ]
  },
  {
    id: 'lists',
    category: t.categories.lists,
    icon: <List className="w-3.5 h-3.5 text-amber-400" />,
    items: [
      { label: t.items.bullet.label, syntax: '- 항목 1\n- 항목 2', description: t.items.bullet.description, exampleSnippet: '- 항목 1\n- 항목 2\n' },
      { label: t.items.numbered.label, syntax: '1. 첫 번째\n2. 두 번째', description: t.items.numbered.description, exampleSnippet: '1. 첫 번째\n2. 두 번째\n' },
      { label: t.items.task.label, syntax: '- [ ] 미완료\n- [x] 완료', description: t.items.task.description, exampleSnippet: '- [ ] 미완료 할 일\n- [x] 완료된 할 일\n' }
    ]
  },
  {
    id: 'quotes',
    category: t.categories.quotes,
    icon: <Quote className="w-3.5 h-3.5 text-[var(--accent-primary)]" />,
    items: [
      { label: t.items.quote.label, syntax: '> 인용 내용', description: t.items.quote.description, exampleSnippet: '> 중요한 인용문입니다.\n' },
      { label: t.items.note.label, syntax: '> [!NOTE]\n> 안내 내용', description: t.items.note.description, exampleSnippet: '> [!NOTE]\n> 중요한 안내 사항을 작성하세요.\n' },
      { label: t.items.tip.label, syntax: '> [!TIP]\n> 유용한 팁', description: t.items.tip.description, exampleSnippet: '> [!TIP]\n> 작업 효율을 높이는 팁입니다.\n' },
      { label: t.items.warning.label, syntax: '> [!WARNING]\n> 주의 사항', description: t.items.warning.description, exampleSnippet: '> [!WARNING]\n> 주의가 필요한 내용입니다.\n' }
    ]
  },
  {
    id: 'tables',
    category: t.categories.tables,
    icon: <TableIcon className="w-3.5 h-3.5 text-[var(--secondary-accent)]" />,
    items: [
      {
        label: t.items.table.label,
        syntax: '| 헤더1 | 헤더2 |\n| :--- | :---: |\n| 내용1 | 내용2 |',
        description: t.items.table.description,
        exampleSnippet: '| 항목 | 상세 내용 | 상태 |\n| :--- | :---: | ---: |\n| 프로젝트 | SSOT 동기화 | 진행중 |\n'
      },
      {
        label: t.items.codeBlock.label,
        syntax: '```typescript\nconst x = 1;\n```',
        description: t.items.codeBlock.description,
        exampleSnippet: '```typescript\nfunction helloWorld(): string {\n  return "Hello, AI Podium!";\n}\n```\n'
      },
      {
        label: t.items.math.label,
        syntax: '$E = mc^2$',
        description: t.items.math.description,
        exampleSnippet: '$E = mc^2$'
      },
      {
        label: t.items.rule.label,
        syntax: '---',
        description: t.items.rule.description,
        exampleSnippet: '\n---\n'
      }
    ]
  },
  {
    id: 'links',
    category: t.categories.links,
    icon: <Link className="w-3.5 h-3.5 text-teal-400" />,
    items: [
      { label: t.items.link.label, syntax: '[링크 이름](https://url)', description: t.items.link.description, exampleSnippet: '[AI Studio](https://aistudio.google.com)' },
      { label: t.items.image.label, syntax: '![설명](https://image.url)', description: t.items.image.description, exampleSnippet: '![대체 텍스트](https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600)' },
      { label: t.items.details.label, syntax: '<details><summary>제목</summary>내용</details>', description: t.items.details.description, exampleSnippet: '<details>\n<summary>상세 내용 펼치기</summary>\n\n숨겨진 상세 내용입니다.\n</details>\n' },
      { label: t.items.kbd.label, syntax: '<kbd>Ctrl</kbd> + <kbd>S</kbd>', description: t.items.kbd.description, exampleSnippet: '<kbd>Ctrl</kbd> + <kbd>S</kbd>' }
    ]
  }
];

export const MarkdownHelpPopover: React.FC<MarkdownHelpPopoverProps> = ({
  isOpen,
  onClose,
  anchorRef,
  onInsertSnippet
}) => {
  const { language } = useLanguage();
  const t = getDocModalsTranslations(language).markdownHelp;
  const helpCategories = buildHelpCategories(t);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [filterQuery, setFilterQuery] = useState('');

  // Calculate viewport positioning based on anchorRef
  const getCoords = () => {
    if (anchorRef?.current && typeof window !== 'undefined') {
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverWidth = Math.min(480, window.innerWidth - 24);
      let left = rect.left - 120; // Slightly bias to center under trigger
      if (left + popoverWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - popoverWidth - 12);
      }
      return {
        top: Math.min(window.innerHeight - 480, rect.bottom + 6),
        left: Math.max(12, left)
      };
    }
    return { top: 70, left: 100 };
  };

  const [coords, setCoords] = useState(getCoords);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      setCoords(getCoords());
    };
    updatePosition();
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Completely ignore scroll events originating from inside the help popover itself
      if (
        target === popoverRef.current ||
        (target instanceof Element && (target.closest('#markdown-help-popover') || target.id === 'markdown-help-popover'))
      ) {
        return;
      }
      updatePosition();
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, anchorRef]);

  // Completely isolate wheel events within the popover so they never cause toolbar or background elements to shift
  useEffect(() => {
    if (!isOpen) return;
    const el = popoverRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
      const scrollable = (e.target as HTMLElement | null)?.closest?.('.overflow-y-auto, .overflow-x-auto') as HTMLElement | null;
      if (scrollable) {
        const isScrollable = scrollable.scrollHeight > scrollable.clientHeight;
        if (!isScrollable) {
          e.preventDefault();
        } else {
          const atTop = scrollable.scrollTop <= 0 && e.deltaY < 0;
          const atBottom =
            Math.ceil(scrollable.scrollTop + scrollable.clientHeight) >= scrollable.scrollHeight && e.deltaY > 0;
          if (atTop || atBottom) {
            e.preventDefault();
          }
        }
      } else {
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  // Escape key listener to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleInsert = (text: string) => {
    if (onInsertSnippet) {
      onInsertSnippet(text);
    }
    onClose();
  };

  const filteredCategories = filterQuery.trim()
    ? helpCategories.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
            item.syntax.toLowerCase().includes(filterQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(filterQuery.toLowerCase())
        )
      })).filter((cat) => cat.items.length > 0)
    : [helpCategories[activeTab]];

  const content = (
    <div
      className="fixed inset-0 z-[99999] pointer-events-auto"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Invisible backdrop to capture outside clicks and close popover */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1.5px] cursor-default transition-opacity"
        onClick={onClose}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* Popover Card */}
      <div
        ref={popoverRef}
        id="markdown-help-popover"
        style={{
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          maxWidth: 'min(480px, calc(100vw - 24px))'
        }}
        className="w-[480px] max-h-[520px] flex flex-col bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-[var(--border-luminous)] rounded-xl shadow-[var(--rim-glow)] cyber-rim-top z-[100000] text-[var(--text-main)] text-xs animate-in fade-in zoom-in-95 duration-100 overflow-hidden season-shell"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--border-structural)] bg-[var(--bg-surface)]/80 shrink-0">
          <div className="flex items-center gap-2 font-bold text-[var(--text-main)]">
            <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-[var(--border-structural)] flex items-center justify-center text-[var(--accent-primary)]">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs">
                <span>{t.title}</span>
                <span className="text-[0.625rem] bg-white/[0.06] text-[var(--text-muted)] px-1.5 py-0.2 rounded font-mono font-normal">
                  Cheat Sheet
                </span>
              </div>
              <p className="text-[0.625rem] text-[var(--text-muted)] font-normal">
                {t.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06] transition cursor-pointer"
            title={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-2 border-b border-[var(--border-structural)] bg-[var(--bg-editor)] shrink-0">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-structural)] rounded-md px-2.5 py-1 text-xs text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-luminous)] transition"
          />
        </div>

        {/* Category Tabs (when not searching) */}
        {!filterQuery.trim() && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-[var(--border-structural)] bg-[var(--bg-surface)]/60 overflow-x-auto scrollbar-none shrink-0">
            {helpCategories.map((cat, idx) => {
              const isActive = idx === activeTab;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[0.6875rem] font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-[#F1F5F9] text-[#0F172A] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="shrink-0">{cat.icon}</span>
                  <span>{t.tabs[cat.id as keyof typeof t.tabs]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 p-2.5 overflow-y-auto overscroll-contain space-y-2.5 custom-scrollbar max-h-[320px] bg-[var(--bg-editor)]">
          {filteredCategories.length === 0 ? (
            <div className="p-6 text-center text-[var(--text-muted)] text-xs">
              {t.noResults}
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                {filterQuery.trim() && (
                  <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-[var(--text-muted)] px-1 pt-1">
                    {cat.icon}
                    <span>{cat.category}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-1.5">
                  {cat.items.map((item, itemIdx) => {
                    const itemId = `${cat.category}-${itemIdx}`;
                    const isCopied = copiedIndex === itemId;
                    return (
                      <div
                        key={item.label}
                        className="p-2 rounded-lg bg-[var(--bg-surface)]/70 border border-[var(--border-structural)] hover:border-[var(--border-luminous)] transition group flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[var(--text-main)] text-xs">{item.label}</span>
                            <span className="text-[0.625rem] text-[var(--text-muted)]">{item.description}</span>
                          </div>
                          <pre className="font-mono text-[0.6875rem] bg-[var(--bg-main)] text-[var(--accent-primary)] p-1.5 rounded border border-[var(--border-structural)] overflow-x-auto whitespace-pre-wrap select-all">
                            {item.syntax}
                          </pre>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                          {onInsertSnippet && (
                            <button
                              type="button"
                              onClick={() => handleInsert(item.exampleSnippet)}
                              className="p-1 px-1.5 rounded bg-[#F1F5F9] hover:bg-white text-[#0F172A] text-[0.625rem] font-medium transition flex items-center gap-1 cursor-pointer"
                              title={t.insertTitle}
                            >
                              <Plus className="w-3 h-3" />
                              <span>{t.insert}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(item.exampleSnippet, itemId)}
                            className="p-1 px-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-muted)] hover:text-[var(--text-main)] text-[0.625rem] transition flex items-center gap-1 cursor-pointer border border-[var(--border-structural)] hover:border-[var(--border-luminous)]"
                            title={t.copyTitle}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-[var(--secondary-accent)]" />
                                <span className="text-[var(--secondary-accent)]">{t.copied}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[var(--text-muted)]" />
                                <span>{t.copy}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Quick Shortcuts */}
        <div className="p-2 px-3 border-t border-[var(--border-structural)] bg-[var(--bg-surface)]/90 text-[0.625rem] text-[var(--text-muted)] flex items-center justify-between shrink-0 font-mono">
          <div className="flex items-center gap-2">
            <span><kbd className="px-1 py-0.5 rounded bg-[var(--bg-editor)] text-[var(--text-main)] border border-[var(--border-structural)]">Ctrl+B</kbd> {t.bold}</span>
            <span><kbd className="px-1 py-0.5 rounded bg-[var(--bg-editor)] text-[var(--text-main)] border border-[var(--border-structural)]">Ctrl+I</kbd> {t.italic}</span>
            <span><kbd className="px-1 py-0.5 rounded bg-[var(--bg-editor)] text-[var(--text-main)] border border-[var(--border-structural)]">/</kbd> {t.autocomplete}</span>
          </div>
          <span className="text-[var(--text-tertiary)]">{t.escHint}</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
