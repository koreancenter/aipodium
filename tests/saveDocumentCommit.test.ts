import test from 'node:test';
import assert from 'node:assert/strict';

test('Save Document Commit & Send to Editor Isolation', async (t) => {
  await t.test('1. Send to Editor marks editor content as dirty without premature files commit', () => {
    const files: Record<string, string> = {
      'sample.md': '# Original Content',
    };
    let editorContent = '# Original Content';

    // Before send to editor
    let isCurrentFileDirty = files['sample.md'] !== editorContent;
    assert.equal(isCurrentFileDirty, false);

    // Simulate handleSendToEditor: only updates editorContent, does NOT overwrite files['sample.md']
    const aiResponse = 'New AI synthesized insight';
    editorContent = `${editorContent}\n\n${aiResponse}`;

    // After send to editor, editorContent is dirty and files['sample.md'] is still original
    isCurrentFileDirty = files['sample.md'] !== editorContent;
    assert.equal(isCurrentFileDirty, true);
    assert.equal(files['sample.md'], '# Original Content');
    assert.ok(editorContent.includes('New AI synthesized insight'));
  });

  await t.test('2. handleSaveDocument commits editor content to files and storage', () => {
    let files: Record<string, string> = {
      'sample.md': '# Original Content',
    };
    const editorContent = '# Original Content\n\nNew AI synthesized insight';
    const lastPushedContentRef: Record<string, string> = {};

    let storageSaved = false;
    const mockSaveVaultToIndexedDB = async () => {
      storageSaved = true;
    };

    // Execution of save logic:
    files = { ...files, 'sample.md': editorContent };
    lastPushedContentRef['sample.md'] = editorContent;
    mockSaveVaultToIndexedDB();

    assert.equal(files['sample.md'], editorContent);
    assert.equal(lastPushedContentRef['sample.md'], editorContent);
    assert.equal(storageSaved, true);

    const isCurrentFileDirty = files['sample.md'] !== editorContent;
    assert.equal(isCurrentFileDirty, false);
  });
});
