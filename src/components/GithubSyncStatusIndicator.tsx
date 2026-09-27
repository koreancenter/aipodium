import React from 'react';
import { Github, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export type GitHubSyncStatus = 'idle' | 'syncing' | 'synced' | 'conflict' | 'error';

export interface GithubSyncStatusIndicatorProps {
  status: GitHubSyncStatus;
  repo?: string;
  branch?: string;
  onClick?: () => void;
  className?: string;
}

interface StatusStyleConfig {
  label: string;
  pillClasses: string;
  dotClasses: string;
  icon?: React.ReactNode;
  tooltip: string;
}

const STATUS_MAP: Record<GitHubSyncStatus, StatusStyleConfig> = {
  idle: {
    label: '대기 중',
    pillClasses:
      'bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:border-zinc-500/60 hover:text-zinc-300',
    dotClasses: 'bg-zinc-500',
    tooltip: 'GitHub 자동 동기화 대기 중 (변경 시 자동 푸시)',
  },
  syncing: {
    label: '동기화 중...',
    pillClasses:
      'bg-indigo-950/80 text-indigo-300 border-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.25)]',
    dotClasses: 'bg-indigo-400 animate-pulse',
    icon: <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0 text-indigo-400" />,
    tooltip: 'GitHub 저장소로 변경사항 자동 동기화 중...',
  },
  synced: {
    label: '동기화 완료',
    pillClasses:
      'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.25)]',
    dotClasses: 'bg-emerald-400',
    icon: <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-400" />,
    tooltip: 'GitHub 저장소 최신 커밋 동기화 완료',
  },
  conflict: {
    label: '충돌 감지',
    pillClasses:
      'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.25)]',
    dotClasses: 'bg-amber-400 animate-ping',
    icon: <AlertCircle className="w-2.5 h-2.5 shrink-0 text-amber-400" />,
    tooltip: '원격 저장소와 충돌 감지됨 (안전 포크 사본 생성 완료)',
  },
  error: {
    label: '동기화 실패',
    pillClasses:
      'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.25)]',
    dotClasses: 'bg-rose-400',
    icon: <AlertCircle className="w-2.5 h-2.5 shrink-0 text-rose-400" />,
    tooltip: 'GitHub 동기화 중 오류 발생',
  },
};

export const GithubSyncStatusIndicator: React.FC<GithubSyncStatusIndicatorProps> = ({
  status,
  repo,
  branch,
  onClick,
  className = '',
}) => {
  const currentConfig = STATUS_MAP[status] || STATUS_MAP.idle;
  const displayRepo = repo ? (repo.includes('/') ? repo.split('/')[1] : repo) : '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      data-testid="github-sync-indicator"
      className={`h-7 flex items-center gap-2 px-2.5 rounded-md border border-[#222226] bg-[#121214] hover:bg-[#18181b] transition-all cursor-pointer select-none group ${className}`}
      title={`${repo ? `[${repo}${branch ? ` : ${branch}` : ''}] ` : ''}${currentConfig.tooltip} - 클릭하여 설정 열기`}
      aria-label={`GitHub 동기화 상태: ${currentConfig.label}`}
    >
      {/* GitHub Repository Info */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
        <Github className="w-3.5 h-3.5 shrink-0 text-zinc-400 group-hover:text-zinc-200" />
        {displayRepo && (
          <span className="font-mono text-[11px] text-zinc-300 max-w-[120px] truncate hidden sm:inline">
            {displayRepo}
          </span>
        )}
      </div>

      {/* Color-coded Status Pill */}
      <span
        data-testid="github-sync-pill"
        data-status={status}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${currentConfig.pillClasses}`}
      >
        {currentConfig.icon ? (
          currentConfig.icon
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentConfig.dotClasses}`} />
        )}
        <span className="tracking-tight">{currentConfig.label}</span>
      </span>
    </div>
  );
};
