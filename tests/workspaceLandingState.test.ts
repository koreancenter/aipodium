import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_WELCOME_DOC,
  GUEST_AI_GUIDE_DOC,
  GUEST_SAMPLE_FILES,
  GUEST_SAMPLE_FOLDERS,
} from '../src/data/guestSampleWorkspace';

test('Workspace Landing State & Guide Organization', async (t) => {
  await t.test('welcome.md and ai_guide.md are organized under 가이드 & 도움말', () => {
    assert.equal(GUEST_SAMPLE_FOLDERS['welcome.md'], '가이드 & 도움말');
    assert.equal(GUEST_SAMPLE_FOLDERS['ai_guide.md'], '가이드 & 도움말');
    assert.ok(GUEST_SAMPLE_FILES['welcome.md']);
    assert.ok(GUEST_SAMPLE_FILES['ai_guide.md']);
    assert.ok(GUEST_SAMPLE_FILES['tech_notes.md']);
  });

  await t.test('Sample docs use standard markdown headings rather than raw asterisks for top headings', () => {
    assert.ok(GUEST_WELCOME_DOC.startsWith('# '));
    assert.ok(GUEST_AI_GUIDE_DOC.startsWith('# '));
    assert.ok(!GUEST_WELCOME_DOC.startsWith('**AI Podium'));
    assert.ok(!GUEST_AI_GUIDE_DOC.startsWith('**AI Podium'));
  });

  await t.test('Multi-tab prevention filter retains only single document on startup', () => {
    const rawTabs = ['welcome.md', 'ai_guide.md'];
    let safeTabs = rawTabs;
    if (safeTabs.includes('welcome.md') && safeTabs.includes('ai_guide.md')) {
      safeTabs = safeTabs.filter((t) => t !== 'ai_guide.md');
    }
    assert.deepEqual(safeTabs, ['welcome.md']);
  });
});
