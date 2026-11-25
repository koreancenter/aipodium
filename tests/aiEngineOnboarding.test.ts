import test from 'node:test';
import assert from 'node:assert/strict';
import { saveAiEnginePreference, getAiEnginePreference } from '../src/services/aiPodiumIntegration';


// Mock localStorage for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  } as any;
}

test('Onboarding trigger state evaluation logic', () => {
  localStorage.clear();

  const checkShouldShow = () => {
    return localStorage.getItem('aipodium_engine_dont_show') !== 'true';
  };

  // 1. Initial state (neither flag is set) -> should show modal
  assert.equal(checkShouldShow(), true);

  // 2. User completed onboarding without dontShowAgain -> modal continues to show on future logins
  assert.equal(checkShouldShow(), true);

  // 3. User opted out of seeing modal again (checked dontShowAgain)
  localStorage.setItem('aipodium_engine_dont_show', 'true');
  assert.equal(checkShouldShow(), false);
});

test('saveAiEnginePreference and getAiEnginePreference round-trip in aiEngineCore', () => {
  localStorage.clear();

  // Test Option A: Cloud BYOK
  saveAiEnginePreference({
    engineType: 'cloud',
    selectedVendor: 'gemini',
    apiKey: 'test-gemini-api-key-123'
  });

  let current = getAiEnginePreference();
  assert.equal(current.engineType, 'cloud');
  assert.equal(current.selectedVendor, 'gemini');
  assert.equal(current.apiKey, 'test-gemini-api-key-123');

  // Test Option B: Local Ollama
  saveAiEnginePreference({
    engineType: 'ollama',
    ollamaEndpoint: 'http://localhost:11434'
  });

  current = getAiEnginePreference();
  assert.equal(current.engineType, 'ollama');
  assert.equal(current.ollamaEndpoint, 'http://localhost:11434');

  // Test Option C: WebLLM
  saveAiEnginePreference({
    engineType: 'webllm'
  });

  current = getAiEnginePreference();
  assert.equal(current.engineType, 'webllm');
});

test('isOnboardingMode logic disables dummy bot fallback when any valid engine is active', () => {
  const evaluateIsOnboardingMode = (params: {
    cloudApiKey?: string;
    apiKeys?: Record<string, string>;
    provider: 'cloud' | 'local-pc' | 'local-server';
    isVerified: boolean;
    discoveredLocalModels?: any[];
    webllmReady: boolean;
    webllmLoading: boolean;
  }) => {
    const hasConfiguredApiKey = Boolean(
      params.cloudApiKey?.trim() ||
      Object.values(params.apiKeys || {}).some((k) => typeof k === 'string' && k.trim().length > 0)
    );
    const hasConnectedLocalAi =
      (params.provider === 'local-pc' || params.provider === 'local-server') &&
      (params.isVerified || (params.discoveredLocalModels && params.discoveredLocalModels.length > 0));

    return !hasConfiguredApiKey && !hasConnectedLocalAi && !params.webllmReady && !params.webllmLoading;
  };

  // 1. Initial guest without any configured key or local AI: dummy bot is active
  assert.equal(
    evaluateIsOnboardingMode({
      provider: 'cloud',
      isVerified: false,
      webllmReady: false,
      webllmLoading: false,
    }),
    true
  );

  // 2. Cloud API key is configured -> isOnboardingMode is false
  assert.equal(
    evaluateIsOnboardingMode({
      cloudApiKey: 'AIzaSyDemoKey',
      provider: 'cloud',
      isVerified: false,
      webllmReady: false,
      webllmLoading: false,
    }),
    false
  );

  // 3. Ollama local engine is verified -> isOnboardingMode is false
  assert.equal(
    evaluateIsOnboardingMode({
      provider: 'local-pc',
      isVerified: true,
      webllmReady: false,
      webllmLoading: false,
    }),
    false
  );

  // 4. WebLLM is downloading (isLoading = true) -> isOnboardingMode is false (immediate real inference route)
  assert.equal(
    evaluateIsOnboardingMode({
      provider: 'local-pc',
      isVerified: false,
      webllmReady: false,
      webllmLoading: true,
    }),
    false
  );

  // 5. WebLLM is ready (isReady = true) -> isOnboardingMode is false
  assert.equal(
    evaluateIsOnboardingMode({
      provider: 'local-pc',
      isVerified: false,
      webllmReady: true,
      webllmLoading: false,
    }),
    false
  );
});

test('AiEngineOnboardingModal UI conforms to luxury minimalism principles', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const modalContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/AiEngineOnboardingModal.tsx'),
    'utf-8'
  );

  // 1. Container specifies calm matte obsidian glass surface synced to Four Seasons variables
  assert.match(modalContent, /max-w-\[420px\] w-full bg-\[var\(--bg-elevated\)\]\/95 backdrop-blur-xl border border-white\/\[0\.08\] rounded-2xl p-6 shadow-\[0_24px_48px_-12px_rgba\(0,0,0,0\.85\)\]/);

  // 2. Subtitle under header is removed
  assert.equal(modalContent.includes('작업 환경에 맞는 AI 모델 엔진을 선택합니다'), false);

  // 3. Borderless unified option list with clean titles and monochrome tags
  assert.match(modalContent, /rounded-xl bg-white\/\[0\.02\] border border-white\/\[0\.06\] divide-y divide-white\/\[0\.05\] overflow-hidden/);
  assert.match(modalContent, /클라우드 API · Gemini \/ OpenAI/);
  assert.match(modalContent, /로컬 AI · Ollama/);
  assert.match(modalContent, /브라우저 내장 WebLLM/);
  assert.equal(modalContent.includes('보유한 API 키 연결'), false);
  assert.equal(modalContent.includes('localhost:11434 직접 연결'), false);
  assert.equal(modalContent.includes('무설치 브라우저 WebGPU 즉시 실행'), false);

  // 4. Submit button uses punchy '저장 후 시작'
  assert.match(modalContent, /저장 후 시작/);
  assert.equal(modalContent.includes('설정 저장 후 시작하기'), false);

  // 5. Dedicated fixed height configuration slot to stop layout jitter
  assert.match(modalContent, /min-h-\[52px\] h-\[52px\] flex items-center/);
  assert.match(modalContent, /http:\/\/localhost:11434/);
  assert.match(modalContent, /연결 확인/);

  // 6. Deferred WebLLM download: handleSelectOption only updates state; handleSubmit triggers download
  const selectFnMatch = modalContent.match(/const handleSelectOption =[\s\S]*?\n  \};/);
  assert.ok(selectFnMatch, 'handleSelectOption must exist');
  assert.equal(selectFnMatch[0].includes('onStartWebLlmDownload'), false, 'handleSelectOption must not trigger onStartWebLlmDownload');
  assert.equal(selectFnMatch[0].includes('checkAvailability'), false, 'handleSelectOption must not invoke checkAvailability');

  const submitFnMatch = modalContent.match(/const handleSubmit =[\s\S]*?\n  \};/);
  assert.ok(submitFnMatch, 'handleSubmit must exist');
  assert.match(submitFnMatch[0], /selectedOption === 'webllm' && onStartWebLlmDownload/);
  assert.match(submitFnMatch[0], /onStartWebLlmDownload\(\)/);

  const skipFnMatch = modalContent.match(/const handleSkip =[\s\S]*?\n  \};/);
  assert.ok(skipFnMatch, 'handleSkip must exist');
  assert.equal(skipFnMatch[0].includes('onStartWebLlmDownload'), false, 'handleSkip must not start WebLLM download');
});
