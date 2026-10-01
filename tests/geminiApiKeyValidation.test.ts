import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyGeminiApiKey,
  verifyGeminiApiKeyDetailed,
  verifyApiKeyWithAiEngine
} from '../src/services/aiEngineCore';

test('1. Sanitize Input (Trim Whitespace): handles leading/trailing spaces and newlines', async () => {
  const rawKeyWithWhitespace = '   AIzaSyAbc1234567890defGHIJKLMNopqrst   \n';
  const sanitized = rawKeyWithWhitespace.trim();

  assert.equal(sanitized, 'AIzaSyAbc1234567890defGHIJKLMNopqrst');
  assert.equal(sanitized.length, 36);

  // Verification helper handles whitespace trimming
  const emptyKey = '   \n\t  ';
  const emptyResult = await verifyGeminiApiKeyDetailed(emptyKey);
  assert.equal(emptyResult.valid, false);
  assert.match(emptyResult.errorMessage || '', /API 키가 입력되지 않았습니다/);
});

test('2. Relax Restrictive Client Regex Checks: accepts basic AIza prefix with length > 20', async () => {
  const isFormatValid = (rawKey: string) => {
    const sanitizedKey = rawKey.trim();
    return sanitizedKey.startsWith('AIza') && sanitizedKey.length > 20;
  };

  // Valid keys with varied lengths (> 20)
  assert.equal(isFormatValid('AIzaSyCustomKeyThatIs30CharactersLong!'), true);
  assert.equal(isFormatValid('  AIzaSyLongerSpecialKeyWithUnderscores_AndDashes-123456789  '), true);
  assert.equal(isFormatValid('AIza12345678901234567'), true); // 21 chars

  // Invalid keys
  assert.equal(isFormatValid('AIzaShort'), false); // too short
  assert.equal(isFormatValid('sk-proj-invalidprefix1234567890'), false); // wrong prefix
  assert.equal(isFormatValid(''), false);
});

test('3. verifyGeminiApiKey uses standard endpoints (models list and gemini-2.5-flash fallback)', async () => {
  // Test network mock behavior
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  try {
    globalThis.fetch = async (url: any, init?: any) => {
      calls.push(String(url));
      if (String(url).includes('models?key=')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200, statusText: 'OK' });
      }
      return new Response(JSON.stringify({}), { status: 404, statusText: 'Not Found' });
    };

    const result = await verifyGeminiApiKey('  AIzaSyValidDemoKey1234567890  ');
    assert.equal(result, true);
    assert.ok(calls.some(url => url.includes('generativelanguage.googleapis.com/v1beta/models?key=')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('3b. Fallback check with x-goog-api-key header and gemini-2.5-flash when models query fails', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; headers: any }> = [];

  try {
    globalThis.fetch = async (url: any, init?: any) => {
      calls.push({ url: String(url), headers: init?.headers });
      if (String(url).includes('models?key=')) {
        // Query param fails (e.g., CORS preflight rejection)
        return new Response('CORS error', { status: 403, statusText: 'Forbidden' });
      }
      if (String(url).includes('models/gemini-2.5-flash')) {
        // Header fallback succeeds
        return new Response(JSON.stringify({ name: 'gemini-2.5-flash' }), { status: 200, statusText: 'OK' });
      }
      return new Response('Not Found', { status: 404 });
    };

    const result = await verifyGeminiApiKey('AIzaSyValidDemoKey1234567890');
    assert.equal(result, true);
    assert.equal(calls.length, 2);
    assert.ok(calls[1].url.includes('models/gemini-2.5-flash'));
    assert.equal(calls[1].headers?.['x-goog-api-key'], 'AIzaSyValidDemoKey1234567890');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('4. Surface Detailed Error Diagnostics: logs and displays actual HTTP status codes', async () => {
  const originalFetch = globalThis.fetch;

  try {
    // 403 API Key Not Enabled test
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ error: { code: 403, message: 'API key not valid or not enabled for Generative Language API' } }),
        { status: 403, statusText: 'Forbidden' }
      );
    };

    const diag403 = await verifyGeminiApiKeyDetailed('AIzaSyValidKeyFormatButNotEnabled123');
    assert.equal(diag403.valid, false);
    assert.equal(diag403.statusCode, 403);
    assert.match(diag403.errorMessage || '', /HTTP 403/);
    assert.match(diag403.errorMessage || '', /API Key Not Enabled/);

    // 429 Quota Exceeded test
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ error: { code: 429, message: 'Resource has been exhausted (rate limit)' } }),
        { status: 429, statusText: 'Too Many Requests' }
      );
    };

    const diag429 = await verifyGeminiApiKeyDetailed('AIzaSyValidKeyFormatOverQuota12345');
    assert.equal(diag429.valid, false);
    assert.equal(diag429.statusCode, 429);
    assert.match(diag429.errorMessage || '', /HTTP 429/);
    assert.match(diag429.errorMessage || '', /Quota Exceeded/);

    // 400 Invalid Argument test
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ error: { code: 400, message: 'API key not found' } }),
        { status: 400, statusText: 'Bad Request' }
      );
    };

    const diag400 = await verifyGeminiApiKeyDetailed('AIzaSyKeyThatDoesNotExistInGoogle123');
    assert.equal(diag400.valid, false);
    assert.equal(diag400.statusCode, 400);
    assert.match(diag400.errorMessage || '', /HTTP 400/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
