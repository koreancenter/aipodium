import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  FileText,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Rocket,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  LifeBuoy,
  X,
  AlertTriangle,
  RotateCcw,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { authService, AuthUser } from '../services/authService';
import { PolicyModal, PolicyType } from './PolicyModal';
import { AcademicDisclaimerModal } from './AcademicDisclaimerModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import {
  hashMasterPin,
  verifyMasterPin,
  generateMasterRecoveryKey,
  hashRecoveryKey,
  verifyRecoveryKey,
  getLockoutStatus,
  recordFailedAttempt,
  resetFailedAttempts,
  initMasterVault,
  unlockVaultWithPin,
  unlockVaultWithRecoveryKey,
  rekeyVaultWithNewPin,
  purgeVaultKey,
  purgeGuestWorkspaceData,
  generateVaultKey,
  encryptDataWithPasscode,
  copySensitiveWithAutoClear,
  clearSensitiveClipboard,
  LOCAL_PIN_HASH_KEY,
  LOCAL_LOCK_ENABLED_KEY,
  LOCAL_RECOVERY_KEY_HASH,
  LOCAL_VAULT_KEY_PIN_ENC
} from '../utils/securityCrypto';
import { AUTH_TRANSLATIONS, AuthLang } from '../locales/authLocale';

export interface AuthPageProps {
  onAuthenticated: (user: AuthUser, vaultKey?: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  // Language State: Defaults to Korean for Korean users, togglable between [KR] and [ENG]
  const [lang, setLang] = useState<AuthLang>(() => {
    try {
      const saved = localStorage.getItem('aipodium_auth_lang');
      if (saved === 'KR' || saved === 'ENG') return saved;
      if (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('ko')) {
        return 'KR';
      }
      return 'KR';
    } catch {
      return 'KR';
    }
  });

  const handleSetLang = (newLang: AuthLang) => {
    setLang(newLang);
    try {
      localStorage.setItem('aipodium_auth_lang', newLang);
    } catch {}
  };

  const t = AUTH_TRANSLATIONS[lang];

  // Check if user has an existing Master PIN configured
  const [storedPinHash, setStoredPinHash] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOCAL_PIN_HASH_KEY);
    } catch {
      return null;
    }
  });

  const [storedRecoveryHash, setStoredRecoveryHash] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOCAL_RECOVERY_KEY_HASH);
    } catch {
      return null;
    }
  });

  const hasPinConfigured = Boolean(storedPinHash);

  // Mandatory Pre-flight Terms & Conditions Agreement
  const isDisclaimerInitiallyAccepted = () => {
    try {
      return localStorage.getItem('aipodium_disclaimer_accepted') === 'true';
    } catch {
      return false;
    }
  };

  const [agreeApiKey, setAgreeApiKey] = useState(isDisclaimerInitiallyAccepted);
  const [agreeLocalStorage, setAgreeLocalStorage] = useState(isDisclaimerInitiallyAccepted);
  const [agreeAiOutput, setAgreeAiOutput] = useState(isDisclaimerInitiallyAccepted);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(() => !isDisclaimerInitiallyAccepted());

  const isAllAgreed = agreeApiKey && agreeLocalStorage && agreeAiOutput;

  const handleToggleAllAgreements = () => {
    const nextVal = !isAllAgreed;
    setAgreeApiKey(nextVal);
    setAgreeLocalStorage(nextVal);
    setAgreeAiOutput(nextVal);
  };

  // Scenario A: First-time / No PIN set state
  const [showSetPinForm, setShowSetPinForm] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showNewPinPassword, setShowNewPinPassword] = useState(false);

  // Recovery Key Generation Modal (First-time PIN setup)
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState<string | null>(null);
  const [hasCopiedRecoveryKey, setHasCopiedRecoveryKey] = useState(false);
  const [confirmedSavedRecoveryKey, setConfirmedSavedRecoveryKey] = useState(false);
  const [pendingPinHash, setPendingPinHash] = useState<string | null>(null);

  // Scenario B: Returning User / Unlock state
  const [enteredPin, setEnteredPin] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  // Rate Limiting state
  const [lockoutState, setLockoutState] = useState(() => getLockoutStatus());

  // Recovery Flow state ("Forgot PIN? Use Emergency Master Access Key")
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [enteredRecoveryKey, setEnteredRecoveryKey] = useState('');
  const [isRecoveryKeyVerified, setIsRecoveryKeyVerified] = useState(false);

  // Emergency Purge confirmation modal (When PIN is forgotten and no recovery key exists)
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeInputText, setPurgeInputText] = useState('');

  // General feedback state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Policy Modal state
  const [academicDisclaimerOpen, setAcademicDisclaimerOpen] = useState(false);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
  const [termsOfServiceOpen, setTermsOfServiceOpen] = useState(false);

  const openPolicy = (tab: PolicyType) => {
    if (tab === 'disclaimer') {
      setAcademicDisclaimerOpen(true);
    } else if (tab === 'privacy') {
      setPrivacyPolicyOpen(true);
    } else if (tab === 'terms') {
      setTermsOfServiceOpen(true);
    }
  };

  // Timer ticker for rate-limiting lockout window
  useEffect(() => {
    if (!lockoutState.isLockedOut) return;

    const interval = setInterval(() => {
      const updated = getLockoutStatus();
      setLockoutState(updated);
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutState.isLockedOut]);

  // When AuthPage is loaded without a configured PIN (Scenario A: Guest / First-time user),
  // purge any lingering unencrypted guest workspace data to prevent data leakage between sessions.
  useEffect(() => {
    if (!hasPinConfigured) {
      purgeGuestWorkspaceData().catch((err) => {
        console.warn('Guest workspace cleanup notice:', err);
      });
    }
  }, [hasPinConfigured]);

  // 1. Direct Workspace Entry (Scenario A - No PIN set)
  const handleOpenWorkspaceDirectly = () => {
    if (!isAllAgreed) return;
    try {
      localStorage.setItem('aipodium_disclaimer_accepted', 'true');
    } catch {}
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = authService.loginAsGuest('Workspace User');
      onAuthenticated(user);
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'KR' ? '워크스페이스를 여는데 실패했습니다.' : 'Failed to open workspace.'));
      setIsLoading(false);
    }
  };

  const handleOpenPinSetup = () => {
    if (!isAllAgreed) return;
    try {
      localStorage.setItem('aipodium_disclaimer_accepted', 'true');
    } catch {}
    setShowSetPinForm(true);
    setErrorMsg(null);
  };

  // 2. Stage Master PIN and prompt Emergency Master Access Key
  const handleStageMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPin = newPin.trim();
    if (cleanPin.length < 4) {
      setErrorMsg(t.pinLengthError);
      return;
    }

    if (cleanPin !== confirmNewPin.trim()) {
      setErrorMsg(t.pinMismatchError);
      return;
    }

    setIsLoading(true);
    try {
      const pinHash = await hashMasterPin(cleanPin);
      const recoveryKey = generateMasterRecoveryKey();

      setPendingPinHash(pinHash);
      setGeneratedRecoveryKey(recoveryKey);
      setHasCopiedRecoveryKey(false);
      setConfirmedSavedRecoveryKey(false);
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'KR' ? '보안 복구 키 생성에 실패했습니다.' : 'Failed to generate cryptographic access key.'));
      setIsLoading(false);
    }
  };

  // 3. Confirm and Save Master PIN & Recovery Key Hash
  const handleConfirmRecoveryKeyAndEnter = async () => {
    if (!generatedRecoveryKey || !pendingPinHash) return;

    if (!confirmedSavedRecoveryKey) {
      setErrorMsg(t.confirmRecoverySavedError);
      return;
    }

    setIsLoading(true);
    try {
      const recHash = await hashRecoveryKey(generatedRecoveryKey);

      // Initialize Master Vault Key dual-encrypted by PIN and Recovery Key for Data-at-Rest Encryption
      const vaultKey = await initMasterVault(newPin.trim(), generatedRecoveryKey);

      localStorage.setItem(LOCAL_PIN_HASH_KEY, pendingPinHash);
      localStorage.setItem(LOCAL_RECOVERY_KEY_HASH, recHash);
      localStorage.setItem(LOCAL_LOCK_ENABLED_KEY, 'true');
      localStorage.setItem('aipodium_disclaimer_accepted', 'true');

      setStoredPinHash(pendingPinHash);
      setStoredRecoveryHash(recHash);
      setGeneratedRecoveryKey(null);
      setSuccessMsg(t.pinConfiguredSuccess);

      setTimeout(() => {
        const user = authService.getCurrentUser() || authService.loginAsGuest('Workspace User');
        onAuthenticated(user, vaultKey);
      }, 400);
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'KR' ? '보안 설정 저장에 실패했습니다.' : 'Failed to save security settings.'));
      setIsLoading(false);
    }
  };

  // 4. Copy Recovery Key to Clipboard with 60s Auto-Clear Protection
  const handleCopyRecoveryKey = async () => {
    if (!generatedRecoveryKey) return;
    try {
      const ok = await copySensitiveWithAutoClear(generatedRecoveryKey, 60);
      if (ok) {
        setHasCopiedRecoveryKey(true);
        setTimeout(() => setHasCopiedRecoveryKey(false), 3000);
      }
    } catch {
      // Fallback manual selection
    }
  };

  // 5. Unlock Workspace with PIN (Scenario B)
  const handleUnlockWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const currentLockout = getLockoutStatus();
    if (currentLockout.isLockedOut) {
      setLockoutState(currentLockout);
      setErrorMsg(lang === 'KR'
        ? `오류 횟수가 초과되어 ${currentLockout.remainingSeconds}초 동안 대기해야 합니다.`
        : `Too many failed attempts. Locked out for ${currentLockout.remainingSeconds} seconds.`);
      return;
    }

    const cleanPin = enteredPin.trim();
    if (!cleanPin) {
      setErrorMsg(t.enterPinError);
      return;
    }

    if (!storedPinHash) {
      handleOpenWorkspaceDirectly();
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await verifyMasterPin(cleanPin, storedPinHash);
      if (isValid) {
        resetFailedAttempts();

        // Unlock or transparently migrate/initialize Master Vault Key
        let vaultKey = await unlockVaultWithPin(cleanPin);
        if (!vaultKey) {
          vaultKey = generateVaultKey();
          const encByPin = await encryptDataWithPasscode(vaultKey, cleanPin);
          localStorage.setItem(LOCAL_VAULT_KEY_PIN_ENC, encByPin);
        }

        setSuccessMsg(t.unlockedSuccess);
        setTimeout(() => {
          const user = authService.getCurrentUser() || authService.loginAsGuest('Workspace User');
          onAuthenticated(user, vaultKey || undefined);
        }, 250);
      } else {
        const updatedLockout = recordFailedAttempt();
        setLockoutState(updatedLockout);
        setIsLoading(false);

        if (updatedLockout.isLockedOut) {
          setErrorMsg(lang === 'KR'
            ? `5회 연속 오류로 ${updatedLockout.remainingSeconds}초 동안 입력이 제한됩니다.`
            : `Too many failed attempts (5/5). Locked out for ${updatedLockout.remainingSeconds}s.`);
        } else {
          setErrorMsg(lang === 'KR'
            ? `잘못된 PIN입니다 (${updatedLockout.attempts}/5회 시도).`
            : `Incorrect PIN (${updatedLockout.attempts}/5 attempts).`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'KR' ? '인증 도중 오류가 발생했습니다.' : 'An error occurred during verification.'));
      setIsLoading(false);
    }
  };

  // 6. Verify Emergency Master Access Key for reset
  const handleVerifyRecoveryKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanInput = enteredRecoveryKey.trim();
    if (!cleanInput) {
      setErrorMsg(t.enterRecoveryKeyError);
      return;
    }

    if (!storedRecoveryHash) {
      setErrorMsg(lang === 'KR' ? '등록된 복구 키를 찾을 수 없습니다.' : 'No registered access key found.');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await verifyRecoveryKey(cleanInput, storedRecoveryHash);
      if (isValid) {
        setIsRecoveryKeyVerified(true);
        resetFailedAttempts();
        setSuccessMsg(lang === 'KR' ? '복구 키가 확인되었습니다. 새 PIN을 설정하세요.' : 'Access Key verified. Please set a new workspace PIN.');
        setIsLoading(false);
      } else {
        setErrorMsg(t.invalidRecoveryKeyError);
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'KR' ? '확인에 실패했습니다.' : 'Verification failed.'));
      setIsLoading(false);
    }
  };

  // 7. Complete PIN Reset with verified Recovery Key
  const handleCompletePinResetWithRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPin = newPin.trim();
    if (cleanPin.length < 4) {
      setErrorMsg(t.pinLengthError);
      return;
    }

    if (cleanPin !== confirmNewPin.trim()) {
      setErrorMsg(t.pinMismatchError);
      return;
    }

    setIsLoading(true);
    try {
      const newPinHash = await hashMasterPin(cleanPin);
      const newRecoveryKey = generateMasterRecoveryKey();
      const newRecHash = await hashRecoveryKey(newRecoveryKey);

      let vaultKey = await unlockVaultWithRecoveryKey(enteredRecoveryKey.trim());
      if (!vaultKey) {
        vaultKey = generateVaultKey();
      }
      await rekeyVaultWithNewPin(vaultKey, cleanPin, newRecoveryKey);

      localStorage.setItem(LOCAL_PIN_HASH_KEY, newPinHash);
      localStorage.setItem(LOCAL_RECOVERY_KEY_HASH, newRecHash);
      setStoredPinHash(newPinHash);
      setStoredRecoveryHash(newRecHash);

      // Present the new access key for safe backup
      setGeneratedRecoveryKey(newRecoveryKey);
      setPendingPinHash(newPinHash);
      setShowRecoveryForm(false);
      setIsRecoveryKeyVerified(false);
      setEnteredRecoveryKey('');
      setNewPin('');
      setConfirmNewPin('');
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'KR' ? 'PIN 업데이트에 실패했습니다.' : 'Failed to update PIN.'));
      setIsLoading(false);
    }
  };

  // 8. Emergency Purge (Destroys local lock to restore workspace access)
  const handleExecuteEmergencyPurge = () => {
    if (purgeInputText.trim().toUpperCase() !== 'RESET') {
      setErrorMsg(lang === 'KR' ? '초기화를 확인하려면 RESET을 입력하세요.' : 'Type "RESET" to confirm security reset.');
      return;
    }

    try {
      localStorage.removeItem(LOCAL_PIN_HASH_KEY);
      localStorage.removeItem(LOCAL_RECOVERY_KEY_HASH);
      localStorage.removeItem(LOCAL_LOCK_ENABLED_KEY);
      purgeVaultKey();
      clearSensitiveClipboard();
      resetFailedAttempts();
      sessionStorage.removeItem('aipodium_api_keys');
      sessionStorage.removeItem('aipodium_cloud_api_key');

      setStoredPinHash(null);
      setStoredRecoveryHash(null);
      setShowPurgeModal(false);
      setShowRecoveryForm(false);
      setEnteredPin('');
      setPurgeInputText('');
      setSuccessMsg(t.purgeSuccess);
    } catch {
      setErrorMsg(t.purgeFailed);
    }
  };

  return (
    <div className="w-full min-h-screen min-h-[100dvh] bg-[#09090b] text-zinc-200 font-['Plus_Jakarta_Sans',Inter,-apple-system,BlinkMacSystemFont,sans-serif] antialiased selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)] flex flex-col justify-between relative overflow-x-hidden overflow-y-auto">
      {/* Subtle ambient lighting adhering strictly to Clean Dark rules */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(99,102,241,0.06),transparent_70%)] pointer-events-none" />

      {/* Main Bounded Container: Perfectly centers layout on all screen sizes (ultrawide to mobile) */}
      <div className="relative z-10 w-full max-w-6xl xl:max-w-7xl mx-auto min-h-screen min-h-[100dvh] flex flex-col justify-between px-4 sm:px-8 lg:px-12 py-2 sm:py-5 lg:py-8">
        {/* Top Header: Brand Identity & Language Toggle */}
        <header className="w-full flex items-center justify-between pt-2 pb-1 sm:py-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold tracking-tight text-zinc-100">
              {t.brandName}
            </span>
            <span className="px-1.5 py-0.5 rounded-sm text-[11px] font-normal bg-white/5 text-zinc-400 border border-white/10">
              {t.betaTag}
            </span>
          </div>

          {/* Clean Segmented Language Selector */}
          <div
            className="inline-flex items-center rounded-md bg-[#121214] border border-white/[0.08] p-0.5"
            role="group"
            aria-label="Language selector"
          >
            <button
              type="button"
              onClick={() => handleSetLang('KR')}
              className={`px-2.5 py-1 text-xs rounded-sm transition-colors cursor-pointer ${
                lang === 'KR'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 font-normal'
              }`}
              aria-pressed={lang === 'KR'}
              title="한국어"
            >
              KR
            </button>
            <button
              type="button"
              onClick={() => handleSetLang('ENG')}
              className={`px-2.5 py-1 text-xs rounded-sm transition-colors cursor-pointer ${
                lang === 'ENG'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 font-normal'
              }`}
              aria-pressed={lang === 'ENG'}
              title="English"
            >
              ENG
            </button>
          </div>
        </header>

        {/* Middle: Responsive Workspace Grid (Action Card prioritized on mobile/tablet) */}
        <main className="my-auto py-2 sm:py-6 lg:py-12 w-full flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-6 lg:gap-10 xl:gap-16 items-center">
          {/* Mobile/Tablet Compact Hero Header (< lg): immediate brand context */}
          <div className="lg:hidden w-full text-center space-y-1 sm:space-y-1.5 order-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-snug text-zinc-100 break-keep">
              {t.heroTitle}
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed max-w-lg mx-auto break-keep">
              {t.heroDesc}
            </p>
          </div>

          {/* Action Card (Onboarding & Security Gateway Card): Prioritized order-2 on mobile/tablet */}
          <div className="w-full flex flex-col items-center lg:items-end order-2 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-1">
            <div className="w-full max-w-md bg-[#121214] border border-white/[0.08] rounded-xl p-4 sm:p-6 md:p-8 shadow-xl shadow-black/40">
              <div>
                {/* Status Feedback Banners */}
                {errorMsg && (
                  <div className="mb-5 rounded-md border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-5 rounded-md border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{successMsg}</span>
                  </div>
                )}

                {/* Rate Limit Lockout Banner */}
                {lockoutState.isLockedOut && (
                  <div className="mb-5 rounded-md border border-amber-500/40 bg-amber-950/40 p-3.5 text-xs text-amber-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{t.cooldownActive}</span>
                    </div>
                    <span className="font-semibold text-amber-200">
                      {lockoutState.remainingSeconds}s
                    </span>
                  </div>
                )}

                {/* Emergency Master Access Key Modal (First-time PIN setup dialogue) */}
                {generatedRecoveryKey && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <LifeBuoy className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">{t.recoveryKeyTitle}</h3>
                        <p className="text-xs text-zinc-400">{t.recoveryKeySubtitle}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-md bg-[#18181b] border border-white/[0.08] text-xs text-zinc-300 leading-relaxed">
                      <strong className="block font-medium text-indigo-300 mb-1">{t.recoveryKeyNoticeHeader}</strong>
                      {t.recoveryKeyNoticeBody}
                    </div>

                    <div className="flex items-center justify-between rounded-md bg-[#18181b] border border-white/[0.08] p-3 font-mono text-sm tracking-widest text-indigo-300 select-all font-medium">
                      <span>{generatedRecoveryKey}</span>
                      <button
                        type="button"
                        onClick={handleCopyRecoveryKey}
                        title={t.copyRecoveryKeyTitle}
                        aria-label={t.copyRecoveryKeyTitle}
                        className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/10"
                      >
                        {hasCopiedRecoveryKey ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmedSavedRecoveryKey}
                        onChange={(e) => setConfirmedSavedRecoveryKey(e.target.checked)}
                        className="mt-0.5 rounded-sm border-white/20 bg-[#18181b] text-indigo-600 focus:ring-0"
                      />
                      <span className="leading-relaxed">
                        {t.recoveryKeySavedCheckbox}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleConfirmRecoveryKeyAndEnter}
                      disabled={!confirmedSavedRecoveryKey || isLoading}
                      title={t.openWorkspaceAfterRecovery}
                      className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-4 font-medium text-sm sm:text-base transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Rocket className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                      <span>{t.openWorkspaceAfterRecovery}</span>
                    </button>
                  </div>
                )}

                {/* Returning User Locked State (Scenario B) */}
                {!generatedRecoveryKey && hasPinConfigured && !showRecoveryForm && (
                  <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                    <div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2 sm:mb-4">
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight">
                        {t.unlockTitle}
                      </h2>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                        {t.unlockDesc}
                      </p>
                    </div>

                    {/* Local Vault Status Badge */}
                    <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-[#18181b] border border-white/[0.08] text-xs text-zinc-300">
                      <div className="w-5 h-5 rounded-sm bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-500/30 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-zinc-200 text-xs truncate">
                          {lang === 'KR' ? '로컬 기기 암호화 워크스페이스' : 'Local Encrypted Workspace'}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate font-mono">
                          {lang === 'KR' ? '온디바이스 저장소 (AES-256)' : 'On-Device Storage (AES-256)'}
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleUnlockWorkspace} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="unlock-pin" className="block text-xs font-medium text-zinc-300">
                          {t.pinLabel}
                        </label>
                        <div className="relative flex items-center rounded-md border border-white/[0.08] bg-[#18181b] px-3 py-2 transition-colors focus-within:border-indigo-500">
                          <KeyRound className="h-4 w-4 text-zinc-400 shrink-0 mr-2.5" />
                          <input
                            id="unlock-pin"
                            name="aipodium-secure-lock-input"
                            type={showUnlockPassword ? 'text' : 'password'}
                            value={enteredPin}
                            onChange={(e) => setEnteredPin(e.target.value)}
                            placeholder={t.pinPlaceholder}
                            autoFocus
                            disabled={isLoading || lockoutState.isLockedOut}
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                            tabIndex={-1}
                            title={showUnlockPassword ? t.hidePassword : t.showPassword}
                            aria-label={showUnlockPassword ? t.hidePassword : t.showPassword}
                            className="text-zinc-400 hover:text-zinc-200 transition-colors ml-2 cursor-pointer"
                          >
                            {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || lockoutState.isLockedOut}
                        title={t.unlockWorkspace}
                        className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-4 font-medium text-sm sm:text-base transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Unlock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                        <span>{t.unlockWorkspace}</span>
                      </button>
                    </form>

                    {/* Security Diagnostics & Recovery Options */}
                    <div className="p-3.5 rounded-md bg-[#18181b] border border-white/[0.08] space-y-2 text-xs text-zinc-400 leading-relaxed">
                      <div className="flex items-center gap-2 text-indigo-300 font-medium">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        <span>{t.deviceEncryptionActive}</span>
                      </div>
                      <p className="text-zinc-400">
                        {t.notesLockedInMemory}
                      </p>
                      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRecoveryForm(true);
                            setErrorMsg(null);
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                          {t.forgotPinPrompt}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowPurgeModal(true)}
                          className="text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          {t.resetLockPrompt}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recovery Key Verification Form */}
                {!generatedRecoveryKey && hasPinConfigured && showRecoveryForm && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                      <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                        <LifeBuoy className="w-4 h-4 text-indigo-400" />
                        <span>{t.recoveryVerificationTitle}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRecoveryForm(false);
                          setIsRecoveryKeyVerified(false);
                          setErrorMsg(null);
                        }}
                        title={t.cancel}
                        aria-label={t.cancel}
                        className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {!isRecoveryKeyVerified ? (
                      <form onSubmit={handleVerifyRecoveryKey} className="space-y-4">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {t.recoveryVerificationDesc}
                        </p>
                        <input
                          type="text"
                          value={enteredRecoveryKey}
                          onChange={(e) => setEnteredRecoveryKey(e.target.value)}
                          placeholder={t.recoveryKeyPlaceholder}
                          autoComplete="off"
                          autoCapitalize="characters"
                          autoCorrect="off"
                          spellCheck={false}
                          disabled={isLoading}
                          className="w-full font-mono text-center tracking-widest text-xs rounded-md border border-white/[0.08] bg-[#18181b] px-3.5 py-2.5 text-indigo-200 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={isLoading}
                          title={t.verifyRecoveryKeyButton}
                          className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-4 font-medium text-sm sm:text-base transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>{t.verifyRecoveryKeyButton}</span>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleCompletePinResetWithRecovery} className="space-y-3.5">
                        <p className="text-xs text-emerald-400 font-medium">
                          {t.recoveryVerifiedSuccessPrompt}
                        </p>
                        <input
                          type="password"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          placeholder={t.newPinAfterRecoveryPlaceholder}
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          className="w-full text-xs rounded-md border border-white/[0.08] bg-[#18181b] px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="password"
                          value={confirmNewPin}
                          onChange={(e) => setConfirmNewPin(e.target.value)}
                          placeholder={t.confirmNewPinAfterRecoveryPlaceholder}
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          className="w-full text-xs rounded-md border border-white/[0.08] bg-[#18181b] px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={isLoading}
                          title={t.saveNewPinButton}
                          className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-4 font-medium text-sm sm:text-base transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>{t.saveNewPinButton}</span>
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* First-time User / No PIN Set (Scenario A - Redesigned Clean IDE Look) */}
                {!generatedRecoveryKey && !hasPinConfigured && (
                  <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                    <div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2 sm:mb-4">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight">
                        {t.welcomeTitle}
                      </h2>
                      <p className="mt-1 sm:mt-1.5 text-xs text-zinc-400 leading-relaxed">
                        {t.welcomeDesc}
                      </p>
                    </div>

                    {!showSetPinForm ? (
                      <div className="space-y-3 sm:space-y-4">
                        {/* Mandatory Pre-flight Terms & Agreement Checklist */}
                        <div className="rounded-lg bg-[#0c0c0e] border border-[#222226] p-2.5 sm:p-3 text-xs space-y-2 sm:space-y-2.5 my-3 sm:my-5">
                          {/* Master All-in-one Toggle */}
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-start gap-2.5 cursor-pointer select-none group flex-1">
                              <input
                                type="checkbox"
                                checked={isAllAgreed}
                                onChange={handleToggleAllAgreements}
                                className="mt-0.5 rounded-sm border-white/20 bg-[#18181b] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600 shrink-0"
                              />
                              <span className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors leading-snug">
                                {t.termsAllAgree}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
                              aria-expanded={isDetailsExpanded}
                              title={isDetailsExpanded ? t.termsHideDetails : t.termsViewDetails}
                            >
                              <span>{isDetailsExpanded ? t.termsHideDetails : t.termsViewDetails}</span>
                              {isDetailsExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Expandable Individual Checklist */}
                          {isDetailsExpanded && (
                            <div className="pt-2 border-t border-[#222226] space-y-2 pl-0.5">
                              {/* Item 1: API Key responsibility */}
                              <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                                <input
                                  type="checkbox"
                                  checked={agreeApiKey}
                                  onChange={(e) => setAgreeApiKey(e.target.checked)}
                                  className="mt-0.5 rounded-sm border-white/20 bg-[#18181b] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600 shrink-0"
                                />
                                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 leading-tight">
                                  {t.termsApiKeyAgree}
                                </span>
                              </label>

                              {/* Item 2: Local storage risk acknowledgement */}
                              <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                                <input
                                  type="checkbox"
                                  checked={agreeLocalStorage}
                                  onChange={(e) => setAgreeLocalStorage(e.target.checked)}
                                  className="mt-0.5 rounded-sm border-white/20 bg-[#18181b] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600 shrink-0"
                                />
                                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 leading-tight">
                                  {t.termsLocalStorageAgree}
                                </span>
                              </label>

                              {/* Item 3: AI output verification responsibility */}
                              <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                                <input
                                  type="checkbox"
                                  checked={agreeAiOutput}
                                  onChange={(e) => setAgreeAiOutput(e.target.checked)}
                                  className="mt-0.5 rounded-sm border-white/20 bg-[#18181b] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600 shrink-0"
                                />
                                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 leading-tight">
                                  {t.termsAiOutputAgree}
                                </span>
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 sm:space-y-2.5">
                          {/* Primary Action: Open Research Workspace */}
                          <button
                            type="button"
                            onClick={handleOpenWorkspaceDirectly}
                            disabled={isLoading || !isAllAgreed}
                            title={t.openWorkspace}
                            className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-4 font-medium text-sm sm:text-base transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Rocket className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-white" />
                            <span>{t.openWorkspace}</span>
                          </button>

                          {/* Secondary Action: Enable Workspace PIN Lock */}
                          <button
                            type="button"
                            onClick={handleOpenPinSetup}
                            disabled={isLoading || !isAllAgreed}
                            title={t.enablePinLock}
                            className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-md px-4 text-sm sm:text-base font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 shrink-0" />
                            <span>{t.enablePinLock}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleStageMasterPin} className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-indigo-400" />
                            <span>{t.configurePinTitle}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowSetPinForm(false)}
                            title={t.cancel}
                            aria-label={t.cancel}
                            className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="new-pin" className="block text-xs font-medium text-zinc-300">
                            {t.newPinLabel}
                          </label>
                          <div className="relative flex items-center rounded-md border border-white/[0.08] bg-[#18181b] px-3 py-2 transition-colors focus-within:border-indigo-500">
                            <input
                              id="new-pin"
                              name="aipodium-new-pin-input"
                              type={showNewPinPassword ? 'text' : 'password'}
                              value={newPin}
                              onChange={(e) => setNewPin(e.target.value)}
                              placeholder={t.newPinPlaceholder}
                              autoFocus
                              disabled={isLoading}
                              autoComplete="off"
                              autoCapitalize="off"
                              autoCorrect="off"
                              spellCheck={false}
                              className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPinPassword(!showNewPinPassword)}
                              tabIndex={-1}
                              title={showNewPinPassword ? t.hidePassword : t.showPassword}
                              aria-label={showNewPinPassword ? t.hidePassword : t.showPassword}
                              className="text-zinc-400 hover:text-zinc-200 transition-colors ml-2 cursor-pointer"
                            >
                              {showNewPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="confirm-new-pin" className="block text-xs font-medium text-zinc-300">
                            {t.confirmPinLabel}
                          </label>
                          <div className="relative flex items-center rounded-md border border-white/[0.08] bg-[#18181b] px-3 py-2 transition-colors focus-within:border-indigo-500">
                            <input
                              id="confirm-new-pin"
                              name="aipodium-confirm-pin-input"
                              type={showNewPinPassword ? 'text' : 'password'}
                              value={confirmNewPin}
                              onChange={(e) => setConfirmNewPin(e.target.value)}
                              placeholder={t.confirmPinPlaceholder}
                              disabled={isLoading}
                              autoComplete="off"
                              autoCapitalize="off"
                              autoCorrect="off"
                              spellCheck={false}
                              className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          title={t.savePinAndGenKey}
                          className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-4 font-medium text-sm sm:text-base transition-colors cursor-pointer disabled:opacity-60 mt-3"
                        >
                          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span>{t.savePinAndGenKey}</span>
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Under-Card System Architecture & Trust Badges (Only on desktop lg: for visual balance) */}
            <div className="hidden lg:grid w-full max-w-md mt-3.5 grid-cols-3 gap-2 text-center select-none">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5 flex flex-col items-center justify-center transition-colors hover:border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[0.6875rem] font-medium text-zinc-200">
                  {lang === 'KR' ? '100% 로컬 격리' : '100% Local'}
                </span>
                <span className="text-[0.625rem] text-zinc-400 mt-0.5">
                  {lang === 'KR' ? '브라우저 단독 보관' : 'In-Browser Only'}
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5 flex flex-col items-center justify-center transition-colors hover:border-white/10">
                <Cpu className="w-4 h-4 text-indigo-400 mb-1" />
                <span className="text-[0.6875rem] font-medium text-zinc-200">
                  {lang === 'KR' ? '멀티 AI 하모니' : 'Multi-AI Harmony'}
                </span>
                <span className="text-[0.625rem] text-zinc-400 mt-0.5">
                  {lang === 'KR' ? '클라우드 & 로컬' : 'Cloud & Local'}
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5 flex flex-col items-center justify-center transition-colors hover:border-white/10">
                <Lock className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[0.6875rem] font-medium text-zinc-200">
                  {lang === 'KR' ? '보안 금고 암호화' : 'Encrypted Vault'}
                </span>
                <span className="text-[0.625rem] text-zinc-400 mt-0.5">
                  {lang === 'KR' ? 'PIN & 복구 키' : 'PIN & Master Key'}
                </span>
              </div>
            </div>

          </div>

          {/* Intro Section & Architectural Pillars (Desktop Left Column / Mobile Below-Card Section) */}
          <div className="w-full lg:col-span-7 lg:col-start-1 lg:row-start-1 order-3 lg:order-none space-y-3 sm:space-y-4 lg:space-y-8 hidden sm:block">
            {/* Desktop Full Hero Header (hidden on mobile/tablet since displayed above action card) */}
            <div className="hidden lg:block space-y-3">
              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-semibold tracking-tight leading-snug text-zinc-100 break-keep">
                {t.heroTitle}
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl break-keep">
                {t.heroDesc}
              </p>
            </div>

            {/* Academic Value Cards - Responsive Presentation (Hidden on mobile < sm & short viewports < 750px) */}
            <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-2 md:gap-3 lg:gap-3 mx-auto lg:mx-0 short-screen-hide">
              <div className="flex items-center lg:items-start gap-2.5 sm:gap-3 lg:gap-3.5 p-2 sm:p-2.5 lg:p-3.5 rounded-lg lg:rounded-md border border-white/[0.05] lg:border-transparent lg:hover:border-white/[0.06] bg-white/[0.02] lg:bg-transparent lg:hover:bg-white/[0.02] transition-colors">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-xs lg:text-sm font-medium text-zinc-200">
                    <span className="lg:hidden">{t.card1CompactTitle}</span>
                    <span className="hidden lg:inline">{t.card1Title}</span>
                  </div>
                  <div className="hidden lg:block text-xs sm:text-sm text-zinc-400 leading-relaxed mt-1">
                    {t.card1Desc}
                  </div>
                </div>
              </div>

              <div className="flex items-center lg:items-start gap-2.5 sm:gap-3 lg:gap-3.5 p-2 sm:p-2.5 lg:p-3.5 rounded-lg lg:rounded-md border border-white/[0.05] lg:border-transparent lg:hover:border-white/[0.06] bg-white/[0.02] lg:bg-transparent lg:hover:bg-white/[0.02] transition-colors">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-xs lg:text-sm font-medium text-zinc-200">
                    <span className="lg:hidden">{t.card2CompactTitle}</span>
                    <span className="hidden lg:inline">{t.card2Title}</span>
                  </div>
                  <div className="hidden lg:block text-xs sm:text-sm text-zinc-400 leading-relaxed mt-1">
                    {t.card2Desc}
                  </div>
                </div>
              </div>

              <div className="flex items-center lg:items-start gap-2.5 sm:gap-3 lg:gap-3.5 p-2 sm:p-2.5 lg:p-3.5 rounded-lg lg:rounded-md border border-white/[0.05] lg:border-transparent lg:hover:border-white/[0.06] bg-white/[0.02] lg:bg-transparent lg:hover:bg-white/[0.02] transition-colors">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-xs lg:text-sm font-medium text-zinc-200">
                    <span className="lg:hidden">{t.card3CompactTitle}</span>
                    <span className="hidden lg:inline">{t.card3Title}</span>
                  </div>
                  <div className="hidden lg:block text-xs sm:text-sm text-zinc-400 leading-relaxed mt-1">
                    {t.card3Desc}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Global Footer: Academic Policies & Operational Status Indicators */}
        <footer className="w-full pt-3 sm:pt-4 border-t border-white/[0.08] flex items-center justify-center text-[11px] sm:text-xs text-zinc-500">
          <div id="auth-footer-legal" className="flex flex-wrap items-center justify-center text-center gap-2.5 sm:gap-3">
            <span>{t.copyright}</span>
            <span className="text-zinc-700">·</span>
            <button
              type="button"
              onClick={() => openPolicy('privacy')}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {t.privacyPolicy}
            </button>
            <span className="text-zinc-700">·</span>
            <button
              type="button"
              onClick={() => openPolicy('terms')}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {t.termsOfUse}
            </button>
            <span className="text-zinc-700">·</span>
            <button
              type="button"
              onClick={() => openPolicy('disclaimer')}
              className="text-amber-400/80 hover:text-amber-300 font-medium transition-colors cursor-pointer"
            >
              {t.academicDisclaimer}
            </button>
          </div>
        </footer>
      </div>

      {/* Emergency Security Reset Confirmation Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#121214] border border-white/[0.08] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{t.purgeModalTitle}</h3>
                <p className="text-xs text-zinc-400">{t.purgeModalSubtitle}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {t.purgeModalDesc}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">
                {t.purgeConfirmPrompt}{' '}
                <span className="font-semibold text-rose-400 font-mono">RESET</span>
              </label>
              <input
                type="text"
                value={purgeInputText}
                onChange={(e) => setPurgeInputText(e.target.value)}
                placeholder="RESET"
                className="w-full rounded-md border border-white/[0.08] bg-[#18181b] px-3 py-2 text-xs text-center font-medium text-rose-200 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeInputText('');
                }}
                className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleExecuteEmergencyPurge}
                disabled={purgeInputText.trim().toUpperCase() !== 'RESET'}
                className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.purgeConfirmButton}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={privacyPolicyOpen}
        onClose={() => setPrivacyPolicyOpen(false)}
        lang={lang}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={termsOfServiceOpen}
        onClose={() => setTermsOfServiceOpen(false)}
        lang={lang}
      />

      {/* Academic Disclaimer Modal */}
      <AcademicDisclaimerModal
        isOpen={academicDisclaimerOpen}
        onClose={() => setAcademicDisclaimerOpen(false)}
        lang={lang}
      />
    </div>
  );
};
