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
      className="fixed inset-0 z-50 bg-[var(--bg-main)]/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-[var(--border-luminous)] rounded-xl max-w-md w-full p-6 shadow-2xl shadow-[var(--rim-glow)] cyber-rim-top space-y-5 text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pt-1">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 className="text-base font-semibold text-[var(--text-main)] tracking-tight">단축키 안내</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)]">워크스페이스 작업 효율을 높이는 단축키 목록입니다.</p>
        </div>

        <div className="divide-y divide-[var(--border-structural)] text-xs text-[var(--text-muted)] max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {SHORTCUTS_LIST.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2"
            >
              <span className="text-[var(--text-muted)]">{item.label}</span>
              <kbd className="bg-[var(--bg-surface)] text-[var(--accent-primary)] font-mono px-2 py-0.5 rounded-md text-[0.6875rem] border border-[var(--border-structural)]">
                {item.keys}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-[var(--border-structural)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F1F5F9] hover:bg-white text-[#0F172A] transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
