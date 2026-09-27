import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage and sessionStorage for Node.js test environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  } as any;
}

if (typeof globalThis.sessionStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  } as any;
}

test('authService accurately tracks guest user state with and without configured PIN', async () => {
  const { authService } = await import('../src/services/authService.ts');
  const { LOCAL_PIN_HASH_KEY } = await import('../src/utils/securityCrypto.ts');

  // Clear any existing PIN
  localStorage.removeItem(LOCAL_PIN_HASH_KEY);
  authService.logout();

  // No active user -> isGuest must be true
  assert.equal(authService.isGuest(), true);
  assert.equal(authService.isGuestMode, true);
  assert.equal(authService.isGuestUser(), true);

  // Guest login without PIN -> isGuest must be true
  authService.loginAsGuest('Test Explorer');
  assert.equal(authService.isGuest(), true);
  assert.equal(authService.getCurrentUser()?.provider, 'guest');
  assert.equal(authService.getCurrentUser()?.isGuest, true);

  // User logs in via Google without configured PIN -> isGuest remains true
  await authService.loginWithGoogle({
    id: 'google_123',
    name: 'Google User',
    email: 'user@example.com',
    picture: 'https://example.com/avatar.jpg'
  });
  assert.equal(authService.isGuest(), true);

  // When PIN is registered in system -> user with provider google is no longer guest
  localStorage.setItem(LOCAL_PIN_HASH_KEY, 'salt:pin_hash_here');
  assert.equal(authService.isGuest(), false);

  // Explicit guest user remains guest even if PIN exists in device
  authService.loginAsGuest('Explicit Guest');
  assert.equal(authService.isGuest(), true);

  // Clean up
  localStorage.removeItem(LOCAL_PIN_HASH_KEY);
  authService.logout();
});

test('purgeGuestSession truncates all guest localStorage keys and dynamic draft buffers', async () => {
  const { purgeGuestSession } = await import('../src/services/workspaceStorageService.ts');

  // Populate guest workspace data
  localStorage.setItem('notebooklm_files', JSON.stringify({ 'secret.md': 'guest secret note' }));
  localStorage.setItem('notebooklm_editor_content', 'Secret draft content');
  localStorage.setItem('notebooklm_sessions', JSON.stringify([{ id: 'sess_99', title: 'Top Secret' }]));
  localStorage.setItem('aipodium_api_keys', JSON.stringify({ gemini: 'AIzaSy12345' }));
  localStorage.setItem('aipodium_github_config', JSON.stringify({ token: 'ghp_secret' }));
  localStorage.setItem('aipodium_project_events', JSON.stringify([{ id: 'ev1' }]));

  // Dynamic keys matching draft_*, vault_*, buffer_*, temp_*
  localStorage.setItem('draft_note_1', 'temporary note buffer');
  localStorage.setItem('vault_temp_file', 'temp cache');
  localStorage.setItem('buffer_active', 'editor buffer');
  localStorage.setItem('temp_data', 'misc temp');

  sessionStorage.setItem('aipodium_api_keys', JSON.stringify({ gemini: 'AIzaSy12345' }));

  // Purge guest session with resetToSampleWorkspace: false (wipes everything cleanly)
  await purgeGuestSession({ resetToSampleWorkspace: false });

  // Verify all guest keys and dynamic keys are removed
  assert.equal(localStorage.getItem('notebooklm_files'), null);
  assert.equal(localStorage.getItem('notebooklm_editor_content'), null);
  assert.equal(localStorage.getItem('notebooklm_sessions'), null);
  assert.equal(localStorage.getItem('aipodium_api_keys'), null);
  assert.equal(localStorage.getItem('aipodium_github_config'), null);
  assert.equal(localStorage.getItem('aipodium_project_events'), null);
  assert.equal(localStorage.getItem('draft_note_1'), null);
  assert.equal(localStorage.getItem('vault_temp_file'), null);
  assert.equal(localStorage.getItem('buffer_active'), null);
  assert.equal(localStorage.getItem('temp_data'), null);
  assert.equal(sessionStorage.getItem('aipodium_api_keys'), null);
});

test('purgeGuestSession with resetToSampleWorkspace: true restores pristine default workspace', async () => {
  const { purgeGuestSession } = await import('../src/services/workspaceStorageService.ts');
  const { GUEST_SAMPLE_FILES } = await import('../src/data/guestSampleWorkspace.ts');

  // Fill with dummy user data
  localStorage.setItem('notebooklm_editor_content', 'User modified text before purge');
  localStorage.setItem('notebooklm_files', JSON.stringify({ 'custom.md': 'Custom user document' }));

  // Purge and reset to default sample
  await purgeGuestSession({ resetToSampleWorkspace: true });

  // Initial welcome sample document must be present in editor content and files
  const restoredContent = localStorage.getItem('notebooklm_editor_content');
  assert.equal(restoredContent, GUEST_SAMPLE_FILES['welcome.md']);

  const restoredFiles = JSON.parse(localStorage.getItem('notebooklm_files') || '{}');
  assert.ok(restoredFiles['welcome.md']);
  assert.equal(restoredFiles['custom.md'], undefined);
  assert.equal(localStorage.getItem('notebooklm_active_file'), 'welcome.md');
});

test('AuthContext logout triggers purgeGuestSession when isGuest is true', async () => {
  const { AuthContext, AuthProvider } = await import('../src/context/AuthContext.tsx');
  const { authService } = await import('../src/services/authService.ts');
  const { LOCAL_PIN_HASH_KEY } = await import('../src/utils/securityCrypto.ts');

  localStorage.removeItem(LOCAL_PIN_HASH_KEY);
  authService.loginAsGuest('Ephemeral Guest');

  // Populate guest workspace
  localStorage.setItem('notebooklm_editor_content', 'Sensitive Guest Notes');
  localStorage.setItem('notebooklm_files', JSON.stringify({ 'guest.md': 'content' }));

  // Call purgeGuestSession (same as invoked during guest logout/auto-lock)
  const { purgeGuestSession } = await import('../src/services/workspaceStorageService.ts');
  await purgeGuestSession({ resetToSampleWorkspace: true });

  const files = JSON.parse(localStorage.getItem('notebooklm_files') || '{}');
  assert.equal(files['guest.md'], undefined);
  assert.ok(files['welcome.md']);
});

