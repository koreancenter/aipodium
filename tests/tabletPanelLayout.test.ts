import test from 'node:test';
import assert from 'node:assert/strict';
import { isTabletLandscape } from '../src/hooks/usePaneResizer.js';

test('isTabletLandscape returns true for 9-inch or smaller tablet in landscape (e.g. Galaxy Tab 9 at 1280x800, 1024x600)', () => {
  // Mock window for 1280x800 landscape (Galaxy Tab A9 / Tab 9)
  (globalThis as any).window = {
    innerWidth: 1280,
    innerHeight: 800,
  };
  assert.equal(isTabletLandscape(), true);

  // 1024x768 landscape
  (globalThis as any).window = {
    innerWidth: 1024,
    innerHeight: 600,
  };
  assert.equal(isTabletLandscape(), true);

  // 1205x753 landscape (Tab S9)
  (globalThis as any).window = {
    innerWidth: 1205,
    innerHeight: 753,
  };
  assert.equal(isTabletLandscape(), true);
});

test('isTabletLandscape returns false for standard desktop monitors (> 1280px)', () => {
  // Standard 1080p desktop monitor
  (globalThis as any).window = {
    innerWidth: 1920,
    innerHeight: 1080,
  };
  assert.equal(isTabletLandscape(), false);

  // 1440p monitor
  (globalThis as any).window = {
    innerWidth: 2560,
    innerHeight: 1440,
  };
  assert.equal(isTabletLandscape(), false);

  // 1366x768 laptop monitor
  (globalThis as any).window = {
    innerWidth: 1366,
    innerHeight: 768,
  };
  assert.equal(isTabletLandscape(), false);
});

test('isTabletLandscape returns false for portrait mode (height > width)', () => {
  // Portrait mode on tablet (800x1280)
  (globalThis as any).window = {
    innerWidth: 800,
    innerHeight: 1280,
  };
  assert.equal(isTabletLandscape(), false);
});

test('Tablet landscape inverse synchronization logic simulation', () => {
  // Simulate the state transitions of left and right panels on tablet landscape
  let isSection1Collapsed = false; // Left panel initially open
  let isSection3Collapsed = true;  // Right panel initially collapsed
  let pane1Width = 40;
  let pane2Width = 60;

  (globalThis as any).window = {
    innerWidth: 1280,
    innerHeight: 800,
  };

  // User on tablet landscape opens right panel (Section 3)
  const openRightPanel = () => {
    if (isTabletLandscape()) {
      isSection3Collapsed = false;
      isSection1Collapsed = true; // 좌측 패널 자동 접힘 (역동기화)
      pane2Width = 70; // 중앙 70%, 우측 30%
    } else {
      isSection3Collapsed = false;
    }
  };

  openRightPanel();
  assert.equal(isSection3Collapsed, false, 'Right panel should be open');
  assert.equal(isSection1Collapsed, true, 'Left panel should be automatically collapsed in tablet landscape');
  assert.equal(pane2Width, 70, 'Center editor width should be 70%');

  // User on tablet landscape opens left panel (Section 1)
  const openLeftPanel = () => {
    if (isTabletLandscape()) {
      isSection1Collapsed = false;
      isSection3Collapsed = true; // 우측 패널 자동 접힘 (역동기화)
      pane1Width = 40;
      pane2Width = 60;
    } else {
      isSection1Collapsed = false;
    }
  };

  openLeftPanel();
  assert.equal(isSection1Collapsed, false, 'Left panel should be open');
  assert.equal(isSection3Collapsed, true, 'Right panel should be automatically collapsed in tablet landscape');
  assert.equal(pane1Width, 40, 'Left chat width should be 40%');
  assert.equal(pane2Width, 60, 'Center editor width should be 60%');
});
