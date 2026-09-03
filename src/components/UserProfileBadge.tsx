import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  Settings,
  HardDrive,
  Zap
} from 'lucide-react';
import { AuthUser } from '../services/authService';

interface UserProfileBadgeProps {
  user: AuthUser;
  variant?: 'header' | 'sidebar' | 'menu';
  onSignOut: () => void;
  onOpenSettings?: () => void;
  onOpenGoogleAccount?: () => void;
  onOpenUpgrade?: () => void;
  onActionComplete?: () => void;
}

export const UserProfileBadge: React.FC<UserProfileBadgeProps> = ({
  user,
  variant = 'header',
  onSignOut,
  onOpenSettings,
  onOpenGoogleAccount,
  onOpenUpgrade,
  onActionComplete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '게';

  // Variant 1: Sidebar compact footer chip
  if (variant === 'sidebar') {
    return (
      <div className="flex items-center justify-between px-2 py-1 w-full bg-[#16171e] border border-[#2e3142] rounded-sm text-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-4.5 h-4.5 rounded-xs object-cover border border-[#2e3142]"
              />
            ) : (
              <div className="w-4.5 h-4.5 rounded-xs bg-[#6366f1] text-white font-bold flex items-center justify-center text-[0.5625rem]">
                {initials}
              </div>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#16171e] ${user.provider === 'guest' ? 'bg-[#0ea5e9]' : 'bg-[#6366f1]'}`} />
          </div>
          <div className="min-w-0 flex-1 leading-none">
            <div className="text-[0.6875rem] font-semibold text-[#e2e8f0] truncate" title={user.name}>
              {user.name || '게스트'}
            </div>
            <div className="text-[0.5625rem] text-[#94a3b8] truncate mt-0.5 font-mono">
              {user.email || '게스트 세션'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="p-1 text-[#94a3b8] hover:text-rose-400 hover:bg-[#282a38] rounded-sm transition cursor-pointer"
          title="로그아웃"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Variant 2: Menu embedded card (Inside File Menu Dropdown)
  if (variant === 'menu') {
    return (
      <div className="p-1 space-y-1 text-xs text-[#e2e8f0]">
        {/* User Info Header Card */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#16171e]">
          <div className="relative shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover border border-[#2e3142]"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#6366f1] text-white font-bold flex items-center justify-center text-[0.625rem]">
                {initials}
              </div>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${user.provider === 'guest' ? 'bg-[#0ea5e9]' : 'bg-[#6366f1]'}`} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-semibold text-slate-100 truncate text-xs">{user.name || '게스트'}</div>
            <div className="text-[0.625rem] text-[#94a3b8] truncate">{user.email || '게스트 세션'}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-0.5 pt-0.5">
          {user.provider === 'guest' && onOpenUpgrade && (
            <button
              type="button"
              onClick={() => {
                onActionComplete?.();
                onOpenUpgrade();
              }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-[#282a38] text-[#0ea5e9] hover:text-[#38bdf8] font-medium flex items-center gap-2 transition cursor-pointer text-xs"
            >
              <Zap className="w-3.5 h-3.5 text-[#0ea5e9] shrink-0" />
              <span>계정 연동 및 클라우드 백업</span>
            </button>
          )}

          {user.provider === 'google' && onOpenGoogleAccount && (
            <button
              type="button"
              onClick={() => {
                onActionComplete?.();
                onOpenGoogleAccount();
              }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-[#282a38] text-[#e2e8f0] hover:text-white flex items-center gap-2 transition cursor-pointer text-xs"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#0ea5e9] shrink-0" />
              <span>Google Drive 계정 관리</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                onActionComplete?.();
                onOpenSettings();
              }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-[#282a38] text-[#e2e8f0] hover:text-white flex items-center gap-2 transition cursor-pointer text-xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>환경설정</span>
            </button>
          )}

          <div className="my-1 border-t border-[#2e3142]" />

          <button
            type="button"
            onClick={() => {
              onActionComplete?.();
              onSignOut();
            }}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 flex items-center gap-2 transition cursor-pointer text-xs"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>{user.provider === 'guest' ? '게스트 세션 종료' : '로그아웃'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Variant 3: Header dropdown badge
  return (
    <div ref={dropdownRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-6 h-6 flex items-center justify-center rounded-sm bg-[#1e202b] hover:bg-[#282a38] border border-[#2e3142] hover:border-[#6366f1]/50 transition cursor-pointer group select-none shrink-0"
        title={`${user.name || '게스트'} (${user.email || '게스트 세션'})`}
      >
        {/* Avatar Square */}
        <div className="relative shrink-0 flex items-center justify-center">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-4.5 h-4.5 rounded-xs object-cover border border-[#2e3142] group-hover:border-[#6366f1] transition"
            />
          ) : (
            <div className="w-4.5 h-4.5 rounded-xs bg-[#6366f1] text-white font-bold flex items-center justify-center text-[0.5625rem] tracking-tight">
              {initials}
            </div>
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#1e202b] ${user.provider === 'guest' ? 'bg-[#0ea5e9]' : 'bg-[#6366f1]'}`} />
        </div>
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[#1e202b]/98 backdrop-blur-md border border-[#2e3142] rounded-sm p-1 text-xs text-[#e2e8f0] z-50 animate-in fade-in duration-75">
          
          {/* User Info Header */}
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#2e3142]">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-xs object-cover border border-[#2e3142] shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-xs bg-[#6366f1] text-white font-bold flex items-center justify-center text-xs shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-semibold text-slate-100 truncate text-xs">{user.name || '게스트'}</div>
              <div className="text-[0.625rem] text-[#94a3b8] truncate mt-0.5 font-mono">{user.email || '게스트 로컬 세션'}</div>
            </div>
          </div>

          {/* Quick Menu Actions */}
          <div className="py-1 space-y-0.5">
            {user.provider === 'guest' && onOpenUpgrade && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenUpgrade();
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#282a38] text-[#0ea5e9] hover:text-[#38bdf8] font-medium flex items-center gap-2 transition cursor-pointer text-xs"
              >
                <Zap className="w-3.5 h-3.5 text-[#0ea5e9] shrink-0" />
                <span>계정 연동 및 클라우드 백업</span>
              </button>
            )}

            {user.provider === 'google' && onOpenGoogleAccount && (
              <button
                type="button"
                onClick={() => {
                  onOpenGoogleAccount();
                  setIsOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#282a38] text-[#e2e8f0] hover:text-white flex items-center gap-2 transition cursor-pointer text-xs"
              >
                <HardDrive className="w-3.5 h-3.5 text-[#0ea5e9] shrink-0" />
                <span>Google Drive 계정 관리</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setIsOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#282a38] text-[#e2e8f0] hover:text-white flex items-center gap-2 transition cursor-pointer text-xs"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>환경설정</span>
              </button>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="pt-1 border-t border-[#2e3142]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 flex items-center gap-2 transition cursor-pointer text-xs"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>{user.provider === 'guest' ? '게스트 세션 종료' : '로그아웃'}</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

