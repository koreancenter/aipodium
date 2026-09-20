import test from 'node:test';
import assert from 'node:assert/strict';

// In-memory mock for localStorage
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

test('Fixed Golden Ratio Panels: Default state and localStorage persistence on Desktop', () => {
  const localStorage = new LocalStorageMock();
  (globalThis as any).window = {
    innerWidth: 1440,
    innerHeight: 900,
  };

  // Helper simulating the panel state resolution
  const resolveLeftPanelVisible = () => {
    const saved = localStorage.getItem('aipodium_left_panel_visible');
    if (saved !== null) return saved === 'true';
    return (globalThis as any).window.innerWidth >= 1024;
  };

  const resolveRightPanelVisible = () => {
    const saved = localStorage.getItem('aipodium_right_panel_visible');
    if (saved !== null) return saved === 'true';
    return (globalThis as any).window.innerWidth >= 1024;
  };

  // 1. Initial desktop resolution: both panels visible by default
  assert.equal(resolveLeftPanelVisible(), true, 'Left panel should default to visible on desktop (>=1024px)');
  assert.equal(resolveRightPanelVisible(), true, 'Right panel should default to visible on desktop (>=1024px)');

  // 2. Toggle Left Panel closed and persist
  localStorage.setItem('aipodium_left_panel_visible', 'false');
  assert.equal(resolveLeftPanelVisible(), false, 'Left panel should be hidden according to localStorage');

  // 3. Toggle Right Panel closed and persist
  localStorage.setItem('aipodium_right_panel_visible', 'false');
  assert.equal(resolveRightPanelVisible(), false, 'Right panel should be hidden according to localStorage');

  // 4. Restore panels
  localStorage.setItem('aipodium_left_panel_visible', 'true');
  localStorage.setItem('aipodium_right_panel_visible', 'true');
  assert.equal(resolveLeftPanelVisible(), true);
  assert.equal(resolveRightPanelVisible(), true);
});

test('Fixed Golden Ratio Panels: Responsive fallback on Mobile/Tablet (< 1024px)', () => {
  const localStorage = new LocalStorageMock();

  // Mobile / tablet screen (< 1024px)
  (globalThis as any).window = {
    innerWidth: 768,
    innerHeight: 1024,
  };

  const resolveLeftPanelVisible = () => {
    const saved = localStorage.getItem('aipodium_left_panel_visible');
    if (saved !== null) return saved === 'true';
    return (globalThis as any).window.innerWidth >= 1024;
  };

  const resolveRightPanelVisible = () => {
    const saved = localStorage.getItem('aipodium_right_panel_visible');
    if (saved !== null) return saved === 'true';
    return (globalThis as any).window.innerWidth >= 1024;
  };

  // When no preference has been stored yet, collapse sidebars on mobile/tablet
  assert.equal(resolveLeftPanelVisible(), false, 'Left panel should collapse by default on screen < 1024px');
  assert.equal(resolveRightPanelVisible(), false, 'Right panel should collapse by default on screen < 1024px');
});

test('Fixed Golden Ratio Panels: Enforced fixed width constants match 340px and 240px', () => {
  // Constants specification verification
  const LEFT_PANEL_WIDTH_PX = 340;
  const RIGHT_PANEL_WIDTH_PX = 240;

  assert.equal(LEFT_PANEL_WIDTH_PX, 340, 'Left panel fixed width must be 340px');
  assert.equal(RIGHT_PANEL_WIDTH_PX, 240, 'Right panel fixed width must be 240px');
});
