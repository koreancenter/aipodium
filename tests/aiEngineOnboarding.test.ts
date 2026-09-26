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
    return !localStorage.getItem('aipodium_engine_onboarding_done') &&
           !localStorage.getItem('aipodium_engine_dont_show');
  };

  // 1. Initial state (neither flag is set) -> should show modal
  assert.equal(checkShouldShow(), true);

  // 2. User completed onboarding
  localStorage.setItem('aipodium_engine_onboarding_done', 'true');
  assert.equal(checkShouldShow(), false);

  // 3. User opted out of seeing modal again
  localStorage.clear();
  localStorage.setItem('aipodium_engine_dont_show', 'true');
  assert.equal(checkShouldShow(), false);

  // 4. Both flags set
  localStorage.setItem('aipodium_engine_onboarding_done', 'true');
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
