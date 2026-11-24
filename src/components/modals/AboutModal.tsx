import React from 'react';
import { X, Brain } from 'lucide-react';

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
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
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)]">
              <Brain className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-[var(--text-main)] tracking-tight">AI Podium 정보</h2>
          </div>
          <p className="text-xs text-[var(--accent-primary)] font-mono">v0.1.0 전문 다중 인공지능 워크스테이션</p>
        </div>

        <div className="space-y-3 text-xs text-[var(--text-muted)] leading-relaxed">
          <p>
            AI Podium은 지능형 다중 인공지능 평가 라우팅, 실시간 마크다운 노트 및 목차 탐색기, 프로젝트·메모·폴더 연동 시스템, 차세대 다중 포맷 내보내기 엔진을 제공하는 통합 워크스테이션입니다.
          </p>
          <div className="bg-[var(--bg-surface)] p-3.5 rounded-lg border border-[var(--border-structural)] text-[0.6875rem] space-y-1.5 font-mono text-[var(--text-muted)]">
            <div className="text-[var(--text-main)] font-semibold mb-1">핵심 아키텍처 사양</div>
            <div>• 쿨 슬레이트 다크 테마 기준 문서 워크스페이스</div>
            <div>• 통합 다중 탭 문서 탐색 바</div>
            <div>• 로컬 파일 시스템 및 브라우저 영구 저장소 연동</div>
            <div>• 가변 높이 인공지능 프롬프트 스튜디오 및 라우팅</div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[var(--border-structural)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#F1F5F9] hover:bg-white text-[#0F172A] transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
