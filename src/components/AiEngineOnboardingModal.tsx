import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Server, Cpu, Key, Check } from 'lucide-react';
import { saveAiEnginePreference, AiEngineChoice } from '../services/aiEngineCore';

export interface AiEngineOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (engine: AiEngineChoice, apiKey?: string) => void;
  initialApiKey?: string;
}

export const AiEngineOnboardingModal: React.FC<AiEngineOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialApiKey = ''
}) => {
  const [selectedOption, setSelectedOption] = useState<AiEngineChoice>('cloud');
  const [apiKey, setApiKey] = useState<string>(initialApiKey);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    // 1. Save engine preference to aiEngineCore.ts configuration
    saveAiEnginePreference({
      engineType: selectedOption,
      selectedVendor: selectedOption === 'cloud' ? 'gemini' : undefined,
      apiKey: selectedOption === 'cloud' && apiKey.trim() ? apiKey.trim() : undefined,
      ollamaEndpoint: selectedOption === 'ollama' ? 'http://localhost:11434' : undefined
    });

    // 2. Set persistent storage flag
    try {
      localStorage.setItem('aipodium_engine_onboarding_done', 'true');
      if (dontShowAgain) {
        localStorage.setItem('aipodium_engine_dont_show', 'true');
      }
    } catch {}

    // 3. Inform parent component
    if (onComplete) {
      onComplete(selectedOption, apiKey.trim());
    }

    // 4. Smoothly close modal
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
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-[#16181d]/95 backdrop-blur-md border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl text-left"
        >
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                AI 엔진 구동 방식을 선택하세요
              </h2>
            </div>
            <p className="text-xs text-zinc-400 pl-10.5 leading-relaxed">
              작업 환경에 맞는 AI 모델 엔진을 선택합니다. 언제든 설정에서 변경할 수 있습니다.
            </p>
          </div>

          {/* 3 Flat Selection Options */}
          <div className="space-y-2.5">
            {/* Option A: 클라우드 API (BYOK) */}
            <div
              onClick={() => setSelectedOption('cloud')}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedOption === 'cloud'
                  ? 'bg-indigo-500/10 border-indigo-500/50'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedOption === 'cloud'
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white flex items-center gap-1.5">
                      <span>클라우드 API (BYOK)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Gemini, OpenAI, Claude 키를 직접 연결하여 고성능 모델 사용.
                    </p>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                    selectedOption === 'cloud'
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-white/20 bg-transparent'
                  }`}
                >
                  {selectedOption === 'cloud' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>

              {/* Expanded Flat Input for Gemini / API Key */}
              {selectedOption === 'cloud' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 pt-3 border-t border-white/[0.08] animate-in fade-in duration-150"
                >
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-indigo-400" />
                    <span>Google Gemini API 키 (선택 사항)</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AI Studio API 키 입력 (미입력 시 기본 체험 모델 적용)"
                    className="w-full bg-[#09090b] border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 rounded-md px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none transition font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1.5">
                    입력된 키는 브라우저 내부 보안 영역에 암호화 보관되며 외부 서버로 전송되지 않습니다.
                  </p>
                </div>
              )}
            </div>

            {/* Option B: 로컬 AI (Ollama) */}
            <div
              onClick={() => setSelectedOption('ollama')}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedOption === 'ollama'
                  ? 'bg-indigo-500/10 border-indigo-500/50'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedOption === 'ollama'
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white flex items-center gap-1.5">
                      <span>로컬 AI (Ollama)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      내 PC에서 실행 중인 Ollama 모델에 직접 연결 (완전한 오프라인/프라이버시).
                    </p>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                    selectedOption === 'ollama'
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-white/20 bg-transparent'
                  }`}
                >
                  {selectedOption === 'ollama' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* Option C: 브라우저 내장 (WebLLM) */}
            <div
              onClick={() => setSelectedOption('webllm')}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedOption === 'webllm'
                  ? 'bg-indigo-500/10 border-indigo-500/50'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedOption === 'webllm'
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white flex items-center gap-1.5">
                      <span>브라우저 내장 (WebLLM)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      API 키나 별도 프로그램 없이 WebGPU로 기기에서 즉시 실행.
                    </p>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                    selectedOption === 'webllm'
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-white/20 bg-transparent'
                  }`}
                >
                  {selectedOption === 'webllm' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
            {/* Left: Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded border border-white/20 bg-[#09090b] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors">
                다음 로그인 시 다시 표시하지 않음
              </span>
            </label>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-md font-medium"
              >
                건너뛰기
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm"
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
