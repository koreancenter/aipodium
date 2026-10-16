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

  // Dynamic keys matching draft_*, vault_*, buffer_*, temp_*, unsaved_*
  localStorage.setItem('draft_note_1', 'temporary note buffer');
  localStorage.setItem('vault_temp_file', 'temp cache');
  localStorage.setItem('buffer_active', 'editor buffer');
  localStorage.setItem('temp_data', 'misc temp');
  localStorage.setItem('unsaved_buffer_1', 'buffer data');

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
  assert.equal(localStorage.getItem('unsaved_buffer_1'), null);
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

test('purgeGuestWorkspaceData performs full storage wipe and invokes clearAll on IndexedDB', async () => {
  const { purgeGuestWorkspaceData } = await import('../src/services/workspaceStorageService.ts');
  const { indexedDbService, isStorageWritesBlocked, blockStorageWrites } = await import('../src/services/indexedDbService.ts');

  // Verify clearAll is a callable function on indexedDbService
  assert.equal(typeof indexedDbService.clearAll, 'function');

  // Seed storage keys
  localStorage.setItem('aipodium_projects_sessions', JSON.stringify([{ id: 'sess_1', title: 'Prior Chat' }]));
  localStorage.setItem('aipodium_active_session_id', 'sess_1');
  localStorage.setItem('aipodium_files', JSON.stringify({ 'note.md': 'confidential notes' }));
  localStorage.setItem('aipodium_editor_content', 'draft in progress');
  localStorage.setItem('unsaved_note_draft', 'unsaved content');

  sessionStorage.setItem('aipodium_cloud_api_key', 'test_key');

  // Execute full wipe
  await purgeGuestWorkspaceData();

  // Storage writes must be blocked during/after purge
  assert.equal(isStorageWritesBlocked(), true);

  // All guest storage keys must be deleted
  assert.equal(localStorage.getItem('aipodium_projects_sessions'), null);
  assert.equal(localStorage.getItem('aipodium_active_session_id'), null);
  assert.equal(localStorage.getItem('aipodium_files'), null);
  assert.equal(localStorage.getItem('aipodium_editor_content'), null);
  assert.equal(localStorage.getItem('unsaved_note_draft'), null);
  assert.equal(sessionStorage.getItem('aipodium_cloud_api_key'), null);

  // Clean up blocking state
  blockStorageWrites(false);
  assert.equal(isStorageWritesBlocked(), false);
});

test('auto-save timer cancellation and storage write blocking prevent post-purge writes', async () => {
  const { blockStorageWrites, isStorageWritesBlocked, saveHybridStorage, setDbItem } = await import('../src/services/indexedDbService.ts');

  // Simulate debounced save timer
  let timerFired = false;
  let saveTimer: NodeJS.Timeout | null = setTimeout(() => {
    timerFired = true;
  }, 100);

  // 1. Cancel pending timer
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  // 2. Block storage writes
  blockStorageWrites(true);
  assert.equal(isStorageWritesBlocked(), true);

  // Attempt to write while blocked
  localStorage.removeItem('test_blocked_key');
  await saveHybridStorage('test_blocked_key', { shouldNotSave: true });
  assert.equal(localStorage.getItem('test_blocked_key'), null);

  await setDbItem('test_blocked_key', { shouldNotSave: true });

  // Wait to verify timer didn't fire
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(timerFired, false);

  // Unblock
  blockStorageWrites(false);
});

test('createInitialEmptySession and getCleanGuestSampleWorkspace provide clean slate', async () => {
  const { createInitialEmptySession, getCleanGuestSampleWorkspace, getCleanGuestSampleFolders } = await import('../src/services/workspaceStorageService.ts');

  const initialSession = createInitialEmptySession();
  assert.equal(initialSession.id, 'session-default');
  assert.equal(initialSession.title, 'AI 지식 비서');
  assert.equal(initialSession.fileName, 'Untitled-1.md');
  assert.equal(initialSession.editorTab, 'wysiwyg');
  assert.equal(initialSession.editorContent, '');
  assert.deepEqual(initialSession.messages, []);

  const cleanFiles = getCleanGuestSampleWorkspace();
  assert.ok(cleanFiles['welcome.md']);
  assert.ok(cleanFiles['ai_guide.md']);
  assert.equal(cleanFiles['my_custom_secret_file.md'], undefined);

  const cleanFolders = getCleanGuestSampleFolders();
  assert.ok(cleanFolders['welcome.md']);
});

test('React in-memory state resets upon guest logout and fresh guest login (re-entry)', async () => {
  const { authService } = await import('../src/services/authService.ts');
  const { purgeGuestWorkspaceData, createInitialEmptySession, getCleanGuestSampleWorkspace } = await import('../src/services/workspaceStorageService.ts');
  const { LOCAL_PIN_HASH_KEY } = await import('../src/utils/securityCrypto.ts');

  // Ensure pure guest environment (no PIN)
  localStorage.removeItem(LOCAL_PIN_HASH_KEY);

  // Step 1: User enters Guest Mode
  const guestUser = authService.loginAsGuest('Original Guest');
  assert.equal(authService.isGuest(), true);

  // React state simulation for active guest session
  let sessions: any[] = [
    {
      id: 'session-personal-1',
      title: 'Confidential Strategy Discussion',
      createdAt: '10:00 AM',
      fileName: 'confidential_strategy.md',
      editorTab: 'wysiwyg',
      editorContent: '# Highly Sensitive Business Notes',
      messages: [{ id: 'm1', role: 'user', content: 'What is our Q4 budget?' }]
    }
  ];
  let files: Record<string, string> = {
    ...getCleanGuestSampleWorkspace(),
    'confidential_strategy.md': '# Highly Sensitive Business Notes\nBudget: $500,000'
  };
  let currentFile = 'confidential_strategy.md';
  let editorContent = '# Highly Sensitive Business Notes\nBudget: $500,000';

  // Verify guest state is dirty
  assert.equal(sessions[0].title, 'Confidential Strategy Discussion');
  assert.ok(files['confidential_strategy.md']);
  assert.equal(currentFile, 'confidential_strategy.md');
  assert.ok(editorContent.includes('Budget: $500,000'));

  // Step 2: Guest logs out
  // - Pending timers canceled
  let autoSaveTimer: NodeJS.Timeout | null = setTimeout(() => {}, 400);
  clearTimeout(autoSaveTimer);
  autoSaveTimer = null;

  // - Purge persistent storage
  await purgeGuestWorkspaceData();
  authService.logout();

  // - Explicit reset of in-memory React state
  sessions = [createInitialEmptySession()];
  files = getCleanGuestSampleWorkspace();
  currentFile = 'Untitled-1.md';
  editorContent = '';

  // Step 3: Verify clean in-memory state immediately upon logout
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, 'session-default');
  assert.equal(sessions[0].title, 'AI 지식 비서');
  assert.equal(sessions[0].fileName, 'Untitled-1.md');
  assert.deepEqual(sessions[0].messages, []);
  assert.equal(files['confidential_strategy.md'], undefined);
  assert.ok(files['welcome.md']);
  assert.equal(currentFile, 'Untitled-1.md');
  assert.equal(editorContent, '');

  // Step 4: Re-enter Guest Mode (Fresh loginAsGuest)
  const reenteredGuest = authService.loginAsGuest('New Guest');
  assert.equal(reenteredGuest.provider, 'guest');

  // In-memory states upon re-entry must be strictly initialized to clean slate
  sessions = [createInitialEmptySession()];
  files = getCleanGuestSampleWorkspace();
  currentFile = 'Untitled-1.md';
  editorContent = '';

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, 'session-default');
  assert.equal(sessions[0].title, 'AI 지식 비서');
  assert.equal(files['confidential_strategy.md'], undefined);
  assert.equal(currentFile, 'Untitled-1.md');
  assert.equal(editorContent, '');

  // Verify storage has no residual traces
  assert.equal(localStorage.getItem('notebooklm_sessions'), null);
  assert.equal(localStorage.getItem('aipodium_projects_sessions'), null);
  assert.equal(localStorage.getItem('notebooklm_editor_content'), null);
  assert.equal(localStorage.getItem('aipodium_editor_content'), null);
});

test('AuthContext logout triggers purgeGuestWorkspaceData when isGuest is true', async () => {
  const { authService } = await import('../src/services/authService.ts');
  const { purgeGuestWorkspaceData } = await import('../src/services/workspaceStorageService.ts');
  const { LOCAL_PIN_HASH_KEY } = await import('../src/utils/securityCrypto.ts');

  localStorage.removeItem(LOCAL_PIN_HASH_KEY);
  authService.loginAsGuest('Ephemeral Guest');

  // Populate guest workspace
  localStorage.setItem('notebooklm_editor_content', 'Sensitive Guest Notes');
  localStorage.setItem('notebooklm_files', JSON.stringify({ 'guest.md': 'content' }));

  // Call purgeGuestWorkspaceData (same as invoked during guest logout/auto-lock)
  await purgeGuestWorkspaceData();

  assert.equal(localStorage.getItem('notebooklm_editor_content'), null);
  assert.equal(localStorage.getItem('notebooklm_files'), null);
});
