import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  Settings,
  ShieldCheck,
  ChevronDown,
  HardDrive,
  Github,
  Key,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AuthUser } from '../services/authService';

interface UserProfileBadgeProps {
  user: AuthUser;
  variant?: 'header' | 'sidebar';
  onSignOut: () => void;
  onOpenSettings?: () => void;
  onOpenGoogleAccount?: () => void;
}

export const UserProfileBadge: React.FC<UserProfileBadgeProps> = ({
  user,
  variant = 'header',
  onSignOut,
  onOpenSettings,
  onOpenGoogleAccount
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

  const getProviderIcon = () => {
    switch (user.provider) {
      case 'google':
        return (
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
        );
      case 'github':
        return <Github className="w-2.5 h-2.5 text-slate-300" />;
      case 'apikey':
        return <Key className="w-2.5 h-2.5 text-amber-400" />;
      default:
        return <User className="w-2.5 h-2.5 text-emerald-400" />;
    }
  };

  const getProviderLabel = () => {
    switch (user.provider) {
      case 'google':
        return 'Google';
      case 'github':
        return 'GitHub';
      case 'apikey':
        return 'API Key';
      default:
        return 'Guest';
    }
  };

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AI';

  // Variant 1: Sidebar compact footer chip
  if (variant === 'sidebar') {
    return (
      <div className="flex items-center justify-between px-2 py-1.5 w-full bg-slate-900/90 border border-slate-800 rounded-lg text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[0.5625rem]">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
          </div>
          <div className="min-w-0 flex-1 leading-none">
            <div className="text-[0.6875rem] font-semibold text-slate-200 truncate" title={user.name}>
              {user.name}
            </div>
            <div className="text-[0.5625rem] text-slate-500 flex items-center gap-1 mt-0.5">
              <span>{getProviderLabel()}</span>
              {user.githubRepo && <span className="truncate font-mono">({user.githubRepo})</span>}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition cursor-pointer"
          title="로그아웃 (Sign Out)"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Variant 2: Header dropdown badge (Icon-only with rich tooltip)
  return (
    <div ref={dropdownRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition cursor-pointer group select-none shadow-xs shrink-0"
        title={`${user.name} (${user.email || '게스트'}) - 프로필 및 계정 설정`}
      >
        {/* Avatar Circle with Online Dot */}
        <div className="relative shrink-0 flex items-center justify-center">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-5.5 h-5.5 rounded-full object-cover border border-slate-600 group-hover:border-indigo-400 transition"
            />
          ) : (
            <div className="w-5.5 h-5.5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[0.625rem] tracking-tight">
              {initials}
            </div>
          )}
          {/* Green online indicator on the bottom-right of avatar */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 shadow-xs" />
        </div>
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900/98 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800/60">
          
          {/* User Info Header */}
          <div className="p-2 space-y-1">
            <div className="flex items-center gap-2">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-100 truncate text-xs">{user.name}</div>
                <div className="text-[0.625rem] text-slate-400 truncate">{user.email}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[0.5625rem] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                {user.role || 'Developer'}
              </span>
              <span className="text-[0.5625rem] text-slate-500 font-mono flex items-center gap-1">
                {getProviderIcon()}
                <span>{getProviderLabel()} Auth</span>
              </span>
            </div>
          </div>

          {/* Quick Menu Actions */}
          <div className="py-1 space-y-0.5">
            {user.provider === 'google' && onOpenGoogleAccount && (
              <button
                type="button"
                onClick={() => {
                  onOpenGoogleAccount();
                  setIsOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition cursor-pointer text-[0.6875rem]"
              >
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                <span>Google Drive SSOT 계정 관리</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setIsOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-indigo-600 hover:text-white flex items-center justify-between transition cursor-pointer text-[0.6875rem]"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>환경설정 (Preferences)</span>
                </div>
                <span className="text-[0.5625rem] text-slate-500 font-mono">Alt+,</span>
              </button>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-red-600/20 hover:text-red-300 text-red-400 flex items-center gap-2 transition cursor-pointer text-[0.6875rem]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃 / 계정 전환</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
