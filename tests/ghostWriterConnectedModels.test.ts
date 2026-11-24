import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getSettingsTranslations } from '../src/locales/settingsLocale';
import { WEB_LLM_MODEL_ID, WEB_LLM_MODEL_DISPLAY_NAME } from '../src/utils/webllmService';

const readWorkspaceFile = (relPath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8');

test('1. App.tsx filters ghostWriterModelOptions strictly by API key, discovered Ollama models, and WebLLM readiness', () => {
  const appContent = readWorkspaceFile('src/App.tsx');

  // Must NOT fall back to unready dummy local fallback in availableChatModels
  assert.doesNotMatch(
    appContent,
    /discoveredLocalModels\.length > 0[\s\S]*?else\s*\{\s*DEFAULT_FALLBACK_MODELS\.filter\(\(m\)\s*=>\s*m\.group\s*===\s*'local'\)/
  );

  // ghostWriterModelOptions must filter cloud models by hasApiKey and webllm by webllmProgress.isReady
  assert.match(appContent, /const ghostWriterModelOptions = useMemo\(\(\) => \{/);
  assert.match(appContent, /if \(m\.group === 'cloud'\)\s*\{\s*return Boolean\(m\.hasApiKey\);/);
  assert.match(appContent, /if \(m\.vendor === 'webllm'\)\s*\{\s*return webllmProgress\.isReady;/);

  // Ghost writer translation execution supports WEB_LLM_MODEL_ID and legacy alias
  assert.match(appContent, /ghostWriterModel === WEB_LLM_MODEL_ID \|\| ghostWriterModel === 'Qwen2\.5-0\.5B-Instruct'/);
});

test('2. PreferencesModal does not fall back to hardcoded DEFAULT_FALLBACK_MODELS for Translation Model', () => {
  const prefsContent = readWorkspaceFile('src/components/PreferencesModal.tsx');

  // Must NOT fall back to DEFAULT_FALLBACK_MODELS in ghost-writer tab
  assert.doesNotMatch(
    prefsContent,
    /const opts = modelOptions && modelOptions\.length > 0 \? modelOptions : DEFAULT_FALLBACK_MODELS;/
  );

  // Must check live API keys, discoveredModels, and WebLLM readiness
  assert.match(prefsContent, /webllmReady\?: boolean;/);
  assert.match(prefsContent, /const isWebLlmConnected = Boolean\(webllmReady\) \|\| Boolean\(getLoadedWebLLMEngine\(\)\);/);
  assert.match(prefsContent, /DEFAULT_CLOUD_MODELS_BY_VENDOR\[vendor\]/);
  assert.match(prefsContent, /placeholder=\{st\.body\.noConnectedModels\}/);
  assert.match(prefsContent, /emptyText=\{st\.body\.noConnectedModels\}/);
  assert.match(prefsContent, /connectedAll\.length === 0/);

  const orchestratorContent = readWorkspaceFile('src/components/modals/AppModalOrchestrator.tsx');
  assert.match(orchestratorContent, /webllmReady=\{Boolean\(webllmProgress\?\.isReady\)\}/);
});

test('3. CustomSelectDropdown renders emptyText instead of blank popover when no models are connected', () => {
  const dropdownContent = readWorkspaceFile('src/components/CustomSelectDropdown.tsx');
  assert.match(dropdownContent, /emptyText\?: string;/);
  assert.match(dropdownContent, /\{emptyText \|\| resolvedPlaceholder\}/);
});

test('4. WebLLM ID matches WEB_LLM_MODEL_ID and Settings Korean empty-state labels adhere to AGENTS.md', () => {
  assert.equal(WEB_LLM_MODEL_ID, 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
  assert.ok(WEB_LLM_MODEL_DISPLAY_NAME.length > 0);

  const koBody = getSettingsTranslations('ko').body;
  assert.equal(koBody.noConnectedModels, '연동된 모델 없음');
  assert.doesNotMatch(koBody.noConnectedModels, /\([A-Za-z]+\)/);
  assert.doesNotMatch(koBody.noConnectedModelsHint, /\([A-Za-z]+\)/);
  assert.doesNotMatch(koBody.goToAiEngine, /\([A-Za-z]+\)/);
});
