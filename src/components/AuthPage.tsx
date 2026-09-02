import React, { useState } from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  Lock,
  Mail,
  Sparkles,
  User
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
      setErrorMsg('Passwords do not match. Please try again.');
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
    <div className="min-h-screen bg-[#edf4f3] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
        <div className="flex w-full flex-col justify-center bg-white p-6 sm:p-8 lg:w-1/2 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <Brain className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">AI Podium</div>
            </div>

            <div className="mb-6">
              <h1 className="text-4xl font-light tracking-[-0.06em] text-slate-900">
                {authMode === 'login' ? 'Welcome back!' : 'Create your account'}
              </h1>
              <p className="mt-3 text-base text-slate-500">
                {authMode === 'login'
                  ? 'Sign in to access your workspace and continue where you left off.'
                  : 'Start building with a clean workspace and collaborative AI tools.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-3 transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
                  <Mail className="h-4 w-4 text-sky-600" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  {authMode === 'login' && (
                    <button type="button" className="text-sm text-sky-600 hover:text-sky-700">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={authMode === 'login' ? 'Enter your password' : 'Create a password'}
                    autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
                    Confirm password
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
                    <Check className="h-4 w-4 text-slate-400" />
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="mb-1 block text-sm text-sky-600 hover:text-sky-700"
              >
                {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>

              <button
                type="button"
                onClick={handleEmailAuth}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-base font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <span>{isLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 py-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                <span>or</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={handleGuestLogin}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                <User className="h-4 w-4 text-slate-500" />
                <span>Continue as guest</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden w-1/2 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_20%),linear-gradient(135deg,#0c4a4d,#0f5d64_40%,#0a3840)] p-8 lg:flex">
          <div className="max-w-xl text-white">
            <div className="mb-8 text-5xl font-light leading-[1.05] tracking-[-0.06em]">
              Revolutionize QA with
              <span className="block pt-2">Smarter Automation</span>
            </div>

            <div className="mb-8 max-w-lg text-lg leading-8 text-slate-200/90">
              “AI Podium has completely transformed our testing process. It’s reliable, efficient, and ensures our releases are always top-notch.”
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold">
                MC
              </div>
              <div>
                <div className="font-medium">Michael Carter</div>
                <div className="text-sm text-slate-300">Software Engineer at DevCore</div>
              </div>
            </div>

            <div className="mt-12 border-t border-white/10 pt-8">
              <div className="mb-6 text-[0.7rem] uppercase tracking-[0.3em] text-slate-200/75">Join our teams</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm font-semibold text-white/90">
                <div>Discord</div>
                <div>Mailchimp</div>
                <div>Grammarly</div>
                <div>Attentive</div>
                <div>Hellosign</div>
                <div>Intercom</div>
                <div>Square</div>
                <div>Dropbox</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
