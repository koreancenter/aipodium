import test from 'node:test';
import assert from 'node:assert/strict';
import { getCoreTranslations } from '../src/locales/coreLocale';

test('core menu and explorer resources expose matching Korean and English keys', () => {
  const korean = getCoreTranslations('ko');
  const english = getCoreTranslations('en');

  assert.deepEqual(Object.keys(korean.menu).sort(), Object.keys(english.menu).sort());
  assert.deepEqual(Object.keys(korean.explorer).sort(), Object.keys(english.explorer).sort());
  assert.equal(korean.menu.newProject, '새 프로젝트');
  assert.equal(english.menu.newProject, 'New project');
  assert.equal(korean.explorer.noResults('보고서'), "'보고서' 검색 결과가 없습니다.");
  assert.equal(english.explorer.noResults('report'), "No results for 'report'.");
});

import { getSettingsTranslations } from '../src/locales/settingsLocale';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
}

test('settings locale has identical ko/en keys', () => {
  assert.deepEqual(keyPaths(getSettingsTranslations('en')), keyPaths(getSettingsTranslations('ko')));
});

import { getEditorTranslations } from '../src/locales/editorLocale';

test('editor locale has identical ko/en keys', () => {
  assert.deepEqual(keyPaths(getEditorTranslations('en')), keyPaths(getEditorTranslations('ko')));
});

import { getAppMessages, formatMessage } from '../src/locales/appMessages';
import { setActiveLanguage } from '../src/locales/language';

test('app messages keep ko/en keys and placeholders identical', () => {
  const ko = getAppMessages('ko') as Record<string, string>;
  const en = getAppMessages('en') as Record<string, string>;
  assert.deepEqual(Object.keys(en), Object.keys(ko));
  for (const key of Object.keys(ko)) {
    const slots = (text: string) => [...new Set(text.match(/\{\d+\}/g) ?? [])].sort();
    assert.deepEqual(slots(en[key]), slots(ko[key]), key);
  }
  assert.equal(formatMessage('{1}-{0}', ['a', 'b']), 'b-a');
  setActiveLanguage('ko');
});
