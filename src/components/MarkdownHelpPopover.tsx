import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

const HELP_CATEGORIES: { category: string; icon: React.ReactNode; items: HelpItem[] }[] = [
  {
    category: '제목 (Headings)',
    icon: <Heading className="w-3.5 h-3.5 text-sky-400" />,
    items: [
      { label: '대제목 (H1)', syntax: '# 제목 1', description: '문서의 메인 제목', exampleSnippet: '# 제목 1\n' },
      { label: '중제목 (H2)', syntax: '## 제목 2', description: '주요 섹션 구분', exampleSnippet: '## 제목 2\n' },
      { label: '소제목 (H3)', syntax: '### 제목 3', description: '세부 항목 구분', exampleSnippet: '### 제목 3\n' },
      { label: '소제목 (H4~H6)', syntax: '#### 제목 4', description: '하위 단락 소제목', exampleSnippet: '#### 제목 4\n' }
    ]
  },
  {
    category: '텍스트 서식 (Text Formatting)',
    icon: <Bold className="w-3.5 h-3.5 text-indigo-400" />,
    items: [
      { label: '굵게 (Bold)', syntax: '**굵은 텍스트**', description: 'Ctrl+B / 중요한 단어 강조', exampleSnippet: '**굵은 텍스트**' },
      { label: '기울임 (Italic)', syntax: '*기울임 텍스트*', description: 'Ctrl+I / 부각 및 강조', exampleSnippet: '*기울임 텍스트*' },
      { label: '취소선 (Strikethrough)', syntax: '~~취소선 텍스트~~', description: '삭제되거나 변경된 내용', exampleSnippet: '~~취소선 텍스트~~' },
      { label: '형광펜 강조 (Highlight)', syntax: '==형광펜 텍스트==', description: '배경 노란색 하이라이트', exampleSnippet: '==형광펜 강조==' },
      { label: '인라인 코드', syntax: '`코드`', description: '단일 코드나 명령어', exampleSnippet: '`console.log()`' }
    ]
  },
  {
    category: '목록 & 체크박스 (Lists & Tasks)',
    icon: <List className="w-3.5 h-3.5 text-amber-400" />,
    items: [
      { label: '글머리 기호 목록', syntax: '- 항목 1\n- 항목 2', description: '순서 없는 불릿 목록', exampleSnippet: '- 항목 1\n- 항목 2\n' },
      { label: '번호 매기기 목록', syntax: '1. 첫 번째\n2. 두 번째', description: '순차가 있는 번호 목록', exampleSnippet: '1. 첫 번째\n2. 두 번째\n' },
      { label: '할 일 체크박스', syntax: '- [ ] 미완료\n- [x] 완료', description: '인터랙티브 태스크 체크박스', exampleSnippet: '- [ ] 미완료 할 일\n- [x] 완료된 할 일\n' }
    ]
  },
  {
    category: '인용구 & 알림창 (Quotes & Callouts)',
    icon: <Quote className="w-3.5 h-3.5 text-purple-400" />,
    items: [
      { label: '기본 인용문', syntax: '> 인용 내용', description: '인용구 및 코멘트 블록', exampleSnippet: '> 중요한 인용문입니다.\n' },
      { label: 'GitHub Note 알림', syntax: '> [!NOTE]\n> 안내 내용', description: '파란색 정보 안내 박스', exampleSnippet: '> [!NOTE]\n> 중요한 안내 사항을 작성하세요.\n' },
      { label: 'GitHub Tip 알림', syntax: '> [!TIP]\n> 유용한 팁', description: '초록색 팁 안내 박스', exampleSnippet: '> [!TIP]\n> 작업 효율을 높이는 팁입니다.\n' },
      { label: 'GitHub Warning 알림', syntax: '> [!WARNING]\n> 주의 사항', description: '주황색 경고 안내 박스', exampleSnippet: '> [!WARNING]\n> 주의가 필요한 내용입니다.\n' }
    ]
  },
  {
    category: '표, 코드 블록 & 수식 (Tables & Math)',
    icon: <TableIcon className="w-3.5 h-3.5 text-emerald-400" />,
    items: [
      {
        label: '데이터 표 (Table)',
        syntax: '| 헤더1 | 헤더2 |\n| :--- | :---: |\n| 내용1 | 내용2 |',
        description: '정렬 기능이 포함된 마크다운 표',
        exampleSnippet: '| 항목 | 상세 내용 | 상태 |\n| :--- | :---: | ---: |\n| 프로젝트 | SSOT 동기화 | 진행중 |\n'
      },
      {
        label: '코드 블록 (Code Block)',
        syntax: '```typescript\nconst x = 1;\n```',
        description: '구문 강조 지원 멀티라인 코드',
        exampleSnippet: '```typescript\nfunction helloWorld(): string {\n  return "Hello, AI Podium!";\n}\n```\n'
      },
      {
        label: '인라인 수식 (LaTeX Math)',
        syntax: '$E = mc^2$',
        description: 'KaTeX 렌더링 인라인 수식',
        exampleSnippet: '$E = mc^2$'
      },
      {
        label: '구분선 (Horizontal Rule)',
        syntax: '---',
        description: '섹션을 시각적으로 나누는 가로줄',
        exampleSnippet: '\n---\n'
      }
    ]
  },
  {
    category: '링크, 이미지 & 단축키 (Links & Shortcuts)',
    icon: <Link className="w-3.5 h-3.5 text-teal-400" />,
    items: [
      { label: '하이퍼링크', syntax: '[링크 이름](https://url)', description: '웹페이지 연결 링크', exampleSnippet: '[AI Studio](https://aistudio.google.com)' },
      { label: '이미지 삽입', syntax: '![설명](https://image.url)', description: '이미지 태그', exampleSnippet: '![대체 텍스트](https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600)' },
      { label: '접기/펼치기 (Details)', syntax: '<details><summary>제목</summary>내용</details>', description: 'HTML 토글 아코디언', exampleSnippet: '<details>\n<summary>상세 내용 펼치기</summary>\n\n숨겨진 상세 내용입니다.\n</details>\n' },
      { label: '키보드 키 뱃지', syntax: '<kbd>Ctrl</kbd> + <kbd>S</kbd>', description: '단축키 스타일 뱃지', exampleSnippet: '<kbd>Ctrl</kbd> + <kbd>S</kbd>' }
    ]
  }
];

export const MarkdownHelpPopover: React.FC<MarkdownHelpPopoverProps> = ({
  isOpen,
  onClose,
  anchorRef,
  onInsertSnippet
}) => {
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
    ? HELP_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
            item.syntax.toLowerCase().includes(filterQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(filterQuery.toLowerCase())
        )
      })).filter((cat) => cat.items.length > 0)
    : [HELP_CATEGORIES[activeTab]];

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
        className="w-[480px] max-h-[520px] flex flex-col bg-[#181a24]/98 backdrop-blur-2xl border border-[#2e3142] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[100000] text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#2e3142] bg-[#121318]/70 shrink-0">
          <div className="flex items-center gap-2 font-bold text-slate-100">
            <div className="w-6 h-6 rounded-md bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center text-[#818cf8]">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs">
                <span>마크다운 & 서식 문법 가이드</span>
                <span className="text-[0.625rem] bg-[#6366f1]/20 text-[#a5b4fc] px-1.5 py-0.2 rounded font-mono border border-[#6366f1]/30">
                  Cheat Sheet
                </span>
              </div>
              <p className="text-[0.625rem] text-slate-400 font-normal">
                클릭하여 에디터에 바로 삽입하거나 문법을 확인하세요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#282a38] transition cursor-pointer"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-2 border-b border-[#2e3142] bg-[#161720] shrink-0">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="문법 검색 (예: 표, 체크박스, bold, quote, kbd)..."
            className="w-full bg-[#1e202b] border border-[#2e3142] rounded-md px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#6366f1] transition"
          />
        </div>

        {/* Category Tabs (when not searching) */}
        {!filterQuery.trim() && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-[#2e3142] bg-[#121318]/50 overflow-x-auto scrollbar-none shrink-0">
            {HELP_CATEGORIES.map((cat, idx) => {
              const isActive = idx === activeTab;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[0.6875rem] font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-[#6366f1] text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#282a38]'
                  }`}
                >
                  <span className="shrink-0">{cat.icon}</span>
                  <span>{cat.category.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 p-2.5 overflow-y-auto overscroll-contain space-y-2.5 custom-scrollbar max-h-[320px]">
          {filteredCategories.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              검색어와 일치하는 마크다운 문법이 없습니다.
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                {filterQuery.trim() && (
                  <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-slate-400 px-1 pt-1">
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
                        className="p-2 rounded-lg bg-[#1e202b]/70 border border-[#2e3142] hover:border-[#6366f1]/50 transition group flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-200 text-xs">{item.label}</span>
                            <span className="text-[0.625rem] text-slate-400">{item.description}</span>
                          </div>
                          <pre className="font-mono text-[0.6875rem] bg-[#121318] text-[#a5b4fc] p-1.5 rounded border border-[#2e3142]/60 overflow-x-auto whitespace-pre-wrap select-all">
                            {item.syntax}
                          </pre>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                          {onInsertSnippet && (
                            <button
                              type="button"
                              onClick={() => handleInsert(item.exampleSnippet)}
                              className="p-1 px-1.5 rounded bg-[#6366f1]/20 hover:bg-[#6366f1] text-[#a5b4fc] hover:text-white text-[0.625rem] font-medium transition flex items-center gap-1 cursor-pointer border border-[#6366f1]/30"
                              title="에디터에 바로 삽입"
                            >
                              <Plus className="w-3 h-3" />
                              <span>삽입</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(item.exampleSnippet, itemId)}
                            className="p-1 px-1.5 rounded bg-[#282a38] hover:bg-[#34384b] text-slate-300 hover:text-white text-[0.625rem] transition flex items-center gap-1 cursor-pointer border border-[#2e3142]"
                            title="클립보드에 복사"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">복사됨</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>복사</span>
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
        <div className="p-2 px-3 border-t border-[#2e3142] bg-[#121318]/80 text-[0.625rem] text-slate-400 flex items-center justify-between shrink-0 font-mono">
          <div className="flex items-center gap-2">
            <span><kbd className="px-1 py-0.5 rounded bg-[#282a38] text-slate-300 border border-[#2e3142]">Ctrl+B</kbd> 굵게</span>
            <span><kbd className="px-1 py-0.5 rounded bg-[#282a38] text-slate-300 border border-[#2e3142]">Ctrl+I</kbd> 기울임</span>
            <span><kbd className="px-1 py-0.5 rounded bg-[#282a38] text-slate-300 border border-[#2e3142]">/</kbd> 자동완성</span>
          </div>
          <span className="text-slate-500">Esc 키로 닫기</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
