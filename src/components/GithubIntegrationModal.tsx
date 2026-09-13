import React, { useState, useEffect } from 'react';
import {
  Github,
  X,
  Key,
  GitBranch,
  GitPullRequest,
  Check,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Unlink,
  Sparkles,
} from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';

export interface GithubConfig {
  token: string;
  repo: string; // e.g. "owner/repo"
  owner?: string;
  branch: string;
}

export interface GithubIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GithubConfig) => void;
  initialConfig?: GithubConfig | null;
  onDisconnect?: () => void;
  onOpenAccountModal?: () => void;
  currentUser?: any;
}

export const GithubIntegrationModal: React.FC<GithubIntegrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  onDisconnect,
  onOpenAccountModal,
  currentUser,
}) => {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setToken(initialConfig.token || '');
        setRepo(initialConfig.repo || '');
        setBranch(initialConfig.branch || 'main');
      } else {
        setToken('');
        setRepo('');
        setBranch('main');
      }
      setTestResult(null);
      setIsTesting(false);
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const isConnected = !!(initialConfig?.token && initialConfig?.repo);

  const handleTestConnection = async () => {
    const cleanRepo = repo.trim();
    const cleanToken = token.trim();

    if (!cleanToken || !cleanRepo) {
      setTestResult({ success: false, message: '개인 액세스 토큰과 저장소 주소를 모두 입력해주세요.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: `연결 확인 성공: ${data.full_name} (기본 브랜치: ${data.default_branch || branch})`,
        });
        if (!branch.trim() && data.default_branch) {
          setBranch(data.default_branch);
        }
      } else if (response.status === 404) {
        setTestResult({
          success: false,
          message: '저장소를 찾을 수 없거나 접근 권한이 없습니다. (private 저장소인 경우 repo 권한 확인 필요)',
        });
      } else if (response.status === 401) {
        setTestResult({
          success: false,
          message: '유효하지 않거나 만료된 개인 액세스 토큰입니다.',
        });
      } else {
        setTestResult({
          success: false,
          message: `연결 실패: HTTP ${response.status}`,
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: '네트워크 연결 상태를 확인해주세요.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRepo = repo.trim();
    const cleanToken = token.trim();
    const cleanBranch = branch.trim() || 'main';

    if (!cleanToken || !cleanRepo) {
      setTestResult({ success: false, message: '개인 액세스 토큰과 저장소 주소를 모두 입력해주세요.' });
      return;
    }

    const parts = cleanRepo.split('/');
    const owner = parts.length > 1 ? parts[0] : '';
    const repoName = parts.length > 1 ? parts.slice(1).join('/') : cleanRepo;

    onSave({
      token: cleanToken,
      repo: cleanRepo,
      owner: owner || repoName,
      branch: cleanBranch,
    });
  };

  return (
    <div
      id="github-integration-modal-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        id="github-integration-modal-content"
        className="relative bg-[#1e202b] border border-[#2e3142] rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#2e3142]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#282a38] border border-[#2e3142] flex items-center justify-center text-slate-100 shrink-0">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">GitHub 저장소 연동</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  로컬 직접 연동
                </span>
                <HelpTooltip
                  title="GitHub 로컬 연동 안내"
                  content="사용자의 개인 액세스 토큰(PAT)을 통해 브라우저에서 GitHub API와 직접 통신합니다. 토큰은 외부 서버에 전송되지 않으며 로컬 브라우저 세션에만 안전하게 보관됩니다."
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                마크다운 문서와 작업 내역을 개인 GitHub 저장소와 실시간으로 동기화합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-[#282a38] transition cursor-pointer shrink-0"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          {/* Repository URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
                <label className="font-medium text-slate-300">저장소 주소</label>
                <HelpTooltip
                  title="저장소 주소 입력 규칙"
                  content="GitHub의 '소유자명/저장소명' 형식으로 입력합니다. 예: octocat/Hello-World 또는 내계정/my-notes"
                />
              </div>
            </div>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="octocat/Hello-World"
              required
              className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition"
            />
          </div>

          {/* Branch & Token Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Branch */}
            <div className="space-y-1.5 sm:col-span-1">
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                <label className="font-medium text-slate-300">기본 브랜치</label>
              </div>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                required
                className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition"
              />
            </div>

            {/* Token */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <label className="font-medium text-slate-300">개인 액세스 토큰</label>
                  <HelpTooltip
                    title="개인 액세스 토큰 발급"
                    content="GitHub Settings > Developer Settings > Personal access tokens에서 'repo' 권한을 부여한 토큰을 발급받아 입력합니다."
                  />
                </div>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline shrink-0"
                >
                  <span>토큰 발급 바로가기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  required
                  className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-3 py-2 pr-9 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  title={showToken ? '토큰 숨기기' : '토큰 표시'}
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded-md border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="text-[11px] leading-relaxed break-all">{testResult.message}</span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-2.5 py-1.5 bg-[#282a38] hover:bg-[#323548] text-slate-200 hover:text-white rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-[#2e3142]"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                <span>{isTesting ? '테스트 중...' : '연결 테스트'}</span>
              </button>

              {isConnected && onDisconnect && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="px-2.5 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  title="현재 연결된 저장소 설정을 해제합니다."
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>연동 해제</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-[#282a38] transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs cursor-pointer flex items-center gap-1.5 border border-indigo-500"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isConnected ? '설정 저장' : '저장소 연결'}</span>
              </button>
            </div>
          </div>

          {/* Cloud Account Sync Hint */}
          <div className="pt-3 border-t border-[#2e3142] flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>다중 기기 동기화 및 클라우드 백업이 필요하신가요?</span>
            </span>
            {currentUser ? (
              <span className="text-emerald-400 font-medium">계정 로그인됨</span>
            ) : onOpenAccountModal ? (
              <button
                type="button"
                onClick={onOpenAccountModal}
                className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline cursor-pointer"
              >
                계정 로그인 및 연동 &rarr;
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
};
