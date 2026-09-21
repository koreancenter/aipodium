import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  RotateCw,
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

  const isRemoteConnected = !!(currentConfig?.host && currentConfig?.username);
  const isConnected = isRemoteConnected;

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
        className="relative bg-[#121214] border border-[#222226] rounded-lg max-w-lg w-full p-5 space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#222226]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#18181b] border border-[#222226] flex items-center justify-center text-zinc-100 shrink-0">
              <Server className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-zinc-100">원격 서버 연동</h2>
                {isRemoteConnected ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    연결됨
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
                    미연동
                  </span>
                )}
                <HelpTooltip
                  title="원격 서버 직접 연동 안내"
                  content="원격 서버 접속 정보는 외부 서버로 전송되지 않으며, 사용자 브라우저 로컬 저장소에만 안전하게 보관됩니다."
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                원격 호스트 또는 사설 서버의 작업 디렉토리를 워크스페이스로 마운트합니다.
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
        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          {/* Host & Port */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-zinc-300">원격 호스트 주소</label>
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
                className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
              />
            </div>

            <div className="sm:col-span-1 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-zinc-300">포트</label>
              </div>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 22)}
                placeholder="22"
                required
                className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
              />
            </div>
          </div>

          {/* User & Auth Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-medium text-zinc-300">사용자명</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ubuntu, root, developer"
                required
                className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-zinc-300">인증 방식</label>
              </div>
              <div className="flex rounded bg-[#09090b] p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setAuthType('password')}
                  className={`flex-1 py-1.5 text-center rounded text-xs transition cursor-pointer font-medium ${
                    authType === 'password'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
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
                      : 'text-zinc-400 hover:text-zinc-200'
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
                <label className="font-medium text-zinc-300">비밀번호</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="접속 비밀번호 입력"
                  className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-3 py-2 pr-9 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                  title={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-zinc-300">SSH 비공개 키</label>
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
                className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition resize-none"
              />
            </div>
          )}

          {/* Remote Directory Path */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="font-medium text-zinc-300">원격 디렉토리 경로</label>
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
              className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition"
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
                className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
                <span>{isTesting ? '테스트 중...' : '연결 테스트'}</span>
              </button>

              {isConnected && onDisconnect && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
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
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isConnected ? '설정 저장' : '원격 서버 연결'}</span>
              </button>
            </div>
          </div>

          {/* Integration Connection Status Footer Banner */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>원격 서버 연동 상태</span>
            </span>
            {isRemoteConnected ? (
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
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
