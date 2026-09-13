import React, { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getPositionClasses = () => {
    if (side === 'bottom') {
      if (align === 'right') return 'top-full right-0 mt-2';
      if (align === 'left') return 'top-full left-0 mt-2';
      return 'top-full left-1/2 -translate-x-1/2 mt-2';
    }
    if (side === 'left') {
      return 'right-full top-1/2 -translate-y-1/2 mr-2';
    }
    if (side === 'right') {
      return 'left-full top-1/2 -translate-y-1/2 ml-2';
    }
    // side === 'top'
    if (align === 'right') return 'bottom-full right-0 mb-2';
    if (align === 'left') return 'bottom-full left-0 mb-2';
    return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label="도움말 확인"
        className="p-0.5 text-slate-400 hover:text-indigo-400 focus:text-indigo-400 rounded transition cursor-pointer"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-[100] w-64 max-w-xs p-2.5 bg-[#121318] border border-[#2e3142] rounded-lg shadow-2xl text-left pointer-events-auto text-xs ${getPositionClasses()} animate-in fade-in duration-100`}
        >
          {title && (
            <div className="font-semibold text-slate-200 text-[11px] mb-1 pb-1 border-b border-[#2e3142]">
              {title}
            </div>
          )}
          <div className="text-[11px] text-slate-300 leading-relaxed font-normal">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};
