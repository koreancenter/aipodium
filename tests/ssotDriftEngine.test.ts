import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSSOTDriftLocally, applySSOTReconciliation } from '../src/utils/ssotDriftEngine.ts';

test('detects timeline chronological conflict between launch and alpha', () => {
  const content = `# 제품 개발 로드맵 (SSOT)
- 2025 Q1: 정식 런칭 및 글로벌 배포
- 2025 Q3: 알파 프로토타입 개발 및 사내 테스트
`;
  const result = analyzeSSOTDriftLocally(content);
  assert.ok(result.issues.length > 0);
  const timelineIssue = result.issues.find(i => i.type === 'timeline');
  assert.ok(timelineIssue, 'Should find timeline issue');
  assert.equal(timelineIssue?.severity, 'critical');
  assert.ok(result.score < 100);
});

test('detects budget and metric discrepancies across document sections', () => {
  const content = `# 사업 기획서
## 1. 개요
이번 프로젝트 총 마케팅 예산은 1500만원으로 책정되었습니다.

## 2. 세부 비용 집행 계획
마케팅 예산은 총 3500만원 집행될 예정입니다.
`;
  const result = analyzeSSOTDriftLocally(content);
  assert.ok(result.issues.length > 0);
  const metricIssue = result.issues.find(i => i.type === 'metric');
  assert.ok(metricIssue, 'Should detect conflicting budget numbers');
  assert.equal(metricIssue?.severity, 'critical');
});

test('detects dangling unassigned action items and vague placeholders', () => {
  const content = `# 태스크 목록
- [ ] 결제 모듈 연동 및 테스트
- [x] 기획서 작성 완료 @홍길동
- 배포 일정: TBD
`;
  const result = analyzeSSOTDriftLocally(content);
  const taskIssue = result.issues.find(i => i.type === 'task');
  const vagueIssue = result.issues.find(i => i.type === 'ambiguity');
  assert.ok(taskIssue, 'Should flag dangling task without assignee or date');
  assert.ok(vagueIssue, 'Should flag TBD ambiguity');
});

test('applies reconciliation patch correctly', () => {
  const original = `# 프로젝트 계획\n총 예산: 2000만원`;
  const patch = {
    original: '총 예산: 2000만원',
    replacement: '총 예산: 1500만원'
  };
  const updated = applySSOTReconciliation(original, patch);
  assert.equal(updated, `# 프로젝트 계획\n총 예산: 1500만원`);
});
