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

test('Auto-Project Creation on First Message & Auto-Collapsing Drawer Tests', async (t) => {
  const {
    generateProjectTitleFromPrompt,
    createProject,
    workspaceStorageService,
  } = await import('../src/services/workspaceStorageService.ts');

  await t.test('1. generateProjectTitleFromPrompt sanitizes and truncates correctly', () => {
    // Normal prompt <= 20 chars
    const shortPrompt = 'AI 포디움 아키텍처 설계';
    const shortTitle = generateProjectTitleFromPrompt(shortPrompt);
    assert.equal(shortTitle, 'AI 포디움 아키텍처 설계');

    // Prompt with punctuation stripped
    const punctPrompt = '오늘 날씨 어때? #1! [중요] 알려줘...';
    const punctTitle = generateProjectTitleFromPrompt(punctPrompt);
    assert.equal(punctTitle, '오늘 날씨 어때 1 중요 알려줘');

    // Long prompt truncated to 20 chars + '...'
    const longPrompt = 'React 19와 Vite 환경에서 작동하는 고성능 마크다운 에디터 개발';
    const longTitle = generateProjectTitleFromPrompt(longPrompt);
    assert.equal(longTitle, 'React 19와 Vite 환경에서...');
    assert.ok(longTitle.endsWith('...'));

    // Empty or punctuation-only prompt fallbacks to '새 프로젝트'
    assert.equal(generateProjectTitleFromPrompt(''), '새 프로젝트');
    assert.equal(generateProjectTitleFromPrompt('   '), '새 프로젝트');
    assert.equal(generateProjectTitleFromPrompt('!@#$%^&*()'), '새 프로젝트');
  });

  await t.test('2. createProject creates and persists new project into storage', async () => {
    localStorage.clear();

    const title = '신규 AI 프로젝트';
    const project = await createProject(title, {
      fileName: 'tech_notes.md',
      editorContent: '# 신규 AI 프로젝트\n\n내용',
    });

    assert.ok(project.id.startsWith('project-'));
    assert.equal(project.title, title);
    assert.equal(project.fileName, 'tech_notes.md');
    assert.equal(project.editorTab, 'wysiwyg');
    assert.deepEqual(project.messages, []);

    // Verify localStorage fallback persistence
    const savedSessions = localStorage.getItem('aipodium_projects_sessions');
    assert.ok(savedSessions);
    const parsed = JSON.parse(savedSessions);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed[0].id, project.id);
    assert.equal(parsed[0].title, title);

    assert.equal(localStorage.getItem('aipodium_active_session_id'), project.id);
  });

  await t.test('3. workspaceStorageService proxy binds createProject seamlessly', async () => {
    const title = 'Proxy Test Project';
    const project = await workspaceStorageService.createProject(title);
    assert.equal(project.title, title);
    assert.ok(project.id.startsWith('project-'));
  });

  await t.test('4. Fresh session detection and auto-collapse drawer simulation', () => {
    // Simulating fresh session condition
    const freshSessionDefault = {
      id: 'session-default',
      title: 'AI 지식 비서',
      messages: [],
    };
    const isFresh =
      freshSessionDefault.id === 'session-default' ||
      freshSessionDefault.messages.length === 0 ||
      !freshSessionDefault.messages.some((m: any) => m.sender === 'user');
    assert.equal(isFresh, true);

    // Initial drawer open
    let isProjectListOpen = true;

    // First prompt sent -> drawer collapses
    if (isFresh) {
      isProjectListOpen = false;
    }
    assert.equal(isProjectListOpen, false);

    // Second prompt in established session -> already has user message, not fresh
    const activeSessionWithUserMsg = {
      id: 'project-12345',
      title: 'AI 포디움 아키텍처',
      messages: [{ sender: 'user', text: 'Hello' }],
    };
    const isFreshSecond =
      activeSessionWithUserMsg.id === 'session-default' ||
      activeSessionWithUserMsg.messages.length === 0 ||
      !activeSessionWithUserMsg.messages.some((m: any) => m.sender === 'user');
    assert.equal(isFreshSecond, false);
  });
});
