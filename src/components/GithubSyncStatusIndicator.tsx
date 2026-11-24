import React from 'react';
import { Github, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export type GitHubSyncStatus = 'idle' | 'syncing' | 'synced' | 'conflict' | 'error';

export interface GithubSyncStatusIndicatorProps {
  status: GitHubSyncStatus;
  repo?: string;
  branch?: string;
  onClick?: () => void;
  onForceSync?: () => void | Promise<void>;
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
      'bg-white/[0.04] text-[var(--text-muted)] border-white/[0.06] hover:text-[var(--text-main)]',
    dotClasses: 'bg-slate-500',
    tooltip: 'GitHub 자동 동기화 대기 중 (변경 시 자동 푸시)',
  },
  syncing: {
    label: '동기화 중...',
    pillClasses:
      'bg-sky-500/10 text-[var(--accent-primary)] border-sky-400/30',
    dotClasses: 'bg-[var(--accent-primary)] animate-pulse',
    icon: <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0 text-[var(--accent-primary)]" />,
    tooltip: 'GitHub 저장소로 변경사항 자동 동기화 중...',
  },
  synced: {
    label: '동기화 완료',
    pillClasses:
      'bg-emerald-500/10 text-[var(--secondary-accent)] border-emerald-400/25',
    dotClasses: 'bg-[var(--secondary-accent)]',
    icon: <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-[var(--secondary-accent)]" />,
    tooltip: 'GitHub 저장소 최신 커밋 동기화 완료',
  },
  conflict: {
    label: '충돌 감지',
    pillClasses:
      'bg-amber-500/10 text-amber-300 border-amber-400/30',
    dotClasses: 'bg-amber-400 animate-ping',
    icon: <AlertCircle className="w-2.5 h-2.5 shrink-0 text-amber-400" />,
    tooltip: '원격 저장소와 충돌 감지됨 (안전 포크 사본 생성 완료)',
  },
  error: {
    label: '동기화 실패',
    pillClasses:
      'bg-rose-500/10 text-rose-300 border-rose-400/30',
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
  onForceSync,
  className = '',
}) => {
  const currentConfig = STATUS_MAP[status] || STATUS_MAP.idle;
  const displayRepo = repo ? (repo.includes('/') ? repo.split('/')[1] : repo) : '';
  const isSyncing = status === 'syncing';

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
      className={`h-7 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 rounded-md border border-[var(--border-structural)] hover:border-[var(--border-luminous)] bg-[var(--bg-surface)] hover:bg-white/[0.05] transition-all cursor-pointer select-none group ${className}`}
      title={`${repo ? `[${repo}${branch ? ` : ${branch}` : ''}] ` : ''}${currentConfig.tooltip} - 클릭하여 설정 열기`}
      aria-label={`GitHub 동기화 상태: ${currentConfig.label}`}
    >
      {/* GitHub Repository Info */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
        <Github className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
        {displayRepo && (
          <span className="font-mono text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-main)] max-w-[120px] truncate hidden sm:inline">
            {displayRepo}
          </span>
        )}
      </div>

      {/* Status Micro-Indicator */}
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

      {/* Divider */}
      <div className="w-[1px] h-3.5 bg-[var(--border-structural)] mx-0.5 shrink-0" />

      {/* Force Sync Manual Trigger Button */}
      <button
        type="button"
        data-testid="github-force-sync-btn"
        data-action="force-sync"
        aria-label="즉시 동기화"
        title="즉시 동기화: 원격 저장소와 즉시 풀 및 푸시 실행"
        disabled={isSyncing}
        onClick={(e) => {
          e.stopPropagation();
          onForceSync ? onForceSync() : onClick?.();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onForceSync ? onForceSync() : onClick?.();
          }
        }}
        className="h-5 px-1.5 flex items-center gap-1 rounded text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
      >
        <RefreshCw className={`w-2.5 h-2.5 shrink-0 ${isSyncing ? 'animate-spin text-[var(--accent-primary)]' : ''}`} />
        <span className="hidden md:inline">즉시 동기화</span>
      </button>
    </div>
  );
};
