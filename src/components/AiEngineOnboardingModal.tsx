import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import {
  saveAiEnginePreference,
  AiEngineChoice,
  verifyGeminiApiKeyDetailed,
  isValidGeminiKeyFormat,
} from '../services/aiPodiumIntegration';

export interface AiEngineOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (engine: AiEngineChoice, apiKey?: string) => void;
  initialApiKey?: string;
  webllmProgress?: {
    isSupported?: boolean;
    isLoading: boolean;
    isReady: boolean;
    progressText: string;
    progressPercent: number;
  };
  onStartWebLlmDownload?: () => void;
}

export const AiEngineOnboardingModal: React.FC<AiEngineOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialApiKey = '',
  webllmProgress,
  onStartWebLlmDownload,
}) => {
  const [selectedOption, setSelectedOption] = useState<AiEngineChoice>(() => {
    if (initialApiKey && initialApiKey.trim().length > 0) {
      return 'cloud';
    }
    return 'webllm';
  });

  const [apiKey, setApiKey] = useState<string>(initialApiKey);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const [isPingingOllama, setIsPingingOllama] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<'success' | 'failed' | null>(null);
  const [isVerifyingCloudKey, setIsVerifyingCloudKey] = useState<boolean>(false);
  const [cloudKeyResult, setCloudKeyResult] = useState<'success' | 'failed' | null>(null);
  const [cloudKeyError, setCloudKeyError] = useState<string>('');

  // Auto-detect fallback engine logic on modal open
  useEffect(() => {
    if (!isOpen) return;
    if (!initialApiKey || !initialApiKey.trim()) {
      fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1000) })
        .then((res) => {
          if (res.ok) {
            setPingResult('success');
          } else {
            setPingResult('failed');
            setSelectedOption('webllm');
          }
        })
        .catch(() => {
          setPingResult('failed');
          setSelectedOption('webllm');
        });
    }
  }, [isOpen, initialApiKey]);

  const handleSkip = useCallback(() => {
    try {
      if (dontShowAgain) {
        localStorage.setItem('aipodium_engine_dont_show', 'true');
      }
    } catch {}
    onClose();
  }, [dontShowAgain, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleSkip]);

  if (!isOpen) return null;

  // Selection only: previewing/selecting WebLLM never triggers background download or cache writes
  const handleSelectOption = (option: AiEngineChoice) => {
    setSelectedOption(option);
  };

  const handleVerifyCloudKey = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const sanitizedKey = apiKey.trim();
    if (!sanitizedKey) {
      setCloudKeyResult('failed');
      setCloudKeyError('API 키를 입력해주세요.');
      return;
    }

    if (!isValidGeminiKeyFormat(sanitizedKey)) {
      setCloudKeyResult('failed');
      setCloudKeyError('올바른 Gemini API 키 형식을 입력해 주세요.');
      return;
    }

    setIsVerifyingCloudKey(true);
    setCloudKeyResult(null);
    setCloudKeyError('');
    try {
      const diag = await verifyGeminiApiKeyDetailed(sanitizedKey);
      if (diag.valid) {
        setCloudKeyResult('success');
      } else {
        const errorMsg =
          diag.errorMessage || (diag.statusCode ? `HTTP ${diag.statusCode}` : 'API 키 검증 실패');
        console.error('Gemini Key verification failed:', errorMsg);
        setCloudKeyResult('failed');
        setCloudKeyError(errorMsg);
      }
    } catch (err: any) {
      console.error('Gemini Key verification failed:', err);
      setCloudKeyResult('failed');
      setCloudKeyError(`네트워크 오류: ${err?.message || '연결 실패'}`);
    } finally {
      setIsVerifyingCloudKey(false);
    }
  };

  const handlePingOllama = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPingingOllama(true);
    setPingResult(null);
    try {
      const res = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(2000),
      });
      setPingResult(res.ok ? 'success' : 'failed');
    } catch {
      setPingResult('failed');
    } finally {
      setIsPingingOllama(false);
    }
  };

  const handleSubmit = () => {
    const sanitizedKey = apiKey.trim();

    if (selectedOption === 'cloud' && sanitizedKey && !isValidGeminiKeyFormat(sanitizedKey)) {
      setCloudKeyResult('failed');
      setCloudKeyError('올바른 Gemini API 키 형식을 입력해 주세요.');
      return;
    }

    // 1. Save engine preference to aiEngineCore configuration
    saveAiEnginePreference({
      engineType: selectedOption,
      selectedVendor: selectedOption === 'cloud' ? 'gemini' : undefined,
      apiKey: selectedOption === 'cloud' && sanitizedKey ? sanitizedKey : undefined,
      ollamaEndpoint: selectedOption === 'ollama' ? 'http://localhost:11434' : undefined,
    });

    // 2. Set persistent storage flag
    try {
      if (dontShowAgain) {
        localStorage.setItem('aipodium_engine_dont_show', 'true');
      }
    } catch {}

    // 3. Trigger WebLLM download strictly on explicit submit when WebLLM is chosen
    if (selectedOption === 'webllm' && onStartWebLlmDownload) {
      if (!webllmProgress?.isReady && !webllmProgress?.isLoading) {
        onStartWebLlmDownload();
      }
    }

    // 4. Inform parent component
    if (onComplete) {
      onComplete(selectedOption, sanitizedKey);
    }

    // 5. Close modal
    onClose();
  };

  const options: Array<{
    id: AiEngineChoice;
    label: string;
    tag: string;
  }> = [
    { id: 'cloud', label: '클라우드 API · Gemini / OpenAI', tag: 'Cloud API' },
    { id: 'ollama', label: '로컬 AI · Ollama', tag: 'Local' },
    { id: 'webllm', label: '브라우저 내장 WebLLM', tag: 'WebGPU' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-[420px] w-full bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] flex flex-col justify-between text-left overflow-hidden before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-px before:pointer-events-none before:z-10 before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent"
        >
          <div>
            {/* Clean Editorial Header */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-semibold text-[var(--text-main)] tracking-tight">
                AI 엔진 선택
              </h2>
              <button
                type="button"
                onClick={handleSkip}
                className="p-1 -mr-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-main)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="닫기"
                aria-label="닫기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Borderless Unified Option List */}
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden mb-3">
              {options.map(({ id, label, tag }) => {
                const isSelected = selectedOption === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectOption(id)}
                    aria-pressed={isSelected}
                    className={`w-full h-11 px-3.5 flex items-center justify-between cursor-pointer transition-colors text-left ${
                      isSelected
                        ? 'bg-white/[0.05] text-[var(--text-main)]'
                        : 'text-[var(--text-secondary)] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                          isSelected
                            ? 'bg-[var(--accent-primary)] shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]'
                            : 'bg-white/15'
                        }`}
                      />
                      <span className="text-[13px] font-medium truncate">
                        {label}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--text-tertiary)] shrink-0 ml-2">
                      {tag}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Clean, Unboxed Fixed-Height Configuration Slot */}
            <div className="min-h-[52px] h-[52px] flex items-center">
              {selectedOption === 'cloud' && (
                <div className="flex gap-2 w-full">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (cloudKeyResult) {
                        setCloudKeyResult(null);
                        setCloudKeyError('');
                      }
                    }}
                    placeholder="Google Gemini API 키 입력"
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-[rgba(var(--accent-rgb),0.5)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors"
                  />
                  {apiKey.trim() && (
                    <button
                      type="button"
                      onClick={handleVerifyCloudKey}
                      disabled={isVerifyingCloudKey}
                      className="px-3 py-2 text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                      title={cloudKeyError || undefined}
                    >
                      {isVerifyingCloudKey ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-primary)]" />
                          <span>확인 중</span>
                        </>
                      ) : cloudKeyResult === 'success' ? (
                        <span className="text-emerald-400">연결 성공</span>
                      ) : cloudKeyResult === 'failed' ? (
                        <span className="text-rose-400" title={cloudKeyError}>
                          연결 실패
                        </span>
                      ) : (
                        <span>연결 확인</span>
                      )}
                    </button>
                  )}
                </div>
              )}

              {selectedOption === 'ollama' && (
                <div className="flex gap-2 w-full">
                  <input
                    defaultValue="http://localhost:11434"
                    readOnly
                    className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={handlePingOllama}
                    disabled={isPingingOllama}
                    className="px-3 py-2 text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {isPingingOllama ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-primary)]" />
                        <span>확인 중</span>
                      </>
                    ) : pingResult === 'success' ? (
                      <span className="text-emerald-400">연결 성공</span>
                    ) : pingResult === 'failed' ? (
                      <span className="text-rose-400">연결 실패</span>
                    ) : (
                      <span>연결 확인</span>
                    )}
                  </button>
                </div>
              )}

              {selectedOption === 'webllm' &&
                (webllmProgress?.isLoading ? (
                  <div className="w-full space-y-2 px-0.5">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                      <span className="truncate">
                        {webllmProgress.progressText || '가중치 다운로드 중...'}
                      </span>
                      <span className="font-mono tabular-nums text-[var(--text-main)] shrink-0 ml-2">
                        {webllmProgress.progressPercent}%
                      </span>
                    </div>
                    <div className="h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full w-full bg-[var(--accent-primary)] origin-left transition-transform duration-200 ease-out"
                        style={{
                          transform: `scaleX(${Math.max(
                            0.01,
                            (webllmProgress.progressPercent || 0) / 100
                          )})`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-0.5">
                    저장 후 시작을 누르면 브라우저 WebGPU 환경에 경량 모델이 설치됩니다.
                  </p>
                ))}
            </div>
          </div>

          {/* Refined Footer */}
          <div className="pt-4 mt-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded border border-white/20 bg-white/[0.03] accent-[var(--accent-primary)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[11.5px] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">
                다시 표시하지 않음
              </span>
            </label>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSkip}
                className="px-2.5 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-main)] transition-colors cursor-pointer rounded-lg font-medium"
              >
                건너뛰기
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="bg-[#F8FAFC] hover:bg-white text-[#09090B] px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1"
              >
                저장 후 시작
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
