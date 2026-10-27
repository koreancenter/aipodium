import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLanguagePreference,
  resolveAppLanguage,
  resolveInitialLanguagePreference
} from '../src/locales/language';

test('browser language resolution selects the first supported preferred language', () => {
  assert.equal(resolveAppLanguage('system', ['fr-CA', 'en-US', 'ko-KR']), 'en');
  assert.equal(resolveAppLanguage('system', ['ko-KR', 'en-US']), 'ko');
  assert.equal(resolveAppLanguage('system', ['fr-FR', 'de-DE']), 'ko');
});

test('explicit language preference overrides browser settings', () => {
  assert.equal(resolveAppLanguage('ko', ['en-US']), 'ko');
  assert.equal(resolveAppLanguage('en', ['ko-KR']), 'en');
});

test('existing authentication language selection migrates without losing user choice', () => {
  assert.equal(resolveInitialLanguagePreference(null, 'KR'), 'ko');
  assert.equal(resolveInitialLanguagePreference(null, 'ENG'), 'en');
  assert.equal(resolveInitialLanguagePreference(null, null), 'system');
  assert.equal(resolveInitialLanguagePreference('system', 'ENG'), 'system');
});

test('invalid saved preference falls back to browser-following mode', () => {
  assert.equal(normalizeLanguagePreference('invalid'), 'system');
  assert.equal(normalizeLanguagePreference('en'), 'en');
});
