import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. FileTreeContextMenu conforms to RULE[AGENTS_md] pure Korean labeling standard', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/FileTreeContextMenu.tsx');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Verify pure Korean action labels
  assert.match(fileContent, /새 파일/);
  assert.match(fileContent, /새 폴더/);
  assert.match(fileContent, /이름 변경/);
  assert.match(fileContent, /삭제/);
  assert.match(fileContent, /경로 복사/);

  // Prohibit English parentheticals like (Delete), (Rename), (New File)
  assert.doesNotMatch(fileContent, /\(Delete\)/i);
  assert.doesNotMatch(fileContent, /\(Rename\)/i);
  assert.doesNotMatch(fileContent, /\(New File\)/i);
  assert.doesNotMatch(fileContent, /\(Open\)/i);
  assert.doesNotMatch(fileContent, /\(Save\)/i);
});

test('2. FileTreeContextMenu applies obsidian dark theme tokens and sharp 1px borders', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/FileTreeContextMenu.tsx');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Obsidian dark theme container & border tokens
  assert.match(fileContent, /bg-\[#121214\]/);
  assert.match(fileContent, /border-\[#222226\]/);
  assert.match(fileContent, /hover:bg-\[#18181b\]/);
});

test('3. App.tsx mounts FileTreeContextMenu and attaches onContextMenu to file tree items', () => {
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  // Mounted component
  assert.match(appContent, /<FileTreeContextMenu/);
  assert.match(appContent, /handleOpenFileTreeContextMenu/);

  // Attached to file tree elements
  assert.match(appContent, /onContextMenu=\{handleOpenFileTreeContextMenu\}/);
});

test('4. RecursiveFolderTree accepts and propagates onContextMenu to subfolders and files', () => {
  const treePath = path.resolve(process.cwd(), 'src/components/RecursiveFolderTree.tsx');
  const treeContent = fs.readFileSync(treePath, 'utf-8');

  assert.match(treeContent, /onContextMenu\?: \(e: React\.MouseEvent/);
  assert.match(treeContent, /onContextMenu=\{onContextMenu\}/);
});

test('5. Viewport clamping logic prevents off-screen clipping', () => {
  const menuWidth = 175;
  const menuHeight = 220;
  const padding = 8;
  const windowWidth = 1000;
  const windowHeight = 800;

  const clampCoords = (x: number, y: number) => ({
    x: Math.min(Math.max(padding, x), windowWidth - menuWidth - padding),
    y: Math.min(Math.max(padding, y), windowHeight - menuHeight - padding),
  });

  // Normal inside position
  const pos1 = clampCoords(200, 300);
  assert.equal(pos1.x, 200);
  assert.equal(pos1.y, 300);

  // Near right edge
  const pos2 = clampCoords(950, 300);
  assert.equal(pos2.x, windowWidth - menuWidth - padding);

  // Near bottom edge
  const pos3 = clampCoords(200, 750);
  assert.equal(pos3.y, windowHeight - menuHeight - padding);
});

test('6. FileTreeContextMenu provides quick actions for New File, Rename, and Delete directly', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/FileTreeContextMenu.tsx');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Verify presence of quick action handlers
  assert.match(fileContent, /onNewFile/);
  assert.match(fileContent, /onRename/);
  assert.match(fileContent, /onDelete/);

  // App handlers for context menu actions
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  assert.match(appContent, /handleContextMenuNewFile/);
  assert.match(appContent, /handleContextMenuRename/);
  assert.match(appContent, /handleContextMenuDelete/);
});

test('7. App.tsx mounts dedicated folder and file deletion modals without window.confirm', () => {
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  // Check state and modals for deletion
  assert.match(appContent, /deleteConfirmFolder/);
  assert.match(appContent, /deleteConfirmFile/);
  assert.match(appContent, /폴더 삭제 확인/);
  assert.match(appContent, /파일 삭제 확인/);

  // Ensure window.confirm is not used in handleDeleteFolder
  const folderDeleteSlice = appContent.slice(
    appContent.indexOf('const handleDeleteFolder ='),
    appContent.indexOf('const executeDeleteFolder =')
  );
  assert.doesNotMatch(folderDeleteSlice, /window\.confirm/);
});
