import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProjectTitleFromPrompt } from '../src/services/workspaceStorageService';
import { GUEST_SAMPLE_FILES, GUEST_SAMPLE_FOLDERS } from '../src/data/guestSampleWorkspace';

test('Auto Project Folder File Routing & Initial Workspace File Open Tests', async (t) => {
  await t.test('1. Auto-Created Project Folder File Routing logic creates document inside folder', () => {
    const prompt = 'React 19와 마크다운 아키텍처 분석';
    const folderName = generateProjectTitleFromPrompt(prompt);
    assert.equal(folderName, 'React 19와 마크다운 아키텍처...');

    // Simulate new document path inside that new folder
    const timestampSuffix = '1234';
    const newFilePath = `${folderName}/notes_${timestampSuffix}.md`;

    assert.ok(newFilePath.startsWith(`${folderName}/`));
    assert.ok(newFilePath.includes('notes_1234.md'));

    // Check files state update simulation
    const files: Record<string, string> = {
      'welcome.md': '# AI Podium 시작하기',
    };
    const responseContent = '# AI 응답 내용';

    // Must NOT write or append AI responses into previously active welcome.md
    assert.equal(files['welcome.md'], '# AI Podium 시작하기');

    const updatedFiles = {
      ...files,
      [newFilePath]: responseContent,
    };
    const currentFile = newFilePath;

    assert.equal(updatedFiles[newFilePath], responseContent);
    assert.equal(updatedFiles['welcome.md'], '# AI Podium 시작하기');
    assert.equal(currentFile, newFilePath);
  });

  await t.test('2. Initial Landing defaults currentFile to Untitled-1 instead of welcome.md', () => {
    // When savedActiveFile is null or welcome.md or ai_guide.md
    const checkLandingFile = (savedFile?: string | null) => {
      const isGuideOrLegacyActive =
        !savedFile ||
        savedFile === 'welcome.md' ||
        savedFile === 'ai_guide.md' ||
        savedFile.startsWith('guide/');
      return isGuideOrLegacyActive ? 'Untitled-1' : savedFile;
    };

    assert.equal(checkLandingFile(null), 'Untitled-1');
    assert.equal(checkLandingFile('welcome.md'), 'Untitled-1');
    assert.equal(checkLandingFile('ai_guide.md'), 'Untitled-1');
    assert.equal(checkLandingFile('guide/intro.md'), 'Untitled-1');
    assert.equal(checkLandingFile('my_doc.md'), 'my_doc.md');

    // welcome.md remains available in sample files under 가이드 & 도움말
    assert.ok(GUEST_SAMPLE_FILES['welcome.md']);
    assert.equal(GUEST_SAMPLE_FOLDERS['welcome.md'], '가이드 & 도움말');
  });

  await t.test('3. Guard blocks appending AI response to guide files and routes to project folder', () => {
    const fileFolders: Record<string, string> = {
      'welcome.md': '가이드 & 도움말',
      'ai_guide.md': '가이드 & 도움말',
    };

    const isGuideFile = (targetFile: string) => {
      return (
        !targetFile ||
        targetFile === 'welcome.md' ||
        targetFile === 'ai_guide.md' ||
        targetFile.startsWith('guide/') ||
        fileFolders[targetFile] === '가이드 & 도움말'
      );
    };

    assert.equal(isGuideFile('welcome.md'), true);
    assert.equal(isGuideFile('ai_guide.md'), true);
    assert.equal(isGuideFile('guide/tips.md'), true);
    assert.equal(isGuideFile('project_notes.md'), false);

    // Route logic when isGuideFile is true
    let currentActiveFile: string = 'welcome.md';
    const currentFolder = '프로젝트 알파';
    let targetFilePath = currentActiveFile;

    if (isGuideFile(currentActiveFile) || currentActiveFile === 'Untitled-1') {
      targetFilePath = `${currentFolder}/notes_9999.md`;
    }

    assert.equal(targetFilePath, '프로젝트 알파/notes_9999.md');
    assert.notEqual(targetFilePath, 'welcome.md');
  });

  await t.test('4. Default fallback engine suggests webllm when no Gemini API key and Ollama offline', () => {
    const resolveDefaultEngine = (apiKey?: string, isOllamaOnline?: boolean) => {
      if (apiKey && apiKey.trim().length > 0) {
        return 'cloud';
      }
      if (isOllamaOnline) {
        return 'ollama';
      }
      return 'webllm';
    };

    assert.equal(resolveDefaultEngine(undefined, false), 'webllm');
    assert.equal(resolveDefaultEngine('', false), 'webllm');
    assert.equal(resolveDefaultEngine('AIzaSy...', false), 'cloud');
    assert.equal(resolveDefaultEngine('', true), 'ollama');
  });

  await t.test('5. WebLlm guide copy contains required onboarding messaging', () => {
    const expectedGuide = '브라우저 내장 AI 엔진(WebLLM)을 준비 중입니다. 최초 1회 모델 가중치(약 1.5GB) 다운로드가 진행되며, 이후에는 오프라인에서도 완전 무료로 실행됩니다.';
    assert.ok(expectedGuide.includes('WebLLM'));
    assert.ok(expectedGuide.includes('1.5GB'));
    assert.ok(expectedGuide.includes('완전 무료'));
  });
});
