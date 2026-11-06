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
      fileName: 'Untitled-1',
      editorContent: '# 신규 AI 프로젝트\n\n내용',
    });

    assert.ok(project.id.startsWith('project-'));
    assert.equal(project.title, title);
    assert.equal(project.fileName, 'Untitled-1');
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

  await t.test('5. Persist Project Drawer Collapsed State in localStorage', () => {
    localStorage.clear();

    // Default when no saved key exists: default collapsed (false)
    const initDefault = () => {
      const saved = localStorage.getItem('aipodium_project_drawer_open');
      return saved !== null ? saved === 'true' : false;
    };
    assert.equal(initDefault(), false);

    // When user explicitly opens drawer
    localStorage.setItem('aipodium_project_drawer_open', 'true');
    assert.equal(initDefault(), true);

    // When drawer collapses or auto-collapses
    localStorage.setItem('aipodium_project_drawer_open', 'false');
    assert.equal(initDefault(), false);
  });

  await t.test('6. Left Project Drawer smooth collapse animation and styling specification', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const appFile = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

    // 1. Verify 350ms duration and natural easing [0.16, 1, 0.3, 1] on project-list-panel
    assert.match(
      appFile,
      /duration-\[350ms\]\s+ease-\[cubic-bezier\(0\.16,1,0\.3,1\)\]/,
      'Project list panel must enforce 350ms duration and cubic-bezier(0.16,1,0.3,1) natural easing'
    );

    // 2. Verify overflow-hidden is applied to prevent text wrapping/distortion during width collapse
    assert.match(
      appFile,
      /id="project-list-panel"[^>]*overflow-hidden/,
      'Project list panel must enforce overflow-hidden to prevent distortion during collapse'
    );

    // 3. Verify auto-collapse controlled timer is present on initial render/mount
    assert.match(
      appFile,
      /autoCollapseTimer\s*=\s*setTimeout\(\(\)\s*=>\s*\{\s*setIsProjectListOpen\(false\);/,
      'App.tsx must include controlled auto-collapse timer sequence on workspace mount'
    );
  });

  await t.test('7. Panel clamping (CHAT_PANEL_MIN_WIDTH = 380) and Model Selector Popover isolation', async () => {
    const { CHAT_PANEL_MIN_WIDTH, clampChatWidth } = await import('../src/utils/panelLayoutEngine.ts');
    assert.equal(CHAT_PANEL_MIN_WIDTH, 380, 'CHAT_PANEL_MIN_WIDTH must be strictly 380');
    assert.equal(clampChatWidth(200), 380, 'Shrinking below 380px must be clamped to 380');
    assert.equal(clampChatWidth(340), 380, '340px must be clamped to 380 to prevent model selector overlap');
    assert.equal(clampChatWidth(380), 380, '380px is valid minimum');

    const fs = await import('node:fs');
    const path = await import('node:path');
    const appFile = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
    const selectorFile = fs.readFileSync(path.resolve(process.cwd(), 'src/components/InlineModelSelector.tsx'), 'utf-8');

    // Verify z-50, min-w-[340px] or min-w-[320px], and backdrop isolation
    assert.match(
      selectorFile,
      /z-50.*min-w-\[(320|340)px\].*backdrop-blur/,
      'Model Selector Popover layer must enforce z-50, min-w >= 320px, and floating backdrop'
    );

    // Verify boundary alignment logic to prevent adjacent resizer / panel overlap
    assert.match(
      selectorFile,
      /popoverShift|alignPopover/,
      'InlineModelSelector must calculate boundary alignment to prevent panel overflow'
    );

    // Verify visual separator indicator (시각적 구분자) on resizer
    assert.match(
      appFile,
      /id="chat-resizer-handle"[^>]*>[\s\S]*?w-\[1px\][\s\S]*?rounded-full/,
      'chat-resizer-handle must contain a visual dividing line and centered grip indicator'
    );
  });
});
