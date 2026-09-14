import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Fingerprint,
  X,
  Lock,
  Unlock,
  KeyRound,
  Check,
  Clock,
  Shield,
  LogOut
} from 'lucide-react';
import {
  encryptDataWithPasscode,
  decryptDataWithPasscode,
  hashPasscode,
  verifyPasscodeHash
} from '../utils/securityCrypto';
import { HelpTooltip } from './HelpTooltip';

export interface SecurityConfig {
  isEncryptionEnabled: boolean;
  hasMasterPasscode: boolean;
  passcodeHash?: string;
  encryptedApiKey?: string;
  encryptedEndpoint?: string;
  autoLockMinutes?: number;
  lockOnStartup?: boolean;
  clearSessionOnClose?: boolean;
  lastWipedAt?: string;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  isEncryptionEnabled: false,
  hasMasterPasscode: false,
  autoLockMinutes: 5,
  lockOnStartup: true,
  clearSessionOnClose: false
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
      onToast('마스터 PIN을 입력해 주세요.', 'warn');
      return;
    }

    try {
      if (securityConfig.passcodeHash) {
        const isValid = await verifyPasscodeHash(unlockInput.trim(), securityConfig.passcodeHash);
        if (!isValid) {
          onToast('마스터 PIN 번호가 일치하지 않습니다.', 'error');
          return;
        }
      }

      // Decrypt credentials if available
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
      onToast('보안 보관함 잠금이 해제되었습니다.', 'success');
    } catch (err: any) {
      onToast(`잠금 해제 오류: ${err.message || '인증에 실패했습니다.'}`, 'error');
    }
  };

  // Lock Vault
  const handleLockVault = () => {
    setIsUnlocked(false);
    onToast('보안 보관함이 잠겼습니다. 메모리 내 키가 보호됩니다.', 'info');
  };

  // Toggle Encryption Setting
  const handleToggleEncryption = async (enabled: boolean) => {
    if (enabled && !securityConfig.hasMasterPasscode) {
      setIsSettingPasscode(true);
      return;
    }

    if (!enabled) {
      const newConfig: SecurityConfig = {
        ...securityConfig,
        isEncryptionEnabled: false,
        encryptedApiKey: undefined,
        encryptedEndpoint: undefined
      };
      onUpdateSecurityConfig(newConfig);
      setIsUnlocked(true);
      onToast('AES-256 로컬 암호화 저장이 비활성화되었습니다.', 'info');
      return;
    }

    const newConfig: SecurityConfig = {
      ...securityConfig,
      isEncryptionEnabled: true
    };
    onUpdateSecurityConfig(newConfig);
    onToast('AES-256 로컬 암호화 저장이 활성화되었습니다.', 'success');
  };

  // Set or Change Master Passcode
  const handleSaveMasterPasscode = async () => {
    if (!passcode || passcode.length < 4) {
      onToast('마스터 PIN은 최소 4자리 이상이어야 합니다.', 'warn');
      return;
    }

    if (passcode !== confirmPasscode) {
      onToast('PIN 확인 번호가 일치하지 않습니다.', 'warn');
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
      onToast('마스터 PIN이 설정되었으며 인증 정보가 AES-256으로 암호화되었습니다.', 'success');
    } catch (err: any) {
      onToast(`마스터 PIN 설정 실패: ${err.message}`, 'error');
    }
  };

  // Danger Zone - Execute Emergency Purge
  const handleExecutePurge = () => {
    if (purgeConfirmationText.trim() !== '초기화') {
      onToast('확인을 위해 "초기화"를 정확히 입력해 주세요.', 'warn');
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
      {/* Settings Rows Container */}
      <div className="bg-[#16171e] border border-[#2e3142] rounded-md p-3 divide-y divide-[#2e3142]">
        {/* Row 1: AES-256 Storage Encryption */}
        <div className="py-3 space-y-2.5 first:pt-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-200">저장소 암호화</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono ${
                  securityConfig.isEncryptionEnabled
                    ? isUnlocked
                      ? 'badge-success'
                      : 'badge-warning'
                    : 'badge-muted'
                }`}
              >
                {securityConfig.isEncryptionEnabled
                  ? isUnlocked
                    ? '암호화 활성'
                    : '잠김'
                  : '비활성'}
              </span>
              <HelpTooltip
                title="저장소 암호화 안내"
                content="API 키 및 접속 주소를 로컬에 저장할 때 마스터 PIN 기반의 고강도 AES-256 알고리즘으로 안전하게 암호화합니다."
              />
            </div>

            <button
              type="button"
              onClick={() => handleToggleEncryption(!securityConfig.isEncryptionEnabled)}
              title={securityConfig.isEncryptionEnabled ? "암호화 비활성화" : "암호화 활성화"}
              aria-label={securityConfig.isEncryptionEnabled ? "암호화 비활성화" : "암호화 활성화"}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                securityConfig.isEncryptionEnabled ? 'bg-indigo-600' : 'bg-[#282a38]'
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
            <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-md flex items-center gap-2">
              <input
                type="password"
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlockVault()}
                placeholder="마스터 PIN 번호 입력"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-form-type="other"
                className="flex-1 bg-[#121318] border border-[#2e3142] rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleUnlockVault}
                title="보관함 잠금 해제"
                className="btn-secondary text-xs text-amber-300 hover:text-amber-200 border-amber-500/30"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>잠금 해제</span>
              </button>
            </div>
          )}

          {/* Actions if unlocked */}
          {securityConfig.isEncryptionEnabled && isUnlocked && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-normal">
                <CheckCircle2 className="w-3.5 h-3.5" /> 복호화 완료 - 정상 활성
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSettingPasscode(true)}
                  title="PIN 번호 변경"
                  className="btn-secondary text-xs"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span>PIN 변경</span>
                </button>
                <button
                  type="button"
                  onClick={handleLockVault}
                  title="지금 즉시 잠금"
                  className="btn-secondary text-xs text-amber-300 hover:text-amber-200 border-amber-500/30"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>즉시 잠금</span>
                </button>
              </div>
            </div>
          )}

          {/* Passcode modal inline */}
          {isSettingPasscode && (
            <div className="p-3 bg-[#121318] border border-indigo-500/40 rounded-md space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-medium text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5" /> 마스터 PIN 설정
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingPasscode(false)}
                  title="닫기"
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
                    placeholder="새 PIN 번호 4자리 이상"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full bg-[#16171e] border border-[#2e3142] rounded-md px-2.5 py-1.5 text-xs text-slate-200 pr-7 focus:border-indigo-500 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    title={showPasscode ? "PIN 숨기기" : "PIN 표시"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="PIN 번호 재입력"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full bg-[#16171e] border border-[#2e3142] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none font-mono"
                />
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSettingPasscode(false)}
                  className="btn-ghost text-xs"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveMasterPasscode}
                  className="btn-secondary text-xs text-indigo-300 hover:text-white border-indigo-500/40"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>설정 완료</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Lock on Startup (Zero-Trust Startup Gate) */}
        <div className="py-3 space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-slate-200">접속 시 항상 잠금 화면 표시</span>
              <span className="badge-muted text-[10px] px-1.5 py-0.5 rounded-sm">
                권장 보안
              </span>
              <HelpTooltip
                title="접속 시 잠금 안내"
                content="브라우저를 새로 열거나 새로고침할 때 이전 세션과 무관하게 항상 마스터 PIN 잠금 화면부터 시작합니다."
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const updated: SecurityConfig = {
                  ...securityConfig,
                  lockOnStartup: securityConfig.lockOnStartup === false ? true : false
                };
                onUpdateSecurityConfig(updated);
                onToast(
                  updated.lockOnStartup
                    ? '페이지 접속 시 잠금 화면이 항상 활성화됩니다.'
                    : '페이지 접속 시 잠금 화면이 비활성화되었습니다.',
                  'info'
                );
              }}
              title="접속 시 잠금 토글"
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                securityConfig.lockOnStartup !== false ? 'bg-indigo-600' : 'bg-[#282a38]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  securityConfig.lockOnStartup !== false ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Row 3: Auto-Lock Inactivity Timeout */}
        <div className="py-3 space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-slate-200">자동 잠금 대기 시간</span>
              <HelpTooltip
                title="자동 잠금 안내"
                content="사용자 입력이 없을 때 자동으로 작업 화면을 잠그고 메모리 내 데이터를 격리합니다."
              />
            </div>

            <select
              value={securityConfig.autoLockMinutes ?? 5}
              onChange={(e) => {
                const val = Number(e.target.value);
                const updated: SecurityConfig = {
                  ...securityConfig,
                  autoLockMinutes: val
                };
                onUpdateSecurityConfig(updated);
                onToast(val > 0 ? `자동 잠금이 ${val}분으로 설정되었습니다.` : '자동 잠금이 해제되었습니다.', 'info');
              }}
              className="bg-[#121318] border border-[#2e3142] hover:border-indigo-500 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={1}>1분 후 잠금</option>
              <option value={3}>3분 후 잠금</option>
              <option value={5}>5분 후 잠금 (기본값)</option>
              <option value={10}>10분 후 잠금</option>
              <option value={30}>30분 후 잠금</option>
              <option value={0}>사용 안 함</option>
            </select>
          </div>
        </div>

        {/* Row 4: Clear Session on Browser Close */}
        <div className="py-3 space-y-1.5 last:pb-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-slate-200">브라우저 종료 시 인증 세션 자동 삭제</span>
              <HelpTooltip
                title="인증 세션 자동 파기"
                content="창이나 탭을 닫을 때 로그인 인증 토큰을 즉시 파기하여 재접속 시 전체 재로그인을 요구합니다."
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const updated: SecurityConfig = {
                  ...securityConfig,
                  clearSessionOnClose: !securityConfig.clearSessionOnClose
                };
                onUpdateSecurityConfig(updated);
                onToast(
                  updated.clearSessionOnClose
                    ? '브라우저 종료 시 인증 세션이 자동 삭제됩니다.'
                    : '브라우저 종료 시 인증 세션이 유지됩니다.',
                  'info'
                );
              }}
              title="브라우저 종료 시 세션 삭제 토글"
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                securityConfig.clearSessionOnClose ? 'bg-indigo-600' : 'bg-[#282a38]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  securityConfig.clearSessionOnClose ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Isolated Warning Box */}
      <div className="bg-rose-950/15 border border-rose-500/30 rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-xs font-medium text-rose-400">로컬 워크스페이스 데이터 초기화</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            로컬에 저장된 문서, 대화 기록 및 암호화 키를 완전히 삭제합니다. 삭제 후에는 복구할 수 없습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPurgeConfirmationText('');
            setIsPurgeModalOpen(true);
          }}
          title="데이터 영구 삭제"
          className="btn-secondary text-xs text-rose-400 hover:text-rose-200 border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-950/30 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>데이터 초기화</span>
        </button>
      </div>

      {/* Emergency Purge Confirmation Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-[#1e202b] border border-rose-500/50 rounded-xl p-4 shadow-2xl space-y-3 animate-in zoom-in-95 text-xs text-slate-200">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-rose-400">로컬 데이터 전체 영구 삭제</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  브라우저에 보관된 모든 문서, AI 대화 기록 및 암호화 키가 영구적으로 파기됩니다.
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-md space-y-1.5">
              <label className="text-xs text-slate-200 font-medium block">
                삭제를 확인하려면 <span className="text-rose-400 font-mono font-bold">초기화</span>를 입력하세요:
              </label>
              <input
                type="text"
                value={purgeConfirmationText}
                onChange={(e) => setPurgeConfirmationText(e.target.value)}
                placeholder="초기화"
                autoFocus
                className="w-full bg-[#121318] border border-rose-500/60 rounded-md px-2.5 py-1.5 text-xs text-rose-200 font-mono outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isPurging}
                className="btn-ghost text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={isPurging || purgeConfirmationText.trim() !== '초기화'}
                className="btn-secondary text-xs text-rose-300 hover:text-white border-rose-500/50 hover:bg-rose-600 disabled:opacity-40"
              >
                {isPurging ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>영구 삭제 실행</span>
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
