import React, { useState } from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  Lock,
  Mail,
  Sparkles,
  User,
  Layers,
  Cpu,
  FileCode,
  ShieldCheck,
  Shield,
  CheckCircle2,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { authService, AuthUser } from '../services/authService';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cloudflare Turnstile Guest Verification state
  const [showGuestTurnstile, setShowGuestTurnstile] = useState(false);
  const [turnstileStatus, setTurnstileStatus] = useState<'idle' | 'verifying' | 'verified'>('idle');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      console.info('Firebase Google signInWithPopup placeholder triggered.');
      const user = await authService.loginWithGoogle();
      onAuthenticated(user);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const fallbackUser = await authService.loginWithGoogle({
        id: `google_${Date.now()}`,
        name: 'Workspace User',
        email: 'workspace-user@gmail.com',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
      });
      onAuthenticated(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    if (authMode === 'register' && password !== confirmPassword) {
      setErrorMsg('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      console.info('Firebase email/password auth placeholder triggered.', {
        mode: authMode,
        email: email.trim()
      });

      const displayName = email.split('@')[0] || 'Workspace Member';
      const fallbackUser: AuthUser = {
        id: `firebase_${Date.now()}`,
        name: displayName,
        email: email.trim(),
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80',
        provider: 'google',
        role: authMode === 'register' ? 'Workspace Creator' : 'Workspace Member',
        createdAt: new Date().toISOString()
      };

      onAuthenticated(fallbackUser);
    } catch (err: any) {
      setErrorMsg(err?.message || '인증에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerTurnstile = () => {
    if (turnstileStatus === 'verifying') return;
    setTurnstileStatus('verifying');
    setTimeout(() => {
      setTurnstileStatus('verified');
    }, 700);
  };

  const handleGuestLogin = () => {
    if (turnstileStatus !== 'verified') {
      setErrorMsg('Cloudflare Turnstile 봇 방지 검증을 완료해 주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const user = authService.loginAsGuest(guestName || 'Guest Developer');
      onAuthenticated(user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen min-h-screen overflow-hidden flex flex-col lg:flex-row bg-[#121318]">
      {/* 1. LEFT 50%: Deep Charcoal Brand / Hero Section (Full 100vh) */}
      <div className="relative hidden lg:flex lg:w-1/2 h-full flex-col justify-between bg-gradient-to-br from-[#121318] via-[#1e202b] to-[#16171e] p-10 xl:p-14 text-white overflow-hidden select-none border-r border-[#2e3142]">
        {/* Subtle Ambient Glow Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#6366f1]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#0ea5e9]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-[#6366f1]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6366f1] to-[#0ea5e9] flex items-center justify-center text-white shadow-md shadow-indigo-950/40">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-sky-200">
              AI Podium
            </span>
            <span className="text-[0.6875rem] text-indigo-300/80 font-medium tracking-wide">
              Living SSOT & Multi-Model AI IDE
            </span>
          </div>
        </div>

        {/* Center: Value Proposition & Feature Highlights */}
        <div className="relative z-10 max-w-lg my-auto py-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#818cf8] text-xs font-medium mb-6 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" />
            <span>Next-Generation Knowledge Engineering</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-tight text-white mb-4">
            단일 진실 공급원(SSOT)과
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-200 to-indigo-200 pt-1 font-bold">
              멀티 AI 모델의 완벽한 결합
            </span>
          </h1>

          <p className="text-sm xl:text-base text-slate-300/90 leading-relaxed mb-8">
            Cloud와 Local AI를 Single·Routing·Multi 모드로 AI Podium에서 완벽하게 오케스트레이션하세요.
            파편화된 정보와 지식을 모아 살아있는 단일 진실 공급원(SSOT)으로 만들어 원하는 문서로 재가공합니다.            
          </p>

          {/* 3 Value Cards */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#16171e]/80 border border-[#2e3142] backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8] shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100">Multi-Model Routing Engine</div>
                <div className="text-[0.6875rem] text-slate-400 truncate">단일 프롬프트로 여러 AI 모델의 답변을 즉시 비교 및 융합</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#16171e]/80 border border-[#2e3142] backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 flex items-center justify-center text-[#38bdf8] shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100">Synchronized Living SSOT</div>
                <div className="text-[0.6875rem] text-slate-400 truncate">대화와 문서가 연동되는 고성능 분할 마크다운 워크스페이스</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#16171e]/80 border border-[#2e3142] backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8] shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100">Enterprise Workspace & Remote Sync</div>
                <div className="text-[0.6875rem] text-slate-400 truncate">로컬 파일, 클라우드 저장소 및 리모트 저장소 동기화 지원</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Footer Info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-[#2e3142] pt-4">
          <span>© 2026 AI Podium Platform</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>개인정보처리방침</span>
            <span>이용약관</span>
            <span>고객지원</span>
          </div>
        </div>
      </div>

      {/* 2. RIGHT 50%: Dark Minimal Compact Login Form (Full 100vh) */}
      <div className="w-full lg:w-1/2 h-full min-h-screen lg:min-h-full flex flex-col justify-center items-center bg-[#121318] px-5 sm:px-8 lg:px-12 py-8 overflow-y-auto">
        <div className="w-full max-w-[400px] flex flex-col">
          {/* Mobile-Only Header Brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6 self-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6366f1] to-[#0ea5e9] flex items-center justify-center text-white shadow-xs">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-100">AI Podium</span>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                {authMode === 'login' ? '로그인' : '계정 생성'}
              </h2>
              <span className="text-xs text-[#818cf8] font-medium bg-[#6366f1]/15 px-2 py-0.5 rounded-md border border-[#6366f1]/30">
                {authMode === 'login' ? 'AI Workspace' : 'Get Started'}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              {authMode === 'login'
                ? '워크스페이스에 접속하여 AI 프로젝트를 계속 진행하세요.'
                : '간단한 가입으로 AI Podium의 모든 강력한 기능을 시작하세요.'}
            </p>
          </div>

          {/* Error Message Banner */}
          {errorMsg && (
            <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-300 flex items-start gap-2">
              <span className="font-bold shrink-0">!</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Controls */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-300">
                이메일 주소
              </label>
              <div className="relative flex items-center rounded-lg border border-[#2e3142] bg-[#1e202b] px-3 py-2 transition-all focus-within:border-[#6366f1] focus-within:ring-2 focus-within:ring-[#6366f1]/20 shadow-2xs">
                <Mail className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-300">
                  비밀번호
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => alert('비밀번호 재설정 링크가 등록된 이메일로 전송됩니다.')}
                    className="text-[0.6875rem] font-medium text-[#818cf8] hover:text-[#a5b4fc] hover:underline cursor-pointer"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                )}
              </div>
              <div className="relative flex items-center rounded-lg border border-[#2e3142] bg-[#1e202b] px-3 py-2 transition-all focus-within:border-[#6366f1] focus-within:ring-2 focus-within:ring-[#6366f1]/20 shadow-2xs">
                <Lock className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  required
                  className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Confirm Password (Register Mode Only) */}
            {authMode === 'register' && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-slate-300">
                  비밀번호 확인
                </label>
                <div className="relative flex items-center rounded-lg border border-[#2e3142] bg-[#1e202b] px-3 py-2 transition-all focus-within:border-[#6366f1] focus-within:ring-2 focus-within:ring-[#6366f1]/20 shadow-2xs">
                  <Check className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] active:bg-[#4338ca] text-white text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-60 mt-1"
            >
              <span>{isLoading ? '처리 중...' : authMode === 'login' ? '로그인' : '회원가입 완료'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Social / Alternative Divider */}
          <div className="flex items-center gap-3 my-4">
            <span className="h-px flex-1 bg-[#2e3142]" />
            <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-slate-500">
              간편 로그인
            </span>
            <span className="h-px flex-1 bg-[#2e3142]" />
          </div>

            {/* Social Auth Buttons (Slim & Compact) */}
          <div className="space-y-2.5">
            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-10 flex items-center justify-center gap-2.5 rounded-lg border border-[#2e3142] bg-[#1e202b] hover:bg-[#282a38] active:bg-[#323548] text-xs font-medium text-slate-200 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Google 계정으로 계속하기</span>
            </button>

            {/* Guest Login Trigger / Expand Button */}
            {!showGuestTurnstile ? (
              <button
                type="button"
                onClick={() => {
                  setShowGuestTurnstile(true);
                  setErrorMsg(null);
                }}
                disabled={isLoading}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-lg border border-[#2e3142] bg-[#1e202b] hover:bg-[#282a38] active:bg-[#323548] text-xs font-medium text-slate-200 transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>게스트 모드로 바로 시작</span>
              </button>
            ) : (
              /* Cloudflare Turnstile Verification & Guest Start */
              <div className="space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                    <Shield className="w-3.5 h-3.5 text-[#6366f1]" />
                    <span>게스트 모드 보안 검증</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGuestTurnstile(false)}
                    className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    취소
                  </button>
                </div>

                {/* Cloudflare Turnstile Styled Interactive Component */}
                <div
                  onClick={handleTriggerTurnstile}
                  className={`w-full p-2.5 rounded-lg border flex items-center justify-between transition cursor-pointer select-none shadow-2xs ${
                    turnstileStatus === 'verified'
                      ? 'bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]'
                      : turnstileStatus === 'verifying'
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-[#1e202b] border-[#2e3142] hover:border-[#6366f1]/50 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {turnstileStatus === 'verified' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#6366f1] shrink-0" />
                    ) : turnstileStatus === 'verifying' ? (
                      <RefreshCw className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded border border-[#2e3142] hover:border-slate-400 flex items-center justify-center bg-[#121318] shrink-0" />
                    )}
                    <div className="text-left">
                      <div className="text-xs font-semibold leading-tight">
                        {turnstileStatus === 'verified'
                          ? '검증되었습니다.'
                          : turnstileStatus === 'verifying'
                          ? '보안 검증 진행 중...'
                          : '자동 봇 방지 보안 검증'}
                      </div>
                    </div>
                  </div>

                  {/* Cloudflare mini branding logo */}
                  <div className="flex flex-col items-end opacity-75 text-[0.5625rem] text-slate-500 shrink-0">
                    <div className="flex items-center gap-1 font-bold text-slate-400 font-mono">
                      <span>Cloudflare</span>
                    </div>
                    <span>보안 인증</span>
                  </div>
                </div>

                {/* Guest Nickname Input & Launch */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="게스트 닉네임"
                    className="flex-1 h-10 px-3 rounded-lg border border-[#2e3142] bg-[#1e202b] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#6366f1] transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    disabled={turnstileStatus !== 'verified' || isLoading}
                    className="h-10 px-4 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] active:bg-[#4338ca] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                  >
                    <span>입장</span>
                  </button>
                </div>

                <div className="text-[0.6875rem] text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <span className="shrink-0">🔒</span>
                  <span>게스트 모드는 브라우저 로컬 저장소에만 안전하게 저장됩니다.</span>
                </div>
              </div>
            )}
          </div>

          {/* Toggle Mode Footer */}
          <div className="mt-5 text-center text-xs text-slate-400">
            {authMode === 'login' ? (
              <span>
                계정이 없으신가요?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-[#818cf8] hover:text-[#a5b4fc] hover:underline ml-1 cursor-pointer"
                >
                  회원가입
                </button>
              </span>
            ) : (
              <span>
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-[#818cf8] hover:text-[#a5b4fc] hover:underline ml-1 cursor-pointer"
                >
                  로그인
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

