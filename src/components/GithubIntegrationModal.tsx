import React, { useState } from 'react';
import {
  X,
  Key,
  GitBranch,
  Check,
  RotateCw,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface GithubConfig {
  token: string;
  repo: string; // e.g. "owner/repo"
  owner?: string;
  branch: string;
}

interface GithubIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GithubConfig) => void;
}

export const GithubIntegrationModal: React.FC<GithubIntegrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!token || !repo) {
      setTestResult({ success: false, message: 'Token과 Repository 주소를 입력해주세요.' });
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult({ success: true, message: `연결 확인 성공 [${data.full_name}]` });
      } else if (response.status === 404) {
        setTestResult({ success: false, message: '저장소를 찾을 수 없거나 접근 권한이 없습니다.' });
      } else if (response.status === 401) {
        setTestResult({ success: false, message: '유효하지 않은 Token입니다.' });
      } else {
        setTestResult({ success: false, message: `연결 실패: HTTP ${response.status}` });
      }
    } catch (err) {
      setTestResult({ success: false, message: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !repo) {
      setTestResult({ success: false, message: 'Token과 Repository 주소를 입력해주세요.' });
      return;
    }
    onSave({ token, repo, branch });
  };

  return (
    <div
      id="github-integration-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        id="github-integration-modal-content"
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
          <h2 className="text-base font-normal text-slate-300">GitHub Source Control</h2>
          <p className="text-xs text-slate-400">GitHub 저장소를 AI Podium 워크스페이스로 동기화합니다.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
              <Key className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Personal Access Token (PAT)</span>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              required
              className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
              <GitPullRequest className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Repository (owner/repo)</span>
            </label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="octocat/Hello-World"
              required
              className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
              <GitBranch className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Branch</span>
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              required
              className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition"
            />
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-2 rounded border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className="font-mono text-[11px]">{testResult.message}</span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-2.5 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 rounded text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-[#38bdf8]' : 'text-slate-400'}`} />
              <span>연결 테스트</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-[#27272a] transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded text-xs font-medium bg-[#0284c7] hover:bg-[#0369a1] text-white transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>저장소 연결</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
