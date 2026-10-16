import { diffLines, Change } from 'diff';

export type CriticPersonaId = 'pm' | 'security' | 'cfo' | 'architect';

export interface CriticReviewIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  targetLine?: number;
}

export interface CriticReviewResult {
  persona: CriticPersonaId;
  name: string;
  role: string;
  title: string;
  score: number;
  verdict: '승인' | '조건부 승인' | '전면 재검토 요망';
  strengths: string[];
  issues: CriticReviewIssue[];
}

export interface CouncilReviewSummary {
  overallScore: number;
  readinessRating: '출시 준비 완료' | '조건부 보완 권고' | '심각한 리스크 감지';
  criticalCount: number;
  warningCount: number;
  critics: CriticReviewResult[];
  revisedDocument: string;
  analyzedAt: string;
  isAiEnhanced?: boolean;
}

export interface DiffHunkStat {
  addedLines: number;
  removedLines: number;
  unchangedLines: number;
  changes: Change[];
}

/**
 * Computes line-by-line diff stats between original and proposed document
 */
export function computeDocumentDiff(original: string, proposed: string): DiffHunkStat {
  const changes = diffLines(original || '', proposed || '');
  let addedLines = 0;
  let removedLines = 0;
  let unchangedLines = 0;

  changes.forEach((c) => {
    const lineCount = c.count || c.value.split('\n').filter(Boolean).length || 1;
    if (c.added) {
      addedLines += lineCount;
    } else if (c.removed) {
      removedLines += lineCount;
    } else {
      unchangedLines += lineCount;
    }
  });

  return {
    addedLines,
    removedLines,
    unchangedLines,
    changes
  };
}

/**
 * Intelligent Local Heuristic Council Evaluation Engine
 * Evaluates document across PM, Security, CFO, and System Architecture axes.
 */
export function evaluateDocumentLocally(content: string): CouncilReviewSummary {
  const lines = (content || '').split('\n');
  const lowerContent = (content || '').toLowerCase();

  // 1. Product Manager (기획/UX 관점)
  const pmIssues: CriticReviewIssue[] = [];
  const hasUserPersona = lowerContent.includes('사용자') || lowerContent.includes('페르소나') || lowerContent.includes('타깃') || lowerContent.includes('고객') || lowerContent.includes('user');
  const hasAcceptanceCriteria = lowerContent.includes('완료 조건') || lowerContent.includes('수용 기준') || lowerContent.includes('acceptance') || lowerContent.includes('ac:');
  const hasSuccessMetric = lowerContent.includes('kpi') || lowerContent.includes('지표') || lowerContent.includes('성공 기준') || lowerContent.includes('metric');

  if (!hasUserPersona) {
    pmIssues.push({
      id: 'pm-no-persona',
      severity: 'critical',
      title: '타깃 사용자 및 페르소나 정의 부재',
      description: '문서 내에 이 기능을 소비하거나 혜택을 받는 핵심 대상(User Persona)이 명시되지 않아 기획 우선순위가 흔들릴 수 있습니다.',
      recommendation: '기능을 사용할 구체적인 대상 그룹과 핵심 문제 정의를 문서 1장에 추가하세요.',
      targetLine: 1
    });
  }

  if (!hasAcceptanceCriteria) {
    pmIssues.push({
      id: 'pm-no-ac',
      severity: 'warning',
      title: '검증 가능한 수용 기준(Acceptance Criteria) 누락',
      description: '개발 및 QA 단계에서 기능 완료 여부를 판단할 구체적인 AC 체크리스트가 명시되지 않았습니다.',
      recommendation: '주요 기능별 구체적인 수용 조건(예: 응답시간 < 200ms, 정상 로그인 검증 등)을 불릿으로 명시하세요.'
    });
  }

  if (!hasSuccessMetric) {
    pmIssues.push({
      id: 'pm-no-kpi',
      severity: 'info',
      title: '정량적 성공 지표(KPI) 부재',
      description: '출시 후 성패를 측정할 비즈니스 또는 프로덕트 핵심 지표(KPI)가 없습니다.',
      recommendation: '출시 후 30일 내 달성 목표(예: 활성 사용자 수, 전환율 15% 개선 등)를 기재하세요.'
    });
  }

  const pmScore = Math.max(30, 100 - pmIssues.length * 20);

  // 2. Cybersecurity & Compliance (보안/컴플라이언스 관점)
  const secIssues: CriticReviewIssue[] = [];
  const secretKeyRegex = /(?:api[_-]?key|secret|password|token|bearer|private[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{8,}['"]/i;
  const emailRegex = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;

  lines.forEach((line, idx) => {
    if (secretKeyRegex.test(line)) {
      secIssues.push({
        id: `sec-hardcoded-secret-${idx + 1}`,
        severity: 'critical',
        title: '하드코딩된 시크릿 키 / 토큰 유출 위험',
        description: `${idx + 1}행에 실제 API 키 또는 민감한 시크릿 문자열 패턴이 노출되어 있습니다.`,
        recommendation: '실제 키를 마스킹하고 환경 변수(.env) 참조 방식으로 교체하세요.',
        targetLine: idx + 1
      });
    }
  });

  const hasAuth = lowerContent.includes('인증') || lowerContent.includes('auth') || lowerContent.includes('권한') || lowerContent.includes('rbac');
  const hasDataProtection = lowerContent.includes('암호화') || lowerContent.includes('보안') || lowerContent.includes('gdpr') || lowerContent.includes('개인정보') || lowerContent.includes('encryption');

  if (!hasAuth) {
    secIssues.push({
      id: 'sec-no-auth',
      severity: 'warning',
      title: '사용자 접근 제어 및 권한 모델 명세 미흡',
      description: '누가 어떤 데이터에 접근하고 변경할 수 있는지에 대한 권한 제어(RBAC) 체계가 누락되었습니다.',
      recommendation: '역할별(게스트/일반사용자/관리자) 접근 권한 매트릭스를 섹션으로 추가하세요.'
    });
  }

  if (!hasDataProtection) {
    secIssues.push({
      id: 'sec-no-encryption',
      severity: 'info',
      title: '저장 및 전송 구간 암호화 방침 부재',
      description: '민감 데이터의 전송(TLS) 및 저장(AES-256) 암호화 규정이 문서에 정의되어 있지 않습니다.',
      recommendation: '보안 정책 준수를 위한 데이터 암호화 및 보관 기한을 명시하세요.'
    });
  }

  const secScore = Math.max(25, 100 - secIssues.length * 25);

  // 3. CFO / Financial & Resource Controller (재무/리소스 관점)
  const cfoIssues: CriticReviewIssue[] = [];
  const hasCostEstimate = lowerContent.includes('비용') || lowerContent.includes('예산') || lowerContent.includes('인건비') || lowerContent.includes('cost') || lowerContent.includes('budget');
  const hasResourceHeadcount = lowerContent.includes('투입 인력') || lowerContent.includes('리소스') || lowerContent.includes('m/m') || lowerContent.includes('공수');

  if (!hasCostEstimate) {
    cfoIssues.push({
      id: 'cfo-no-cost',
      severity: 'critical',
      title: '총 소요 비용(TCO) 및 인프라 예산 추정치 누락',
      description: '개발, 클라우드 호스팅, API 토큰 비용을 포함한 예상 지출 내역이 전혀 작성되지 않았습니다.',
      recommendation: '클라우드 인프라 및 모델 API 예상 호출 비용을 월간 단위로 산출하여 삽입하세요.'
    });
  }

  if (!hasResourceHeadcount) {
    cfoIssues.push({
      id: 'cfo-no-headcount',
      severity: 'warning',
      title: '필요 개발 공수(M/M) 및 인력 배정 계획 부재',
      description: '프로젝트 완수를 위해 필요한 직군별 공수(Frontend, Backend, Design)가 구체화되지 않았습니다.',
      recommendation: '역할별 예상 투입 공수(Man-Month) 및 의존성 일정을 명시하세요.'
    });
  }

  const cfoScore = Math.max(30, 100 - cfoIssues.length * 22);

  // 4. Principal Systems Architect (시스템 아키텍트/엔지니어링 관점)
  const archIssues: CriticReviewIssue[] = [];
  const hasArchitectureDiagram = lowerContent.includes('아키텍처') || lowerContent.includes('architecture') || lowerContent.includes('구조') || lowerContent.includes('데이터베이스') || lowerContent.includes('db');
  const hasScalingSla = lowerContent.includes('트래픽') || lowerContent.includes('성능') || lowerContent.includes('sla') || lowerContent.includes('캐싱') || lowerContent.includes('tps');

  if (!hasArchitectureDiagram) {
    archIssues.push({
      id: 'arch-no-diagram',
      severity: 'warning',
      title: '시스템 데이터 흐름 및 컴포넌트 구조도 부재',
      description: '클라이언트, API 서버, 저장소 간의 상호작용 및 데이터 흐름이 시각적으로 정의되지 않았습니다.',
      recommendation: 'Mermaid 다이어그램 또는 컴포넌트 아키텍처 다이어그램 블록을 삽입하세요.'
    });
  }

  if (!hasScalingSla) {
    archIssues.push({
      id: 'arch-no-sla',
      severity: 'warning',
      title: '목표 트래픽(TPS) 및 가용성(SLA) 기준 부재',
      description: '시스템이 감당해야 할 최대 동시 접속자 수 및 레이턴시 상한(P99) SLA가 누락되었습니다.',
      recommendation: '목표 트래픽 수치와 캐시 무효화 전략(Cache Invalidation)을 명시하세요.'
    });
  }

  const archScore = Math.max(35, 100 - archIssues.length * 20);

  // Compile critics
  const critics: CriticReviewResult[] = [
    {
      persona: 'pm',
      name: 'Elena Rostova',
      role: '기획 / 프로덕트 총괄',
      title: 'Skeptical Product Lead',
      score: pmScore,
      verdict: pmScore >= 80 ? '승인' : pmScore >= 60 ? '조건부 승인' : '전면 재검토 요망',
      strengths: ['핵심 목적 서술 명확', '목차 구조화 양호'],
      issues: pmIssues
    },
    {
      persona: 'security',
      name: 'Dr. Marcus Vance',
      role: '보안 / 거버넌스 최고책임자',
      title: 'Chief Security Auditor',
      score: secScore,
      verdict: secScore >= 80 ? '승인' : secScore >= 60 ? '조건부 승인' : '전면 재검토 요망',
      strengths: ['외부 링크 신뢰성 준수', '민감 키 격리 환경 선언'],
      issues: secIssues
    },
    {
      persona: 'cfo',
      name: 'Julian Sterling',
      role: '재무 / 투자 리스크 총괄',
      title: 'CFO & Budget Controller',
      score: cfoScore,
      verdict: cfoScore >= 80 ? '승인' : cfoScore >= 60 ? '조건부 승인' : '전면 재검토 요망',
      strengths: ['사업 목표 부합성 양호'],
      issues: cfoIssues
    },
    {
      persona: 'architect',
      name: 'Kai Nakamura',
      role: '수석 시스템 아키텍트',
      title: 'Principal Systems Architect',
      score: archScore,
      verdict: archScore >= 80 ? '승인' : archScore >= 60 ? '조건부 승인' : '전면 재검토 요망',
      strengths: ['모듈형 컴포넌트 설계 철학'],
      issues: archIssues
    }
  ];

  const totalScore = Math.round((pmScore + secScore + cfoScore + archScore) / 4);
  const criticalCount = pmIssues.filter(i => i.severity === 'critical').length +
    secIssues.filter(i => i.severity === 'critical').length +
    cfoIssues.filter(i => i.severity === 'critical').length +
    archIssues.filter(i => i.severity === 'critical').length;
  const warningCount = pmIssues.filter(i => i.severity === 'warning').length +
    secIssues.filter(i => i.severity === 'warning').length +
    cfoIssues.filter(i => i.severity === 'warning').length +
    archIssues.filter(i => i.severity === 'warning').length;

  let readinessRating: CouncilReviewSummary['readinessRating'] = '출시 준비 완료';
  if (criticalCount > 0 || totalScore < 60) {
    readinessRating = '심각한 리스크 감지';
  } else if (warningCount > 0 || totalScore < 85) {
    readinessRating = '조건부 보완 권고';
  }

  // Synthesize an improved revised document addressing the council's top feedback
  let revised = content.trim();
  const appendixItems: string[] = [];

  if (!hasUserPersona) {
    appendixItems.push(`### 1.1 타깃 사용자 및 페르소나 정의 (기획 위원회 권고)\n- **핵심 타깃**: 엔터프라이즈 기획자, 기술 문서 작성자 및 아키텍처 엔지니어\n- **주요 가치 제안**: 문서와 데이터 간의 실시간 정합성 보장 및 다각도 위험 검증`);
  }

  if (!hasAuth || !hasDataProtection) {
    appendixItems.push(`### 2.2 보안 및 거버넌스 규정 (보안 위원회 권고)\n- **권한 체계 (RBAC)**: 역할별 접근 제어 정책 적용 (Owner, Editor, Viewer)\n- **데이터 보안**: 전송 구간 TLS 1.3 암호화 및 IndexedDB 로컬 볼트 AES-256 저장`);
  }

  if (!hasCostEstimate) {
    appendixItems.push(`### 3.1 인프라 비용 및 예산 계획 (재무 위원회 권고)\n| 구분 | 항목 | 월간 예상 예산 | 비고 |\n| :--- | :--- | :--- | :--- |\n| 인프라 | Cloud Run 컨테이너 호스팅 | $120 / 월 | 오토스케일링 기본 적용 |\n| 모델 API | Gemini 3.8 Flash 토큰 비용 | $80 / 월 | 요청당 캐싱 적용 |\n| 합계 | 총 운영 비용 (TCO) | $200 / 월 | 초기 6개월 예산 확보 완료 |`);
  }

  if (!hasArchitectureDiagram || !hasScalingSla) {
    appendixItems.push(`### 4.1 시스템 가용성 및 성능 SLA (아키텍처 위원회 권고)\n- **목표 가용성**: 99.9% Uptime\n- **응답 속도 (P99)**: API 응답 레이턴시 300ms 이내 보장\n- **캐싱 전략**: Memory Cache 및 로컬 IndexedDB 캐시 연동`);
  }

  if (appendixItems.length > 0) {
    revised += `\n\n---\n## 🏛️ 비평가 위원회 종합 보완 부록 (Council Audit Appendix)\n${appendixItems.join('\n\n')}\n`;
  }

  return {
    overallScore: totalScore,
    readinessRating,
    criticalCount,
    warningCount,
    critics,
    revisedDocument: revised,
    analyzedAt: new Date().toLocaleTimeString(),
    isAiEnhanced: false
  };
}
