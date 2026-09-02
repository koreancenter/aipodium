const fs = require('fs');
let code = fs.readFileSync('src/components/CommandPalette.tsx', 'utf-8');

// Add DocTemplatePreset interface and DOC_TEMPLATES array
const docTemplatesDef = `
export interface DocTemplatePreset {
  id: string;
  tag: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  structureSnippet: string;
  defaultPrompt: string;
}

export const DOC_TEMPLATES: DocTemplatePreset[] = [
  {
    id: 'prd',
    tag: '@기획서_PRD',
    name: '제품 기획서 (PRD)',
    desc: '제품 비전, 타겟 사용자, 핵심 기능 명세, 유저 시나리오 및 성공 지표 정의',
    icon: FileText,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    borderColor: 'border-indigo-500/30 hover:border-indigo-500/60',
    defaultPrompt: '선택된 문서들을 종합하여 명확한 비전과 기능 명세를 담은 표준 제품 기획서(PRD) 형태로 정리해 줘.',
    structureSnippet: \`# [프로젝트명] 제품 기획서 (PRD)\\n\\n## 1. 개요 및 배경 (Overview & Background)\\n- **문서 버전:** 1.0.0 (SSOT)\\n- **작성일:** {DATE}\\n- **목표:** \\n\\n## 2. 타겟 사용자 및 핵심 가치 (Target Audience & Value Proposition)\\n\\n## 3. 핵심 기능 요구사항 명세 (Functional Specifications)\\n| ID | 기능명 | 우선순위 | 상세 설명 | 상태 |\\n|---|---|---|---|---|\\n| F-01 | 핵심 기능 | P0 (High) | 설명 작성 | 검토중 |\\n\\n## 4. 유저 시나리오 및 흐름 (User Flow & Scenarios)\\n\\n## 5. 성공 지표 및 KPI (Success Metrics & KPIs)\\n- 활성 사용자 및 전환율 목표\\n\\n## 6. 마일스톤 및 릴리즈 계획 (Milestones & Release Plan)\\n\`
  },
  {
    id: 'architecture',
    tag: '@기술설계서_Architecture',
    name: '시스템 아키텍처 설계서',
    desc: '시스템 컴포넌트 구조, 데이터 모델, API 명세, 보안 및 배포 파이프라인 명세',
    icon: Code,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10 hover:bg-sky-500/20',
    borderColor: 'border-sky-500/30 hover:border-sky-500/60',
    defaultPrompt: '선택된 파일의 기술 명세와 구조를 분석하여 일관된 기술 아키텍처 설계서(Architecture Document)로 작성해 줘.',
    structureSnippet: \`# [시스템명] 기술 아키텍처 설계서\\n\\n## 1. 시스템 아키텍처 개요 (System Architecture)\\n- **설계 원칙:** High Availability, Loose Coupling, Single Source of Truth (SSOT)\\n\\n## 2. 모듈 및 컴포넌트 구성 (Module Breakdown)\\n\`\`\`\\n[Client Layer] <---> [API Gateway] <---> [Microservices] <---> [Storage/DB]\\n\`\`\`\\n\\n## 3. 데이터베이스 및 스키마 명세 (Data Models & Schemas)\\n\\n## 4. 핵심 API 엔드포인트 명세 (API Endpoints)\\n- \\\`POST /api/v1/resource\\\` : 설명\\n\\n## 5. 보안, 인증 및 암호화 (Security & Authentication)\\n- AES-256 / JWT / PBKDF2 암호화 적용\\n\\n## 6. 배포 및 인프라 파이프라인 (Deployment & Infra)\\n\`
  },
  {
    id: 'executive',
    tag: '@경영보고서_Executive',
    name: '경영진 요약 보고서',
    desc: '경영진 및 주요 의사결정자를 위한 핵심 요약, 성과 지표, 리스크 및 의사결정 안건',
    icon: FileText,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    borderColor: 'border-amber-500/30 hover:border-amber-500/60',
    defaultPrompt: '선택된 자료를 바탕으로 핵심 요약, 주요 지표, 의사결정 안건이 포함된 경영진 보고서 형태로 작성해 줘.',
    structureSnippet: \`# [프로젝트/사업명] 경영진 요약 보고서 (Executive Summary)\\n\\n## 1. 핵심 요약 (Executive Summary)\\n- 본 문서는 현재 진행 상황과 주요 핵심 성과를 요약합니다.\\n\\n## 2. 주요 성과 및 진척도 (Key Achievements & Progress)\\n- **전체 진척률:** 85%\\n- **주요 달성 사항:** \\n\\n## 3. 재무 및 리소스 현황 (Budget & Resource Allocation)\\n\\n## 4. 리스크 관리 및 대응 방안 (Risk Factors & Mitigations)\\n\\n## 5. 최종 의사결정 및 승인 요청 사항 (Decision Items for Approval)\\n\`
  },
  {
    id: 'minutes',
    tag: '@회의록_Minutes',
    name: '전략/정기 회의록',
    desc: '회의 개요, 참석자, 주요 논의 안건, 최종 결정 사항 및 담당자별 Action Items',
    icon: Clock,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 hover:bg-violet-500/20',
    borderColor: 'border-violet-500/30 hover:border-violet-500/60',
    defaultPrompt: '회의 내용과 논의된 메모들을 정리하여 결정 사항과 액션 아이템이 분명한 회의록으로 만들어 줘.',
    structureSnippet: \`# [회의명] 회의록 (Meeting Minutes)\\n\\n- **일시:** {DATE}\\n- **참석자:** \\n- **회의 목적:** \\n\\n## 1. 논의 안건 (Agenda Items)\\n\\n## 2. 주요 논의 내용 및 결과 (Discussion Details)\\n\\n## 3. 최종 결정 사항 (Key Decisions Made)\\n- [x] 결정 항목 1\\n\\n## 4. 담당자별 실행 과제 (Action Items)\\n| 담당자 | 실행 항목 (Action Item) | 마감 기한 | 상태 |\\n|---|---|---|---|\\n| 담당자A | 작업 내용 | 기한 | 진행중 |\\n\`
  }
];
`;

code = code.replace(/const QUICK_CHIPS: QuickChip\[\] = \[/, docTemplatesDef + '\nconst QUICK_CHIPS: QuickChip[] = [');

code = code.replace(
  `onExecuteAction: (
    actionType: 'ppt' | 'invoice' | 'schedule' | 'table' | 'word' | 'code' | 'custom',
    customPrompt: string
  ) => Promise<void>;`,
  `onExecuteAction: (
    actionType: string,
    customPrompt: string
  ) => Promise<void>;`
);

let docTemplateUI = `
          {/* Vibe Canvas (SSOT) Actions */}
          <div className="flex items-center justify-between text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wider mt-4">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Vibe Canvas (SSOT 마스터 템플릿)</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  disabled={isExecuting}
                  onClick={() => handleExecute('vibe-' + tmpl.id, tmpl.defaultPrompt)}
                  className={\`flex flex-col items-start p-2.5 rounded-lg border transition text-left group \${tmpl.bgColor} \${tmpl.borderColor} disabled:opacity-50\`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={\`w-4 h-4 \${tmpl.color} shrink-0 group-hover:scale-110 transition-transform\`} />
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        {tmpl.name}
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                  </div>
                  <span className="text-[0.625rem] text-slate-500 line-clamp-2 mt-0.5">
                    {tmpl.desc}
                  </span>
                </button>
              );
            })}
          </div>
`;

code = code.replace(
  `          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_CHIPS.map((chip, idx) => {`,
  docTemplateUI + `\n          <div className="flex items-center justify-between text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wider mt-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>원클릭 퀵 액션 (Quick Action Chips)</span>
            </span>
          </div>\n          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">\n            {QUICK_CHIPS.map((chip, idx) => {`
);

// We should remove the old header for "원클릭 퀵 액션 (Quick Action Chips)" because I moved it above QUICK_CHIPS loop.
// Actually, let's just do a clean replace for the whole Quick Action Chips Section.
