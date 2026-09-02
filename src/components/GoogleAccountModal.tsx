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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        id="google-account-modal-content"
        className="relative bg-[#18181b] border border-[#27272a] rounded-lg max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition cursor-pointer"
          title="닫기 (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 pt-1">
          <h2 className="text-base font-normal text-slate-300">Google Account & Workspace</h2>
          <p className="text-xs text-slate-400">Google Drive 동기화 및 계정 인증 상태</p>
        </div>

        {/* Content */}
        {user ? (
          <div className="space-y-4 text-xs">
            {/* User Profile Card */}
            <div className="flex items-center gap-3 p-3 bg-[#27272a]/60 border border-[#3f3f46] rounded">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#38bdf8] shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0284c7] text-white font-medium text-sm flex items-center justify-center shrink-0">
                  {(user.name || user.email || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-200 truncate text-xs">{user.name || 'Google User'}</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 rounded text-[0.625rem]">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    인증됨
                  </span>
                </div>
                <div className="text-slate-400 truncate text-[0.6875rem] mt-0.5 font-mono">{user.email}</div>
              </div>
            </div>

            {/* Storage Quota */}
            <div className="p-3 bg-[#27272a]/60 border border-[#3f3f46] rounded space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-normal text-xs text-slate-400">
                  <HardDrive className="w-3.5 h-3.5 text-[#38bdf8]" />
                  Google Drive 저장 용량
                </span>
                <span className="font-mono text-[0.6875rem] text-slate-400">
                  {formatBytes(user.storageQuota?.usage)} / {formatBytes(user.storageQuota?.limit)} ({quotaPercent}%)
                </span>
              </div>
              <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden border border-[#3f3f46]">
                <div
                  className={`h-full transition-all duration-300 ${
                    quotaPercent > 90 ? 'bg-rose-500' : quotaPercent > 70 ? 'bg-amber-500' : 'bg-[#0284c7]'
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
                  onToast('Google 계정 로그아웃이 완료되었습니다.');
                }}
                className="px-3 py-1.5 rounded text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                로그아웃
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded text-xs font-medium bg-[#0284c7] hover:bg-[#0369a1] text-white transition cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs py-2">
            <p className="text-slate-400 leading-relaxed text-xs">
              Google Drive 계정을 연결하면 워크스페이스 문서, 마크다운 노트를 안전하게 클라우드에 백업하고 여러 기기에서 동기화할 수 있습니다.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-[#27272a] transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onSignIn();
                  onClose();
                }}
                className="px-4 py-1.5 rounded text-xs font-medium bg-[#0284c7] hover:bg-[#0369a1] text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Google 계정 로그인</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
