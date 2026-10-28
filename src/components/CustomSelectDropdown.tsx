import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getConnectionTranslations } from '../locales/connectionLocale';

export interface DropdownOption {
  id: string;
  name: string;
  desc?: string;
}

export interface DropdownOptionGroup {
  label?: string;
  options: DropdownOption[];
}

export interface CustomSelectDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options?: DropdownOption[];
  groups?: DropdownOptionGroup[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  openUpward?: boolean;
}

export const CustomSelectDropdown: React.FC<CustomSelectDropdownProps> = ({
  value,
  onChange,
  options,
  groups,
  placeholder,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  openUpward = false,
}) => {
  const { language } = useLanguage();
  const t = getConnectionTranslations(language).customSelect;
  const resolvedPlaceholder = placeholder ?? t.placeholder;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Find currently selected label
  let selectedLabel = resolvedPlaceholder;
  if (options) {
    const found = options.find((o) => o.id === value);
    if (found) selectedLabel = found.name;
  } else if (groups) {
    for (const g of groups) {
      const found = g.options.find((o) => o.id === value);
      if (found) {
        selectedLabel = found.name;
        break;
      }
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`bg-[#09090b] border border-[#222226] hover:border-zinc-700 rounded-md px-3 py-1.5 text-xs text-zinc-200 flex items-center justify-between transition-colors cursor-pointer w-full focus:outline-none ${buttonClassName}`}
      >
        <span className="truncate font-normal leading-normal">{selectedLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 ml-2 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Popover Container */}
      {isOpen && (
        <div
          className={`absolute ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } left-0 w-full min-w-[200px] max-h-60 bg-[#16181d] border border-white/[0.08] rounded-lg shadow-2xl p-1 z-50 overflow-y-auto ${menuClassName}`}
        >
          {groups && groups.length > 0 ? (
            groups.map((group, gIdx) => (
              <div key={gIdx} className={gIdx > 0 ? 'mt-1 pt-1 border-t border-white/[0.06]' : ''}>
                {group.label && (
                  <div className="px-2.5 py-1 text-[10px] text-zinc-500 font-medium select-none">
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.options.map((opt) => {
                    const isSelected = opt.id === value;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onChange(opt.id);
                          setIsOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.06] text-zinc-100 font-medium'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100'
                        }`}
                      >
                        <span className="truncate">{opt.name}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : options && options.length > 0 ? (
            <div className="space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.06] text-zinc-100 font-medium'
                        : 'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100'
                    }`}
                  >
                    <span className="truncate">{opt.name}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
