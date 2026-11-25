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
import { useLanguage } from '../context/LanguageContext';
import { getConnectionTranslations } from '../locales/connectionLocale';
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
  const { language } = useLanguage();
  const t = getConnectionTranslations(language).github;
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
      setRepoError(t.repoFormatError);
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
      setTestResult({ success: false, message: t.tokenAndRepoRequired });
      return;
    }

    if (!GITHUB_REPO_REGEX.test(cleanRepo)) {
      setTestResult({ success: false, message: t.repoFormatErrorExample });
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

      if (!res.ok) throw new Error(t.repoNotFound);
      const scopes = res.headers.get('x-oauth-scopes') || '';
      if (!scopes.includes('repo') && !scopes.includes('contents')) {
        throw new Error(t.tokenNeedsWrite);
      }

      const data = await res.json();
      setTestResult({
        success: true,
        message: t.connectionOk(data.full_name, data.default_branch || branch),
      });
      if (!branch.trim() && data.default_branch) {
        setBranch(data.default_branch);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || t.networkCheck,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePushActiveDocument = async () => {
    if (!currentActiveFile || editorContent === undefined) {
      setTestResult({ success: false, message: t.noActiveDocument });
      return;
    }

    const cleanRepo = sanitizeGithubRepo(repo);
    const cleanToken = token.trim();
    const cleanBranch = branch.trim() || 'main';

    if (!cleanToken || !cleanRepo) {
      setTestResult({ success: false, message: t.checkTokenAndRepo });
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
          message: t.pushSuccess(currentActiveFile, res.sha?.slice(0, 7)),
        });
      } else if (res.conflict) {
        setTestResult({
          success: false,
          message: t.pushConflict,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || t.pushFailed,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || t.pushException,
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
      setTestResult({ success: false, message: t.tokenAndRepoRequired });
      return;
    }

    if (!GITHUB_REPO_REGEX.test(cleanRepo)) {
      setRepoError(t.repoFormatError);
      setTestResult({ success: false, message: t.repoFormatErrorExample });
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--bg-main)]/80 backdrop-blur-sm p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        id="github-integration-modal-content"
        className="relative bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl max-w-lg w-full p-5 space-y-4 text-[var(--text-muted)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-100 font-sans max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] border border-white/[0.07] flex items-center justify-center text-[var(--text-main)] shrink-0">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-[var(--text-main)]">{t.title}</h2>
                {isGithubConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--secondary-accent)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary-accent)] shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                    {t.connected}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-tertiary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />
                    {t.notConnected}
                  </span>
                )}
                <HelpTooltip
                  title={t.helpTitle}
                  content={t.helpContent}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-md hover:bg-white/[0.06] transition cursor-pointer shrink-0"
            title={t.close}
            aria-label={t.close}
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
                <label className="font-medium text-[var(--text-muted)]">{t.repoLabel}</label>
                <HelpTooltip
                  title={t.repoHelpTitle}
                  content={t.repoHelpContent}
                />
              </div>
              {repoError && (
                <span className="text-[11px] text-rose-400 font-medium">
                  {repoError}
                </span>
              )}
            </div>
            <div
              className={`flex items-center rounded-md bg-[var(--bg-surface)] border ${
                repoError ? 'border-rose-500/50' : 'border-[var(--border-structural)] focus-within:border-[var(--border-luminous)]'
              } transition-colors overflow-hidden`}
            >
              <span className="pl-3 pr-1 text-xs font-mono text-[var(--text-tertiary)] select-none shrink-0">
                https://github.com/
              </span>
              <input
                type="text"
                value={repo}
                onChange={handleRepoChange}
                onPaste={handleRepoPaste}
                placeholder="owner/repo"
                required
                className="w-full bg-transparent py-2 pr-3 text-xs font-mono text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] outline-none"
              />
            </div>
          </div>

          {/* Branch & Token Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Branch */}
            <div className="space-y-1.5 sm:col-span-1">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-[var(--text-muted)]">{t.branchLabel}</label>
              </div>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value.trim())}
                placeholder="main"
                required
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-structural)] focus:border-[var(--border-luminous)] rounded-md px-3 py-2 text-xs font-mono text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] outline-none transition"
              />
            </div>

            {/* Token */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="font-medium text-[var(--text-muted)]">{t.tokenLabel}</label>
                  <HelpTooltip
                    title={t.tokenHelpTitle}
                    content={t.tokenHelpContent}
                  />
                </div>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 flex items-center gap-1 hover:underline shrink-0"
                >
                  <span>{t.getToken}</span>
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
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-structural)] focus:border-[var(--border-luminous)] rounded-md px-3 py-2 pr-9 text-xs font-mono text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 cursor-pointer"
                  title={showToken ? t.hideToken : t.showToken}
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Automated Commit Message Pipeline - Clean Flat Row */}
          <div className="py-2 border-b border-[var(--border-structural)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--text-main)]">{t.autoCommit}</span>
                  <HelpTooltip
                    title={t.autoCommit}
                    content={t.autoCommitHelp}
                  />
                </div>
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
                <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
              </label>
            </div>
            {!autoCommit && (
              <input
                type="text"
                value={customCommitMessage}
                onChange={(e) => setCustomCommitMessage(e.target.value)}
                placeholder="docs: update ${filename} (via AI Podium)"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-structural)] rounded-md px-3 py-1.5 text-xs text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] mt-2 outline-none focus:border-[var(--border-luminous)] font-mono transition"
              />
            )}
          </div>

          {/* Direct Push of Currently Active Editor Document if connected - Flat Row */}
          {isConnected && currentActiveFile && (
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-structural)]">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--text-main)]">{t.pushActive}</span>
                  <HelpTooltip
                    title={t.pushActive}
                    content={t.pushActiveHelp}
                  />
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[var(--text-muted)] font-mono truncate max-w-[140px]">
                    {currentActiveFile}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePushActiveDocument}
                disabled={isPushing || isTesting || isPulling}
                className="px-2.5 py-1.5 rounded text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] text-[var(--text-main)] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] transition-colors inline-flex items-center justify-center shrink-0 cursor-pointer"
              >
                <span>{isPushing ? t.pushing : t.pushNow}</span>
              </button>
            </div>
          )}

          {/* Initial Pull Option on Connect - Clean Flat Row */}
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-structural)]">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--text-main)]">{t.pullOnConnect}</span>
                <HelpTooltip
                  title={t.pullOnConnect}
                  content={t.pullOnConnectHelp}
                />
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={pullOnConnect}
                onChange={(e) => setPullOnConnect(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
            </label>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded-md border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-white/[0.03] border-[var(--border-structural)] text-[var(--text-main)]'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--secondary-accent)] shrink-0" />
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
                className="px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-main)] bg-white/[0.05] hover:bg-white/[0.1] border border-[var(--border-structural)] hover:border-[var(--border-luminous)] transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                <span>{isTesting ? t.testing : t.testConnection}</span>
              </button>

              {isConnected && onDisconnect && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  disabled={isPulling || isPushing}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer inline-flex items-center justify-center"
                  title={t.disconnectHint}
                >
                  <span>{t.disconnect}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPulling || isPushing}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={isPulling || isTesting || isPushing}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#F1F5F9] hover:bg-white text-[#0F172A] shadow-sm transition-colors inline-flex items-center justify-center cursor-pointer"
              >
                {isPulling ? (
                  <span>{t.syncing}</span>
                ) : (
                  <span>{isConnected ? t.saveSettings : t.connectRepo}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
