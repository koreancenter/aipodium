import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

<<<<<<< HEAD
test('TopMenuBar component extraction & v0.0.8 branding verification', async (t) => {
  await t.test('1. package.json is updated to v0.0.8', () => {
    const pkgRaw = fs.readFileSync(path.resolve('./package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    assert.equal(pkg.version, '0.0.8');
=======
test('TopMenuBar component extraction & v0.1.0 branding verification', async (t) => {
  await t.test('1. package.json is updated to v0.1.0', () => {
    const pkgRaw = fs.readFileSync(path.resolve('./package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    assert.equal(pkg.version, '0.1.0');
>>>>>>> main
  });

  await t.test('2. TopMenuBar component exists and exports TopMenuBar', async () => {
    const topMenuBarPath = path.resolve('./src/components/TopMenuBar.tsx');
    assert.ok(fs.existsSync(topMenuBarPath), 'TopMenuBar.tsx must exist');

    const content = fs.readFileSync(topMenuBarPath, 'utf-8');
    assert.ok(content.includes('export const TopMenuBar'), 'Must export TopMenuBar component');
    assert.ok(content.includes('export interface TopMenuBarProps'), 'Must export TopMenuBarProps');
    assert.ok(content.includes('새 프로젝트'), 'Must contain file menu actions');
    assert.ok(content.includes('문서 정합성 감사'), 'Must contain SSOT actions');
    assert.ok(content.includes('PDF 최적화 및 경량화'), 'Must contain PDF actions');
  });

<<<<<<< HEAD
  await t.test('3. App.tsx mounts TopMenuBar and displays v0.0.8 semantic version badge', () => {
=======
  await t.test('3. App.tsx mounts TopMenuBar and displays v0.1.0 semantic version badge', () => {
>>>>>>> main
    const appPath = path.resolve('./src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');

    // Branding semantic badge
<<<<<<< HEAD
    assert.ok(content.includes('v0.0.8'), 'App.tsx must include v0.0.8 badge');
=======
    assert.ok(content.includes('v0.1.0'), 'App.tsx must include v0.1.0 badge');
>>>>>>> main
    assert.ok(content.includes('<TopMenuBar'), 'App.tsx must render <TopMenuBar component');

    // Guest header badge updated
    assert.ok(
<<<<<<< HEAD
      content.includes('가이드 v0.0.8'),
      'Left chat panel header must have updated guide version badge'
    );
  });

  await t.test('4. AuthPage & authLocale display v0.0.8 version badge instead of beta', () => {
    const localePath = path.resolve('./src/locales/authLocale.ts');
    const localeContent = fs.readFileSync(localePath, 'utf-8');
    assert.ok(localeContent.includes("betaTag: 'v0.0.8'"), 'authLocale must set betaTag to v0.0.8');
=======
      content.includes('가이드 v0.1.0'),
      'Left chat panel header must have updated guide version badge'
    );

    // Bot icon removed from left of guide title
    assert.ok(
      !content.includes('<Bot className="w-3.5 h-3.5 text-[#6366f1] shrink-0" />\n                <span className="truncate max-w-[130px]'),
      'Bot icon to the left of AI 지식 비서 · 가이드 must be removed'
    );
  });

  await t.test('4. AuthPage & authLocale display v0.1.0 version badge instead of beta', () => {
    const localePath = path.resolve('./src/locales/authLocale.ts');
    const localeContent = fs.readFileSync(localePath, 'utf-8');
    assert.ok(localeContent.includes("betaTag: 'v0.1.0'"), 'authLocale must set betaTag to v0.1.0');
>>>>>>> main

    const authPagePath = path.resolve('./src/components/AuthPage.tsx');
    const authPageContent = fs.readFileSync(authPagePath, 'utf-8');
    assert.ok(authPageContent.includes('{t.betaTag}'), 'AuthPage must render t.betaTag');
    assert.ok(authPageContent.includes('font-mono'), 'AuthPage badge must have font-mono style');
  });
<<<<<<< HEAD
=======

  await t.test('5. Duplicate lower header in ChatPanel is removed', () => {
    const chatPanelPath = path.resolve('./src/components/chat/ChatPanel.tsx');
    const content = fs.readFileSync(chatPanelPath, 'utf-8');
    assert.ok(
      !content.includes('id="project-drawer-toggle"'),
      'Duplicate project drawer toggle button inside ChatPanel must be removed'
    );
  });

  await t.test('6. AI model indicator next to main session title in header is removed', () => {
    const appPath = path.resolve('./src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');
    assert.ok(
      !content.includes('title="현재 활성 AI 모델 (선택 및 변경은 하단 프롬프트 툴바에서 지원)"'),
      'Model indicator next to main session title must be removed'
    );
  });
>>>>>>> main
});
