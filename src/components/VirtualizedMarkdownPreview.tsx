/**
 * High-Performance Virtualized Markdown Document Preview Component
 * Implements block-level windowing, dynamic height caching, and smooth scroll synchronization
 * for extremely large Markdown documents (thousands of lines / blocks).
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle
} from 'react';
import {
  splitMarkdownIntoBlocks,
  renderCachedBlockHtml,
  MarkdownBlock
} from '../utils/markdownBlockParser';
import { Zap } from 'lucide-react';

export interface VirtualizedMarkdownPreviewProps {
  id?: string;
  content: string;
  renderMarkdownToHtml: (md: string) => string;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
  isSplitMode?: boolean;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Number of blocks above which virtualization activates. Defaults to 25. */
  virtualizationThreshold?: number;
  /** Number of blocks to render above and below the visible viewport. Defaults to 6. */
  overscan?: number;
}

export interface VirtualizedMarkdownPreviewRef {
  scrollToLine: (lineNumber: number) => void;
  scrollToBlock: (blockIndex: number) => void;
  getContainerElement: () => HTMLDivElement | null;
  getIsVirtualized: () => boolean;
  getBlockCount: () => number;
}

/**
 * Fast binary search to find the block index whose vertical range encompasses or starts at the offset.
 */
function findBlockIndexAtOffset(positions: Float32Array, offset: number): number {
  if (positions.length <= 1) return 0;
  let low = 0;
  let high = positions.length - 2;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (positions[mid + 1] <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(0, Math.min(positions.length - 2, low));
}

// Sub-component for individual virtualized block
interface VirtualBlockItemProps {
  block: MarkdownBlock;
  rawHtml: string;
  onMeasure: (id: string, height: number) => void;
}

const VirtualBlockItem: React.FC<VirtualBlockItemProps> = React.memo(
  ({ block, rawHtml, onMeasure }) => {
    const blockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = blockRef.current;
      if (!el) return;

      const measure = () => {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0) {
          onMeasure(block.id, rect.height);
        }
      };

      measure();

      let observer: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
            if (h > 0) {
              onMeasure(block.id, h);
            }
          }
        });
        observer.observe(el);
      }

      return () => {
        if (observer) {
          observer.disconnect();
        }
      };
    }, [block.id, onMeasure, rawHtml]);

    return (
      <div
        ref={blockRef}
        data-block-id={block.id}
        data-block-type={block.type}
        data-start-line={block.startLine}
        data-end-line={block.endLine}
        className="virtual-markdown-block w-full"
        dangerouslySetInnerHTML={{ __html: rawHtml }}
      />
    );
  }
);

VirtualBlockItem.displayName = 'VirtualBlockItem';

export const VirtualizedMarkdownPreview = forwardRef<
  HTMLDivElement,
  VirtualizedMarkdownPreviewProps
>(({
  id = 'markdown-preview',
  content,
  renderMarkdownToHtml,
  fontSize,
  className = '',
  style = {},
  isSplitMode = false,
  onScroll,
  virtualizationThreshold = 25,
  overscan = 6
}, forwardedRef) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Set both internal ref and forwarded ref reliably when the DOM node attaches
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }, [forwardedRef]);

  // 1. Parse markdown into structural blocks
  const { blocks, referenceDefs } = useMemo(() => {
    return splitMarkdownIntoBlocks(content);
  }, [content]);

  const blockCount = blocks.length;
  const isVirtualized = blockCount >= virtualizationThreshold;

  // 2. Dynamic measured heights store
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const measuredHeightsRef = useRef<Record<string, number>>({});
  measuredHeightsRef.current = measuredHeights;
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const rafIdRef = useRef<number | null>(null);

  const handleBlockMeasure = useCallback((blockId: string, height: number) => {
    const current = measuredHeightsRef.current[blockId];
    if (current === undefined || Math.abs(current - height) > 2) {
      pendingUpdatesRef.current[blockId] = height;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          setMeasuredHeights((prev) => ({
            ...prev,
            ...pendingUpdatesRef.current
          }));
          pendingUpdatesRef.current = {};
        });
      }
    }
  }, []);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // 3. Compute cumulative positions prefix array for lightning-fast range lookups
  const positions = useMemo(() => {
    const pos = new Float32Array(blockCount + 1);
    pos[0] = 0;
    for (let i = 0; i < blockCount; i++) {
      const b = blocks[i];
      const h = measuredHeights[b.id] ?? b.estimatedHeight;
      pos[i + 1] = pos[i] + h;
    }
    return pos;
  }, [blocks, blockCount, measuredHeights]);

  const totalHeight = positions[blockCount] || 0;

  // 4. Viewport scroll tracking
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  // Update viewport height with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      if (container.clientHeight > 0) {
        setViewportHeight(container.clientHeight);
      }
    };

    updateHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const h = entry.contentRect.height;
          if (h > 0) setViewportHeight(h);
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  // Throttled scroll handling
  const scrollRafRef = useRef<number | null>(null);
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const currentScroll = target.scrollTop;

      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }

      scrollRafRef.current = requestAnimationFrame(() => {
        setScrollTop(currentScroll);
        scrollRafRef.current = null;
      });

      onScroll?.(e);
    },
    [onScroll]
  );

  // 5. Calculate visible block window
  const { startIndex, endIndex, topSpacerHeight, bottomSpacerHeight } = useMemo(() => {
    if (!isVirtualized || blockCount === 0) {
      return {
        startIndex: 0,
        endIndex: blockCount - 1,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0
      };
    }

    // Binary search for visible block range
    const firstVisible = findBlockIndexAtOffset(positions, scrollTop);
    const lastVisible = findBlockIndexAtOffset(positions, scrollTop + viewportHeight);

    const start = Math.max(0, firstVisible - overscan);
    const end = Math.min(blockCount - 1, lastVisible + overscan);

    const topSpacer = positions[start] || 0;
    const bottomSpacer = Math.max(0, totalHeight - positions[end + 1]);

    return {
      startIndex: start,
      endIndex: end,
      topSpacerHeight: topSpacer,
      bottomSpacerHeight: bottomSpacer
    };
  }, [isVirtualized, blockCount, positions, scrollTop, viewportHeight, overscan, totalHeight]);

  // 6. Memoized visible blocks with rendered HTML
  const visibleBlocksWithHtml = useMemo(() => {
    if (blockCount === 0) return [];

    const result: Array<{ block: MarkdownBlock; html: string }> = [];
    const maxIdx = Math.min(endIndex, blockCount - 1);

    for (let i = startIndex; i <= maxIdx; i++) {
      const b = blocks[i];
      if (b) {
        const html = renderCachedBlockHtml(b.raw, renderMarkdownToHtml, referenceDefs);
        result.push({ block: b, html });
      }
    }

    return result;
  }, [blocks, blockCount, startIndex, endIndex, renderMarkdownToHtml, referenceDefs]);

  // Delegated Code Block Copy Support
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Check if clicked inside a code block header or pre block
    const codeBlock = target.closest('.group');
    if (codeBlock && target.closest('.select-none')) {
      const codeElement = codeBlock.querySelector('code');
      if (codeElement && codeElement.textContent) {
        navigator.clipboard?.writeText(codeElement.textContent);
      }
    }
  }, []);

  const renderedCount = visibleBlocksWithHtml.length;

  return (
    <div
      id={id}
      ref={setContainerRef}
      onScroll={handleScroll}
      onClick={handleContainerClick}
      style={{
        background: 'var(--bg-editor)',
        color: 'var(--text-primary)',
        fontSize: fontSize ? `${fontSize}px` : 'var(--editor-font-size, 15px)',
        ...style
      }}
      className={`relative w-full h-full overflow-y-auto leading-[1.65] font-sans select-text break-words [word-break:break-word] [overflow-wrap:anywhere] custom-scrollbar ${className}`}
    >
      {/* Floating Status Indicator for large documents */}
      {isVirtualized && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-2 right-3 z-10 flex justify-end pointer-events-none mb-1 mr-2"
        >
          <span className="text-[0.5625rem] font-mono text-[#818cf8] bg-[#121214]/90 backdrop-blur-md px-2 py-0.5 rounded border border-[#222226] shadow-xs flex items-center gap-1 select-none pointer-events-auto">
            <Zap className="w-2.5 h-2.5 text-[#818cf8]" />
            <span>가상화 렌더링 활성: {renderedCount} / {blockCount} 블록</span>
          </span>
        </div>
      )}

      {/* Main Preview Container */}
      <div
        className={`${
          isSplitMode ? 'p-5' : 'max-w-3xl mx-auto px-6 py-8'
        } min-h-full markdown-preview`}
      >
        {/* Top Spacer to preserve scroll position */}
        {topSpacerHeight > 0 && (
          <div
            aria-hidden="true"
            style={{ height: `${topSpacerHeight}px` }}
            className="w-full shrink-0 pointer-events-none"
          />
        )}

        {/* Rendered Visible Blocks */}
        {visibleBlocksWithHtml.map(({ block, html }) => (
          <VirtualBlockItem
            key={block.id}
            block={block}
            rawHtml={html}
            onMeasure={handleBlockMeasure}
          />
        ))}

        {/* Bottom Spacer */}
        {bottomSpacerHeight > 0 && (
          <div
            aria-hidden="true"
            style={{ height: `${bottomSpacerHeight}px` }}
            className="w-full shrink-0 pointer-events-none"
          />
        )}
      </div>
    </div>
  );
});

VirtualizedMarkdownPreview.displayName = 'VirtualizedMarkdownPreview';
