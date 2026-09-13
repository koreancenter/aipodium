import React from 'react';
import { X, ShieldAlert, FileText, Lock, Check } from 'lucide-react';

export type PolicyType = 'privacy' | 'terms' | 'disclaimer';

export interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PolicyType;
  lang?: 'KR' | 'ENG';
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'disclaimer',
  lang = 'KR'
}) => {
  const [activeTab, setActiveTab] = React.useState<PolicyType>(initialTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const isKr = lang === 'KR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#0f172a] border border-slate-700/60 rounded-xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[85vh] overflow-hidden text-slate-100 font-sans"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0b1120] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                {isKr ? 'AI Podium 정책 및 학술 면책 고지' : 'AI Podium Policies & Academic Disclaimers'}
              </h2>
              <p className="text-xs text-slate-400">
                {isKr ? '로컬 중심 아키텍처 및 프라이버시 기준' : 'Local-First Architecture and Privacy Standards'}
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-2.5 bg-[#0b1120] border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('disclaimer')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-lg transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'disclaimer'
                ? 'border-indigo-500 text-indigo-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>{isKr ? '학술 면책 고지' : 'Disclaimer'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-lg transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-indigo-500 text-indigo-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isKr ? '개인정보 처리방침' : 'Privacy Policy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-lg transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'terms'
                ? 'border-indigo-500 text-indigo-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>{isKr ? '이용약관' : 'Terms of Use'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-300 leading-relaxed bg-[#0f172a]">
          {activeTab === 'disclaimer' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
                <strong>{isKr ? 'AI Podium 학술 베타 서비스 이용 및 법적 면책 고지:' : 'Academic & Beta Disclaimer:'}</strong>{' '}
                {isKr
                  ? 'AI Podium은 100% Local-First 연구 워크스페이스입니다. 데이터 보관, AI 모델 생성물의 학술적 검증, API 과금 및 베타 서비스 이용에 관한 중요 정책을 확인하세요.'
                  : 'AI Podium operates on a 100% Local-First architecture. Please review our core policies regarding local data ownership, AI generation verification, API billing, and beta release terms.'}
              </div>

              {/* Section 1: Local Data Loss Policy */}
              <section className="space-y-1.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="text-indigo-400 font-bold">1.</span>
                  {isKr ? '데이터 보관 및 백업 책임' : 'Local Data Ownership & Backup'}
                </h3>
                <p className="text-slate-300 leading-relaxed pl-4">
                  {isKr
                    ? 'AI Podium은 100% Local-First 응용 프로그램으로, 사용자의 모든 문서, 노트 및 대화 기록은 운영자 서버가 아닌 사용자의 브라우저 로컬 저장소(IndexedDB)에만 저장됩니다. 따라서 브라우저 쿠키/데이터 삭제, 기기 분실, 마스터 PIN 및 복구 키 분실로 인한 데이터 손실 시 당사는 이를 복구할 수 없으며 이에 대한 어떠한 법적 책임도 지지 않습니다. 데이터의 주기적인 외부 백업 책임은 사용자에게 있습니다.'
                    : "AI Podium operates on a 100% Local-First architecture. All research drafts, notes, and datasets reside strictly within your browser's local sandbox (IndexedDB). AI Podium holds no central server backups and is not liable for data loss caused by browser data clearing, hardware failure, or lost access credentials (PIN / Recovery Keys). Users are strongly advised to maintain regular local backups."}
                </p>
              </section>

              {/* Section 2: AI Accuracy & Hallucination Disclaimer */}
              <section className="space-y-1.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="text-sky-400 font-bold">2.</span>
                  {isKr ? 'AI 답변의 학술적 검증' : 'Academic Verification & AI Accuracy'}
                </h3>
                <p className="text-slate-300 leading-relaxed pl-4">
                  {isKr
                    ? '본 서비스에서 제공하는 AI 기능은 외부 LLM API를 기반으로 동작하며, 논문 인용, 요약, 데이터 분석 결과에 기술적 오류나 환각 현상(Hallucination)이 포함될 수 있습니다. AI가 생성한 모든 결과물은 연구자의 책임하에 반드시 재검증되어야 하며, 이를 논문, 보고서, 학술 발표 등에 활용함으로써 발생하는 학술적·법적 문제에 대해 당사는 책임을 지지 않습니다.'
                    : 'AI-assisted syntheses, citations, and summaries may contain inaccuracies or hallucinations. Researchers and users assume full responsibility for verifying all AI-generated content before citing or incorporating it into manuscripts, theses, or publication materials.'}
                </p>
              </section>

              {/* Section 3: BYOK & API Billing Responsibility */}
              <section className="space-y-1.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">3.</span>
                  {isKr ? 'API 키 관리 및 과금' : 'BYOK & API Costs'}
                </h3>
                <p className="text-slate-300 leading-relaxed pl-4">
                  {isKr
                    ? '사용자가 직접 등록한 API Key(BYOK)는 암호화되어 사용자 로컬에만 보관됩니다. API 호출로 인해 발생하는 각 제공사(OpenAI, Google 등)의 이용 요금 및 키 유출 관리 책임은 전적으로 사용자 본인에게 있습니다.'
                    : 'Users are solely responsible for managing their own API keys and monitoring associated usage costs charged by third-party AI providers (OpenAI, Google Gemini, etc.).'}
                </p>
              </section>

              {/* Section 4: Beta Version Notice */}
              <section className="space-y-1.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="text-purple-400 font-bold">4.</span>
                  {isKr ? '베타 서비스 사양 변경' : 'Beta Version Notice'}
                </h3>
                <p className="text-slate-300 leading-relaxed pl-4">
                  {isKr
                    ? '본 소프트웨어는 현재 Beta v1.0 단계로, 사전 고지 없이 일부 기능이 변경되거나 업데이트될 수 있습니다.'
                    : 'This software is currently in Beta v1.0. Specific features or specifications may be modified or updated without prior notice.'}
                </p>
              </section>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-xs leading-relaxed">
                <strong>{isKr ? '설계 단계부터 보장되는 프라이버시:' : 'Privacy by Design:'}</strong>{' '}
                {isKr
                  ? '작성된 연구 노트, 문헌 매트릭스 및 원고 초안은 100% 브라우저 격리 영역에만 유지됩니다. 어떠한 개인 정보나 논문 초안도 외부 독점 서버로 동기화되지 않습니다.'
                  : "100% of your notes, literature matrices, and drafts stay within your browser's private sandbox. No personal information or research manuscripts are ever synced to external proprietary servers."}
              </div>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-100">
                  {isKr ? '1. 정보 구조' : '1. Information Architecture'}
                </h3>
                <p>
                  {isKr
                    ? 'AI Podium은 사용자 행동을 추적하거나 프로필을 생성하지 않습니다. 워크스페이스 상태, 마크다운 파일 및 PIN 정보는 로컬 브라우저 저장소에만 안전하게 위치합니다.'
                    : 'AI Podium does not track user behavior or build user profiles. Workspace states, markdown files, and PIN credentials reside solely within your browser IndexedDB with optional AES-256 vault encryption.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-100">
                  {isKr ? '2. 로컬 데이터 격리' : '2. Local Data Isolation'}
                </h3>
                <p>
                  {isKr
                    ? '브라우저 샌드박스 격리를 통해 다른 웹사이트가 사용자의 연구 데이터에 접근할 수 없습니다. PIN 잠금이 활성화된 경우 세션이 잠기거나 닫히면 메모리에서 보안 키가 즉시 소멸됩니다.'
                    : 'Browser sandbox isolation prevents other websites from accessing your research data. When PIN lock is enabled, key materials are wiped from active memory when your session is locked or closed.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-100">
                  {isKr ? '3. 타사 AI 모델 추론' : '3. Third-Party AI Inference'}
                </h3>
                <p>
                  {isKr
                    ? '사용자가 요약이나 작성을 위해 직접 전송한 프롬프트 구문만이 선택된 모델 제공자에게 전달되며, 어떠한 백그라운드 추적 데이터도 결합되지 않습니다.'
                    : 'Only the prompt snippets you actively send for synthesis are submitted to the chosen model provider. No telemetry or ambient tracking data is attached.'}
                </p>
              </section>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3.5">
              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-100">
                  {isKr ? '1. 교육 및 학술 연구 목적' : '1. Educational & Research Purpose'}
                </h3>
                <p>
                  {isKr
                    ? 'AI Podium은 학술 연구 프로토콜과 비밀유지 규정을 준수하며 학술 연구, 문헌 합성 및 구조화된 노트 작성을 돕기 위해 제공됩니다.'
                    : 'AI Podium is provided to empower academic investigation, literature synthesis, and structured note-taking in full compliance with research privacy and confidentiality protocols.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-100">
                  {isKr ? '2. 올바른 이용 규정' : '2. Acceptable Use'}
                </h3>
                <p>
                  {isKr
                    ? '사용자는 학문적 진실성 기준, 기관 생명윤리위원회(IRB) 비밀유지 규칙 및 모델 제공업체의 서비스 약관을 준수하여 워크스페이스를 사용할 것에 동의합니다.'
                    : 'Users agree to use the workspace in accordance with academic honesty standards, institutional review board (IRB) confidentiality rules, and the service terms of third-party model providers.'}
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-100">
                  {isKr ? '3. 상시 가용성' : '3. Continuous Availability'}
                </h3>
                <p>
                  {isKr
                    ? '본 애플리케이션은 클라이언트 기기에서 직접 실행되므로 서버 중단이나 네트워크 장애 없이 오프라인에서도 상시 이용할 수 있습니다.'
                    : 'Because the application operates client-side, the workspace remains accessible offline anytime without server downtime or network dependencies.'}
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0b1120] border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {isKr ? '최신 업데이트: 2026' : 'Updated: Academic Edition 2026'}
          </span>
          <button
            type="button"
            onClick={onClose}
            title={isKr ? '[ 이해하였으며 동의합니다 ]' : '[ I Understand & Accept ]'}
            aria-label={isKr ? '[ 이해하였으며 동의합니다 ]' : '[ I Understand & Accept ]'}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>{isKr ? '[ 이해하였으며 동의합니다 ]' : '[ I Understand & Accept ]'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
