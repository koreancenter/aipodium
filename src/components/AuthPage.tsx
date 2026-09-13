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
  RotateCcw
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

  // 1. Direct Workspace Entry (Scenario A - No PIN set)
  const handleOpenWorkspaceDirectly = () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = authService.getCurrentUser() || authService.loginAsGuest('Research Scholar');
      onAuthenticated(user);
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'KR' ? '연구 워크스페이스를 여는데 실패했습니다.' : 'Failed to open research workspace.'));
      setIsLoading(false);
    }
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

      setStoredPinHash(pendingPinHash);
      setStoredRecoveryHash(recHash);
      setGeneratedRecoveryKey(null);
      setSuccessMsg(t.pinConfiguredSuccess);

      setTimeout(() => {
        const user = authService.getCurrentUser() || authService.loginAsGuest('Research Scholar');
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
          const user = authService.getCurrentUser() || authService.loginAsGuest('Research Scholar');
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
    <div className="w-screen h-screen min-h-screen overflow-hidden flex flex-col lg:flex-row bg-[#0b1120] text-slate-100 font-['Plus_Jakarta_Sans',Inter,-apple-system,BlinkMacSystemFont,sans-serif] antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. LEFT 50%: Brand & Academic Architecture Overview */}
      <div className="relative hidden lg:flex lg:w-1/2 h-full flex-col justify-between bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e293b] p-8 xl:p-14 text-white overflow-hidden select-none border-r border-slate-800/80">
        {/* Subtle Ambient Academic Atmosphere */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-950/40">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">
                  AI Podium
                </span>
                <span className="px-2 py-0.5 rounded-md text-[0.6875rem] font-semibold bg-indigo-500/15 border border-indigo-400/25 text-indigo-300">
                  {t.betaTag}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-normal leading-relaxed">
                {t.subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Architectural Value Pillars for Researchers */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div>
            <h1 className="text-2xl xl:text-3xl font-bold tracking-tight leading-snug text-white mb-3">
              {t.heroTitle}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {t.heroDesc}
            </p>
          </div>

          {/* Academic Value Cards */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 backdrop-blur-xs shadow-xs transition hover:border-slate-700/80">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100">{t.card1Title}</div>
                <div className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  {t.card1Desc}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 backdrop-blur-xs shadow-xs transition hover:border-slate-700/80">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100">{t.card2Title}</div>
                <div className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  {t.card2Desc}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 backdrop-blur-xs shadow-xs transition hover:border-slate-700/80">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100">{t.card3Title}</div>
                <div className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  {t.card3Desc}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Academic Policies & Standards */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
          <span className="text-xs">{t.copyright}</span>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => openPolicy('privacy')}
              className="hover:text-slate-200 transition cursor-pointer"
            >
              {t.privacyPolicy}
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => openPolicy('terms')}
              className="hover:text-slate-200 transition cursor-pointer"
            >
              {t.termsOfUse}
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => openPolicy('disclaimer')}
              className="text-amber-400/90 hover:text-amber-300 font-medium transition cursor-pointer"
            >
              {t.academicDisclaimer}
            </button>
          </div>
        </div>
      </div>

      {/* 2. RIGHT 50%: Academic Onboarding & Security Gateway */}
      <div className="w-full lg:w-1/2 h-full min-h-screen lg:min-h-full flex flex-col justify-between items-center bg-[#0b1120] px-6 sm:px-10 lg:px-14 xl:px-20 py-8 lg:py-10 overflow-y-auto">
        {/* Top Status Header with [KR] [ENG] Language Toggle */}
        <div className="w-full max-w-[440px] flex items-center justify-between text-xs text-slate-400 mb-4">
          <div className="flex items-center gap-2">
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-xs">
                <GraduationCap className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-base font-bold text-slate-100">AI Podium</span>
            </div>
          </div>

          {/* [KR] [ENG] Toggle Button (1 function 1 button) */}
          <div
            className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-700/80 p-0.5 shadow-xs"
            role="group"
            aria-label="Language selector"
          >
            <button
              type="button"
              onClick={() => handleSetLang('KR')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                lang === 'KR'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-pressed={lang === 'KR'}
              title="한국어"
            >
              KR
            </button>
            <button
              type="button"
              onClick={() => handleSetLang('ENG')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                lang === 'ENG'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-pressed={lang === 'ENG'}
              title="English"
            >
              ENG
            </button>
          </div>
        </div>

        {/* Center: Main Academic Onboarding & Lock Controller */}
        <div className="w-full max-w-[440px] my-auto py-4">
          {/* Status Feedback Banners */}
          {errorMsg && (
            <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Rate Limit Lockout Banner */}
          {lockoutState.isLockedOut && (
            <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 text-xs text-amber-300 flex items-center justify-between animate-in fade-in duration-150">
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
            <div className="p-5 rounded-xl bg-slate-900 border border-indigo-500/50 shadow-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <LifeBuoy className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{t.recoveryKeyTitle}</h3>
                  <p className="text-xs text-slate-400">{t.recoveryKeySubtitle}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/80 border border-indigo-500/30 text-xs text-slate-300 leading-relaxed">
                <strong className="block font-semibold text-indigo-200 mb-1">{t.recoveryKeyNoticeHeader}</strong>
                {t.recoveryKeyNoticeBody}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-700/80 p-3.5 font-mono text-sm tracking-widest text-indigo-300 select-all font-medium">
                <span>{generatedRecoveryKey}</span>
                <button
                  type="button"
                  onClick={handleCopyRecoveryKey}
                  title={t.copyRecoveryKeyTitle}
                  aria-label={t.copyRecoveryKeyTitle}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {hasCopiedRecoveryKey ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmedSavedRecoveryKey}
                  onChange={(e) => setConfirmedSavedRecoveryKey(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
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
                className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-950/40 cursor-pointer disabled:opacity-50"
              >
                <Rocket className="w-4 h-4 shrink-0" />
                <span>{t.openWorkspaceAfterRecovery}</span>
              </button>
            </div>
          )}

          {/* Returning User Locked State (Scenario B) */}
          {!generatedRecoveryKey && hasPinConfigured && !showRecoveryForm && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-md shadow-indigo-950/30">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                  {t.unlockTitle}
                </h2>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  {t.unlockDesc}
                </p>
              </div>

              {/* Local Vault Status Badge */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-500/30 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-200 text-xs truncate">
                    {lang === 'KR' ? '로컬 기기 암호화 워크스페이스' : 'Local Encrypted Workspace'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate font-mono">
                    {lang === 'KR' ? '100% 온디바이스 저장소 (AES-256)' : '100% On-Device Storage (AES-256)'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleUnlockWorkspace} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="unlock-pin" className="block text-xs font-semibold text-slate-300">
                    {t.pinLabel}
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-3 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-xs">
                    <KeyRound className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
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
                      className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                      tabIndex={-1}
                      title={showUnlockPassword ? t.hidePassword : t.showPassword}
                      aria-label={showUnlockPassword ? t.hidePassword : t.showPassword}
                      className="text-slate-400 hover:text-slate-200 transition ml-2 cursor-pointer"
                    >
                      {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || lockoutState.isLockedOut}
                  title={t.unlockWorkspace}
                  className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-950/40 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="h-4 w-4 shrink-0" />
                  <span>{t.unlockWorkspace}</span>
                </button>
              </form>

              {/* Security Diagnostics & Recovery Options */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 text-xs text-slate-400 leading-relaxed shadow-xs">
                <div className="flex items-center justify-between text-indigo-300 font-medium">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>{t.deviceEncryptionActive}</span>
                  </div>
                </div>
                <p className="text-slate-400">
                  {t.notesLockedInMemory}
                </p>
                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoveryForm(true);
                      setErrorMsg(null);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    {t.forgotPinPrompt}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPurgeModal(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    {t.resetLockPrompt}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recovery Key Verification Form */}
          {!generatedRecoveryKey && hasPinConfigured && showRecoveryForm && (
            <div className="space-y-4 p-5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
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
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!isRecoveryKeyVerified ? (
                <form onSubmit={handleVerifyRecoveryKey} className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
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
                    className="w-full font-mono text-center tracking-widest text-xs rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-indigo-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    title={t.verifyRecoveryKeyButton}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
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
                    className="w-full text-xs rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
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
                    className="w-full text-xs rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    title={t.saveNewPinButton}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t.saveNewPinButton}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* First-time User / No PIN Set (Scenario A - Right Panel Redesign) */}
          {!generatedRecoveryKey && !hasPinConfigured && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 mb-4 shadow-md shadow-indigo-950/30">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                  {t.welcomeTitle}
                </h2>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {t.welcomeDesc}
                </p>
              </div>

              {!showSetPinForm ? (
                <div className="space-y-3.5">
                  {/* Primary Action: Open Research Workspace */}
                  <button
                    type="button"
                    onClick={handleOpenWorkspaceDirectly}
                    disabled={isLoading}
                    title={t.openWorkspace}
                    className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-950/40 hover:shadow-indigo-900/50 cursor-pointer disabled:opacity-60"
                  >
                    <Rocket className="h-4 w-4 shrink-0 text-white" />
                    <span>{t.openWorkspace}</span>
                  </button>

                  {/* Secondary Action: Enable Workspace PIN Lock */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSetPinForm(true);
                      setErrorMsg(null);
                    }}
                    disabled={isLoading}
                    title={t.enablePinLock}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{t.enablePinLock}</span>
                  </button>

                  {/* Academic Privacy Guarantee Card */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs text-slate-400 leading-relaxed shadow-xs">
                    <div className="flex items-center gap-2 text-slate-200 font-medium">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{t.academicConfidentialityTitle}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {t.academicConfidentialityDesc}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleStageMasterPin} className="space-y-4 p-5 rounded-xl bg-slate-900 border border-slate-700 shadow-xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-400" />
                      <span>{t.configurePinTitle}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSetPinForm(false)}
                      title={t.cancel}
                      aria-label={t.cancel}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="new-pin" className="block text-xs font-semibold text-slate-300">
                      {t.newPinLabel}
                    </label>
                    <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 transition-all focus-within:border-indigo-500">
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
                        className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPinPassword(!showNewPinPassword)}
                        tabIndex={-1}
                        title={showNewPinPassword ? t.hidePassword : t.showPassword}
                        aria-label={showNewPinPassword ? t.hidePassword : t.showPassword}
                        className="text-slate-400 hover:text-slate-200 transition ml-2 cursor-pointer"
                      >
                        {showNewPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirm-new-pin" className="block text-xs font-semibold text-slate-300">
                      {t.confirmPinLabel}
                    </label>
                    <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 transition-all focus-within:border-indigo-500">
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
                        className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    title={t.savePinAndGenKey}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md cursor-pointer disabled:opacity-60 mt-3"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{t.savePinAndGenKey}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Bottom Helper Footer: Simple Badges for Academic Users */}
        <div className="w-full max-w-[440px] pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>{t.offlineReady}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{t.encryptedStorage}</span>
          </div>
        </div>
      </div>

      {/* Emergency Security Reset Confirmation Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-rose-500/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">{t.purgeModalTitle}</h3>
                <p className="text-xs text-slate-400">{t.purgeModalSubtitle}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {t.purgeModalDesc}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">
                {t.purgeConfirmPrompt}{' '}
                <span className="font-semibold text-rose-400">RESET</span>
              </label>
              <input
                type="text"
                value={purgeInputText}
                onChange={(e) => setPurgeInputText(e.target.value)}
                placeholder="RESET"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-center font-medium text-rose-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeInputText('');
                }}
                title={t.cancel}
                aria-label={t.cancel}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleExecuteEmergencyPurge}
                disabled={purgeInputText.trim().toUpperCase() !== 'RESET'}
                title={t.purgeConfirmButton}
                aria-label={t.purgeConfirmButton}
                className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" />
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
