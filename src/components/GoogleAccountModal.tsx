import React from 'react';
import { LogOut, CheckCircle2, HardDrive, X } from 'lucide-react';
import { GoogleUserProfile } from '../services/googleDriveService';

interface GoogleAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GoogleUserProfile | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => void;
  onToast: (msg: string) => void;
}

export const GoogleAccountModal: React.FC<GoogleAccountModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignIn,
  onSignOut,
  onToast,
}) => {
  if (!isOpen) return null;

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '0 B';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const calculateQuotaPercent = () => {
    if (!user?.storageQuota?.limit || !user?.storageQuota?.usage) return 0;
    const limit = parseInt(user.storageQuota.limit, 10);
    const usage = parseInt(user.storageQuota.usage, 10);
    if (!limit || isNaN(limit) || !usage || isNaN(usage)) return 0;
    return Math.min(100, Math.round((usage / limit) * 100));
  };

  const quotaPercent = calculateQuotaPercent();

  return (
    <div
      id="google-account-modal-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--bg-main)]/80 backdrop-blur-sm p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        id="google-account-modal-content"
        className="relative bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] max-w-md w-full p-5 space-y-4 text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded hover:bg-white/[0.06] transition cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 pt-1">
          <h2 className="text-sm font-medium text-[var(--text-main)]">구글 계정 및 워크스페이스</h2>
          <p className="text-xs text-[var(--text-muted)]">구글 드라이브 동기화 및 계정 인증 상태</p>
        </div>

        {/* Content */}
        {user ? (
          <div className="space-y-3.5 text-xs">
            {/* User Profile Card */}
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-surface)] border border-white/[0.07] rounded-md">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover border border-white/[0.12] shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#0F172A] font-medium text-sm flex items-center justify-center shrink-0">
                  {(user.name || user.email || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-[var(--text-main)] truncate text-xs">{user.name || 'Google 사용자'}</span>
                  <span className="badge-success text-[10px] font-medium px-2 py-0.5 rounded">
                    인증됨
                  </span>
                </div>
                <div className="text-[var(--text-muted)] truncate text-[11px] mt-0.5 font-mono">{user.email}</div>
              </div>
            </div>

            {/* Storage Quota */}
            <div className="p-3 bg-[var(--bg-surface)] border border-white/[0.07] rounded-md space-y-2">
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span className="font-normal text-xs text-[var(--text-muted)]">
                  구글 드라이브 저장 공간
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {formatBytes(user.storageQuota?.usage)} / {formatBytes(user.storageQuota?.limit)} ({quotaPercent}%)
                </span>
              </div>
              <div className="w-full bg-[var(--bg-main)] h-1.5 rounded-full overflow-hidden border border-white/[0.07]">
                <div
                  className={`h-full transition-all duration-300 ${
                    quotaPercent > 90 ? 'bg-rose-500' : quotaPercent > 70 ? 'bg-amber-500' : 'bg-[var(--accent-primary)]'
                  }`}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  onToast('구글 계정 로그아웃이 완료되었습니다.');
                }}
                className="btn-secondary text-xs text-rose-400 hover:text-rose-300 border-rose-900/50 hover:bg-rose-950/40"
              >
                <span>로그아웃</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary text-xs"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs py-2">
            <p className="text-[var(--text-muted)] leading-relaxed text-xs">
              구글 드라이브 계정을 연결하면 워크스페이스 문서와 마크다운 노트를 안전하게 클라우드에 보관하고 여러 기기에서 동기화할 수 있습니다.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onSignIn();
                  onClose();
                }}
                className="btn-primary text-xs"
              >
                <span>구글 계정 로그인</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
