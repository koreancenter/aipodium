import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectBrowserLanguage,
  normalizeLanguagePreference,
  resolveAppLanguage,
  resolveInitialLanguagePreference
} from '../src/locales/language.js';

test('1. detectBrowserLanguage inspects preferred languages according to specifications', () => {
  // If any preferred language starts with 'ko', return 'ko'
  assert.equal(detectBrowserLanguage(['ko-KR', 'en-US']), 'ko');
  assert.equal(detectBrowserLanguage(['ko']), 'ko');

  // If it starts with 'en', return 'en'
  assert.equal(detectBrowserLanguage(['en-US', 'ko-KR']), 'en');
  assert.equal(detectBrowserLanguage(['en-GB']), 'en');

  // Skips non-supported languages and picks first matching
  assert.equal(detectBrowserLanguage(['fr-CA', 'en-US', 'ko-KR']), 'en');
  assert.equal(detectBrowserLanguage(['ja-JP', 'ko-KR']), 'ko');

  // Default fallback: 'ko' when unsupported or empty
  assert.equal(detectBrowserLanguage(['fr-FR', 'de-DE']), 'ko');
  assert.equal(detectBrowserLanguage([]), 'ko');
});

test('2. Integrated mode handling: AUTO vs manual pin', () => {
  // When set to 'auto', resolve dynamically using detectBrowserLanguage
  assert.equal(resolveAppLanguage('auto', ['en-US']), 'en');
  assert.equal(resolveAppLanguage('auto', ['ko-KR']), 'ko');
  assert.equal(resolveAppLanguage('auto', ['es-ES']), 'ko');

  // Legacy 'system' compatibility
  assert.equal(resolveAppLanguage('system', ['en-US']), 'en');
  assert.equal(resolveAppLanguage('system', ['ko-KR']), 'ko');

  // When explicitly pinned to 'ko' or 'en', override browser settings
  assert.equal(resolveAppLanguage('ko', ['en-US']), 'ko');
  assert.equal(resolveAppLanguage('en', ['ko-KR']), 'en');
});

test('3. Initial preference resolution and normalization', () => {
  assert.equal(resolveInitialLanguagePreference(null, 'KR'), 'ko');
  assert.equal(resolveInitialLanguagePreference(null, 'ENG'), 'en');
  assert.equal(resolveInitialLanguagePreference(null, null), 'auto');
  assert.equal(resolveInitialLanguagePreference('auto', 'ENG'), 'auto');
  assert.equal(resolveInitialLanguagePreference('system', 'ENG'), 'auto');
  assert.equal(resolveInitialLanguagePreference('ko', 'ENG'), 'ko');
  assert.equal(resolveInitialLanguagePreference('en', 'KR'), 'en');

  assert.equal(normalizeLanguagePreference('auto'), 'auto');
  assert.equal(normalizeLanguagePreference('system'), 'auto');
  assert.equal(normalizeLanguagePreference('ko'), 'ko');
  assert.equal(normalizeLanguagePreference('en'), 'en');
  assert.equal(normalizeLanguagePreference('invalid'), 'auto');
});

test('4. App.tsx and LanguageContext integrate languagechange listener and document.documentElement.lang sync', () => {
  const appPath = path.resolve('./src/App.tsx');
  const contextPath = path.resolve('./src/context/LanguageContext.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');
  const contextContent = fs.readFileSync(contextPath, 'utf-8');

  // App.tsx uses useLanguage hook and registers languagechange listener
  assert.ok(appContent.includes('useLanguage'), 'App.tsx must consume useLanguage hook');
  assert.ok(appContent.includes('document.documentElement.lang = language'), 'App.tsx must sync html lang attribute');
  assert.ok(appContent.includes("addEventListener('languagechange'"), 'App.tsx must register languagechange listener');

  // LanguageContext listens to languagechange and synchronizes html lang tag
  assert.ok(contextContent.includes("window.addEventListener('languagechange'"), 'LanguageContext must listen to languagechange');
  assert.ok(contextContent.includes('document.documentElement.lang = language'), 'LanguageContext must sync html lang tag');
});

