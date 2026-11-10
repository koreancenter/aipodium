import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { offlineSyncManager } from '../src/services/offlineSyncService';

test('Offline Sync & PWA Integrity Verification', async (t) => {
  await t.test('1. offlineSyncManager tracks dirty documents and pending count', () => {
    offlineSyncManager.clearQueue();
    assert.equal(offlineSyncManager.getState().pendingCount, 0);

    offlineSyncManager.markDirty('docs/plan.md');
    offlineSyncManager.markDirty('notes/meeting.md');
    assert.equal(offlineSyncManager.getState().pendingCount, 2);
    assert.ok(offlineSyncManager.getState().pendingPaths.includes('docs/plan.md'));
    assert.ok(offlineSyncManager.getState().pendingPaths.includes('notes/meeting.md'));

    offlineSyncManager.markSynced('docs/plan.md');
    assert.equal(offlineSyncManager.getState().pendingCount, 1);
    assert.equal(offlineSyncManager.getState().pendingPaths[0], 'notes/meeting.md');

    offlineSyncManager.clearQueue();
    assert.equal(offlineSyncManager.getState().pendingCount, 0);
  });

  await t.test('2. triggerSync invokes registered sync handlers and clears queue', async () => {
    offlineSyncManager.clearQueue();
    offlineSyncManager.markDirty('document.md');

    let handlerInvoked = false;
    const unregister = offlineSyncManager.registerSyncHandler(async () => {
      handlerInvoked = true;
    });

    await offlineSyncManager.triggerSync();
    assert.equal(handlerInvoked, true);
    assert.equal(offlineSyncManager.getState().pendingCount, 0);

    unregister();
  });

  await t.test('3. site.webmanifest and vite.config.ts define shortcuts and obsidian theme', () => {
    const manifestPath = path.resolve(process.cwd(), 'public/site.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'public/site.webmanifest must exist');

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifestContent.display, 'standalone');
    assert.equal(manifestContent.theme_color, '#121214');
    assert.equal(manifestContent.background_color, '#09090b');
    assert.ok(Array.isArray(manifestContent.shortcuts));
    assert.ok(manifestContent.shortcuts.length >= 2);

    const shortcutNames = manifestContent.shortcuts.map((s: any) => s.name);
    assert.ok(shortcutNames.includes('새 문서 작성'));
    assert.ok(shortcutNames.includes('문서 적합성 검사'));
  });

  await t.test('4. Required PWA icons exist on disk', () => {
    const requiredIcons = [
      'public/pwa-192x192.png',
      'public/pwa-512x512.png',
      'public/pwa-maskable-512x512.png',
      'public/apple-touch-icon.png',
      'public/favicon.svg',
    ];

    for (const iconPath of requiredIcons) {
      const fullPath = path.resolve(process.cwd(), iconPath);
      assert.ok(fs.existsSync(fullPath), `Icon ${iconPath} must exist on disk`);
    }
  });
});
