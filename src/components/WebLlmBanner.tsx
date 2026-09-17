import React from 'react';
import { Cpu, Sparkles, AlertCircle, CheckCircle2, Loader2, X, Zap } from 'lucide-react';

interface WebLlmBannerProps {
  isSupported: boolean;
  isLoading: boolean;
  isReady: boolean;
  progressText: string;
  progressPercent: number;
  onStartDownload: () => void;
  onSelectModel: () => void;
  onDismiss?: () => void;
}

export const WebLlmBanner: React.FC<WebLlmBannerProps> = ({
  isSupported,
  isLoading,
  isReady,
  progressText,
  progressPercent,
  onStartDownload,
  onSelectModel,
  onDismiss,
}) => {
  // 1. WebGPU 미지원 환경 안내
  if (!isSupported) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 mb-4 flex items-center justify-between gap-3 text-xs text-zinc-300">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate break-keep">
            현재 브라우저는 WebGPU를 지원하지 않습니다. Chrome, Edge 113+ 브라우저 환경을 권장합니다.
          </span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer shrink-0"
            title="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // 2. 로드 완료 상태 ('🟢 로컬 AI 구동 중' 축소 칩)
  if (isReady) {
    return (
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs mb-4 select-none animate-in fade-in duration-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-emerald-300 font-medium truncate">
            🟢 로컬 AI 구동 중 (Qwen2.5-0.5B 브라우저 내장)
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSelectModel}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 transition cursor-pointer"
          >
            대화 모델로 적용
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-emerald-400/60 hover:text-emerald-200 rounded transition cursor-pointer"
              title="배너 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. 로딩 상태 (WebLLM 초기화 진행률 0~100% 및 프로그레스 바)
  if (isLoading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-4 select-none animate-in fade-in duration-150">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
            <span className="text-xs font-semibold text-zinc-100 truncate">
              브라우저 내장 로컬 AI 가중치 다운로드 및 초기화 중
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-indigo-400 shrink-0">
            {progressPercent}%
          </span>
        </div>

        {/* 0~100% 게이지 바 */}
        <div className="w-full bg-white/5 border border-white/10 rounded-full h-1.5 overflow-hidden mb-2">
          <div
            className="bg-indigo-500 h-full transition-all duration-200 rounded-full"
            style={{ width: `${Math.max(2, Math.min(100, progressPercent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[0.6875rem] text-zinc-400">
          <span className="truncate max-w-[80%]" title={progressText}>
            {progressText || '가중치 다운로드 및 WebGPU 컴파일 중...'}
          </span>
          <span className="shrink-0 font-mono text-[0.625rem] text-zinc-400">
            약 350MB (최초 1회 캐싱)
          </span>
        </div>
      </div>
    );
  }

  // 4. 기본 Callout Card (인라인 체험 배너)
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-4 transition select-none animate-in fade-in duration-150">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs font-semibold text-zinc-100 whitespace-nowrap">
              API 키 없이 바로 체험하기
            </span>
            <span className="text-[0.625rem] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-indigo-300 font-mono">
              WebGPU 내장
            </span>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer shrink-0 -mr-1 -mt-1"
            title="배너 닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400 mb-3 break-keep leading-relaxed">
        브라우저 내장 초경량 AI(약 350MB)를 기기에 직접 올려 즉시 테스트합니다.
      </p>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onStartDownload}
          className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-zinc-100 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
        >
          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          <span>무설치 브라우저 AI 활성화</span>
        </button>
      </div>
    </div>
  );
};
