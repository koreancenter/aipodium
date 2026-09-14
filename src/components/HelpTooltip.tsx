import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'center' | 'left' | 'right';
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  title,
  side = 'top',
  align = 'center',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [position, setPosition] = useState<{
    top: number;
    left: number;
    actualSide: 'top' | 'bottom' | 'left' | 'right';
    arrowLeft: number;
    arrowTop: number;
  }>({
    top: -9999,
    left: -9999,
    actualSide: side,
    arrowLeft: 20,
    arrowTop: 20
  });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const buttonRect = buttonRef.current.getBoundingClientRect();

    // If button is hidden or zero-size
    if (buttonRect.width === 0 && buttonRect.height === 0) {
      setIsOpen(false);
      return;
    }

    // If button is scrolled completely outside visible viewport
    if (buttonRect.bottom < 10 || buttonRect.top > window.innerHeight - 10) {
      setIsOpen(false);
      return;
    }

    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 288;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 96;

    const gap = 8;
    const padding = 12;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let targetSide = side;

    // Viewport boundary collision detection: auto-flip if space is constrained
    if (targetSide === 'top') {
      if (buttonRect.top - tooltipHeight - gap < padding) {
        if (winH - buttonRect.bottom > buttonRect.top) {
          targetSide = 'bottom';
        }
      }
    } else if (targetSide === 'bottom') {
      if (buttonRect.bottom + tooltipHeight + gap > winH - padding) {
        if (buttonRect.top > winH - buttonRect.bottom) {
          targetSide = 'top';
        }
      }
    } else if (targetSide === 'left') {
      if (buttonRect.left - tooltipWidth - gap < padding) {
        if (winW - buttonRect.right > buttonRect.left) {
          targetSide = 'right';
        }
      }
    } else if (targetSide === 'right') {
      if (buttonRect.right + tooltipWidth + gap > winW - padding) {
        if (buttonRect.left > winW - buttonRect.right) {
          targetSide = 'left';
        }
      }
    }

    let top = 0;
    let left = 0;

    if (targetSide === 'top') {
      top = buttonRect.top - tooltipHeight - gap;
      if (align === 'left') {
        left = buttonRect.left;
      } else if (align === 'right') {
        left = buttonRect.right - tooltipWidth;
      } else {
        left = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2;
      }
    } else if (targetSide === 'bottom') {
      top = buttonRect.bottom + gap;
      if (align === 'left') {
        left = buttonRect.left;
      } else if (align === 'right') {
        left = buttonRect.right - tooltipWidth;
      } else {
        left = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2;
      }
    } else if (targetSide === 'left') {
      left = buttonRect.left - tooltipWidth - gap;
      top = buttonRect.top + buttonRect.height / 2 - tooltipHeight / 2;
    } else if (targetSide === 'right') {
      left = buttonRect.right + gap;
      top = buttonRect.top + buttonRect.height / 2 - tooltipHeight / 2;
    }

    // Safety clamp within viewport bounds
    const clampedLeft = Math.max(padding, Math.min(winW - tooltipWidth - padding, left));
    const clampedTop = Math.max(padding, Math.min(winH - tooltipHeight - padding, top));

    // Calculate arrow offset pointing directly to button center
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;
    const arrowLeft = Math.max(16, Math.min(tooltipWidth - 16, buttonCenterX - clampedLeft));
    const arrowTop = Math.max(12, Math.min(tooltipHeight - 12, buttonCenterY - clampedTop));

    setPosition({
      top: Math.round(clampedTop),
      left: Math.round(clampedLeft),
      actualSide: targetSide,
      arrowLeft: Math.round(arrowLeft),
      arrowTop: Math.round(arrowTop)
    });
  }, [side, align]);

  const getTransformOrigin = useCallback(() => {
    if (position.actualSide === 'top') {
      return `${position.arrowLeft}px 100%`;
    }
    if (position.actualSide === 'bottom') {
      return `${position.arrowLeft}px 0%`;
    }
    if (position.actualSide === 'left') {
      return `100% ${position.arrowTop}px`;
    }
    if (position.actualSide === 'right') {
      return `0% ${position.arrowTop}px`;
    }
    return 'center center';
  }, [position.actualSide, position.arrowLeft, position.arrowTop]);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen((prev) => !prev);
        }}
        aria-label="도움말 안내"
        className={`p-0.5 rounded transition-colors duration-150 inline-flex items-center justify-center align-middle cursor-pointer ${
          isOpen
            ? 'text-indigo-400 bg-[#282a38]'
            : 'text-slate-400 hover:text-slate-200 hover:bg-[#282a38] focus:text-slate-200'
        } ${className}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={tooltipRef}
                role="tooltip"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                  position: 'fixed',
                  top: `${position.top}px`,
                  left: `${position.left}px`,
                  zIndex: 99999,
                  filter: 'drop-shadow(0 12px 28px rgba(0, 0, 0, 0.75))',
                  transformOrigin: getTransformOrigin()
                }}
                className="w-72 max-w-[calc(100vw-24px)] rounded-md bg-[#1e202b] border border-[#2e3142] text-left pointer-events-auto select-text overflow-visible shadow-xl shadow-black/70"
              >
                {/* Pointer arrow pointing to trigger button */}
                {position.actualSide === 'top' && (
                  <div
                    style={{ left: `${position.arrowLeft}px` }}
                    className="absolute -bottom-[5.5px] -translate-x-1/2 w-2.5 h-2.5 bg-[#1e202b] border-r border-b border-[#2e3142] rotate-45"
                  />
                )}
                {position.actualSide === 'bottom' && (
                  <div
                    style={{ left: `${position.arrowLeft}px` }}
                    className="absolute -top-[5.5px] -translate-x-1/2 w-2.5 h-2.5 bg-[#1e202b] border-l border-t border-[#2e3142] rotate-45"
                  />
                )}
                {position.actualSide === 'left' && (
                  <div
                    style={{ top: `${position.arrowTop}px` }}
                    className="absolute -right-[5.5px] -translate-y-1/2 w-2.5 h-2.5 bg-[#1e202b] border-r border-t border-[#2e3142] rotate-45"
                  />
                )}
                {position.actualSide === 'right' && (
                  <div
                    style={{ top: `${position.arrowTop}px` }}
                    className="absolute -left-[5.5px] -translate-y-1/2 w-2.5 h-2.5 bg-[#1e202b] border-l border-b border-[#2e3142] rotate-45"
                  />
                )}

                {/* Body Content */}
                <div className="p-2.5 text-[11.5px] leading-relaxed text-slate-300 font-normal break-words">
                  {content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
