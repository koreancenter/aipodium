import React from 'react';
import { X, FileText, Check, AlertTriangle } from 'lucide-react';

export interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'KR' | 'ENG';
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
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
      aria-labelledby="terms-title"
    >
      <div className="bg-[#1e202b] border border-[#2e3142] rounded-xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[86vh] overflow-hidden text-zinc-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#181a23] border-b border-[#2e3142]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="terms-title" className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight">
                {isKr ? 'AI Podium 서비스 이용약관' : 'AI Podium Terms of Service'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                aipodium.net · {isKr ? '이용 조건 및 면책 사항' : 'Service Conditions & Disclaimers'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title={isKr ? '닫기' : 'Close'}
            aria-label={isKr ? '닫기' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content - Flattened Clean Document Layout */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-zinc-300 leading-relaxed bg-[#1e202b]">
          {/* Terms Core Warning Banner */}
          <div className="p-3 rounded-md bg-amber-950/25 border border-amber-500/25 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-300 font-medium mb-0.5">
                {isKr ? '핵심 이용 규정 및 동의 안내' : 'Key Terms & Agreement Requirements'}
              </strong>
              <span className="text-zinc-300">
                {isKr
                  ? 'AI Podium은 서버를 두지 않는 독립 실행형 응용프로그램으로, 데이터를 자체 보관해야 하며 외부 연동 과금의 주체가 이용자 본인임을 동의한 후 이용이 가능합니다.'
                  : 'AI Podium is a standalone, serverless application. Utilization is conditional on accepting local-custody backup responsibilities and BYOK client-side subscription expenses.'}
              </span>
            </div>
          </div>

          {/* Clauses: Pure Flattened Document Sections */}
          <div className="space-y-5 pt-1">
            {/* Clause 1 */}
            <section className="space-y-1.5 pb-4 border-b border-[#2e3142]/60">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '제1조 (목적)' : 'Article 1 (Purpose)'}
              </h3>
              <p className="text-zinc-400 leading-relaxed pl-1">
                {isKr
                  ? '본 약관은 AI Podium(이하 "서비스")이 제공하는 로컬 기반 지식 관리 및 AI 보조 프로그램의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.'
                  : 'These Terms govern the rules, responsibilities, and conditions for utilizing the client-side local-first research assistance software offered via aipodium.net.'}
              </p>
            </section>

            {/* Clause 2 */}
            <section className="space-y-1.5 pb-4 border-b border-[#2e3142]/60">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '제2조 (용어의 정의)' : 'Article 2 (Definitions)'}
              </h3>
              <div className="space-y-1 pl-1 text-zinc-400">
                <p>
                  <span className="text-zinc-300 font-medium">{isKr ? '· "서비스":' : '· "Service":'}</span>{' '}
                  {isKr
                    ? 'aipodium.net을 통해 제공되는 로컬 우선 연구 및 문서 작성 소프트웨어를 의미합니다.'
                    : 'the Local-First research and compilation workspace delivered through the aipodium.net portal.'}
                </p>
                <p>
                  <span className="text-zinc-300 font-medium">{isKr ? '· "개인 API 키 연동":' : '· "BYOK (Bring Your Own Key)":'}</span>{' '}
                  {isKr
                    ? '이용자가 직접 발급받은 외부 AI 서비스의 API 키를 등록하여 사용하는 방식을 의미합니다.'
                    : 'bringing your own custom API keys directly from generative model providers to enable secure client-side model execution.'}
                </p>
              </div>
            </section>

            {/* Clause 3 */}
            <section className="space-y-1.5 pb-4 border-b border-[#2e3142]/60">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '제3조 (데이터의 관리 및 책임)' : 'Article 3 (Data Custody & Responsibility)'}
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-zinc-400">
                <li>{isKr ? '모든 생성 문서 및 설정 데이터는 이용자의 기기(브라우저)에만 저장됩니다.' : 'All draft archives, records, indexes, and structures remain isolated entirely on the user\'s local hardware / browser cache.'}</li>
                <li>
                  <span className="text-zinc-300 font-medium">
                    {isKr ? '기기 변경, 브라우저 캐시 삭제, 마스터 PIN 및 복구 키 분실 등으로 발생하는 데이터 손실의 책임은 이용자 본인에게 있습니다.' : 'Data losses originating from machine migrations, hardware failure, manual browser cache clearing, or the misplacement of access credentials (PIN / Recovery Keys) reside solely and fully with the user.'}
                  </span>
                </li>
              </ol>
            </section>

            {/* Clause 4 */}
            <section className="space-y-1.5 pb-4 border-b border-[#2e3142]/60">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '제4조 (외부 API 이용 및 비용)' : 'Article 4 (API Operations & Costs)'}
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-zinc-400">
                <li>{isKr ? '이용자가 등록한 API 키의 사용에 따라 발생하는 외부 AI 서비스(OpenAI, Google 등)의 이용 요금은 이용자 본인이 부담합니다.' : 'Billing costs, subscription thresholds, and tokens spent with external AI companies (OpenAI, Google, Anthropic, etc.) due to local actions are fully paid by the user.'}</li>
                <li>{isKr ? '서비스는 API 키 유출을 방지하기 위해 로컬 암호화를 적용하나, 이용자 기기의 보안 관리 소홀로 인한 키 유출에 대해서는 책임을 지지 않습니다.' : 'While the workspace enforces local cryptographic standards to safeguard registered keys, any leakage arising from client hardware intrusion or insecure credential storage falls beyond our liability.'}</li>
              </ol>
            </section>

            {/* Clause 5 */}
            <section className="space-y-1.5">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '제5조 (면책조항)' : 'Article 5 (Disclaimers & Warranties)'}
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-zinc-400">
                <li>{isKr ? '본 서비스는 베타 v1.0 버전으로 제공되며, 성능 개선을 위해 사전 고지 없이 업데이트될 수 있습니다.' : 'The platform is distributed as a Beta v1.0 software. Features, schemas, and properties may alter or adapt over time to enhance research metrics.'}</li>
                <li>
                  <span className="text-zinc-300 font-medium">
                    {isKr ? 'AI가 생성한 결과물(인용, 요약 등)의 학술적·법적 검증 책임은 이용자에게 있습니다.' : 'Responsibility for citation verification, thesis validation, plagiarism prevention, and compliance with institutional reviews regarding AI-assisted materials remains strictly with the user.'}
                  </span>
                </li>
              </ol>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#181a23] border-t border-[#2e3142] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 font-mono">
            {isKr ? '개정 시행일: 2026년 9월 9일' : 'Effective Date: September 9, 2026'}
          </div>

          <button
            type="button"
            onClick={onClose}
            title={isKr ? '확인' : 'Confirm'}
            aria-label={isKr ? '확인' : 'Confirm'}
            className="w-full sm:w-auto px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isKr ? '확인' : 'Confirm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

