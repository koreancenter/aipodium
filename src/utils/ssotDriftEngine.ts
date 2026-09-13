export interface SSOTDriftIssue {
  id: string;
  type: 'timeline' | 'metric' | 'contradiction' | 'task' | 'ambiguity' | 'architecture';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  location: {
    line: number;
    text: string;
  };
  suggestedFix: string;
  reconciliationPatch?: {
    original: string;
    replacement: string;
  };
}

export interface SSOTAuditSummary {
  score: number;
  status: 'pristine' | 'healthy' | 'warning' | 'critical';
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  issues: SSOTDriftIssue[];
  analyzedAt: string;
  isAiEnhanced?: boolean;
}

/**
 * Fast client-side Heuristic SSOT Drift Analyzer
 * Scans markdown content for internal contradictions, timeline conflicts,
 * numeric discrepancies, dangling tasks, and vague placeholders.
 */
export function analyzeSSOTDriftLocally(content: string): SSOTAuditSummary {
  if (!content || !content.trim()) {
    return {
      score: 100,
      status: 'pristine',
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      issues: [],
      analyzedAt: new Date().toLocaleTimeString()
    };
  }

  const lines = content.split('\n');
  const issues: SSOTDriftIssue[] = [];

  // 1. Timeline & Chronological Conflict Analysis
  const milestonePatterns = [
    { key: 'alpha', terms: ['alpha', '알파', '프로토타입', 'prototype'], rank: 1, label: '알파/프로토타입' },
    { key: 'beta', terms: ['beta', '베타'], rank: 2, label: '베타 테스트' },
    { key: 'launch', terms: ['launch', '런칭', '출시', '배포', 'release', 'ga'], rank: 3, label: '정식 런칭/배포' }
  ];

  const dateRegex = /(?:202[4-9]|2030)(?:[-/.](?:0?[1-9]|1[0-2])(?:[-/.](?:0?[1-9]|[12]\d|3[01]))?|\s*(?:Q[1-4]|[1-4]분기))/i;

  function parseDateScore(str: string): number {
    const yearMatch = str.match(/202[4-9]|2030/);
    if (!yearMatch) return 0;
    const year = parseInt(yearMatch[0], 10);

    const qMatch = str.match(/Q([1-4])|([1-4])분기/i);
    if (qMatch) {
      const q = parseInt(qMatch[1] || qMatch[2], 10);
      return year + q * 0.25;
    }

    const monthMatch = str.match(/(?:[-/.])(0?[1-9]|1[0-2])/);
    if (monthMatch) {
      const m = parseInt(monthMatch[1], 10);
      return year + (m / 12);
    }
    return year;
  }

  const milestonesFound: { lineIdx: number; key: string; rank: number; label: string; text: string; dateStr?: string; dateScore: number }[] = [];

  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    for (const m of milestonePatterns) {
      const matched = m.terms.some((term) => lower.includes(term));
      if (matched) {
        const dateMatch = line.match(dateRegex);
        milestonesFound.push({
          lineIdx: idx + 1,
          key: m.key,
          rank: m.rank,
          label: m.label,
          text: line.trim(),
          dateStr: dateMatch ? dateMatch[0].trim() : undefined,
          dateScore: dateMatch ? parseDateScore(dateMatch[0]) : 0
        });
        break;
      }
    }
  });

  // Check if an earlier milestone has a later rank/date
  for (let i = 0; i < milestonesFound.length; i++) {
    for (let j = i + 1; j < milestonesFound.length; j++) {
      const first = milestonesFound[i];
      const second = milestonesFound[j];

      // Contradiction: Later phase (e.g. Launch rank 3) scheduled before or at same time as earlier phase (Alpha rank 1)
      if (first.rank > second.rank && first.dateScore > 0 && second.dateScore > 0 && first.dateScore <= second.dateScore) {
        issues.push({
          id: `timeline-order-${first.lineIdx}-${second.lineIdx}`,
          type: 'timeline',
          severity: 'critical',
          title: '마일스톤 순서 및 타임라인 역전 모순',
          description: `'${first.text}' (${first.dateStr || ''})가 선행 단계인 '${second.text}' (${second.dateStr || ''})보다 앞선 일정으로 설정되어 실행 정합성이 깨졌습니다.`,
          location: {
            line: first.lineIdx,
            text: first.text
          },
          suggestedFix: `${second.label} 이후 일정으로 조정하거나 타임라인 일자를 역전 보정하세요.`,
          reconciliationPatch: {
            original: first.text,
            replacement: first.text.replace(first.dateStr || '', second.dateStr || '')
          }
        });
      }
    }
  }

  // 2. Budget & Numeric Inconsistency Check
  const currencyRegex = /(\$[\d,]+(?:\.\d+)?|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:만원|억원|KRW|USD|달러|원))/g;
  const metricKeywords = ['예산', 'budget', '비용', 'cost', '매출', 'revenue', '인건비', '단가'];
  
  const metricMentions: { lineIdx: number; keyword: string; valStr: string; rawLine: string }[] = [];

  lines.forEach((line, idx) => {
    const lineLower = line.toLowerCase();
    metricKeywords.forEach((kw) => {
      if (lineLower.includes(kw)) {
        const matches = line.match(currencyRegex);
        if (matches) {
          matches.forEach((val) => {
            metricMentions.push({
              lineIdx: idx + 1,
              keyword: kw,
              valStr: val.trim(),
              rawLine: line
            });
          });
        }
      }
    });
  });

  // Group by keyword and compare
  const keywordGroups = new Map<string, typeof metricMentions>();
  metricMentions.forEach((m) => {
    const grp = keywordGroups.get(m.keyword) || [];
    grp.push(m);
    keywordGroups.set(m.keyword, grp);
  });

  keywordGroups.forEach((mentions, kw) => {
    if (mentions.length > 1) {
      const first = mentions[0];
      for (let k = 1; k < mentions.length; k++) {
        const next = mentions[k];
        if (first.valStr !== next.valStr && Math.abs(first.lineIdx - next.lineIdx) > 2) {
          issues.push({
            id: `metric-conflict-${kw}-${first.lineIdx}-${next.lineIdx}`,
            type: 'metric',
            severity: 'critical',
            title: `'${kw}' 수치 및 금액 불일치`,
            description: `${first.lineIdx}행의 '${first.valStr}'과 ${next.lineIdx}행의 '${next.valStr}'이 상호 충돌하여 단일 진실 공급원(SSOT) 원칙에 위배됩니다.`,
            location: {
              line: next.lineIdx,
              text: next.rawLine.trim()
            },
            suggestedFix: `기준값인 '${first.valStr}'로 통일하거나 정확한 산출 근거를 보완하세요.`,
            reconciliationPatch: {
              original: next.rawLine,
              replacement: next.rawLine.replace(next.valStr, first.valStr)
            }
          });
          break;
        }
      }
    }
  });

  // 3. Dangling & Unassigned Action Items
  lines.forEach((line, idx) => {
    const taskMatch = line.match(/^(\s*[-*]\s*\[\s*\]\s*)(.+)$/);
    if (taskMatch) {
      const taskBody = taskMatch[2].trim();
      const hasAssignee = /@[a-zA-Z0-9_\uac00-\ud7a3]+/.test(taskBody);
      const hasDueDate = /(?:202[4-9]|D-|\b\d+일|\b\d+월)/.test(taskBody);

      if (!hasAssignee && !hasDueDate) {
        issues.push({
          id: `task-dangling-${idx + 1}`,
          type: 'task',
          severity: 'warning',
          title: '책임자/기한 미지정 미완료 태스크',
          description: `체크리스트 '${taskBody}'에 담당자(@멘션) 또는 완료 기한이 지정되지 않아 누락 위험이 있습니다.`,
          location: {
            line: idx + 1,
            text: line.trim()
          },
          suggestedFix: `담당자와 목표 일정을 명시하세요.`,
          reconciliationPatch: {
            original: line,
            replacement: `${line} @담당자 (기한: 미정)`
          }
        });
      }
    }
  });

  // 4. Ambiguity & Vague Placeholders (TBD, TODO, 미정)
  const vagueRegex = /\b(TBD|TODO|미정|추후\s*결정|추후\s*논의|확인\s*필요|asap|as\s+soon\s+as\s+possible)\b/i;
  lines.forEach((line, idx) => {
    const match = line.match(vagueRegex);
    if (match) {
      issues.push({
        id: `ambiguity-vague-${idx + 1}`,
        type: 'ambiguity',
        severity: 'warning',
        title: `모호한 임시 표기 감지 ('${match[0]}')`,
        description: `SSOT 문서 내에 미확정 임시 표기('${match[0]}')가 잔존해 있어 팀 간 정합성을 저해합니다.`,
        location: {
          line: idx + 1,
          text: line.trim()
        },
        suggestedFix: `구체적인 결정 내용이나 검토 일자, 의사결정 담당자를 지정하세요.`,
        reconciliationPatch: {
          original: line,
          replacement: line.replace(match[0], `[확정 요망: 담당자 검토중]`)
        }
      });
    }
  });

  // 5. Structural SSOT Completeness (For documents over 10 lines)
  if (lines.length > 10) {
    const lowerAll = content.toLowerCase();
    const hasGoals = lowerAll.includes('목표') || lowerAll.includes('goal') || lowerAll.includes('objective') || lowerAll.includes('개요');
    const hasTimeline = lowerAll.includes('일정') || lowerAll.includes('timeline') || lowerAll.includes('마일스톤') || lowerAll.includes('schedule');
    const hasRisk = lowerAll.includes('리스크') || lowerAll.includes('risk') || lowerAll.includes('제약') || lowerAll.includes('대안');

    if (!hasGoals || !hasTimeline || !hasRisk) {
      const missingSections: string[] = [];
      if (!hasGoals) missingSections.push('핵심 목표/개요');
      if (!hasTimeline) missingSections.push('일정/타임라인');
      if (!hasRisk) missingSections.push('리스크/제약사항');

      issues.push({
        id: 'arch-missing-sections',
        type: 'architecture',
        severity: 'info',
        title: 'SSOT 필수 섹션 누락 권고',
        description: `문서의 완결성을 위해 다음 핵심 섹션의 추가를 권장합니다: ${missingSections.join(', ')}`,
        location: {
          line: lines.length,
          text: lines[lines.length - 1] || ''
        },
        suggestedFix: `문서 하단에 누락된 섹션 뼈대를 자동 삽입하세요.`,
        reconciliationPatch: {
          original: lines[lines.length - 1] || '',
          replacement: `${lines[lines.length - 1] || ''}\n\n## 📌 추가 검토 필요 사항\n- [ ] ${missingSections.join('\n- [ ] ')}`
        }
      });
    }
  }

  // Calculate Health Score
  let score = 100;
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  issues.forEach((iss) => {
    if (iss.severity === 'critical') {
      score -= 22;
      criticalCount++;
    } else if (iss.severity === 'warning') {
      score -= 8;
      warningCount++;
    } else {
      score -= 3;
      infoCount++;
    }
  });

  score = Math.max(0, Math.min(100, score));

  let status: SSOTAuditSummary['status'] = 'pristine';
  if (criticalCount > 0 || score < 60) {
    status = 'critical';
  } else if (warningCount > 0 || score < 85) {
    status = 'warning';
  } else if (issues.length > 0) {
    status = 'healthy';
  }

  return {
    score,
    status,
    criticalCount,
    warningCount,
    infoCount,
    issues,
    analyzedAt: new Date().toLocaleTimeString(),
    isAiEnhanced: false
  };
}

/**
 * Applies an individual reconciliation patch to the document content safely
 */
export function applySSOTReconciliation(
  content: string,
  patch: { original: string; replacement: string }
): string {
  if (!patch.original || patch.original === patch.replacement) return content;
  if (content.includes(patch.original)) {
    return content.replace(patch.original, patch.replacement);
  }
  // Trim fallback match
  const trimmedOrig = patch.original.trim();
  const trimmedLines = content.split('\n');
  const matchIdx = trimmedLines.findIndex((l) => l.trim() === trimmedOrig);
  if (matchIdx !== -1) {
    trimmedLines[matchIdx] = patch.replacement;
    return trimmedLines.join('\n');
  }
  return content;
}
