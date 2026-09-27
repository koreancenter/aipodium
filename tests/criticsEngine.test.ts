import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDocumentLocally, computeDocumentDiff } from '../src/utils/criticsEngine.ts';

test('evaluates document and flags missing persona and budget in council review', () => {
  const draft = `# 서비스 기획 초안\n간단한 메모 앱입니다.\n기능: 추가, 삭제, 수정`;
  const result = evaluateDocumentLocally(draft);

  assert.ok(result.critics.length === 4);
  assert.ok(result.overallScore < 85);
  assert.ok(result.criticalCount > 0);

  const pm = result.critics.find(c => c.persona === 'pm');
  const cfo = result.critics.find(c => c.persona === 'cfo');

  assert.ok(pm, 'PM critic should exist');
  assert.ok(cfo, 'CFO critic should exist');
  assert.ok(pm?.issues.some(i => i.id === 'pm-no-persona'));
  assert.ok(cfo?.issues.some(i => i.id === 'cfo-no-cost'));

  assert.ok(result.revisedDocument.includes('Council Audit Appendix'));
});

test('computes line diff accurately between original and proposed text', () => {
  const original = `Line 1\nLine 2\nLine 3`;
  const proposed = `Line 1\nLine 2 Modified\nLine 3\nLine 4 Added`;

  const diffStat = computeDocumentDiff(original, proposed);
  assert.ok(diffStat.addedLines >= 2);
  assert.ok(diffStat.removedLines >= 1);
  assert.ok(diffStat.changes.length > 0);
});
