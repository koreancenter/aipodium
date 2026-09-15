import React from 'react';
import { X, ShieldCheck, Check } from 'lucide-react';

export interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'KR' | 'ENG';
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
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
      aria-labelledby="privacy-title"
    >
      <div className="bg-[#1e202b] border border-[#2e3142] rounded-xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[86vh] overflow-hidden text-zinc-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#181a23] border-b border-[#2e3142]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="privacy-title" className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight">
                {isKr ? 'AI Podium 개인정보처리방침' : 'AI Podium Privacy Policy'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                aipodium.net · {isKr ? '개인정보 보호법 준수 선언' : 'PIPA Compliance Statement'}
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
          {/* Policy Compact Banner */}
          <div className="p-3 rounded-md bg-indigo-950/30 border border-indigo-500/25 text-indigo-200 text-xs leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-indigo-300 font-medium mb-0.5">
                {isKr ? '설계 단계부터 반영된 서버 저장 정보 제로 정책' : 'Zero Server-Side Data Collection Policy'}
              </strong>
              <span className="text-zinc-300">
                {isKr
                  ? '본 서비스는 개인정보 보호법 제3조(개인정보 보호 원칙)에 따라, 사용자의 개인 식별 정보 및 기밀 학술 연구 데이터를 일절 서버로 전송하거나 수집하지 않도록 설계되었습니다.'
                  : 'In accordance with strict personal data minimization principles, AI Podium does not transmit, collect, or store any of your private manuscripts, keys, or logs on external servers.'}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {isKr
              ? 'AI Podium(이하 "서비스")은 이용자의 개인정보를 중요시하며, 대한민국의 「개인정보 보호법」 등 관련 법령을 철저히 준수합니다.'
              : 'AI Podium ("the Service") highly values user privacy and complies fully with the Personal Information Protection Act (PIPA) of the Republic of Korea and applicable standard regulations.'}
          </p>

          {/* Clauses: Pure Flattened Document Sections without Box-in-Box */}
          <div className="space-y-5 pt-1">
            {/* Section 1 */}
            <section className="space-y-1.5 pb-4 border-b border-[#2e3142]/60">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '1. 개인정보의 수집 및 이용 목적' : '1. Purposes of Processing'}
              </h3>
              <p className="text-zinc-400 leading-relaxed pl-1">
                {isKr
                  ? '본 서비스는 별도의 회원가입 절차가 없으며, 운영자 서버로 이용자의 어떠한 개인정보(이름, 이메일, 작성 문서, 대화 기록 등)도 수집·저장하지 않는 100% 로컬 우선 방식으로 동작합니다.'
                  : 'The Service operates entirely under a 100% Local-First architecture. No signup is required, and the operator never collects, mirrors, or processes any user personal data, draft files, or conversation logs on its servers.'}
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-1.5 pb-4 border-b border-[#2e3142]/60">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '2. 수집하는 개인정보 항목 및 수집 방법' : '2. Items Collected and Storage Location'}
              </h3>
              <div className="space-y-1 pl-1 text-zinc-400">
                <p>
                  <span className="text-zinc-300 font-medium">{isKr ? '· 수집 항목:' : '· Collected Items:'}</span>{' '}
                  {isKr ? '없음 (서버 수집 정보 제로)' : 'None (Zero Server Harvesting)'}
                </p>
                <p>
                  <span className="text-zinc-300 font-medium">{isKr ? '· 이용자 데이터의 저장 위치:' : '· Storage Location:'}</span>{' '}
                  {isKr
                    ? '이용자가 작성한 연구 문서, API 키, 설정 정보는 이용자 본인 기기의 브라우저 내 로컬 저장소(IndexedDB / LocalStorage)에만 암호화되어 보관됩니다.'
                    : 'All research documents, drafts, custom API credentials, and preference configs are saved locally and securely inside the browser environment (IndexedDB / LocalStorage) on your device.'}
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-1.5 pb-4 border-b border-[#2e3142]/60">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '3. 개인정보의 보유 및 이용 기간' : '3. Retention and Disposal'}
              </h3>
              <p className="text-zinc-400 leading-relaxed pl-1">
                {isKr
                  ? '서버에 저장되는 개인정보가 없으므로 별도의 보유 및 파기 절차가 존재하지 않습니다. 이용자가 브라우저의 사이트 데이터 삭제를 실행하거나 앱 내 저장 데이터를 삭제하면 즉시 영구 소멸됩니다.'
                  : 'Since no data is stored or mirrored server-side, there are no separate retention schedules or deletion workflows on our part. Cleanses or local browser data wipes directly execute irreversible self-destruction.'}
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-1.5 pb-4 border-b border-[#2e3142]/60">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '4. 제3자 제공 및 처리위탁' : '4. Third-Party Sharing & Transfers'}
              </h3>
              <p className="text-zinc-400 leading-relaxed pl-1">
                {isKr
                  ? '서비스는 이용자의 데이터를 제3자에게 제공하거나 외부 서버로 위탁 처리하지 않습니다. 단, 이용자가 직접 입력한 개인 API 키를 통해 직접 호출하는 AI 서비스 제공사(OpenAI, Google 등)와의 통신은 이용자의 직접적인 요청에 의해서만 실행됩니다.'
                  : 'The Service does not transmit or share your local records with third parties. Telemetry-free connections are established directly with the respective LLM providers (e.g., OpenAI, Google Gemini) solely based on your explicit execution and configured BYOK keys.'}
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-1.5">
              <h3 className="text-sm font-medium text-zinc-200">
                {isKr ? '5. 개인정보 보호책임자 및 문의처' : '5. Compliance & Contact Officers'}
              </h3>
              <div className="space-y-1 pl-1 text-zinc-400">
                <p>· <span className="text-zinc-300 font-medium">{isKr ? '서비스명:' : 'Service Name:'}</span> AI Podium (aipodium.net)</p>
                <p>· <span className="text-zinc-300 font-medium">{isKr ? '문의 이메일:' : 'Inquiries:'}</span> maestro@aipodium.net</p>
                <p>· <span className="text-zinc-300 font-medium">{isKr ? '운영본부:' : 'Entity:'}</span> {isKr ? '한국센터글로벌네트워크 지식관리실 (사업자등록번호: 141-82-83410)' : 'Korean Center Global Network Knowledge Management Division (Registration: 141-82-83410)'}</p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#181a23] border-t border-[#2e3142] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 font-mono">
            {isKr ? '개정 시행일: 2026년 9월 9일' : 'Effective: September 9, 2026'}
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

