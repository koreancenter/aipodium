import React from 'react';
import { X, ShieldAlert, HardDrive, Brain, KeyRound, Info, Check } from 'lucide-react';

export interface AcademicDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'KR' | 'ENG';
}

export const AcademicDisclaimerModal: React.FC<AcademicDisclaimerModalProps> = ({
  isOpen,
  onClose,
  lang = 'KR',
}) => {
  if (!isOpen) return null;

  const isKr = lang === 'KR';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[88vh] overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0b1120] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="disclaimer-title" className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                {isKr ? 'AI Podium 학술 베타 서비스 이용 및 법적 면책 고지' : 'Academic & Beta Disclaimer'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                aipodium.net · {isKr ? '로컬 우선 학술 지식 플랫폼' : 'Local-First Academic Knowledge Platform'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title={isKr ? '닫기' : 'Close'}
            aria-label={isKr ? '닫기' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs text-slate-300 leading-relaxed bg-[#0f172a]">
          {/* Top Legal Notice Banner */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-300 font-semibold mb-0.5">
                {isKr ? '학술 연구자 및 사용자 필독 안내:' : 'Important Notice for Academic Researchers:'}
              </strong>
              {isKr
                ? 'AI Podium은 사용자의 로컬 컴퓨터에서 구동되는 독립형 학술 도구입니다. 데이터의 보관, AI 모델의 결과 검증 및 사용 요금에 관한 아래의 핵심 정책을 반드시 확인하시기 바랍니다.'
                : 'AI Podium operates client-side as an independent academic tool. Please review the core policies regarding local data ownership, AI generation verification, and billing responsibility.'}
            </div>
          </div>

          {/* Core Section 1: Local Data Loss Policy */}
          <section className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2 hover:border-slate-700/80 transition">
            <div className="flex items-center gap-2 text-slate-100 font-semibold">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <HardDrive className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                {isKr ? '1. 데이터 보관 및 백업 책임' : '1. Local Data Ownership & Backup'}
              </h3>
            </div>
            <p className="text-slate-300 leading-relaxed pl-8">
              {isKr
                ? 'AI Podium은 100% Local-First 응용 프로그램으로, 사용자의 모든 문서, 노트 및 대화 기록은 운영자 서버가 아닌 사용자의 브라우저 로컬 저장소(IndexedDB)에만 저장됩니다. 따라서 브라우저 쿠키/데이터 삭제, 기기 분실, 마스터 PIN 및 복구 키 분실로 인한 데이터 손실 시 당사는 이를 복구할 수 없으며 이에 대한 어떠한 법적 책임도 지지 않습니다. 데이터의 주기적인 외부 백업 책임은 사용자에게 있습니다.'
                : 'AI Podium operates on a 100% Local-First architecture. All research drafts, notes, and datasets reside strictly within your browser\'s local sandbox (IndexedDB). AI Podium holds no central server backups and is not liable for data loss caused by browser data clearing, hardware failure, or lost access credentials (PIN / Recovery Keys). Users are strongly advised to maintain regular local backups.'}
            </p>
          </section>

          {/* Core Section 2: AI Accuracy & Hallucination Disclaimer */}
          <section className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2 hover:border-slate-700/80 transition">
            <div className="flex items-center gap-2 text-slate-100 font-semibold">
              <div className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                {isKr ? '2. AI 답변의 학술적 검증' : '2. Academic Verification & AI Accuracy'}
              </h3>
            </div>
            <p className="text-slate-300 leading-relaxed pl-8">
              {isKr
                ? '본 서비스에서 제공하는 AI 기능은 외부 LLM API를 기반으로 동작하며, 논문 인용, 요약, 데이터 분석 결과에 기술적 오류나 환각 현상(Hallucination)이 포함될 수 있습니다. AI가 생성한 모든 결과물은 연구자의 책임하에 반드시 재검증되어야 하며, 이를 논문, 보고서, 학술 발표 등에 활용함으로써 발생하는 학술적·법적 문제에 대해 당사는 책임을 지지 않습니다.'
                : 'AI-assisted syntheses, citations, and summaries may contain inaccuracies or hallucinations. Researchers and users assume full responsibility for verifying all AI-generated content before citing or incorporating it into manuscripts, theses, or publication materials.'}
            </p>
          </section>

          {/* Core Section 3: BYOK & API Billing Responsibility */}
          <section className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2 hover:border-slate-700/80 transition">
            <div className="flex items-center gap-2 text-slate-100 font-semibold">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                {isKr ? '3. API 키 관리 및 과금' : '3. BYOK & API Costs'}
              </h3>
            </div>
            <p className="text-slate-300 leading-relaxed pl-8">
              {isKr
                ? '사용자가 직접 등록한 API Key(BYOK)는 암호화되어 사용자 로컬에만 보관됩니다. API 호출로 인해 발생하는 각 제공사(OpenAI, Google 등)의 이용 요금 및 키 유출 관리 책임은 전적으로 사용자 본인에게 있습니다.'
                : 'Users are solely responsible for managing their own API keys and monitoring associated usage costs charged by third-party AI providers (OpenAI, Google Gemini, etc.).'}
            </p>
          </section>

          {/* Core Section 4: Beta Version Notice */}
          <section className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2 hover:border-slate-700/80 transition">
            <div className="flex items-center gap-2 text-slate-100 font-semibold">
              <div className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Info className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                {isKr ? '4. 베타 서비스 사양 변경' : '4. Beta Version Notice'}
              </h3>
            </div>
            <p className="text-slate-300 leading-relaxed pl-8">
              {isKr
                ? '본 소프트웨어는 현재 Beta v1.0 단계로, 사전 고지 없이 일부 기능이 변경되거나 업데이트될 수 있습니다.'
                : 'This software is currently in Beta v1.0. Specific features or specifications may be modified or updated without prior notice.'}
            </p>
          </section>
        </div>

        {/* Footer with Explicit [ I Understand & Accept ] Button */}
        <div className="px-5 py-3.5 bg-[#0b1120] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {isKr ? '최신 개정일: 2026년 9월 · Beta v1.0' : 'Last Updated: September 2026 · Beta v1.0'}
          </div>

          <button
            type="button"
            onClick={onClose}
            title={isKr ? '[ 이해하였으며 동의합니다 ]' : '[ I Understand & Accept ]'}
            aria-label={isKr ? '[ 이해하였으며 동의합니다 ]' : '[ I Understand & Accept ]'}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-950/40 cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{isKr ? '[ 이해하였으며 동의합니다 ]' : '[ I Understand & Accept ]'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
