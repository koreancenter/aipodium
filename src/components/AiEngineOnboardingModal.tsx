import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Server, Cpu, Check } from 'lucide-react';
import {
  saveAiEnginePreference,
  AiEngineChoice,
  verifyGeminiApiKey,
  verifyGeminiApiKeyDetailed
} from '../services/ai';

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
  onStartWebLlmDownload
}) => {
  const [selectedOption, setSelectedOption] = useState<AiEngineChoice>('cloud');
  const [apiKey, setApiKey] = useState<string>(initialApiKey);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const [isPingingOllama, setIsPingingOllama] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<'success' | 'failed' | null>(null);
  const [isVerifyingCloudKey, setIsVerifyingCloudKey] = useState<boolean>(false);
  const [cloudKeyResult, setCloudKeyResult] = useState<'success' | 'failed' | null>(null);
  const [cloudKeyError, setCloudKeyError] = useState<string>('');

  if (!isOpen) return null;

  const handleVerifyCloudKey = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const rawKey = apiKey;
    const sanitizedKey = rawKey.trim();
    if (!sanitizedKey) {
      setCloudKeyResult('failed');
      setCloudKeyError('API 키를 입력해주세요.');
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
        const errorMsg = diag.errorMessage || (diag.statusCode ? `HTTP ${diag.statusCode}` : 'API 키 검증 실패');
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
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        setPingResult('success');
      } else {
        setPingResult('failed');
      }
    } catch {
      setPingResult('failed');
    } finally {
      setIsPingingOllama(false);
    }
  };

  const handleSubmit = () => {
    const rawKey = apiKey;
    const sanitizedKey = rawKey.trim();

    // 1. Save engine preference to aiEngineCore configuration
    saveAiEnginePreference({
      engineType: selectedOption,
      selectedVendor: selectedOption === 'cloud' ? 'gemini' : undefined,
      apiKey: selectedOption === 'cloud' && sanitizedKey ? sanitizedKey : undefined,
      ollamaEndpoint: selectedOption === 'ollama' ? 'http://localhost:11434' : undefined
    });

    // 2. Set persistent storage flag
    try {
      if (dontShowAgain) {
        localStorage.setItem('aipodium_engine_dont_show', 'true');
      }
    } catch {}

    // 3. Trigger WebLLM download if WebLLM was chosen and not yet loaded
    if (selectedOption === 'webllm' && onStartWebLlmDownload) {
      if (!webllmProgress?.isReady && !webllmProgress?.isLoading) {
        onStartWebLlmDownload();
      }
    }

    // 4. Inform parent component
    if (onComplete) {
      onComplete(selectedOption, sanitizedKey);
    }

    // 5. Smoothly close modal
    onClose();
  };

  const handleSkip = () => {
    try {
      if (dontShowAgain) {
        localStorage.setItem('aipodium_engine_dont_show', 'true');
      }
    } catch {}
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="max-w-md w-full bg-[#121214] border border-white/10 rounded-xl p-5 shadow-2xl flex flex-col justify-between min-h-[440px] text-left"
        >
          <div>
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  AI 엔진 선택
                </h2>
              </div>
              <p className="text-xs text-zinc-400">
                작업 환경에 맞는 AI 모델 엔진을 선택합니다.
              </p>
            </div>

            {/* 3 Flat Selection Options (Fixed Compact Height) */}
            <div className="space-y-2 mb-3">
              {/* Option 1: 클라우드 API (Gemini / OpenAI) */}
              <div
                onClick={() => setSelectedOption('cloud')}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  selectedOption === 'cloud'
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : 'border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className={`w-4 h-4 shrink-0 ${selectedOption === 'cloud' ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-200 truncate">
                      클라우드 API (Gemini / OpenAI)
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      보유한 API 키 연결
                    </div>
                  </div>
                </div>
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                    selectedOption === 'cloud'
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-white/20 bg-transparent'
                  }`}
                >
                  {selectedOption === 'cloud' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>

              {/* Option 2: 로컬 AI (Ollama) */}
              <div
                onClick={() => setSelectedOption('ollama')}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  selectedOption === 'ollama'
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : 'border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Server className={`w-4 h-4 shrink-0 ${selectedOption === 'ollama' ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-200 truncate">
                      로컬 AI (Ollama)
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      localhost:11434 직접 연결
                    </div>
                  </div>
                </div>
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                    selectedOption === 'ollama'
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-white/20 bg-transparent'
                  }`}
                >
                  {selectedOption === 'ollama' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>

              {/* Option 3: 브라우저 내장 (WebLLM) */}
              <div
                onClick={() => setSelectedOption('webllm')}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  selectedOption === 'webllm'
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : 'border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Cpu className={`w-4 h-4 shrink-0 ${selectedOption === 'webllm' ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-200 truncate">
                      브라우저 내장 (WebLLM)
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      무설치 브라우저 WebGPU 즉시 실행
                    </div>
                  </div>
                </div>
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                    selectedOption === 'webllm'
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-white/20 bg-transparent'
                  }`}
                >
                  {selectedOption === 'webllm' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* Dedicated Fixed Height Configuration Slot */}
            <div className="min-h-[56px] h-[56px] flex items-center mb-4">
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
                    placeholder="Google Gemini API 키 입력 (선택)"
                    className="w-full bg-[#18181b] border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500/60"
                  />
                  {apiKey.trim() && (
                    <button
                      type="button"
                      onClick={handleVerifyCloudKey}
                      disabled={isVerifyingCloudKey}
                      className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-zinc-300 transition shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      title={cloudKeyError || undefined}
                    >
                      {isVerifyingCloudKey ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          <span>확인 중</span>
                        </>
                      ) : cloudKeyResult === 'success' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-emerald-400">연결 성공</span>
                        </>
                      ) : cloudKeyResult === 'failed' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span className="text-rose-400" title={cloudKeyError}>연결 실패</span>
                        </>
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
                    className="flex-1 bg-[#18181b] border border-white/10 rounded-md px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={handlePingOllama}
                    disabled={isPingingOllama}
                    className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-zinc-300 transition shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isPingingOllama ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span>확인 중</span>
                      </>
                    ) : pingResult === 'success' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400">연결 성공</span>
                      </>
                    ) : pingResult === 'failed' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span className="text-rose-400">연결 실패</span>
                      </>
                    ) : (
                      <span>연결 확인</span>
                    )}
                  </button>
                </div>
              )}

              {selectedOption === 'webllm' && (
                webllmProgress?.isLoading ? (
                  <div className="text-xs text-zinc-400 bg-white/[0.02] border border-white/5 rounded-md px-3 py-2 w-full space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate">{webllmProgress.progressText || '가중치 다운로드 중...'}</span>
                      <span className="font-mono text-zinc-300 shrink-0">{webllmProgress.progressPercent}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-200"
                        style={{ width: `${webllmProgress.progressPercent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 bg-white/[0.02] border border-white/5 rounded-md px-3 py-2 w-full flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">✨ 별도 설정 없이 브라우저 WebGPU를 통해 기기에서 즉시 실행됩니다.</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded border border-white/20 bg-[#09090b] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors">
                다시 표시하지 않음
              </span>
            </label>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSkip}
                className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-md font-medium"
              >
                건너뛰기
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                설정 저장 후 시작하기
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
