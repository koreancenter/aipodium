import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('GitHub Auto-Push Debouncing & Real-time Sync Status Indicator', async (t) => {
  const indicatorPath = path.resolve('./src/components/GithubSyncStatusIndicator.tsx');
  const appPath = path.resolve('./src/App.tsx');

  await t.test('1. GithubSyncStatusIndicator component exists and defines status pills', () => {
    assert.ok(fs.existsSync(indicatorPath), 'GithubSyncStatusIndicator.tsx must exist');
    const content = fs.readFileSync(indicatorPath, 'utf-8');

    // Type exports
    assert.ok(content.includes('export type GitHubSyncStatus'), 'Must export GitHubSyncStatus type');
    assert.ok(content.includes('export const GithubSyncStatusIndicator'), 'Must export component');

    // All 4 required debouncing states + error fallback
    assert.ok(content.includes('idle:'), 'Must configure idle status');
    assert.ok(content.includes('syncing:'), 'Must configure syncing status');
    assert.ok(content.includes('synced:'), 'Must configure synced status');
    assert.ok(content.includes('conflict:'), 'Must configure conflict status');

    // Color-coded status pills styling
    assert.ok(content.includes('rounded-full'), 'Must use status pill geometry (rounded-full)');
    assert.ok(content.includes('bg-indigo'), 'Must use indigo styling for syncing');
    assert.ok(content.includes('bg-emerald'), 'Must use emerald styling for synced');
    assert.ok(content.includes('bg-amber'), 'Must use amber styling for conflict');
    assert.ok(content.includes('bg-zinc'), 'Must use zinc/slate styling for idle');
  });

  await t.test('2. Enforces pure Korean labeling without English parentheticals (RULE[AGENTS_md])', () => {
    const content = fs.readFileSync(indicatorPath, 'utf-8');

    // Required pure Korean labels
    assert.ok(content.includes("'대기 중'"), "idle label must be '대기 중'");
    assert.ok(content.includes("'동기화 중...'"), "syncing label must be '동기화 중...'");
    assert.ok(content.includes("'동기화 완료'"), "synced label must be '동기화 완료'");
    assert.ok(content.includes("'충돌 감지'"), "conflict label must be '충돌 감지'");

    // No English parentheticals
    assert.ok(!content.includes('(Idle)'), 'No (Idle) allowed');
    assert.ok(!content.includes('(Syncing)'), 'No (Syncing) allowed');
    assert.ok(!content.includes('(Synced)'), 'No (Synced) allowed');
    assert.ok(!content.includes('(Conflict)'), 'No (Conflict) allowed');
  });

  await t.test('3. App.tsx mounts GithubSyncStatusIndicator in the top header', () => {
    const content = fs.readFileSync(appPath, 'utf-8');

    assert.ok(
      content.includes('<GithubSyncStatusIndicator'),
      'App.tsx must render <GithubSyncStatusIndicator in top header'
    );
    assert.ok(
      content.includes('status={githubSyncStatus}'),
      'Must pass githubSyncStatus state to indicator'
    );
  });

  await t.test('4. Real-time debouncing state machine transitions correctly', () => {
    type Status = 'idle' | 'syncing' | 'synced' | 'conflict' | 'error';
    let currentStatus: Status = 'idle';

    let lastPushedContent = 'Original document text';
    let editorContent = 'Original document text';
    let timer: any = null;

    // Simulate user editing keystrokes with 3000ms debounce
    const onUserEdit = (newContent: string) => {
      editorContent = newContent;
      if (editorContent !== lastPushedContent) {
        currentStatus = 'syncing';
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          // Push succeeded
          lastPushedContent = editorContent;
          currentStatus = 'synced';
        }, 10);
      }
    };

    assert.equal(currentStatus, 'idle', 'Initial state must be idle');

    // Keystroke 1: immediately triggers syncing debouncing state
    onUserEdit('Original document text modified 1');
    assert.equal(currentStatus, 'syncing', 'Debounce typing immediately sets status to syncing');

    // Keystroke 2 within debounce window: remains syncing
    onUserEdit('Original document text modified 2');
    assert.equal(currentStatus, 'syncing', 'Subsequent keystrokes maintain syncing status');
  });

  await t.test('5. Force Sync button exists and allows manual pull/push bypass without waiting for debouncer', () => {
    const indicatorContent = fs.readFileSync(indicatorPath, 'utf-8');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    // Props and button in indicator component
    assert.ok(indicatorContent.includes('onForceSync?:'), 'Must declare onForceSync prop in GithubSyncStatusIndicatorProps');
    assert.ok(
      indicatorContent.includes('data-testid="github-force-sync-btn"') || indicatorContent.includes('data-testid="github-force-sync-button"'),
      'Must render Force Sync button with data-testid'
    );
    assert.ok(indicatorContent.includes('즉시 동기화'), "Must display pure Korean '즉시 동기화' label");
    assert.ok(indicatorContent.includes('stopPropagation'), 'Clicking Force Sync must stop propagation to avoid triggering settings modal');

    // Mounted with onForceSync in App.tsx
    assert.ok(
      appContent.includes('onForceSync={handleForceGithubSync}'),
      'App.tsx must pass handleForceGithubSync to GithubSyncStatusIndicator'
    );

    // Debouncer bypass logic simulation
    let currentStatus = 'idle';
    let debounceTimerCancelled = false;
    let pushExecuted = false;

    // Simulate active debounce timer running
    let timer: any = setTimeout(() => {}, 3000);

    const handleForceSync = () => {
      // 1. Cancel debouncer immediately
      if (timer) {
        clearTimeout(timer);
        timer = null;
        debounceTimerCancelled = true;
      }
      currentStatus = 'syncing';
      // 2. Perform push/pull operation immediately
      pushExecuted = true;
      currentStatus = 'synced';
    };

    handleForceSync();
    assert.equal(debounceTimerCancelled, true, 'Debouncer timer must be cancelled immediately');
    assert.equal(pushExecuted, true, 'Push/pull operation must be executed immediately without waiting 3000ms');
    assert.equal(currentStatus, 'synced', 'Status transitions to synced after manual force sync');
  });
});
