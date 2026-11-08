import React from 'react';
import { X, Keyboard } from 'lucide-react';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  label: string;
  keys: string;
}

const SHORTCUTS_LIST: ShortcutItem[] = [
  { label: '메시지 전송', keys: 'Ctrl + Enter' },
  { label: '마크다운 파일 저장', keys: 'Ctrl + S' },
  { label: '새 프로젝트 생성', keys: 'Alt + N' },
  { label: '새 마크다운 노트', keys: 'Ctrl + N' },
  { label: '로컬 파일 불러오기', keys: 'Ctrl + O' },
  { label: '인쇄 및 출력', keys: 'Ctrl + P' },
  { label: '이미지 및 파일 붙여넣기', keys: 'Ctrl + V' },
  { label: '전체 마크다운 복사', keys: 'Ctrl + C' },
  { label: '탐색기 파일 검색', keys: 'Ctrl + F' }
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-[#121214] border border-[#222226] rounded-xs max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-xs hover:bg-[#18181b] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pt-1">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-indigo-300">단축키 안내</h2>
          </div>
          <p className="text-xs text-slate-400">워크스페이스 작업 효율을 높이는 단축키 목록입니다.</p>
        </div>

        <div className="space-y-1.5 text-xs text-slate-300 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {SHORTCUTS_LIST.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-1.5 border-b border-[#222226]"
            >
              <span className="text-slate-300">{item.label}</span>
              <kbd className="bg-[#09090b] text-[#6366f1] font-mono px-2 py-0.5 rounded-xs text-[0.6875rem] border border-[#222226]">
                {item.keys}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-[#222226]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xs text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
