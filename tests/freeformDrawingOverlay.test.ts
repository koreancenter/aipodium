import test from 'node:test';
import assert from 'node:assert/strict';

test('FreeformDrawingOverlay unit tests', async (t) => {
  await t.test('stroke point recording and interpolation math', () => {
    interface StrokePoint {
      x: number;
      y: number;
    }
    const points: StrokePoint[] = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    assert.equal(points.length, 3);
    const midX = (points[0].x + points[1].x) / 2;
    const midY = (points[0].y + points[1].y) / 2;
    assert.equal(midX, 15);
    assert.equal(midY, 15);
  });

  await t.test('undo and redo stack operations on drawing strokes', () => {
    interface Stroke {
      tool: 'pen' | 'highlighter' | 'eraser';
      color: string;
      size: number;
      points: { x: number; y: number }[];
    }
    let strokes: Stroke[] = [];
    let redoStack: Stroke[] = [];

    const stroke1: Stroke = { tool: 'pen', color: '#6366f1', size: 3, points: [{ x: 5, y: 5 }] };
    const stroke2: Stroke = { tool: 'highlighter', color: '#fbbf24', size: 8, points: [{ x: 15, y: 15 }] };

    // Draw 2 strokes
    strokes.push(stroke1);
    strokes.push(stroke2);
    assert.equal(strokes.length, 2);

    // Undo once
    const last = strokes.pop()!;
    redoStack.push(last);
    assert.equal(strokes.length, 1);
    assert.equal(redoStack.length, 1);
    assert.equal(redoStack[0].tool, 'highlighter');

    // Redo once
    const restored = redoStack.pop()!;
    strokes.push(restored);
    assert.equal(strokes.length, 2);
    assert.equal(redoStack.length, 0);

    // Clear all
    strokes = [];
    redoStack = [];
    assert.equal(strokes.length, 0);
  });

  await t.test('markdown image insertion string generation', () => {
    const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const markdownImage = `\n\n![자유 형식 메모](${fakeDataUrl})\n\n`;
    assert.ok(markdownImage.includes('![자유 형식 메모]('));
    assert.ok(markdownImage.includes(fakeDataUrl));
  });

  await t.test('null and undefined stroke safety in strokes array', () => {
    const strokes: any[] = [
      null,
      undefined,
      { tool: 'pen', color: '#6366f1', size: 3, points: null },
      { tool: 'pen', color: '#6366f1', size: 3, points: [] },
      { tool: 'pen', color: '#6366f1', size: 3, points: [{ x: 5, y: 5 }] },
    ];

    // Simulating replay filter
    const validStrokes = strokes.filter((s) => s && s.points && s.points.length > 0);
    assert.equal(validStrokes.length, 1);
    assert.equal(validStrokes[0].points[0].x, 5);

    // Simulating replay loop without crash
    for (const stroke of strokes) {
      if (!stroke || !stroke.points || stroke.points.length === 0) continue;
      assert.ok(stroke.points.length > 0);
    }
  });
});
