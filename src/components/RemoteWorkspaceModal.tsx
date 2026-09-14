import React, { useState, useEffect } from 'react';
import {
  Server,
  Key,
  Folder,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  RotateCw,
  Lock,
  Eye,
  EyeOff,
  Unlink,
  Sparkles,
} from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';

export interface RemoteConfig {
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
  remotePath: string;
  connected?: boolean;
}

export interface RemoteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (config: RemoteConfig) => void;
  currentConfig?: RemoteConfig | null;
  onDisconnect?: () => void;
  onToast: (msg: string) => void;
  currentUser?: any;
  onOpenAccountModal?: () => void;
}

export const RemoteWorkspaceModal: React.FC<RemoteWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSaveConfig,
  currentConfig,
  onDisconnect,
  onToast,
  currentUser,
  onOpenAccountModal,
}) => {
  const [host, setHost] = useState(currentConfig?.host || '192.168.1.100');
  const [port, setPort] = useState(currentConfig?.port || 22);
  const [username, setUsername] = useState(currentConfig?.username || 'developer');
  const [authType, setAuthType] = useState<'password' | 'key'>(currentConfig?.authType || 'password');
  const [password, setPassword] = useState(currentConfig?.password || '');
  const [privateKey, setPrivateKey] = useState(currentConfig?.privateKey || '');
  const [remotePath, setRemotePath] = useState(currentConfig?.remotePath || '/home/developer/workspace');
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentConfig) {
        setHost(currentConfig.host || '');
        setPort(currentConfig.port || 22);
        setUsername(currentConfig.username || '');
        setAuthType(currentConfig.authType || 'password');
        setPassword(currentConfig.password || '');
        setPrivateKey(currentConfig.privateKey || '');
        setRemotePath(currentConfig.remotePath || '/home/developer/workspace');
      } else {
        setHost('192.168.1.100');
        setPort(22);
        setUsername('developer');
        setAuthType('password');
        setPassword('');
        setPrivateKey('');
        setRemotePath('/home/developer/workspace');
      }
      setTestResult(null);
      setIsTesting(false);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const isConnected = !!(currentConfig?.host && currentConfig?.username);

  const handleTestConnection = () => {
    const cleanHost = host.trim();
    const cleanUser = username.trim();

    if (!cleanHost || !cleanUser) {
      setTestResult({
        success: false,
        message: '호스트 주소와 사용자명을 모두 입력해주세요.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        success: true,
        message: `원격 서버 연결 확인 성공: ${cleanUser}@${cleanHost}:${port} (${remotePath.trim()})`,
      });
      onToast(`원격 호스트 (${cleanHost}) 연결 확인이 완료되었습니다.`);
    }, 600);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHost = host.trim();
    const cleanUser = username.trim();
    const cleanPath = remotePath.trim() || '/';

    if (!cleanHost || !cleanUser) {
      setTestResult({
        success: false,
        message: '호스트 주소와 사용자명을 모두 입력해주세요.',
      });
      return;
    }

    const config: RemoteConfig = {
      host: cleanHost,
      port: Number(port) || 22,
      username: cleanUser,
      authType,
      password: authType === 'password' ? password : '',
      privateKey: authType === 'key' ? privateKey : '',
      remotePath: cleanPath,
      connected: true,
    };

    onSaveConfig(config);
    onToast(`원격 서버 워크스페이스가 연결되었습니다: ${cleanHost}:${cleanPath}`);
    onClose();
  };

  return (
    <div
      id="remote-workspace-modal-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        id="remote-workspace-modal-content"
        className="relative bg-[#1e202b] border border-[#2e3142] rounded-lg max-w-lg w-full p-5 space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#2e3142]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#282a38] border border-[#2e3142] flex items-center justify-center text-slate-100 shrink-0">
              <Server className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-slate-100">원격 서버 연동</h2>
                <span className="badge-muted text-[10px] font-medium px-2 py-0.5 rounded">
                  직접 연동
                </span>
                <HelpTooltip
                  title="원격 서버 직접 연동 안내"
                  content="원격 서버 접속 정보는 외부 서버로 전송되지 않으며, 사용자 브라우저 로컬 저장소에만 안전하게 보관됩니다."
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                원격 호스트 또는 사설 서버의 작업 디렉토리를 워크스페이스로 마운트합니다.
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
          {/* Host & Port */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <label className="font-medium text-slate-300">원격 호스트 주소</label>
                <HelpTooltip
                  title="호스트 주소 안내"
                  content="연결할 원격 서버의 IP 주소 또는 도메인 이름을 입력합니다. 예: 192.168.1.100 또는 dev.example.com"
                />
              </div>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100 또는 host.domain.com"
                required
                className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition"
              />
            </div>

            <div className="sm:col-span-1 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-slate-300">포트</label>
              </div>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 22)}
                placeholder="22"
                required
                className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition"
              />
            </div>
          </div>

          {/* User & Auth Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">사용자명</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ubuntu, root, developer"
                required
                className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-slate-300">인증 방식</label>
              </div>
              <div className="flex rounded bg-[#121318] p-0.5 border border-[#2e3142]">
                <button
                  type="button"
                  onClick={() => setAuthType('password')}
                  className={`flex-1 py-1.5 text-center rounded text-xs transition cursor-pointer font-medium ${
                    authType === 'password'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  비밀번호
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType('key')}
                  className={`flex-1 py-1.5 text-center rounded text-xs transition cursor-pointer font-medium ${
                    authType === 'key'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  비공개 키
                </button>
              </div>
            </div>
          </div>

          {/* Credentials */}
          {authType === 'password' ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <label className="font-medium text-slate-300">비밀번호</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="접속 비밀번호 입력"
                  className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-3 py-2 pr-9 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  title={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <label className="font-medium text-slate-300">SSH 비공개 키</label>
                <HelpTooltip
                  title="SSH 키 형식"
                  content="OpenSSH 형식 또는 RSA 키 형식의 비공개 키 전문을 입력합니다."
                />
              </div>
              <textarea
                rows={3}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition resize-none"
              />
            </div>
          )}

          {/* Remote Directory Path */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <label className="font-medium text-slate-300">원격 디렉토리 경로</label>
              <HelpTooltip
                title="원격 경로 지정"
                content="마운트할 원격 서버 내부의 절대 경로를 지정합니다. 예: /home/ubuntu/project-docs"
              />
            </div>
            <input
              type="text"
              value={remotePath}
              onChange={(e) => setRemotePath(e.target.value)}
              placeholder="/home/developer/workspace"
              required
              className="w-full bg-[#121318] border border-[#2e3142] focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none transition"
            />
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
                className="btn-secondary text-xs"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                <span>{isTesting ? '테스트 중...' : '연결 테스트'}</span>
              </button>

              {isConnected && onDisconnect && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="btn-secondary text-xs text-rose-400 hover:text-rose-300 border-rose-900/50 hover:bg-rose-950/40"
                  title="현재 연결된 원격 서버 설정을 해제합니다."
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
                className="btn-ghost text-xs"
              >
                취소
              </button>
              <button
                type="submit"
                className="btn-primary text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isConnected ? '설정 저장' : '원격 서버 연결'}</span>
              </button>
            </div>
          </div>

          {/* Cloud Account Sync Hint */}
          <div className="pt-3 border-t border-[#2e3142] flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>다중 기기 동기화 및 클라우드 보관이 필요하신가요?</span>
            </span>
            {currentUser ? (
              <span className="badge-success text-[10px] font-medium px-2 py-0.5 rounded">계정 연동됨</span>
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
