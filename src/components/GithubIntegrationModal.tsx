import React, { useState, useEffect } from 'react';
import {
  Github,
  X,
  Check,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Unlink,
  Sparkles,
  Upload,
} from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';
import {
  pullDocumentsFromGithub,
  sanitizeGithubRepo,
  GITHUB_REPO_REGEX,
  syncDocumentToGithub,
  syncDocToGithub,
} from '../services/workspaceStorageService';
import { saveEncryptedGithubPat } from '../utils/securityCrypto';
import type { GithubConfig } from '../types';
export type { GithubConfig };

export interface GithubIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    config: GithubConfig,
    pulledData?: { files: Record<string, string>; fileFolders: Record<string, string>; count: number }
  ) => void;
  initialConfig?: GithubConfig | null;
  onDisconnect?: () => void;
  onOpenAccountModal?: () => void;
  currentUser?: any;
  currentActiveFile?: string;
  editorContent?: string;
}

const DEFAULT_COMMIT_TEMPLATE = 'docs: update ${filename} (via AI Podium)';

export const GithubIntegrationModal: React.FC<GithubIntegrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  onDisconnect,
  currentActiveFile,
  editorContent,
}) => {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [repoError, setRepoError] = useState<string | null>(null);
  const [branch, setBranch] = useState('main');
  const [pullOnConnect, setPullOnConnect] = useState(true);
  const [autoCommit, setAutoCommit] = useState(true);
  const [customCommitMessage, setCustomCommitMessage] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setToken(initialConfig.token || '');
        const sanitizedRepo = sanitizeGithubRepo(initialConfig.repo || '');
        setRepo(sanitizedRepo);
        setBranch(initialConfig.branch || 'main');
        setPullOnConnect(initialConfig.pullOnConnect ?? true);
        const isAuto = initialConfig.autoCommit ?? (!initialConfig.useCustomCommitMessage);
        setAutoCommit(isAuto);
        setCustomCommitMessage(initialConfig.customCommitMessage || DEFAULT_COMMIT_TEMPLATE);
      } else {
        setToken('');
        setRepo('');
        setBranch('main');
        setPullOnConnect(true);
        setAutoCommit(true);
        setCustomCommitMessage(DEFAULT_COMMIT_TEMPLATE);
      }
      setRepoError(null);
      setTestResult(null);
      setIsTesting(false);
      setIsPulling(false);
      setIsPushing(false);
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const isGithubConnected = !!(initialConfig?.token && initialConfig?.repo);
  const isConnected = isGithubConnected;

  const validateRepo = (val: string): boolean => {
    if (!val) {
      setRepoError(null);
      return false;
    }
    if (!GITHUB_REPO_REGEX.test(val)) {
      setRepoError("저장소 주소는 '소유자명/저장소명' 형식이어야 합니다.");
      return false;
    }
    setRepoError(null);
    return true;
  };

  const handleRepoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = (raw.includes('github.com') || raw.includes('git@') || raw.startsWith('http'))
      ? sanitizeGithubRepo(raw)
      : raw.trim();
    setRepo(sanitized);
    validateRepo(sanitized);
  };

  const handleRepoPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const sanitized = sanitizeGithubRepo(pasted);
    setRepo(sanitized);
    validateRepo(sanitized);
  };

  const handleTestConnection = async () => {
    const cleanRepo = sanitizeGithubRepo(repo);
    const cleanToken = token.trim();

    if (!cleanToken || !cleanRepo) {
      setTestResult({ success: false, message: '개인 액세스 토큰과 저장소 주소를 모두 입력해주세요.' });
      return;
    }

    if (!GITHUB_REPO_REGEX.test(cleanRepo)) {
      setTestResult({ success: false, message: "저장소 주소는 '소유자명/저장소명' 형식이어야 합니다. (예: octocat/Hello-World)" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const parts = cleanRepo.split('/');
      const owner = parts.length > 1 ? parts[0] : '';
      const repoName = parts.length > 1 ? parts.slice(1).join('/') : cleanRepo;

      const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) throw new Error('저장소를 찾을 수 없거나 토큰이 유효하지 않습니다.');
      const scopes = res.headers.get('x-oauth-scopes') || '';
      if (!scopes.includes('repo') && !scopes.includes('contents')) {
        throw new Error('토큰에 저장소 쓰기 권한이 필요합니다.');
      }

      const data = await res.json();
      setTestResult({
        success: true,
        message: `연결 확인 성공: ${data.full_name}, 기본 브랜치: ${data.default_branch || branch}`,
      });
      if (!branch.trim() && data.default_branch) {
        setBranch(data.default_branch);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || '네트워크 연결 상태를 확인해주세요.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePushActiveDocument = async () => {
    if (!currentActiveFile || editorContent === undefined) {
      setTestResult({ success: false, message: '현재 에디터에 열린 활성 문서가 없습니다.' });
      return;
    }

    const cleanRepo = sanitizeGithubRepo(repo);
    const cleanToken = token.trim();
    const cleanBranch = branch.trim() || 'main';

    if (!cleanToken || !cleanRepo) {
      setTestResult({ success: false, message: '토큰과 저장소 주소를 먼저 확인해주세요.' });
      return;
    }

    setIsPushing(true);
    setTestResult(null);

    try {
      const parts = cleanRepo.split('/');
      const owner = parts.length > 1 ? parts[0] : '';
      const repoName = parts.length > 1 ? parts.slice(1).join('/') : cleanRepo;

      const commitMsg = !autoCommit && customCommitMessage
        ? customCommitMessage.replace(/\${filename}/g, currentActiveFile)
        : undefined;

      const res = await syncDocToGithub({
        owner: owner || repoName,
        repo: repoName,
        branch: cleanBranch,
        token: cleanToken,
        filePath: currentActiveFile,
        content: editorContent,
        commitMessage: commitMsg,
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: `'${currentActiveFile}' 문서가 GitHub에 성공적으로 커밋 및 푸시되었습니다. (SHA: ${res.sha?.slice(0, 7) || '완료'})`,
        });
      } else if (res.conflict) {
        setTestResult({
          success: false,
          message: '원격 저장소에 더 최신 문서가 존재하여 충돌이 감지되었습니다. (에디터 자동 동기화 시 안전한 충돌 사본이 생성됩니다)',
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || '문서 푸시에 실패했습니다.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || '문서 푸시 중 예외가 발생했습니다.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRepo = sanitizeGithubRepo(repo);
    const cleanToken = token.trim();
    const cleanBranch = branch.trim() || 'main';

    if (!cleanToken || !cleanRepo) {
      setTestResult({ success: false, message: '개인 액세스 토큰과 저장소 주소를 모두 입력해주세요.' });
      return;
    }

    if (!GITHUB_REPO_REGEX.test(cleanRepo)) {
      setRepoError("저장소 주소는 '소유자명/저장소명' 형식이어야 합니다.");
      setTestResult({ success: false, message: "저장소 주소는 '소유자명/저장소명' 형식이어야 합니다. (예: octocat/Hello-World)" });
      return;
    }

    const parts = cleanRepo.split('/');
    const owner = parts.length > 1 ? parts[0] : '';
    const repoName = parts.length > 1 ? parts.slice(1).join('/') : cleanRepo;

    let pulledData: { files: Record<string, string>; fileFolders: Record<string, string>; count: number } | undefined = undefined;

    if (pullOnConnect) {
      setIsPulling(true);
      try {
        pulledData = await pullDocumentsFromGithub({
          owner: owner || repoName,
          repo: repoName,
          branch: cleanBranch,
          token: cleanToken,
        });
      } catch (pullErr: any) {
        console.warn('Initial pull error on connect:', pullErr);
      } finally {
        setIsPulling(false);
      }
    }

    // Securely encrypt PAT using AES-GCM before persisting
    await saveEncryptedGithubPat(cleanToken);

    onSave(
      {
        token: cleanToken,
        repo: cleanRepo,
        owner: owner || repoName,
        branch: cleanBranch,
        pullOnConnect,
        autoCommit,
        useCustomCommitMessage: !autoCommit,
        customCommitMessage: !autoCommit ? customCommitMessage.trim() : undefined,
      },
      pulledData
    );
  };

  return (
    <div
      id="github-integration-modal-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        id="github-integration-modal-content"
        className="relative bg-[#121214] border border-[#222226] rounded-lg max-w-lg w-full p-5 space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#222226]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#18181b] border border-[#222226] flex items-center justify-center text-zinc-100 shrink-0">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-zinc-100">GitHub 저장소 연동</h2>
                {isGithubConnected ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    연결됨
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
                    미연동
                  </span>
                )}
                <HelpTooltip
                  title="GitHub 로컬 연동 안내"
                  content="사용자의 개인 액세스 토큰을 통해 브라우저에서 GitHub API와 직접 통신합니다. 토큰은 외부 서버에 전송되지 않으며 로컬 브라우저 세션에만 안전하게 보관됩니다."
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                마크다운 문서와 작업 내역을 개인 GitHub 저장소와 실시간으로 동기화합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-white/5 transition cursor-pointer shrink-0"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Repository URL with sleek prefix addon */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-zinc-300">저장소 주소</label>
                <HelpTooltip
                  title="저장소 주소 입력 안내"
                  content="GitHub 저장소 경로('소유자명/저장소명')를 입력합니다. URL을 붙여넣으면 도메인과 프로토콜이 자동으로 정리됩니다."
                />
              </div>
              {repoError && (
                <span className="text-[11px] text-rose-400 font-medium">
                  {repoError}
                </span>
              )}
            </div>
            <div
              className={`flex items-center rounded bg-[#09090b] border ${
                repoError ? 'border-rose-500/50' : 'border-white/10 focus-within:border-indigo-500'
              } transition-colors overflow-hidden`}
            >
              <span className="pl-3 pr-1 text-xs font-mono text-zinc-500 select-none shrink-0">
                https://github.com/
              </span>
              <input
                type="text"
                value={repo}
                onChange={handleRepoChange}
                onPaste={handleRepoPaste}
                placeholder="owner/repo"
                required
                className="w-full bg-transparent py-2 pr-3 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none"
              />
            </div>
          </div>

          {/* Branch & Token Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Branch */}
            <div className="space-y-1.5 sm:col-span-1">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-zinc-300">기본 브랜치</label>
              </div>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value.trim())}
                placeholder="main"
                required
                className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
              />
            </div>

            {/* Token */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="font-medium text-zinc-300">개인 액세스 토큰</label>
                  <HelpTooltip
                    title="개인 액세스 토큰 발급 안내"
                    content="GitHub 설정 > 개발자 설정 > 개인 액세스 토큰에서 저장소 접근 권한을 부여한 토큰을 발급받아 입력합니다."
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
                  className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-3 py-2 pr-9 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                  title={showToken ? '토큰 숨기기' : '토큰 표시'}
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Automated Commit Message Pipeline - Clean Flat Row */}
          <div className="py-2 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-zinc-200">자동 커밋 메시지 생성</span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  문서 저장 시 표준 커밋 메시지(docs: update...)를 자동으로 생성합니다.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input
                  type="checkbox"
                  checked={autoCommit}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoCommit(checked);
                    if (!checked && !customCommitMessage) {
                      setCustomCommitMessage(DEFAULT_COMMIT_TEMPLATE);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            {!autoCommit && (
              <input
                type="text"
                value={customCommitMessage}
                onChange={(e) => setCustomCommitMessage(e.target.value)}
                placeholder="docs: update ${filename} (via AI Podium)"
                className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-1.5 text-xs text-zinc-200 mt-2 outline-none focus:border-indigo-500 font-mono transition"
              />
            )}
          </div>

          {/* Direct Push of Currently Active Editor Document if connected - Flat Row */}
          {isConnected && currentActiveFile && (
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-200">현재 활성 문서 커밋 및 푸시</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono truncate max-w-[140px]">
                    {currentActiveFile}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  현재 에디터에서 작성 중인 문서를 원격 저장소에 즉시 동기화합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePushActiveDocument}
                disabled={isPushing || isTesting || isPulling}
                className="px-2.5 py-1.5 rounded text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Upload className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
                <span>{isPushing ? '푸시 중...' : '즉시 푸시'}</span>
              </button>
            </div>
          )}

          {/* Initial Pull Option on Connect - Clean Flat Row */}
          <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
            <div>
              <span className="text-xs font-medium text-zinc-200">저장소 문서 워크스페이스 동기화</span>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                연결 시 대상 브랜치의 마크다운 문서를 현재 작업 공간으로 불러옵니다.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={pullOnConnect}
                onChange={(e) => setPullOnConnect(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded-md border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-white/[0.03] border-white/10 text-zinc-300'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
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
                disabled={isTesting || isPulling || isPushing}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
                <span>{isTesting ? '테스트 중...' : '연결 테스트'}</span>
              </button>

              {isConnected && onDisconnect && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  disabled={isPulling || isPushing}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
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
                disabled={isPulling || isPushing}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPulling || isTesting || isPushing}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isPulling ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>문서 동기화 중...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isConnected ? '설정 저장' : '저장소 연결'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Integration Connection Status Footer Banner */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>GitHub 연동 상태</span>
            </span>
            {isGithubConnected ? (
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                연결됨
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                미연동
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
