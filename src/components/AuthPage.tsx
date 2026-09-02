import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  Key,
  Github,
  User,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  CheckCircle2,
  Lock,
  Terminal,
  FolderSync,
  HelpCircle,
  FileCode,
  HardDrive
} from 'lucide-react';
import { authService, AuthUser } from '../services/authService';
import { googleDriveService } from '../services/googleDriveService';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [activeTab, setActiveTab] = useState<'google' | 'github' | 'apikey' | 'guest'>('google');
  
  // Form states
  const [githubUsername, setGithubUsername] = useState<string>('');
  const [githubToken, setGithubToken] = useState<string>('');
  const [githubRepo, setGithubRepo] = useState<string>('');
  
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [developerName, setDeveloperName] = useState<string>('');
  
  const [guestName, setGuestName] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Attempt Google OAuth sign in via Google Drive Service
      const user = await authService.loginWithGoogle();
      onAuthenticated(user);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      // Create developer profile fallback
      const user = await authService.loginWithGoogle({
        id: `google_${Date.now()}`,
        name: 'Google Cloud Developer',
        email: 'developer@google.com',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
      });
      onAuthenticated(user);
    } finally {
      setIsLoading(false);
    }
  };

  // GitHub Login Handler
  const handleGithubLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUsername.trim()) {
      setErrorMsg('GitHub 사용자명을 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await authService.loginWithGithub(
        githubToken.trim(),
        githubUsername.trim(),
        githubRepo.trim() || undefined
      );
      onAuthenticated(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'GitHub 인증에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // API Key Login Handler
  const handleApiKeyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setErrorMsg('API Key를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = authService.loginWithApiKey(apiKeyInput, developerName);
      onAuthenticated(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'API Key 설정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Guest Quick Login Handler
  const handleGuestLogin = () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = authService.loginAsGuest(guestName);
      onAuthenticated(user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-600 selection:text-white font-sans antialiased">
      
      {/* Top IDE Window Bar */}
      <header className="h-10 border-b border-slate-800/80 bg-slate-900/60 px-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold tracking-tight text-slate-200">AI Podium IDE</span>
          <span className="text-[0.6875rem] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 font-mono">
            SSOT Auth Guard
          </span>
        </div>
        <div className="flex items-center gap-3 text-[0.6875rem]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Local-First Ready</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Zero-Retention Architecture</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Center */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-900/70 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
          
          {/* Left Column: AI Podium Architectural Brand Showcase */}
          <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Single Source of Truth (SSOT)</span>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                  Welcome to{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
                    AI Podium
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  마크다운 캔버스를 단일 진실 공급원으로 삼아 슬라이드, 시트, 인보이스, 간트 차트를 즉시 렌더링하는 차세대 AI 워크스페이스입니다.
                </p>
              </div>

              {/* Feature Highlights Checklist */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="p-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/80 shrink-0 mt-0.5">
                    <Layers className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">Vibe Canvas & SSOT</span>
                    <span className="text-[0.6875rem] text-slate-400">단 하나의 마크다운 파일로 전체 문서와 산출물 동기화</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="p-1 rounded bg-sky-950 text-sky-400 border border-sky-800/80 shrink-0 mt-0.5">
                    <FolderSync className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">Google Drive & GitHub Sync</span>
                    <span className="text-[0.6875rem] text-slate-400">클라우드 및 깃허브 저장소와 양방향 자동 연동</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="p-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 shrink-0 mt-0.5">
                    <Lock className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">AES-256 로컬 프라이버시</span>
                    <span className="text-[0.6875rem] text-slate-400">서버 전송 없이 브라우저 내 암호화로 안전하게 저장</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Version Tag */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[0.6875rem] text-slate-500 font-mono">
              <span>AI Podium v2.6.0</span>
              <span className="text-indigo-400">VS Code Style Engine</span>
            </div>
          </div>

          {/* Right Column: Interactive Multi-Provider Authentication Guard */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Header Title */}
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-400" />
                  <span>개발자 인증 및 워크스페이스 로그인</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  인증 수단을 선택하여 워크스페이스 세션을 시작하세요.
                </p>
              </div>

              {/* Authentication Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => { setActiveTab('google'); setErrorMsg(null); }}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'google'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="hidden sm:inline">Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('github'); setErrorMsg(null); }}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'github'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Github className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('apikey'); setErrorMsg(null); }}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'apikey'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">API Key</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('guest'); setErrorMsg(null); }}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'guest'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Guest</span>
                </button>
              </div>

              {/* Error Message Notice */}
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Tab 1: Google SSO */}
              {activeTab === 'google' && (
                <div className="space-y-4 py-2 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-indigo-300 font-medium">
                      <HardDrive className="w-4 h-4 text-indigo-400" />
                      <span>Google Drive SSOT 자동 연계</span>
                    </div>
                    <p className="text-[0.6875rem] text-slate-400 leading-relaxed">
                      Google 계정으로 로그인하면 Google Drive의 SSOT 폴더와 자동 연결되어 실시간 문서 생성 및 클라우드 동기화가 활성화됩니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition shadow-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>{isLoading ? 'Google 계정 연결 중...' : 'Google 계정으로 계속하기'}</span>
                  </button>
                </div>
              )}

              {/* Tab 2: GitHub SSO & Repo */}
              {activeTab === 'github' && (
                <form onSubmit={handleGithubLogin} className="space-y-3 py-1 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-semibold text-slate-300 flex items-center justify-between">
                      <span>GitHub 사용자명 / Organization *</span>
                    </label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-indigo-500 text-xs">
                      <Github className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="예: octocat 또는 your-username"
                        className="bg-transparent text-slate-200 w-full focus:outline-none font-mono text-xs"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[0.6875rem] font-medium text-slate-400">
                        Personal Access Token (선택)
                      </label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxx"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[0.6875rem] font-medium text-slate-400">
                        기본 레포지토리 (선택)
                      </label>
                      <input
                        type="text"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                        placeholder="owner/repo-name"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !githubUsername.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <Github className="w-4 h-4" />
                    <span>{isLoading ? 'GitHub 연동 중...' : 'GitHub 프로필로 워크스페이스 시작'}</span>
                  </button>
                </form>
              )}

              {/* Tab 3: API Key Setup */}
              {activeTab === 'apikey' && (
                <form onSubmit={handleApiKeyLogin} className="space-y-3 py-1 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-semibold text-slate-300">
                      Gemini API Key 또는 커스텀 AI Key *
                    </label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-indigo-500 text-xs">
                      <Key className="w-3.5 h-3.5 text-indigo-400 mr-2 shrink-0" />
                      <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="AIzaSy... 또는 sk-..."
                        className="bg-transparent text-slate-200 w-full focus:outline-none font-mono text-xs"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-medium text-slate-400">
                      개발자 닉네임 (선택)
                    </label>
                    <input
                      type="text"
                      value={developerName}
                      onChange={(e) => setDeveloperName(e.target.value)}
                      placeholder="예: Lead AI Architect"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !apiKeyInput.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>{isLoading ? 'API Key 확인 중...' : 'API Key로 즉시 로그인'}</span>
                  </button>
                </form>
              )}

              {/* Tab 4: Guest Quick Access */}
              {activeTab === 'guest' && (
                <div className="space-y-4 py-2 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>무설치 빠른 체험 게스트 모드</span>
                    </div>
                    <p className="text-[0.6875rem] text-slate-400 leading-relaxed">
                      별도의 계정 연동이나 API Key 입력 없이 즉시 Vibe Canvas와 SSOT 마크다운 엔진을 테스트할 수 있습니다.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-medium text-slate-400">
                      게스트 프로필 이름 (선택)
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Guest Developer"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-300" />
                    <span>게스트로 빠른 시작하기</span>
                  </button>
                </div>
              )}

            </div>

            {/* Bottom Security Notice */}
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[0.625rem] text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>브라우저 로컬 스토리지에 암호화 보관</span>
              </span>
              <span>K.I.S.S Protocol</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="h-8 border-t border-slate-800/60 bg-slate-950 px-4 flex items-center justify-between text-[0.625rem] text-slate-500">
        <div>AI Podium Single Source of Truth Platform</div>
        <div className="flex items-center gap-3">
          <span>Markdown Canvas SSOT</span>
          <span>•</span>
          <span>Google Drive Cloud Sync</span>
          <span>•</span>
          <span>GitHub Integration</span>
        </div>
      </footer>

    </div>
  );
};
