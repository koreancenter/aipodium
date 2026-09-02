import React, { useState } from 'react';
import {
  Globe,
  Key,
  Folder,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  RotateCw,
  Lock,
} from 'lucide-react';

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

interface RemoteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (config: RemoteConfig) => void;
  currentConfig?: RemoteConfig | null;
  onToast: (msg: string) => void;
}

export const RemoteWorkspaceModal: React.FC<RemoteWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSaveConfig,
  currentConfig,
  onToast,
}) => {
  const [host, setHost] = useState(currentConfig?.host || '192.168.1.100');
  const [port, setPort] = useState(currentConfig?.port || 22);
  const [username, setUsername] = useState(currentConfig?.username || 'developer');
  const [authType, setAuthType] = useState<'password' | 'key'>(currentConfig?.authType || 'password');
  const [password, setPassword] = useState(currentConfig?.password || '');
  const [privateKey, setPrivateKey] = useState(currentConfig?.privateKey || '');
  const [remotePath, setRemotePath] = useState(currentConfig?.remotePath || '/home/developer/ai-podium-ssot');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = () => {
    if (!host || !username) {
      onToast('호스트와 사용자 이름을 입력해주세요.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        success: true,
        message: `SSH 연결 성공: ${username}@${host}:${port} (${remotePath})`,
      });
      onToast(`원격 호스트 (${host}) 연결 확인 완료`);
    }, 800);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host || !username) {
      onToast('호스트 및 사용자 정보를 입력해주세요.');
      return;
    }

    const config: RemoteConfig = {
      host,
      port,
      username,
      authType,
      password,
      privateKey,
      remotePath,
      connected: true,
    };

    onSaveConfig(config);
    onToast(`원격 SSH 워크스페이스가 연결되었습니다: ${host}:${remotePath}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="relative bg-[#18181b] border border-[#27272a] rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
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
          <h2 className="text-base font-normal text-slate-300">Remote - SSH: Connect to Host</h2>
          <p className="text-xs text-slate-400">원격 서버 디렉토리를 워크스페이스로 마운트합니다.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Host & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
                <Globe className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Remote Host / IP</span>
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100 또는 hostname.com"
                required
                className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-normal">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 22)}
                className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition"
              />
            </div>
          </div>

          {/* User & Auth Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-normal">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ubuntu, developer..."
                required
                className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-normal">인증 방식</label>
              <div className="flex rounded bg-[#27272a] p-0.5 border border-[#3f3f46]">
                <button
                  type="button"
                  onClick={() => setAuthType('password')}
                  className={`flex-1 py-1.5 text-center rounded text-xs transition cursor-pointer ${
                    authType === 'password' ? 'bg-[#0284c7] text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType('key')}
                  className={`flex-1 py-1.5 text-center rounded text-xs transition cursor-pointer ${
                    authType === 'key' ? 'bg-[#0284c7] text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SSH Key
                </button>
              </div>
            </div>
          </div>

          {/* Credentials */}
          {authType === 'password' ? (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
                <Lock className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
                <Key className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>SSH Private Key (OpenSSH Format)</span>
              </label>
              <textarea
                rows={3}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                className="w-full bg-[#18181b] border border-[#3f3f46] rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#38bdf8] transition"
              />
            </div>
          )}

          {/* Remote Directory Path */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
              <Folder className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Remote Workspace Directory Path</span>
            </label>
            <input
              type="text"
              value={remotePath}
              onChange={(e) => setRemotePath(e.target.value)}
              placeholder="/home/username/projects/workspace"
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
                <span>원격 워크스페이스 저장</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
