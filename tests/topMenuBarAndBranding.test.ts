import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('TopMenuBar component extraction & v0.0.8 branding verification', async (t) => {
  await t.test('1. package.json is updated to v0.0.8', () => {
    const pkgRaw = fs.readFileSync(path.resolve('./package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    assert.equal(pkg.version, '0.0.8');
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

  await t.test('3. App.tsx mounts TopMenuBar and displays v0.0.8 semantic version badge', () => {
    const appPath = path.resolve('./src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');

    // Branding semantic badge
    assert.ok(content.includes('v0.0.8'), 'App.tsx must include v0.0.8 badge');
    assert.ok(content.includes('<TopMenuBar'), 'App.tsx must render <TopMenuBar component');

    // Guest header badge updated
    assert.ok(
      content.includes('가이드 v0.0.8'),
      'Left chat panel header must have updated guide version badge'
    );
  });

  await t.test('4. AuthPage & authLocale display v0.0.8 version badge instead of beta', () => {
    const localePath = path.resolve('./src/locales/authLocale.ts');
    const localeContent = fs.readFileSync(localePath, 'utf-8');
    assert.ok(localeContent.includes("betaTag: 'v0.0.8'"), 'authLocale must set betaTag to v0.0.8');

    const authPagePath = path.resolve('./src/components/AuthPage.tsx');
    const authPageContent = fs.readFileSync(authPagePath, 'utf-8');
    assert.ok(authPageContent.includes('{t.betaTag}'), 'AuthPage must render t.betaTag');
    assert.ok(authPageContent.includes('font-mono'), 'AuthPage badge must have font-mono style');
  });
});
