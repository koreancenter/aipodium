import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Server,
  Fingerprint,
  Check,
  X
} from 'lucide-react';
import {
  encryptDataWithPasscode,
  decryptDataWithPasscode,
  hashPasscode
} from '../utils/securityCrypto';

export interface SecurityConfig {
  isEncryptionEnabled: boolean;
  hasMasterPasscode: boolean;
  passcodeHash?: string;
  encryptedApiKey?: string;
  encryptedEndpoint?: string;
  autoLockMinutes?: number;
  lastWipedAt?: string;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  isEncryptionEnabled: false,
  hasMasterPasscode: false,
  autoLockMinutes: 30
};

interface SecuritySettingsProps {
  securityConfig: SecurityConfig;
  onUpdateSecurityConfig: (newConfig: SecurityConfig) => void;
  currentApiKey: string;
  onUpdateApiKey: (apiKey: string) => void;
  currentEndpoint: string;
  onUpdateEndpoint: (endpoint: string) => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  onWipeAllData: () => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  securityConfig,
  onUpdateSecurityConfig,
  currentApiKey,
  onUpdateApiKey,
  currentEndpoint,
  onUpdateEndpoint,
  onToast,
  onWipeAllData
}) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!securityConfig.isEncryptionEnabled);
  const [passcode, setPasscode] = useState<string>('');
  const [confirmPasscode, setConfirmPasscode] = useState<string>('');
  const [unlockInput, setUnlockInput] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [isSettingPasscode, setIsSettingPasscode] = useState<boolean>(false);

  // Danger Zone Modal state
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState<string>('');
  const [isPurging, setIsPurging] = useState<boolean>(false);

  // Handle Passcode Unlock
  const handleUnlockVault = async () => {
    if (!unlockInput.trim()) {
      onToast('마스터 비밀번호(PIN)를 입력해 주세요.', 'warn');
      return;
    }

    try {
      const inputHash = await hashPasscode(unlockInput.trim());
      if (securityConfig.passcodeHash && inputHash !== securityConfig.passcodeHash) {
        onToast('❌ 비밀번호가 올바르지 않습니다.', 'error');
        return;
      }

      // If we have encrypted bundles, decrypt them
      if (securityConfig.encryptedApiKey) {
        try {
          const decryptedKey = await decryptDataWithPasscode(
            securityConfig.encryptedApiKey,
            unlockInput.trim()
          );
          onUpdateApiKey(decryptedKey);
        } catch (e) {
          console.warn('API Key decryption warning:', e);
        }
      }

      if (securityConfig.encryptedEndpoint) {
        try {
          const decryptedEp = await decryptDataWithPasscode(
            securityConfig.encryptedEndpoint,
            unlockInput.trim()
          );
          onUpdateEndpoint(decryptedEp);
        } catch (e) {
          console.warn('Endpoint decryption warning:', e);
        }
      }

      setIsUnlocked(true);
      setUnlockInput('');
      onToast('🔓 보안 저장소(Vault)가 성공적으로 잠금 해제되었습니다.', 'success');
    } catch (err: any) {
      onToast(`잠금 해제 오류: ${err.message || '인증 실패'}`, 'error');
    }
  };

  // Lock Vault
  const handleLockVault = () => {
    setIsUnlocked(false);
    onToast('🔒 보안 저장소(Vault)가 잠겼습니다. 메모리 내 키가 보호됩니다.', 'info');
  };

  // Toggle Encryption Setting
  const handleToggleEncryption = async (enabled: boolean) => {
    if (enabled && !securityConfig.hasMasterPasscode) {
      setIsSettingPasscode(true);
      return;
    }

    if (!enabled) {
      // Disable encryption: save in plaintext
      const newConfig: SecurityConfig = {
        ...securityConfig,
        isEncryptionEnabled: false,
        encryptedApiKey: undefined,
        encryptedEndpoint: undefined
      };
      onUpdateSecurityConfig(newConfig);
      setIsUnlocked(true);
      onToast('ℹ️ AES-256 로컬 암호화 저장이 비활성화되었습니다.', 'info');
      return;
    }

    // Enabling with existing passcode
    const newConfig: SecurityConfig = {
      ...securityConfig,
      isEncryptionEnabled: true
    };
    onUpdateSecurityConfig(newConfig);
    onToast('🛡️ AES-256 로컬 암호화 저장이 활성화되었습니다.', 'success');
  };

  // Set or Change Master Passcode
  const handleSaveMasterPasscode = async () => {
    if (!passcode || passcode.length < 4) {
      onToast('비밀번호(PIN)는 최소 4자 이상이어야 합니다.', 'warn');
      return;
    }

    if (passcode !== confirmPasscode) {
      onToast('비밀번호 확인이 일치하지 않습니다.', 'warn');
      return;
    }

    try {
      const pHash = await hashPasscode(passcode);
      let encKey = securityConfig.encryptedApiKey;
      let encEp = securityConfig.encryptedEndpoint;

      if (currentApiKey) {
        encKey = await encryptDataWithPasscode(currentApiKey, passcode);
      }
      if (currentEndpoint) {
        encEp = await encryptDataWithPasscode(currentEndpoint, passcode);
      }

      const updatedConfig: SecurityConfig = {
        ...securityConfig,
        isEncryptionEnabled: true,
        hasMasterPasscode: true,
        passcodeHash: pHash,
        encryptedApiKey: encKey,
        encryptedEndpoint: encEp
      };

      onUpdateSecurityConfig(updatedConfig);
      setIsUnlocked(true);
      setIsSettingPasscode(false);
      setPasscode('');
      setConfirmPasscode('');
      onToast('✅ AES-256 마스터 비밀번호가 설정되고 인증정보가 암호화되었습니다.', 'success');
    } catch (err: any) {
      onToast(`마스터 비밀번호 설정 실패: ${err.message}`, 'error');
    }
  };

  // Danger Zone - Execute Emergency Purge
  const handleExecutePurge = () => {
    if (purgeConfirmationText.trim() !== 'DELETE' && purgeConfirmationText.trim() !== '삭제') {
      onToast('확인을 위해 "DELETE" 또는 "삭제"를 정확히 입력해 주세요.', 'warn');
      return;
    }

    setIsPurging(true);
    setTimeout(() => {
      onWipeAllData();
      setIsPurgeModalOpen(false);
      setIsPurging(false);
    }, 400);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 text-xs">
      <div className="divide-y divide-[#27272a]/60">
        {/* Row 1: AES-256 Storage Encryption */}
        <div className="py-3 space-y-2.5 first:pt-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300">AES-256 암호화 저장</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                  securityConfig.isEncryptionEnabled
                    ? isUnlocked
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                    : 'bg-[#27272a] text-slate-400 border-[#27272a]'
                }`}
              >
                {securityConfig.isEncryptionEnabled
                  ? isUnlocked
                    ? '활성'
                    : '잠김'
                  : '비활성'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleToggleEncryption(!securityConfig.isEncryptionEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                securityConfig.isEncryptionEnabled ? 'bg-[#0284c7]' : 'bg-[#27272a]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  securityConfig.isEncryptionEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Unlock prompt if locked */}
          {securityConfig.isEncryptionEnabled && !isUnlocked && (
            <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded flex items-center gap-2">
              <input
                type="password"
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlockVault()}
                placeholder="마스터 PIN 입력"
                className="flex-1 bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleUnlockVault}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded transition cursor-pointer shrink-0"
              >
                잠금 해제
              </button>
            </div>
          )}

          {/* Actions if unlocked */}
          {securityConfig.isEncryptionEnabled && isUnlocked && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-emerald-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> 복호화 활성 상태
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSettingPasscode(true)}
                  className="px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-slate-300 border border-[#27272a] transition cursor-pointer text-xs"
                >
                  비밀번호 변경
                </button>
                <button
                  type="button"
                  onClick={handleLockVault}
                  className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition cursor-pointer text-xs"
                >
                  지금 잠그기
                </button>
              </div>
            </div>
          )}

          {/* Passcode modal inline */}
          {isSettingPasscode && (
            <div className="p-3 bg-[#18181b] border border-[#38bdf8]/40 rounded space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-[#38bdf8]">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5" /> 마스터 비밀번호(PIN) 설정
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingPasscode(false)}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="새 비밀번호 (4자 이상)"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-slate-200 pr-7 focus:border-[#38bdf8] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="비밀번호 확인"
                  className="w-full bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-[#38bdf8] outline-none font-mono"
                />
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSettingPasscode(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-white rounded transition text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveMasterPasscode}
                  className="px-3 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded font-medium text-xs transition cursor-pointer"
                >
                  설정 저장
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="flex items-center justify-between gap-4 py-3">
          <label className="text-xs font-medium text-rose-400">모든 로컬 데이터 초기화</label>
          <button
            type="button"
            onClick={() => {
              setPurgeConfirmationText('');
              setIsPurgeModalOpen(true);
            }}
            className="px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-200 border border-rose-500/40 hover:border-rose-500 bg-rose-950/20 hover:bg-rose-950/50 rounded transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Trash2 className="w-3 h-3" />
            <span>데이터 전체 초기화</span>
          </button>
        </div>
      </div>

      {/* Emergency Purge Confirmation Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-[#18181b] border border-rose-500/50 rounded-lg p-4 shadow-2xl space-y-3 animate-in zoom-in-95 text-xs text-slate-200">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-rose-400">모든 로컬 데이터 영구 파기</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  에디터 문서, 대화 세션 및 암호화 키가 복구 불가능하게 즉시 파기됩니다.
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-rose-950/30 border border-rose-500/30 rounded space-y-1.5">
              <label className="text-xs text-slate-200 font-medium block">
                진행을 위해 <span className="text-rose-400 font-mono font-bold">DELETE</span> 또는 <span className="text-rose-400 font-mono font-bold">삭제</span>를 입력하세요:
              </label>
              <input
                type="text"
                value={purgeConfirmationText}
                onChange={(e) => setPurgeConfirmationText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                className="w-full bg-[#18181b] border border-rose-500/60 rounded px-2.5 py-1.5 text-xs text-rose-200 font-mono outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isPurging}
                className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-300 text-xs font-medium rounded transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={
                  isPurging ||
                  (purgeConfirmationText.trim() !== 'DELETE' && purgeConfirmationText.trim() !== '삭제')
                }
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold rounded transition flex items-center gap-1 cursor-pointer"
              >
                {isPurging ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>파기 중...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" />
                    <span>확인 및 파기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
