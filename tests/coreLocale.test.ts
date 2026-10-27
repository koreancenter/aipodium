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
