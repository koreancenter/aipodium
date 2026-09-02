import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, MessageSquareText, FileText, Code, Check } from 'lucide-react';

interface InlineContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  selectedText: string;
  onClose: () => void;
  onAction: (actionType: string, resultText: string) => void;
}

export const InlineContextMenu: React.FC<InlineContextMenuProps> = ({
  isOpen,
  position,
  selectedText,
  onClose,
  onAction
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  const handleActionClick = async (type: string, label: string) => {
    setIsProcessing(true);
    setActionMessage(label + ' 중...');
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate mock result based on action type
    let result = selectedText;
    if (type === 'summarize') {
      result = `[요약된 텍스트] ${selectedText.substring(0, 50)}...`;
    } else if (type === 'rewrite') {
      result = `[다듬어진 텍스트] ${selectedText} (완료)`;
    } else if (type === 'explain') {
      // Explain doesn't replace, it might just show a toast or append. For now just append.
      result = `${selectedText}\n\n> 💡 설명: 이 텍스트는 AI에 의해 설명되었습니다.`;
    } else if (type === 'format-code') {
      result = '\`\`\`\n' + selectedText + '\n\`\`\`';
    }
    
    onAction(type, result);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      className="absolute z-[100] animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl shadow-black/50 p-1 gap-1 overflow-hidden">
        {isProcessing ? (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{actionMessage}</span>
          </div>
        ) : (
          <>
            <button
              onClick={() => handleActionClick('rewrite', '다듬기')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-800 rounded-md text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <MessageSquareText className="w-3.5 h-3.5 text-indigo-400" />
              다듬기
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5"></div>
            <button
              onClick={() => handleActionClick('summarize', '요약')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-800 rounded-md text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              요약
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5"></div>
            <button
              onClick={() => handleActionClick('explain', '설명')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-800 rounded-md text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-amber-400" />
              설명
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5"></div>
            <button
              onClick={() => handleActionClick('format-code', '코드 포맷팅')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-800 rounded-md text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <Code className="w-3.5 h-3.5 text-sky-400" />
              코드
            </button>
          </>
        )}
      </div>
    </div>
  );
};
