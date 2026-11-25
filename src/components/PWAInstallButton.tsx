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
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[var(--text-main)] text-xs font-medium border border-[var(--border-structural)] hover:border-[var(--border-luminous)] transition cursor-pointer ${className}`}
        title="데스크톱 또는 홈 화면에 독립 앱으로 설치"
      >
        <Download className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
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
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-medium border border-[var(--border-structural)] hover:border-[var(--border-luminous)] transition cursor-pointer ${className}`}
          title="홈 화면에 추가 안내"
        >
          <Download className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>앱 설치</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 font-sans"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-xl bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-white/[0.08] p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] text-[var(--text-main)] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-md hover:bg-white/[0.06] transition cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>홈 화면에 앱 추가 방법</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  사파리 브라우저에서 아래 순서대로 진행하시면 독립 앱으로 설치됩니다.
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-structural)] text-xs space-y-2 text-[var(--text-muted)]">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[var(--accent-primary)]">1.</span>
                  <span>하단 사파리 툴바의 <strong className="text-[var(--text-main)]">공유</strong> 아이콘을 탭합니다.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[var(--accent-primary)]">2.</span>
                  <span>아래로 스크롤하여 <strong className="text-[var(--text-main)]">홈 화면에 추가</strong>를 선택합니다.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[var(--accent-primary)]">3.</span>
                  <span>우측 상단의 <strong className="text-[var(--text-main)]">추가</strong>를 누르면 설치가 완료됩니다.</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[var(--border-structural)]">
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="px-3.5 py-1.5 rounded-md bg-[#F1F5F9] hover:bg-white text-xs font-medium text-[#0F172A] transition cursor-pointer"
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
