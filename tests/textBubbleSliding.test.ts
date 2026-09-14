import test from 'node:test';
import assert from 'node:assert/strict';

function calculateTextBubbleBounds(
  containerWidth: number,
  positionLeft: number,
  isExpanded: boolean,
  safeRightMargin = 20,
  safeLeftMargin = 8
): { left: number; width: number } {
  const menuWidth = isExpanded ? 485 : 85;
  const maxAllowedLeft = Math.max(safeLeftMargin, containerWidth - menuWidth - safeRightMargin);

  let finalLeft = positionLeft;
  if (finalLeft > maxAllowedLeft) {
    finalLeft = maxAllowedLeft;
  }
  if (finalLeft < safeLeftMargin) {
    finalLeft = safeLeftMargin;
  }

  return { left: finalLeft, width: menuWidth };
}

test('Text bubble menu collapsed compact button is small and well positioned', () => {
  const collapsed = calculateTextBubbleBounds(800, 150, false);
  assert.equal(collapsed.width, 85);
  assert.equal(collapsed.left, 150);
  assert.ok(collapsed.left + collapsed.width <= 800 - 20);
});

test('Text bubble menu expands sideways and clamps safely within container bounds', () => {
  // When cursor is near the right edge (e.g. 600px on an 800px editor pane)
  // 800 - 485 - 20 = 295px
  const expandedFarRight = calculateTextBubbleBounds(800, 600, true);
  assert.equal(expandedFarRight.width, 485);
  assert.equal(expandedFarRight.left, 295);
  assert.ok(expandedFarRight.left + expandedFarRight.width <= 800 - 20, 'Expanded menu must stay inside safe right margin');

  // In narrow 500px pane, cursor at 200px:
  // 500 - 485 - 20 = -5 -> clamped to safeLeftMargin (8px)
  const expandedNarrow = calculateTextBubbleBounds(500, 200, true);
  assert.equal(expandedNarrow.left, 8);
});
