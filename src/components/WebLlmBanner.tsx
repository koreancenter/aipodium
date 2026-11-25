import React from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

export interface WebLlmBannerProps {
  isSupported: boolean;
  isLoading?: boolean;
  isModelLoading?: boolean;
  isReady: boolean;
  progressText?: string;
  progressPercent?: number;
  downloadProgress?: number;
  memoryGuide?: string;
  onStartDownload: () => void;
  onSelectModel?: () => void;
  onDismiss?: () => void;
}

export const WebLlmBanner: React.FC<WebLlmBannerProps> = ({
  isSupported,
  isLoading,
  isModelLoading,
  isReady,
  progressText = '',
  progressPercent = 0,
  downloadProgress,
  memoryGuide,
  onStartDownload,
  onSelectModel,
  onDismiss,
}) => {
  const loading = Boolean(isLoading || isModelLoading);
  const percent = downloadProgress !== undefined ? downloadProgress : progressPercent;

  // 1. WebGPU 미지원 환경 안내
  if (!isSupported) {
    return (
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border-structural)] px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)] select-none">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate break-keep">
            현재 브라우저는 WebGPU 가속을 지원하지 않습니다. Chrome 또는 Edge 최신 버전 브라우저 환경을 권장합니다.
          </span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition cursor-pointer shrink-0"
            title="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // 2. 로드 완료 상태
  if (isReady) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-[var(--secondary-accent)]/10 border-b border-[var(--secondary-accent)]/20 text-xs select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--secondary-accent)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--secondary-accent)]" />
          </span>
          <span className="text-[var(--secondary-accent)] font-medium truncate">
            브라우저 내장 로컬 AI 엔진 가동 중 · 완전 오프라인 무료 추론 가능
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onSelectModel && (
            <button
              type="button"
              onClick={onSelectModel}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--secondary-accent)]/15 hover:bg-[var(--secondary-accent)]/25 text-[var(--secondary-accent)] border border-[var(--secondary-accent)]/30 transition cursor-pointer"
            >
              대화 모델로 적용
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-[var(--secondary-accent)]/60 hover:text-[var(--secondary-accent)] rounded transition cursor-pointer"
              title="배너 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. 로딩 상태 (WebLLM 가중치 다운로드 진행률 및 프로그레스 바)
  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border-structural)] px-4 py-3 select-none">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="w-4 h-4 text-[var(--accent-primary)] animate-spin shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-main)] truncate">
              브라우저 내장 로컬 AI 가중치 다운로드 및 초기화 중
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-[var(--accent-primary)] shrink-0">
            {percent}%
          </span>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] mb-2 leading-relaxed break-keep">
          브라우저 내장 AI 엔진(WebLLM)을 준비 중입니다. 최초 1회 모델 가중치(약 1.5GB) 다운로드가 진행되며, 이후에는 오프라인에서도 완전 무료로 실행됩니다.
        </p>

        {/* 0~100% 게이지 바 */}
        <div className="w-full bg-[var(--bg-editor)] border border-[var(--border-structural)] rounded-full h-1.5 overflow-hidden mb-2">
          <div
            className="bg-[var(--accent-primary)] h-full w-full rounded-full origin-left transition-transform duration-200 ease-out"
            style={{ transform: `scaleX(${Math.max(0.02, Math.min(1, percent / 100))})` }}
          />
        </div>

        <div className="flex items-center justify-between text-[0.6875rem] text-[var(--text-muted)]">
          <span className="truncate max-w-[70%]" title={progressText}>
            {progressText || '가중치 다운로드 및 WebGPU 컴파일 중...'}
          </span>
          <span className="shrink-0 font-mono text-[0.625rem] text-[var(--text-tertiary)]">
            {memoryGuide || '권장 메모리: 4GB 이상 · 가중치 캐싱 약 1.5GB'}
          </span>
        </div>
      </div>
    );
  }

  // 4. 기본 Callout 안내 (WebLLM 선택 시 가중치 다운로드 시작 안내)
  return (
    <div className="bg-[var(--bg-surface)] border-b border-[var(--border-structural)] px-4 py-3 transition select-none">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-xs font-semibold text-[var(--text-main)]">
            API 키 없이 브라우저 내장 로컬 AI 실행
          </span>
          <span className="text-[0.625rem] text-[var(--accent-primary)] font-mono">
            · WebGPU
          </span>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded transition cursor-pointer shrink-0"
            title="배너 닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)] mb-3 break-keep leading-relaxed">
        브라우저 내장 AI 엔진(WebLLM)을 준비 중입니다. 최초 1회 모델 가중치(약 1.5GB) 다운로드가 진행되며, 이후에는 오프라인에서도 완전 무료로 실행됩니다.
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.6875rem] text-[var(--text-tertiary)] font-mono">
          권장 메모리: 4GB 이상 여유 공간
        </span>
        <button
          type="button"
          onClick={onStartDownload}
          className="bg-[#F1F5F9] hover:bg-white text-[#0F172A] px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition flex items-center justify-center shadow-xs active:scale-[0.98]"
        >
          무설치 브라우저 로컬 AI 시작하기
        </button>
      </div>
    </div>
  );
};
