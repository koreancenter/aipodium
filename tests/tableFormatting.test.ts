import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTableAtCursor,
  toggleTableCellFormat
} from '../src/utils/markdownTableHelper';

test('Table cell formatting: toggles bold on and off for a data cell', () => {
  const doc = `| 기능 | 상태 |\n| :--- | :--- |\n| 로그인 | 완료 |\n`;
  // Place cursor in data row 0, col 0 ('로그인')
  const cursor = doc.indexOf('로그인') + 1;
  const table = getTableAtCursor(doc, cursor);
  assert.ok(table, 'Table must be detected');
  assert.equal(table.isHeader, false);
  assert.equal(table.isSeparator, false);

  // 1. Toggle bold ON
  const resBoldOn = toggleTableCellFormat(table, 'bold', doc, cursor, cursor);
  assert.ok(resBoldOn.nextDocText.includes('**로그인**'), 'Cell text should be wrapped in **');

  // 2. Toggle bold OFF on the updated document
  const tableUpdated = getTableAtCursor(resBoldOn.nextDocText, resBoldOn.newCursorStart);
  assert.ok(tableUpdated);
  const resBoldOff = toggleTableCellFormat(tableUpdated, 'bold', resBoldOn.nextDocText, resBoldOn.newCursorStart, resBoldOn.newCursorStart);
  assert.ok(!resBoldOff.nextDocText.includes('**로그인**'), 'Cell text should have ** stripped');
  assert.ok(resBoldOff.nextDocText.includes('로그인'), 'Cell text should still have "로그인"');
});

test('Table cell formatting: toggles italic on and off for a header cell', () => {
  const doc = `| 기능 | 상태 |\n| :--- | :--- |\n| 로그인 | 완료 |\n`;
  const cursor = doc.indexOf('상태') + 1;
  const table = getTableAtCursor(doc, cursor);
  assert.ok(table);
  assert.equal(table.isHeader, true);

  // 1. Toggle italic ON
  const resItalicOn = toggleTableCellFormat(table, 'italic', doc, cursor, cursor);
  assert.ok(resItalicOn.nextDocText.includes('*상태*'), 'Header should be wrapped in *');

  // 2. Toggle italic OFF
  const tableUpdated = getTableAtCursor(resItalicOn.nextDocText, resItalicOn.newCursorStart);
  assert.ok(tableUpdated);
  const resItalicOff = toggleTableCellFormat(tableUpdated, 'italic', resItalicOn.nextDocText, resItalicOn.newCursorStart, resItalicOn.newCursorStart);
  assert.ok(!resItalicOff.nextDocText.includes('*상태*'), 'Header should have * stripped');
  assert.ok(resItalicOff.nextDocText.includes('상태'));
});

test('Table cell formatting: handles partial selection within a cell', () => {
  const doc = `| 상세 내용 |\n| :--- |\n| 사용자 시나리오 |\n`;
  const start = doc.indexOf('시나리오');
  const end = start + '시나리오'.length;

  const table = getTableAtCursor(doc, start);
  assert.ok(table);

  // Toggle bold on selected substring '시나리오'
  const res = toggleTableCellFormat(table, 'bold', doc, start, end);
  assert.ok(res.nextDocText.includes('사용자 **시나리오**'));

  // Toggle bold off on the highlighted '**시나리오**'
  const newStart = res.nextDocText.indexOf('**시나리오**');
  const newEnd = newStart + '**시나리오**'.length;
  const table2 = getTableAtCursor(res.nextDocText, newStart);
  assert.ok(table2);
  const resOff = toggleTableCellFormat(table2, 'bold', res.nextDocText, newStart, newEnd);
  assert.ok(resOff.nextDocText.includes('사용자 시나리오'));
});

test('Table cell formatting: safely ignores separator line', () => {
  const doc = `| A | B |\n| :--- | :--- |\n| 1 | 2 |\n`;
  const sepPos = doc.indexOf(':---') + 1;
  const table = getTableAtCursor(doc, sepPos);
  assert.ok(table);
  assert.equal(table.isSeparator, true);

  const res = toggleTableCellFormat(table, 'bold', doc, sepPos, sepPos);
  assert.equal(res.nextDocText, doc, 'Document must be unchanged on separator row');
});
