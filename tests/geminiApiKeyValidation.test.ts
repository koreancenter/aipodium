import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyGeminiApiKey,
  verifyGeminiApiKeyDetailed,
  verifyApiKeyWithAiEngine,
  isValidGeminiKeyFormat
} from '../src/services/aiPodiumIntegration';


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

test('2. Relax Restrictive Client Regex Checks: accepts AIza and AQ. prefixes with dots, hyphens, and length >= 20', () => {
  // Valid keys starting with AIza
  assert.equal(isValidGeminiKeyFormat('AIzaSyCustomKeyThatIs30CharactersLong'), true);
  assert.equal(isValidGeminiKeyFormat('  AIzaSyLongerSpecialKeyWithUnderscores_AndDashes-123456789  '), true);
  assert.equal(isValidGeminiKeyFormat('AIza12345678901234567'), true); // 21 chars

  // Valid keys starting with AQ. prefix containing dots
  assert.equal(isValidGeminiKeyFormat('AQ.AbCdEf1234567890.xyz_foo-bar'), true);
  assert.equal(isValidGeminiKeyFormat('AQ.Ab12345678901234567'), true); // 22 chars
  assert.equal(isValidGeminiKeyFormat('  AQ.Ab.LongerTokenWithMultiple.Dots.1234567890  '), true);
  assert.equal(isValidGeminiKeyFormat('AQ.Ab9876-5432_1098.token'), true);

  // Invalid keys
  assert.equal(isValidGeminiKeyFormat('AIzaShort'), false); // too short (< 20)
  assert.equal(isValidGeminiKeyFormat('AQ.Short'), false); // too short (< 20)
  assert.equal(isValidGeminiKeyFormat(''), false);
  assert.equal(isValidGeminiKeyFormat('   '), false);
  assert.equal(isValidGeminiKeyFormat('AIzaKeyWithInvalid!Exclamation12345'), false); // invalid character
  assert.equal(isValidGeminiKeyFormat('AQ.KeyWithInvalid$Symbol1234567890'), false); // invalid character
  assert.equal(isValidGeminiKeyFormat('AQ.Key With Spaces 1234567890'), false); // invalid spaces

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

test('3c. verifyGeminiApiKey supports AQ. keys with dots and cleans hidden characters', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; headers: any }> = [];

  try {
    globalThis.fetch = async (url: any, init?: any) => {
      calls.push({ url: String(url), headers: init?.headers });
      if (String(url).includes('models?key=')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200, statusText: 'OK' });
      }
      return new Response(JSON.stringify({}), { status: 404, statusText: 'Not Found' });
    };

    const rawKeyWithHidden = '  \u200BAQ.AbCd1234567890.xyz_key  \n';
    const result = await verifyGeminiApiKey(rawKeyWithHidden);
    assert.equal(result, true);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.includes('models?key=AQ.AbCd1234567890.xyz_key'));
    assert.equal(calls[0].headers?.['x-goog-api-key'], 'AQ.AbCd1234567890.xyz_key');
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('4. Surface Detailed Error Diagnostics: logs and displays actual HTTP status codes', async () => {
  const originalFetch = globalThis.fetch;

  try {
    // Format error test
    const diagInvalid = await verifyGeminiApiKeyDetailed('AQ.Short');
    assert.equal(diagInvalid.valid, false);
    assert.equal(diagInvalid.errorMessage, '올바른 Gemini API 키 형식을 입력해 주세요.');


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

    const diag429 = await verifyGeminiApiKeyDetailed('AQ.AbValidKeyFormatOverQuota12345');

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

    const diag400 = await verifyGeminiApiKeyDetailed('AQ.AbKeyThatDoesNotExistInGoogle.123');

    assert.equal(diag400.valid, false);
    assert.equal(diag400.statusCode, 400);
    assert.match(diag400.errorMessage || '', /HTTP 400/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('5. verifyGeminiApiKey: handles empty/whitespace keys and logs HTTP status codes on failure', async () => {
  // Empty key checks
  assert.equal(await verifyGeminiApiKey(''), false);
  assert.equal(await verifyGeminiApiKey('   \n\t  '), false);

  const originalFetch = globalThis.fetch;
  const loggedErrors: string[] = [];
  const originalError = console.error;

  try {
    console.error = (...args: any[]) => {
      loggedErrors.push(args.join(' '));
    };

    // 403 response
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ error: { code: 403, message: 'API key not valid or not enabled' } }),
        { status: 403, statusText: 'Forbidden' }
      );
    };

    const res403 = await verifyGeminiApiKey('  valid-key-with-spaces-over-20chars  \n');

    assert.equal(res403, false);
    assert.ok(loggedErrors.some(msg => msg.includes('HTTP 403')));

    // 429 response
    loggedErrors.length = 0;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ error: { code: 429, message: 'Rate limit exceeded' } }),
        { status: 429, statusText: 'Too Many Requests' }
      );
    };

    const res429 = await verifyGeminiApiKey('any-key-over-quota-length-exceeds-20');

    assert.equal(res429, false);
    assert.ok(loggedErrors.some(msg => msg.includes('HTTP 429')));
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
});
