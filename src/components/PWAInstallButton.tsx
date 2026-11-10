import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-medium border border-indigo-500/50 transition cursor-pointer ${className}`}
        title="데스크톱 또는 홈 화면에 독립 앱으로 설치"
      >
        <Download className="w-3.5 h-3.5" />
        <span>앱 설치</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-xs bg-[#121214] hover:bg-[#18181b] text-indigo-300 text-xs font-medium border border-[#222226] transition cursor-pointer ${className}`}
          title="홈 화면에 추가 안내"
        >
          <Download className="w-3.5 h-3.5" />
          <span>앱 설치</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-sm p-4 font-sans"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-xs bg-[#121214] border border-[#222226] p-5 shadow-2xl text-slate-200 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xs hover:bg-[#18181b] transition"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <span>홈 화면에 앱 추가 방법</span>
                </h3>
                <p className="text-xs text-slate-400">
                  사파리 브라우저에서 아래 순서대로 진행하시면 독립 앱으로 설치됩니다.
                </p>
              </div>

              <div className="bg-[#09090b] p-3 rounded-xs border border-[#222226] text-xs space-y-2 text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">1.</span>
                  <span>하단 사파리 툴바의 <strong>공유</strong> 아이콘을 탭합니다.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">2.</span>
                  <span>아래로 스크롤하여 <strong>홈 화면에 추가</strong>를 선택합니다.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">3.</span>
                  <span>우측 상단의 <strong>추가</strong>를 누르면 설치가 완료됩니다.</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#222226]">
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="px-3.5 py-1.5 rounded-xs bg-[#121214] hover:bg-[#18181b] border border-[#222226] text-xs font-medium text-slate-200 transition cursor-pointer"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
