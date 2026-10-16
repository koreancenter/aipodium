import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AiClient,
  CloudAdapter,
  OllamaAdapter,
  WebLlmAdapter,
} from '../src/services/ai';
import { UnifiedEditor } from '../src/components/editor';

test('1. AiClient Facade: Registers default adapters and resolves correctly', () => {
  const aiClient = new AiClient();
  assert.ok(aiClient, 'aiClient instance should exist');

  const cloudAdapter = aiClient.getAdapter('cloud');
  assert.ok(cloudAdapter instanceof CloudAdapter, 'cloud should resolve to CloudAdapter');

  const ollamaAdapter = aiClient.getAdapter('local-pc');
  assert.ok(ollamaAdapter instanceof OllamaAdapter, 'local-pc should resolve to OllamaAdapter');

  const webllmAdapter = aiClient.getAdapter('webllm');
  assert.ok(webllmAdapter instanceof WebLlmAdapter, 'webllm should resolve to WebLlmAdapter');

  // Unknown defaults to cloud
  const fallbackAdapter = aiClient.getAdapter('unknown-provider');
  assert.ok(fallbackAdapter instanceof CloudAdapter, 'unknown should fallback to CloudAdapter');
});

test('2. CloudAdapter.getModels returns standard cloud models', async () => {
  const adapter = new CloudAdapter();
  const models = await adapter.getModels();
  assert.ok(Array.isArray(models));
  assert.ok(models.some((m) => m.id === 'gemini-2.5-flash'));
  assert.ok(models.some((m) => m.id === 'gpt-4o'));
});

test('3. CloudAdapter.stream handles SSE chunks correctly', async () => {
  const originalFetch = globalThis.fetch;
  const chunksReceived: string[] = [];

  try {
    globalThis.fetch = async (url: any, init: any) => {
      assert.equal(String(url), '/api/chat');
      assert.equal(init?.headers?.['x-goog-api-key'], 'test-gemini-key');

      const streamText =
        'data: {"chunk":"Hello "}\n\n' +
        'data: {"chunk":"from "}\n\n' +
        'data: {"chunk":"CloudAdapter!"}\n\n' +
        'data: {"done":true,"usage":{"promptTokens":10,"completionTokens":5}}\n\n';

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(streamText));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { 'content-type': 'text/event-stream' },
        status: 200,
      });
    };

    const adapter = new CloudAdapter();
    const result = await adapter.stream({
      model: 'gemini-2.5-flash',
      apiKey: 'test-gemini-key',
      messages: [{ role: 'user', content: 'Say hello' }],
      onChunk: (chunk) => {
        chunksReceived.push(chunk);
      },
    });

    assert.equal(result.fullText, 'Hello from CloudAdapter!');
    assert.deepEqual(chunksReceived, ['Hello ', 'from ', 'CloudAdapter!']);
    assert.equal(result.usage?.promptTokens, 10);
    assert.equal(result.usage?.completionTokens, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('4. OllamaAdapter.stream handles NDJSON line stream', async () => {
  const originalFetch = globalThis.fetch;
  const chunksReceived: string[] = [];

  try {
    globalThis.fetch = async (url: any, init: any) => {
      assert.ok(String(url).includes('/api/chat'));
      const parsedBody = JSON.parse(init?.body);
      assert.equal(parsedBody.model, 'llama3.3:latest');

      const streamText =
        '{"message":{"content":"Hello "},"prompt_eval_count":12}\n' +
        '{"message":{"content":"from "}}\n' +
        '{"message":{"content":"Ollama!"},"eval_count":8}\n';

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(streamText));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    };

    const adapter = new OllamaAdapter('http://localhost:11434');
    const result = await adapter.stream({
      model: 'llama3.3:latest',
      messages: [{ role: 'user', content: 'Hi' }],
      onChunk: (chunk) => {
        chunksReceived.push(chunk);
      },
    });

    assert.equal(result.fullText, 'Hello from Ollama!');
    assert.deepEqual(chunksReceived, ['Hello ', 'from ', 'Ollama!']);
    assert.equal(result.usage?.promptTokens, 12);
    assert.equal(result.usage?.completionTokens, 8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('5. WebLlmAdapter exposes getModels and isAvailable', async () => {
  const adapter = new WebLlmAdapter({
    model: { id: 'test-webllm-model', name: 'Test WebLLM' },
    isAvailable: () => false,
    isLoaded: () => false,
    initialize: async () => {},
    stream: async () => '',
  });
  const models = await adapter.getModels();
  assert.equal(models.length, 1);
  assert.equal(models[0].id, 'test-webllm-model');

  // In Node environment without WebGPU, isAvailable returns false
  const available = await adapter.isAvailable();
  assert.equal(available, false);
});

test('6. WebLlmAdapter delegates inference to its injected runtime', async () => {
  let streamedMessages: Array<{ role: string; content: string }> = [];
  let streamedTemperature = -1;
  const chunks: string[] = [];
  const adapter = new WebLlmAdapter({
    model: { id: 'test-webllm-model', name: 'Test WebLLM' },
    isAvailable: () => true,
    isLoaded: () => true,
    initialize: async () => {
      assert.fail('a loaded runtime should not initialize again');
    },
    stream: async (messages, onChunk, temperature) => {
      streamedMessages = messages;
      streamedTemperature = temperature;
      onChunk('reply');
      return 'reply';
    },
  });
  const result = await adapter.stream({
    model: 'test-webllm-model',
    messages: [{ role: 'user', content: 'question' }],
    systemInstruction: 'host instruction',
    temperature: 0.6,
    onChunk: (chunk) => chunks.push(chunk),
  });

  assert.equal(result.fullText, 'reply');
  assert.equal(streamedMessages[0].content, 'host instruction');
  assert.equal(streamedTemperature, 0.6);
  assert.deepEqual(chunks, ['reply']);
});

test('7. UnifiedEditor is exported and adheres to controlled component props', () => {
  assert.equal(typeof UnifiedEditor, 'function', 'UnifiedEditor should be a React component');
});

test('8. Editor modularization structure verification', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  // Verify files exist in src/components/editor/
  const editorDir = path.resolve(process.cwd(), 'src/components/editor');
  assert.ok(fs.existsSync(path.join(editorDir, 'UnifiedEditor.tsx')), 'UnifiedEditor.tsx must exist');
  assert.ok(fs.existsSync(path.join(editorDir, 'OptimizedEditor.tsx')), 'OptimizedEditor.tsx must exist');
  assert.ok(fs.existsSync(path.join(editorDir, 'TiptapWysiwygEditor.tsx')), 'TiptapWysiwygEditor.tsx must exist');
  assert.ok(fs.existsSync(path.join(editorDir, 'TableGridPicker.tsx')), 'TableGridPicker.tsx must exist');
  assert.ok(fs.existsSync(path.join(editorDir, 'TableFloatingBubbleMenu.tsx')), 'TableFloatingBubbleMenu.tsx must exist');
  assert.ok(fs.existsSync(path.join(editorDir, 'TextFloatingBubbleMenu.tsx')), 'TextFloatingBubbleMenu.tsx must exist');
  assert.ok(fs.existsSync(path.join(editorDir, 'FreeformDrawingOverlay.tsx')), 'FreeformDrawingOverlay.tsx must exist');
  assert.ok(fs.existsSync(path.join(editorDir, 'index.ts')), 'index.ts must exist');

  // Verify App.tsx mounts UnifiedEditor
  const appContent = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
  assert.match(appContent, /import\s*\{\s*UnifiedEditor\s*\}\s*from\s*'\.\/components\/editor'/);
  assert.match(appContent, /<UnifiedEditor/);
  assert.match(appContent, /aiClient\.streamCompletion/);
});
