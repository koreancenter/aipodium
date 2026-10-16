import test from 'node:test';
import assert from 'node:assert/strict';

function calculateTableBubbleLeft(
  containerWidth: number,
  cursorVisibleLeft: number,
  menuWidth = 365,
  rightSafeMargin = 24,
  leftSafeMargin = 12
): number {
  const maxAllowedLeft = Math.max(leftSafeMargin, containerWidth - menuWidth - rightSafeMargin);
  const clampedLeft = Math.max(leftSafeMargin, Math.min(maxAllowedLeft, cursorVisibleLeft - 40));
  return clampedLeft;
}

test('Table bubble menu never overflows into right panel or divider', () => {
  // Test 1: Desktop width 800px, cursor at far right (col 5 at 650px)
  const leftDesktopFarRight = calculateTableBubbleLeft(800, 650);
  // Max allowed left should be 800 - 365 - 24 = 411px
  assert.equal(leftDesktopFarRight, 411);
  assert.ok(leftDesktopFarRight + 365 <= 800 - 24, 'Right edge must have at least 24px safe margin');

  // Test 2: Tablet/medium split view width 500px, cursor at col 3 at 450px
  const leftTabletFarRight = calculateTableBubbleLeft(500, 450);
  // Max allowed left should be 500 - 365 - 24 = 111px
  assert.equal(leftTabletFarRight, 111);
  assert.ok(leftTabletFarRight + 365 <= 500 - 24, 'Right edge must have at least 24px safe margin');

  // Test 3: Narrow pane width 380px, cursor at 300px
  const leftNarrow = calculateTableBubbleLeft(380, 300);
  // Max allowed left is 380 - 365 - 24 = -9 -> clamped to leftSafeMargin (12px)
  assert.equal(leftNarrow, 12);

  // Test 4: Cursor at left edge (col 1 at 20px)
  const leftFarLeft = calculateTableBubbleLeft(700, 20);
  // cursorVisibleLeft - 40 is -20 -> clamped to leftSafeMargin (12px)
  assert.equal(leftFarLeft, 12);
});
