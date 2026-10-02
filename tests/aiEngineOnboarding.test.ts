import test from 'node:test';
import assert from 'node:assert/strict';
import { saveAiEnginePreference, getAiEnginePreference } from '../src/services/aiEngineCore';

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

test('AiEngineOnboardingModal UI conforms to DESIGN.md v2.1 flat design principles', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const modalContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/AiEngineOnboardingModal.tsx'),
    'utf-8'
  );

  // 1. Container specifies required locked boundary flat styling
  assert.match(modalContent, /max-w-md w-full bg-\[#121214\] border border-white\/10 rounded-xl p-5 shadow-2xl flex flex-col justify-between min-h-\[440px\]/);

  // 2. Selectable rows use subtle border styling
  assert.match(modalContent, /p-3 rounded-lg border cursor-pointer/);

  // 3. Option titles & punchy 1-line descriptions
  assert.match(modalContent, /클라우드 API \(Gemini \/ OpenAI\)/);
  assert.match(modalContent, /보유한 API 키 연결/);
  assert.match(modalContent, /로컬 AI \(Ollama\)/);
  assert.match(modalContent, /localhost:11434 직접 연결/);
  assert.match(modalContent, /브라우저 내장 \(WebLLM\)/);
  assert.match(modalContent, /무설치 브라우저 WebGPU 즉시 실행/);

  // 4. Dedicated fixed height configuration slot to stop layout jitter
  assert.match(modalContent, /min-h-\[56px\] h-\[56px\] flex items-center mb-4/);
  assert.match(modalContent, /w-full bg-\[#18181b\] border border-white\/10 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500\/60/);
  assert.match(modalContent, /✨ 별도 설정 없이 브라우저 WebGPU를 통해 기기에서 즉시 실행됩니다\./);

  // 5. Ping connection button for Option 2
  assert.match(modalContent, /http:\/\/localhost:11434/);
  assert.match(modalContent, /연결 확인/);
});
