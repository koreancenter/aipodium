import React from 'react';
import {
  X,
  Lock,
  Sparkles,
  Github,
  Cloud,
  HardDrive,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export interface GuestFeatureGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  featureDescription?: string;
  featureIcon?: 'github' | 'cloud' | 'gdrive' | 'sync' | 'default';
  onUpgrade: () => void;
}

export const GuestFeatureGateModal: React.FC<GuestFeatureGateModalProps> = ({
  isOpen,
  onClose,
  featureName = '클라우드 동기화',
  featureDescription = '이 기능은 클라우드 및 계정 연동이 필요한 엔터프라이즈 기능입니다.',
  featureIcon = 'default',
  onUpgrade,
}) => {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (featureIcon) {
      case 'github':
        return <Github className="w-6 h-6 text-slate-200" />;
      case 'gdrive':
        return <HardDrive className="w-6 h-6 text-emerald-400" />;
      case 'sync':
        return <RefreshCw className="w-6 h-6 text-cyan-400" />;
      case 'cloud':
        return <Cloud className="w-6 h-6 text-teal-300" />;
      default:
        return <Lock className="w-6 h-6 text-emerald-400" />;
    }
  };

  return (
    <div
      id="guest-feature-gate-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-main)]/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="guest-feature-gate-modal-content"
        className="relative bg-[var(--bg-elevated)]/95 backdrop-blur-md border border-white/[0.08] rounded-xl max-w-md w-full p-6 shadow-2xl text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-150 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Feature Icon Header */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-[var(--bg-surface)] border border-white/[0.06] flex items-center justify-center shadow-lg">
              {renderIcon()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-[var(--accent-primary)] text-[#0F172A] flex items-center justify-center font-bold text-xs shadow-md">
              <Lock className="w-3 h-3" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-[var(--accent-primary)] text-[0.6875rem] font-medium">
            <Sparkles className="w-3 h-3" />
            <span>클라우드 전용 기능</span>
          </div>

          <h3 className="text-lg font-semibold text-[var(--text-main)] tracking-tight">
            [{featureName}] 기능 안내
          </h3>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed px-2">
            {featureDescription}
          </p>
        </div>

        {/* Benefit Callouts */}
        <div className="my-5 p-3.5 rounded-xl bg-[var(--bg-surface)] border border-white/[0.06] space-y-2.5 text-xs text-[var(--text-muted)]">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
            <span>
              <strong className="text-[var(--text-main)]">로컬 작업 내용 100% 자동 유지</strong>: 계정 생성 시 현재 작성 중인 마크다운 문서와 세션이 유실 없이 그대로 이전됩니다.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
            <span>
              <strong className="text-[var(--text-main)]">다중 기기 실시간 동기화</strong>: GitHub 및 Cloudflare D1 기반 클라우드 백업을 활성화할 수 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
            <span>
              <strong className="text-[var(--text-main)]">무료 계정 생성</strong>: Google 소셜 로그인 또는 이메일로 3초 만에 시작할 수 있습니다.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-1/2 h-9 flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-medium transition cursor-pointer"
          >
            로컬에서 계속 작업하기
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onUpgrade();
            }}
            className="w-full sm:w-1/2 h-9 flex items-center justify-center gap-1.5 rounded-lg bg-[#F1F5F9] hover:bg-white text-[#0F172A] text-xs font-semibold transition cursor-pointer"
          >
            <span>계정 로그인 / 생성</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Guest Security Notice */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] text-center text-[0.625rem] text-[var(--text-muted)] flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary-accent)]" />
          <span>게스트 모드는 브라우저 로컬 스토리지에만 안전하게 저장됩니다.</span>
        </div>
      </div>
    </div>
  );
};
