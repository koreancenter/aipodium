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
            <div className="w-6 h-6 rounded-xs bg-indigo-600 flex items-center justify-center text-white">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-white">AI Podium 정보</h2>
          </div>
          <p className="text-xs text-indigo-400 font-mono">v2.5 전문 다중 인공지능 워크스테이션</p>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            AI Podium은 지능형 다중 인공지능 평가 라우팅, 실시간 마크다운 노트 및 목차 탐색기, 프로젝트·메모·폴더 연동 시스템, 차세대 다중 포맷 내보내기 엔진을 제공하는 통합 워크스테이션입니다.
          </p>
          <div className="bg-[#09090b] p-3 rounded-xs border border-[#222226] text-[0.6875rem] space-y-1 font-mono text-slate-300">
            <div className="text-indigo-300 font-semibold mb-1">핵심 아키텍처 사양:</div>
            <div>• 옵시디언 다크 테마 기준 문서 워크스페이스</div>
            <div>• 통합 다중 탭 문서 탐색 바</div>
            <div>• 로컬 파일 시스템 및 브라우저 영구 저장소 연동</div>
            <div>• 가변 높이 인공지능 프롬프트 스튜디오 및 라우팅</div>
          </div>
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
