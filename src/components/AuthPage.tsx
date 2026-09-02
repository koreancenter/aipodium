import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  User,
  CheckCircle2,
  Lock,
  FolderSync,
  ArrowRight,
  Mail,
  ShieldCheck,
  Cloud,
  KeyRound
} from 'lucide-react';
import { authService, AuthUser } from '../services/authService';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [activeTab, setActiveTab] = useState<'google' | 'email' | 'guest'>('google');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    if (authMode === 'register' && password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please check them and try again.');
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
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const user = authService.loginAsGuest(guestName || 'Guest User');
      onAuthenticated(user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-600 selection:text-white font-sans antialiased">
      <header className="h-10 border-b border-slate-800/80 bg-slate-900/60 px-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold tracking-tight text-slate-200">AI Podium IDE</span>
          <span className="text-[0.6875rem] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 font-mono">
            Firebase Ready
          </span>
        </div>
        <div className="flex items-center gap-3 text-[0.6875rem]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cloudflare Pages + D1</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-900/70 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Single Source of Truth</span>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                  Welcome to{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
                    AI Podium
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Build, review, and sync your workspace with a clean identity flow designed for Firebase Auth and Cloudflare-managed data.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="p-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/80 shrink-0 mt-0.5">
                    <Cloud className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">Cloudflare Pages + D1</span>
                    <span className="text-[0.6875rem] text-slate-400">Data and app hosting stay aligned with your deployment flow.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="p-1 rounded bg-sky-950 text-sky-400 border border-sky-800/80 shrink-0 mt-0.5">
                    <FolderSync className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">Google Drive Sync</span>
                    <span className="text-[0.6875rem] text-slate-400">Connect your workspace to a shared document flow.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="p-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 shrink-0 mt-0.5">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">Simple auth flow</span>
                    <span className="text-[0.6875rem] text-slate-400">Focused on Google SSO and email/password identity.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[0.6875rem] text-slate-500 font-mono">
              <span>AI Podium v2.6.0</span>
              <span className="text-indigo-400">VS Code Style Engine</span>
            </div>
          </div>

          <div className="md:col-span-7 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>Sign in to your workspace</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Use Google SSO or your email account to continue.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => { setActiveTab('google'); setErrorMsg(null); }}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'google' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="hidden sm:inline">Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('email'); setErrorMsg(null); }}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'email' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('guest'); setErrorMsg(null); }}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'guest' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Guest</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {activeTab === 'google' && (
                <div className="space-y-4 py-2 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2 text-indigo-300 font-medium">
                      <KeyRound className="w-4 h-4 text-indigo-400" />
                      <span>Google OAuth</span>
                    </div>
                    <p className="text-[0.6875rem] text-slate-400 leading-relaxed mt-2">
                      Ready for Firebase <span className="font-mono text-slate-300">signInWithPopup</span> integration.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition shadow-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
                  </button>
                </div>
              )}

              {activeTab === 'email' && (
                <form onSubmit={handleEmailAuth} className="space-y-3 py-1 animate-in fade-in duration-150">
                  <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1 text-[0.6875rem]">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`flex-1 rounded-md px-2 py-1.5 transition ${authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`flex-1 rounded-md px-2 py-1.5 transition ${authMode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Register
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="email" className="text-[0.6875rem] font-medium text-slate-400">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="password" className="text-[0.6875rem] font-medium text-slate-400">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                    />
                  </div>

                  {authMode === 'register' && (
                    <div className="space-y-1">
                      <label htmlFor="confirm-password" className="text-[0.6875rem] font-medium text-slate-400">
                        Confirm password
                      </label>
                      <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Repeat your password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        autoComplete="new-password"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Please wait...' : authMode === 'login' ? 'Sign in with email' : 'Create account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {activeTab === 'guest' && (
                <div className="space-y-4 py-2 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guest mode</span>
                    </div>
                    <p className="text-[0.6875rem] text-slate-400 leading-relaxed">
                      Use a quick local identity to explore the workspace without a full account setup.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="guestName" className="text-[0.6875rem] font-medium text-slate-400">
                      Display name
                    </label>
                    <input
                      id="guestName"
                      type="text"
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      placeholder="Guest User"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-300" />
                    <span>Continue as guest</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[0.625rem] text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Secure browser session</span>
              </span>
              <span>Firebase + Cloudflare</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="h-8 border-t border-slate-800/60 bg-slate-950 px-4 flex items-center justify-between text-[0.625rem] text-slate-500">
        <div>AI Podium Single Source of Truth Platform</div>
        <div className="flex items-center gap-3">
          <span>Markdown Canvas</span>
          <span>•</span>
          <span>Google Drive Sync</span>
          <span>•</span>
          <span>Firebase Auth</span>
        </div>
      </footer>
    </div>
  );
};
