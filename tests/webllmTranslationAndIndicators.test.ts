import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { WEB_LLM_MODEL_ID } from '../src/utils/webllmService';

test('1. App.tsx handleTranslateMessage inherits activeProvider and protects against Ollama CORS', () => {
  const appFile = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

  // Verify handleTranslateMessage definition
  assert.ok(
    appFile.includes('const handleTranslateMessage = useCallback('),
    'handleTranslateMessage should be defined with useCallback'
  );

  // Verify activeProvider derivation
  assert.ok(
    appFile.includes("selectedModel === WEB_LLM_MODEL_ID\n          ? 'webllm'") ||
    appFile.includes("selectedModel === WEB_LLM_MODEL_ID ? 'webllm'"),
    'activeProvider should resolve to "webllm" when selectedModel === WEB_LLM_MODEL_ID'
  );

  // Verify streamCompletion call uses activeProvider
  assert.ok(
    appFile.includes('await aiClient.streamCompletion(activeProvider,'),
    'aiClient.streamCompletion must receive activeProvider directly'
  );

  // Verify ollamaEndpoint is NOT passed for webllm
  assert.ok(
    appFile.includes("activeProvider === 'local-pc' ? (localEndpointAddress || 'http://localhost:11434') : undefined"),
    'ollamaEndpoint must be undefined when activeProvider is webllm'
  );

  // Verify streaming translation onChunk updates state
  assert.ok(
    appFile.includes('onChunk: (deltaText) => {') || appFile.includes('onChunk: (deltaText: string) => {'),
    'onChunk should update message translatedText stream'
  );
});

test('2. Redundant top WebLlmBanner is suppressed during download in App.tsx', () => {
  const appFile = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

  // Verify top banner condition contains !webllmProgress.isLoading
  assert.ok(
    appFile.includes('!webllmProgress.isLoading && (selectedModel === WEB_LLM_MODEL_ID)'),
    'Top WebLlmBanner must be suppressed when webllmProgress.isLoading is true'
  );
});

test('3. ChatPanel.tsx unifies download progress into centered empty state view and removes duplicate banner', () => {
  const chatFile = fs.readFileSync(path.resolve(process.cwd(), 'src/components/chat/ChatPanel.tsx'), 'utf-8');

  // Verify centered empty state indicator is rendered when webllmProgress.isLoading
  assert.ok(
    chatFile.includes('id="webllm-chat-download-progress"'),
    'ChatPanel should contain dedicated webllm-chat-download-progress inside empty state'
  );

  // Verify redundant WebLlmBanner inside ChatPanel body before messages is removed
  const linesBeforeMessages = chatFile.substring(
    chatFile.indexOf('<AnimatePresence mode="wait">'),
    chatFile.indexOf('{messages.length === 0 ?')
  );
  assert.ok(
    !linesBeforeMessages.includes('<WebLlmBanner'),
    'Redundant top <WebLlmBanner> inside ChatPanel must be removed'
  );

  // Verify activeProvider prop exists in ChatPanel
  assert.ok(
    chatFile.includes("activeProvider?: 'webllm' | 'cloud' | 'local-pc' | string;"),
    'ChatPanelProps should include activeProvider'
  );
});

test('4. WebLLM service and adapter support consecutive calls without resetting', async () => {
  const serviceFile = fs.readFileSync(path.resolve(process.cwd(), 'src/utils/webllmService.ts'), 'utf-8');
  const adapterFile = fs.readFileSync(path.resolve(process.cwd(), 'src/services/ai/adapters/WebLlmAdapter.ts'), 'utf-8');

  // Verify initPromise exists to prevent concurrent duplicate worker creation
  assert.ok(
    serviceFile.includes('let initPromise: Promise<WebWorkerMLCEngine> | null = null;'),
    'webllmService should track initPromise for consecutive/concurrent calls'
  );

  // Verify WebLlmAdapter checks getLoadedWebLLMEngine before calling init
  assert.ok(
    adapterFile.includes('if (!getLoadedWebLLMEngine())'),
    'WebLlmAdapter should only initialize if engine is not already loaded'
  );
});
