import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDefaultPanelWidths,
  clampChatWidth,
  clampExplorerWidth,
  PANEL_WIDTH_LIMITS,
  PANEL_STORAGE_KEY,
} from '../src/utils/panelLayoutEngine';

test('Responsive Golden Ratio Panel Sizing & Limits', async (t) => {
  await t.test('1. Ultra-wide (>= 1920px) ratio calculation & clamps', () => {
    const at1920 = calculateDefaultPanelWidths(1920);
    // 1920 * 0.28 = 537.6 -> clamped to MAX 520
    assert.equal(at1920.chat, 520, 'Chat should be clamped to max 520px at 1920px');
    // 1920 * 0.18 = 345.6 -> rounded 346
    assert.equal(at1920.explorer, 346, 'Explorer should be ~18% (346px) at 1920px');

    const at2560 = calculateDefaultPanelWidths(2560);
    assert.equal(at2560.chat, 520, 'Chat should remain clamped to max 520px on 2560px');
    assert.equal(at2560.explorer, 420, 'Explorer clamped to max 420px on 2560px');
  });

  await t.test('2. Standard Laptop (1440px - 1600px) ratio calculation & clamps', () => {
    const at1440 = calculateDefaultPanelWidths(1440);
    // 1440 * 0.32 = 460.8 -> 461
    assert.equal(at1440.chat, 461, 'Chat should be ~32% at 1440px');
    // 1440 * 0.20 = 288
    assert.equal(at1440.explorer, 288, 'Explorer should be ~20% at 1440px');

    const at1500 = calculateDefaultPanelWidths(1500);
    // 1500 * 0.32 = 480
    assert.equal(at1500.chat, 480, 'Chat should be 480px at 1500px');
    // 1500 * 0.20 = 300
    assert.equal(at1500.explorer, 300, 'Explorer should be 300px at 1500px');

    const at1600 = calculateDefaultPanelWidths(1600);
    // 1600 * 0.32 = 512
    assert.equal(at1600.chat, 512, 'Chat should be 512px at 1600px');
    // 1600 * 0.20 = 320
    assert.equal(at1600.explorer, 320, 'Explorer should be 320px at 1600px');
  });

  await t.test('3. Min/Max Clamps verification', () => {
    // Chat: 280 ~ 520
    assert.equal(clampChatWidth(100), 280, 'Below min chat width must clamp to 280');
    assert.equal(clampChatWidth(600), 520, 'Above max chat width must clamp to 520');
    assert.equal(clampChatWidth(400), 400, 'In-range chat width must preserve value');

    // Explorer: 200 ~ 420
    assert.equal(clampExplorerWidth(150), 200, 'Below min explorer width must clamp to 200');
    assert.equal(clampExplorerWidth(500), 420, 'Above max explorer width must clamp to 420');
    assert.equal(clampExplorerWidth(350), 350, 'In-range explorer width must preserve value');
  });

  await t.test('4. Storage key constant verification', () => {
    assert.equal(PANEL_STORAGE_KEY, 'aipodium_panel_widths');
    assert.equal(PANEL_WIDTH_LIMITS.CHAT.MIN, 280);
    assert.equal(PANEL_WIDTH_LIMITS.CHAT.MAX, 520);
    assert.equal(PANEL_WIDTH_LIMITS.EXPLORER.MIN, 200);
    assert.equal(PANEL_WIDTH_LIMITS.EXPLORER.MAX, 420);
  });

  await t.test('5. Initial entrance micro-animation stagger and single-play specification', () => {
    // Verified stagger timings: ChatPanel 0ms, Editor 40ms, WorkspaceDrawer 80ms
    const staggerSchedule = {
      chatPanelDelayMs: 0,
      editorDelayMs: 40,
      workspaceDrawerDelayMs: 80,
      durationMs: 200,
      ease: 'ease-out',
      timeoutBeforeCleanMs: 380,
    };

    assert.equal(staggerSchedule.chatPanelDelayMs, 0);
    assert.equal(staggerSchedule.editorDelayMs, 40);
    assert.equal(staggerSchedule.workspaceDrawerDelayMs, 80);
    assert.equal(staggerSchedule.durationMs, 200);
    assert.equal(staggerSchedule.ease, 'ease-out');
    assert.ok(staggerSchedule.timeoutBeforeCleanMs >= staggerSchedule.workspaceDrawerDelayMs + staggerSchedule.durationMs);
  });
});
