import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_DOMAIN_PROFILES,
  AiClient,
  CloudAdapter,
  OllamaAdapter,
  applyAiDomainProfile,
  getAiDomainProfile,
  type AiInferenceOptions,
  type AiProviderAdapter,
} from '../src/services/ai';

const baseOptions: AiInferenceOptions = {
  model: '',
  messages: [{ role: 'user', content: '요청 내용' }],
  onChunk: () => {},
};

test('domain profiles expose document summary and schedule management presets', () => {
  assert.deepEqual(
    AI_DOMAIN_PROFILES.map(({ id }) => id),
    ['document-summary', 'schedule-management']
  );
  assert.equal(getAiDomainProfile('document-summary')?.responseFormat, 'markdown');
  assert.equal(getAiDomainProfile('schedule-management')?.responseFormat, 'json');
  assert.equal(getAiDomainProfile('unknown'), undefined);
});

test('profile defaults are applied without overriding request-specific options', () => {
  const profile = getAiDomainProfile('document-summary');
  assert.ok(profile);
  const options = applyAiDomainProfile({
    ...baseOptions,
    systemInstruction: '앱 고유 지침',
  }, profile);

  assert.equal(options.model, profile.recommendedModel);
  assert.equal(options.temperature, profile.temperature);
  assert.equal(options.responseFormat, 'markdown');
  assert.match(options.systemInstruction ?? '', /앱 고유 지침/);
  assert.match(options.systemInstruction ?? '', /문서 요약 전문가/);

  const overridden = applyAiDomainProfile({
    ...baseOptions,
    model: 'custom-model',
    temperature: 0.8,
    responseFormat: 'json',
  }, profile);
  assert.equal(overridden.model, 'custom-model');
  assert.equal(overridden.temperature, 0.8);
  assert.equal(overridden.responseFormat, 'json');
  assert.equal(baseOptions.systemInstruction, undefined);
});

test('AiClient applies profile defaults before delegating to the selected adapter', async () => {
  const client = new AiClient();
  let received: AiInferenceOptions | undefined;
  const adapter: AiProviderAdapter = {
    isAvailable: async () => true,
    getModels: async () => [],
    stream: async (options) => {
      received = options;
      return { fullText: 'ok' };
    },
  };
  client.registerAdapter('test', adapter);

  const profile = getAiDomainProfile('schedule-management');
  assert.ok(profile);
  await client.streamCompletion('test', baseOptions, profile);

  assert.equal(received?.model, profile.recommendedModel);
  assert.equal(received?.temperature, profile.temperature);
  assert.equal(received?.responseFormat, 'json');
  assert.match(received?.systemInstruction ?? '', /유효한 JSON만 출력/);
});

test('CloudAdapter resolves host-managed API keys and uses the configured endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedKey = '';
  let resolvedWith: { model: string; userSecret?: string } | undefined;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedKey = new Headers(init?.headers).get('x-goog-api-key') ?? '';
    return new Response(JSON.stringify({ text: 'ok' }), {
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    await new CloudAdapter({
      chatEndpoint: 'https://host.example/ai/chat',
      resolveApiKey: async (model, userSecret) => {
        resolvedWith = { model, userSecret };
        return 'host-managed-secret';
      },
    }).stream({
      ...baseOptions,
      model: 'custom-cloud-model',
      userSecret: 'unlocked-secret',
    });

    assert.equal(requestedUrl, 'https://host.example/ai/chat');
    assert.equal(requestedKey, 'host-managed-secret');
    assert.deepEqual(resolvedWith, {
      model: 'custom-cloud-model',
      userSecret: 'unlocked-secret',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cloud adapter forwards JSON response format to the chat API', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: { parameters?: { responseFormat?: string } } | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ text: '{}' }), {
      headers: { 'content-type': 'application/json' },
    });

    test('AiClient translation selects a model from non-cloud provider when none is specified', async () => {
      const client = new AiClient();
      let usedModel = '';
      client.registerAdapter('local-pc', {
        isAvailable: async () => true,
        getModels: async () => [{ id: 'local-translation-model', name: 'Local Translator' }],
        stream: async (options) => {
          usedModel = options.model;
          options.onChunk('translated');
          return { fullText: 'translated' };
        },
      });

      assert.equal(await client.translateText('source', 'ko', 'local-pc'), 'translated');
      assert.equal(usedModel, 'local-translation-model');
    });
  };

  try {
    await new CloudAdapter().stream({
      ...baseOptions,
      model: 'gemini-2.5-flash',
      apiKey: 'test-gemini-key',
      responseFormat: 'json',
    });
    assert.equal(requestBody?.parameters?.responseFormat, 'json');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Ollama adapter requests native JSON output for JSON profiles', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: { format?: string } | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response('{"message":{"content":"{}"},"done":true}\n', {
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    await new OllamaAdapter().stream({
      ...baseOptions,
      model: 'llama3.3:latest',
      responseFormat: 'json',
    });
    assert.equal(requestBody?.format, 'json');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
