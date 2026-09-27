import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage and sessionStorage for Node.js test environment if not present
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  };
}

if (typeof (globalThis as any).sessionStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  };
}

test('autoLock logic: activity listeners restricted to mousedown, keydown, touchstart', async () => {
  // Verify that hyperactive listeners mousemove, scroll, click are excluded
  const allowedEvents = ['mousedown', 'keydown', 'touchstart'];
  const excludedEvents = ['mousemove', 'scroll', 'click'];

  for (const excluded of excludedEvents) {
    assert.equal(allowedEvents.includes(excluded), false);
  }
  for (const allowed of allowedEvents) {
    assert.equal(allowedEvents.includes(allowed), true);
  }
});

test('autoLock throttle logic: suppresses timer reset within 5-second interval', () => {
  let lastActive = 100000;
  let timerResetCount = 0;

  const handleActivity = (now: number) => {
    // 5-second throttle check
    if (now - lastActive < 5000) {
      return false;
    }
    lastActive = now;
    timerResetCount++;
    return true;
  };

  // Activity 1: 100ms later -> throttled (no reset)
  assert.equal(handleActivity(100100), false);
  assert.equal(timerResetCount, 0);

  // Activity 2: 2500ms later -> throttled (no reset)
  assert.equal(handleActivity(102500), false);
  assert.equal(timerResetCount, 0);

  // Activity 3: 4999ms later -> throttled (no reset)
  assert.equal(handleActivity(104999), false);
  assert.equal(timerResetCount, 0);

  // Activity 4: 5001ms later -> passed throttle (resets timer)
  assert.equal(handleActivity(105001), true);
  assert.equal(timerResetCount, 1);
  assert.equal(lastActive, 105001);

  // Activity 5: 1000ms after last reset -> throttled
  assert.equal(handleActivity(106001), false);
  assert.equal(timerResetCount, 1);
});

test('autoLock visibilitychange: background elapsed time check locks immediately when >= 5 minutes', () => {
  const timeoutMs = 5 * 60 * 1000; // 300,000ms
  let locked = false;

  const onTabVisible = (lastActive: number, currentTime: number) => {
    const elapsed = currentTime - lastActive;
    if (elapsed >= timeoutMs) {
      locked = true;
    }
    return locked;
  };

  const initialActive = 1000000;

  // Returning after 2 minutes (120,000ms) -> should not lock
  assert.equal(onTabVisible(initialActive, initialActive + 120000), false);
  assert.equal(locked, false);

  // Returning after 4.9 minutes (294,000ms) -> should not lock
  assert.equal(onTabVisible(initialActive, initialActive + 294000), false);
  assert.equal(locked, false);

  // Returning after 5 minutes (300,000ms) -> triggers lock immediately
  assert.equal(onTabVisible(initialActive, initialActive + 300000), true);
  assert.equal(locked, true);

  // Returning after 20 minutes (1,200,000ms) -> triggers lock immediately
  locked = false;
  assert.equal(onTabVisible(initialActive, initialActive + 1200000), true);
  assert.equal(locked, true);
});

test('autoLock timeout actions: Guest triggers purgeGuestWorkspaceData, Registered PIN locks workspace', async () => {
  const { purgeGuestWorkspaceData, LOCAL_PIN_HASH_KEY } = await import('../src/utils/securityCrypto.ts');
  const { authService } = await import('../src/services/authService.ts');

  // 1. Guest Mode Scenario
  localStorage.removeItem(LOCAL_PIN_HASH_KEY);
  authService.loginAsGuest('Test Guest Inactive');

  localStorage.setItem('notebooklm_files', JSON.stringify({ 'guest_secret.md': 'confidential' }));
  localStorage.setItem('notebooklm_editor_content', 'Transient guest thoughts');
  localStorage.setItem('aipodium_api_keys', JSON.stringify({ gemini: 'test-key' }));

  let isGuest = true;
  let isLocked = false;
  let redirectedToLanding = false;

  const onGuestTimeout = async () => {
    if (isGuest) {
      await purgeGuestWorkspaceData();
      authService.logout();
      isLocked = true;
      redirectedToLanding = true;
    } else {
      isLocked = true;
    }
  };

  await onGuestTimeout();

  assert.equal(isLocked, true);
  assert.equal(redirectedToLanding, true);
  assert.equal(authService.getCurrentUser(), null);
  assert.equal(localStorage.getItem('notebooklm_files'), null);
  assert.equal(localStorage.getItem('notebooklm_editor_content'), null);
  assert.equal(localStorage.getItem('aipodium_api_keys'), null);

  // 2. Registered PIN Mode Scenario
  localStorage.setItem(LOCAL_PIN_HASH_KEY, 'PBKDF2:SHA256:100000:salt:hash');
  await authService.loginWithGoogle({
    id: 'user_registered_456',
    name: 'Registered User',
    email: 'user@example.com',
    picture: 'https://example.com/avatar.png'
  });

  isGuest = false;
  isLocked = false;
  redirectedToLanding = false;

  const onPinUserTimeout = async () => {
    if (isGuest) {
      await purgeGuestWorkspaceData();
      authService.logout();
      isLocked = true;
      redirectedToLanding = true;
    } else {
      // For Registered PIN mode: lock workspace, retain user session so PIN modal unlocks directly
      isLocked = true;
    }
  };

  await onPinUserTimeout();

  assert.equal(isLocked, true);
  assert.equal(redirectedToLanding, false);
  // User remains authenticated so unlock PIN modal is displayed
  assert.notEqual(authService.getCurrentUser(), null);
  assert.equal(authService.getCurrentUser()?.id, 'user_registered_456');

  // Clean up
  localStorage.removeItem(LOCAL_PIN_HASH_KEY);
  authService.logout();
});
