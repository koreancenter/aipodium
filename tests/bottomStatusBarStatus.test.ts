import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Bottom Status Bar: Real-Time Engine & Storage Status Architecture', async (t) => {
  const appPath = path.resolve('./src/App.tsx');
  const monitorPath = path.resolve('./src/components/LocalAiResourceMonitor.tsx');

  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
  assert.ok(fs.existsSync(monitorPath), 'LocalAiResourceMonitor.tsx must exist');

  const appContent = fs.readFileSync(appPath, 'utf-8');
  const monitorContent = fs.readFileSync(monitorPath, 'utf-8');

  await t.test('1. Ambiguous LOCAL is replaced with dynamic storageTargetLabel', () => {
    // Must NOT contain ambiguous uppercase {activeWorkspace.type} in the footer
    assert.ok(
      !appContent.includes('<span className="uppercase">{activeWorkspace.type}</span>'),
      'Ambiguous uppercase {activeWorkspace.type} must be removed from footer'
    );

    // Must define storageTargetLabel with all 4 explicit Korean labels
    assert.ok(appContent.includes('storageTargetLabel'), 'App.tsx must define and render storageTargetLabel');
    assert.ok(appContent.includes("'게스트 임시 저장소'"), "Must support '게스트 임시 저장소'");
    assert.ok(appContent.includes("'브라우저 저장소'"), "Must support '브라우저 저장소'");
    assert.ok(appContent.includes("'로컬 폴더 연동됨'"), "Must support '로컬 폴더 연동됨'");
    assert.ok(appContent.includes("'GitHub 동기화'"), "Must support 'GitHub 동기화'");
  });

  await t.test('2. Hardcoded 연결됨 is replaced with dynamic aiEngineStatus', () => {
    // Must NOT contain hardcoded static green dot and 연결됨
    assert.ok(
      !appContent.includes('연결됨\n          </span>') && !appContent.includes('연결됨\r\n          </span>'),
      'Hardcoded static 연결됨 must be replaced'
    );

    // Must define aiEngineStatus with real-time states
    assert.ok(appContent.includes('aiEngineStatus'), 'App.tsx must compute dynamic aiEngineStatus');
    assert.ok(appContent.includes("'Cloud AI 준비됨'"), "Must reflect 'Cloud AI 준비됨' when key present");
    assert.ok(appContent.includes("'API 키 필요'"), "Must reflect 'API 키 필요' when key missing");
    assert.ok(appContent.includes("'Ollama 연결됨'"), "Must reflect 'Ollama 연결됨' when health check succeeds");
    assert.ok(appContent.includes("'Ollama 오프라인'"), "Must reflect 'Ollama 오프라인' when health check fails");
    assert.ok(appContent.includes("'WebGPU 활성'"), "Must reflect 'WebGPU 활성' when WebLLM loaded");
    assert.ok(appContent.includes("'모델 준비 중...'"), "Must reflect '모델 준비 중...' while downloading");
  });

  await t.test('3. Clicking AI Engine status indicator opens preferences modal with ai-engine tab', () => {
    assert.ok(
      appContent.includes("setPreferencesInitialTab('ai-engine')"),
      'Must switch to ai-engine tab on click'
    );
    assert.ok(
      appContent.includes('setIsPreferencesModalOpen(true)'),
      'Must open preferences modal on click'
    );
  });

  await t.test('4. LocalAiResourceMonitor conditionally hides when activeProvider is cloud', () => {
    // In LocalAiResourceMonitor component
    assert.ok(
      monitorContent.includes("effectiveProvider === 'cloud'") || monitorContent.includes("provider === 'cloud'"),
      'LocalAiResourceMonitor must detect cloud provider'
    );
    assert.ok(
      monitorContent.includes('return null;'),
      'LocalAiResourceMonitor must return null when provider is cloud'
    );

    // In App.tsx footer status bar
    assert.ok(
      appContent.includes("activeAiEngineProvider === 'webllm' || activeAiEngineProvider === 'local-pc'"),
      'App.tsx footer must only mount LocalAiResourceMonitor for webllm or local-pc'
    );
  });

  await t.test('5. Pure Korean labels without English parentheticals (RULE[AGENTS_md])', () => {
    // Check no unwanted English parentheticals in monitor or footer
    assert.ok(!monitorContent.includes('(Open)'), 'No (Open)');
    assert.ok(!monitorContent.includes('(Save)'), 'No (Save)');
    assert.ok(!monitorContent.includes('(SSOT)'), 'No (SSOT)');
    assert.ok(!monitorContent.includes('(Esc)'), 'No (Esc)');
    assert.ok(!monitorContent.includes('(Idle)'), 'No (Idle)');
    assert.ok(!monitorContent.includes('(Cloud)'), 'No (Cloud)');
  });
});
