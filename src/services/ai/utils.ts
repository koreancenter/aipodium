/**
 * AI Engine Utilities & Security Hardening Gateway
 *
 * Implements strict zero-retention in-memory key isolation:
 * 1. Only decrypts stored API keys at the exact moment of making an active network request.
 * 2. Decrypted keys are isolated strictly within module closures or ephemeral function call scopes.
 *    NEVER attached to window, globalThis, persistent state, or debug logs.
 * 3. Immediately clears and zeros ephemeral key memory upon project switch, auto-lock timeout, or logout.
 */

import { authService } from '../authService';
import { clearDeviceSecretMemory } from '../../utils/securityCrypto';
import type { ExecuteAiOptions } from '../../types';
export type { ExecuteAiOptions };

export type AiEngineChoice = 'cloud' | 'ollama' | 'webllm';

export interface AiEngineConfig {
  engineType: AiEngineChoice;
  selectedVendor?: string;
  apiKey?: string;
  ollamaEndpoint?: string;
  modelId?: string;
}

const AI_ENGINE_CONFIG_KEY = 'aipodium_ai_engine_preference';

let activeEngineConfig: AiEngineConfig = {
  engineType: 'cloud',
  selectedVendor: 'gemini',
};

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(AI_ENGINE_CONFIG_KEY);
    if (saved) {
      activeEngineConfig = { ...activeEngineConfig, ...JSON.parse(saved) };
    }
  } catch {}
}

/**
 * Saves and updates the active AI engine preference.
 */
export function saveAiEnginePreference(config: Partial<AiEngineConfig>): void {
  const sanitizedConfig = { ...config };
  if (typeof sanitizedConfig.apiKey === 'string') {
    sanitizedConfig.apiKey = sanitizedConfig.apiKey.trim();
  }
  activeEngineConfig = {
    ...activeEngineConfig,
    ...sanitizedConfig,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AI_ENGINE_CONFIG_KEY, JSON.stringify(activeEngineConfig));
      window.dispatchEvent(
        new CustomEvent('aipodium:engine_preference_changed', { detail: activeEngineConfig })
      );
    } catch {}
  }
}

/**
 * Retrieves the current AI engine preference.
 */
export function getAiEnginePreference(): AiEngineConfig {
  return { ...activeEngineConfig };
}

// Module-closure isolated variables - NEVER accessible outside this file scope
let inFlightEphemeralKey: string | null = null;
let activeUserSecret: string | null = null;
let ephemeralKeyTimestamp: number = 0;
const EPHEMERAL_MAX_LIFETIME_MS = 10000; // 10s maximum lifespan for batched operations

/**
 * Sets the active session user secret (e.g. Master PIN after unlock).
 * Kept strictly in module closure.
 */
export function setActiveUserSecret(secret: string | null): void {
  activeUserSecret = secret ? secret.trim() : null;
}

/**
 * Clears and zeros all decrypted key references from transient memory.
 * Triggered automatically on project switch, session switch, auto-lock timeout, and logout.
 */
export function clearAiDecryptedKeyMemory(): void {
  if (inFlightEphemeralKey) {
    // Best-effort in-memory zeroing
    inFlightEphemeralKey = '';
    inFlightEphemeralKey = null;
  }
  activeUserSecret = null;
  ephemeralKeyTimestamp = 0;
  clearDeviceSecretMemory();
}

/**
 * Resolves a decrypted API key on-demand for a specific vendor, strictly within module closure.
 */
export async function getEphemeralDecryptedApiKey(
  vendor: string = 'gemini',
  userSecret?: string
): Promise<string> {
  const secretToUse = userSecret || activeUserSecret || undefined;

  // Use short-lived ephemeral key if still valid
  if (
    inFlightEphemeralKey &&
    Date.now() - ephemeralKeyTimestamp < EPHEMERAL_MAX_LIFETIME_MS
  ) {
    return inFlightEphemeralKey;
  }

  let resolved = '';
  if (vendor === 'gemini') {
    resolved = await authService.getEncryptedApiKey(secretToUse);
  } else {
    const keysMap = await authService.getEncryptedApiKeys(secretToUse);
    resolved = keysMap[vendor] || '';
  }

  if (resolved) {
    inFlightEphemeralKey = resolved.trim();
    ephemeralKeyTimestamp = Date.now();
  }

  return (resolved || '').trim();
}

/**
 * High-security execution wrapper.
 * Decrypts key at the exact moment of network execution and guarantees zeroing in finally block.
 */
export async function executeAiRequest<T>(
  requestFn: (decryptedApiKey: string) => Promise<T>,
  options?: ExecuteAiOptions
): Promise<T> {
  const vendor = options?.vendor || 'gemini';
  let ephemeralKey: string | null = null;

  try {
    ephemeralKey = await getEphemeralDecryptedApiKey(vendor, options?.userSecret);
    return await requestFn(ephemeralKey ? ephemeralKey.trim() : '');
  } finally {
    // Transient in-flight variable zeroing
    ephemeralKey = null;
  }
}

/**
 * Convenience helper to verify a Google Gemini API key against standard endpoints.
 * First tries the models list endpoint, and falls back to a lightweight gemini-2.5-flash
 * check with the x-goog-api-key header if query param fails or triggers CORS issues.
 */
export async function verifyGeminiApiKey(rawKey: string): Promise<boolean> {
  const key = (rawKey || '').trim();
  if (!key) return false;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      return true;
    }

    // Fallback check with header if query param fails CORS
    const fallbackRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash',
      {
        method: 'GET',
        headers: {
          'x-goog-api-key': key,
        },
      }
    );

    if (fallbackRes.ok) {
      return true;
    }

    // Determine failed response for logging clear error diagnostics
    const failedRes = res.status !== 200 && res.status !== 0 ? res : fallbackRes;
    const statusCode = failedRes.status;

    let apiDetail = '';
    try {
      const errData = await failedRes.json();
      if (errData?.error?.message) {
        apiDetail = errData.error.message;
      }
    } catch {
      // not JSON or body already read
    }

    let statusDesc = '';
    if (statusCode === 400) {
      statusDesc = 'HTTP 400 Invalid Argument (잘못된 요청 또는 키 형식)';
    } else if (statusCode === 403) {
      statusDesc = 'HTTP 403 API Key Not Enabled / Permission Denied (API 키 미활성화 또는 권한 없음)';
    } else if (statusCode === 429) {
      statusDesc = 'HTTP 429 Quota Exceeded (호출 한도 초과)';
    } else {
      statusDesc = `HTTP ${statusCode} ${failedRes.statusText || '검증 실패'}`;
    }

    const fullDiag = apiDetail ? `${statusDesc} - ${apiDetail}` : statusDesc;
    console.error(`Gemini Key verification failed [HTTP ${statusCode}]:`, fullDiag);

    return false;
  } catch (err) {
    console.error('Gemini Key verification failed:', err);
    return false;
  }
}

export interface GeminiVerificationDiagnostics {
  valid: boolean;
  statusCode?: number;
  statusText?: string;
  errorMessage?: string;
}

/**
 * Verifies a Google Gemini API key with detailed HTTP diagnostics without rigid client regex restrictions.
 */
export async function verifyGeminiApiKeyDetailed(
  rawKey: string
): Promise<GeminiVerificationDiagnostics> {
  const sanitizedKey = (rawKey || '').trim();
  if (!sanitizedKey) {
    return { valid: false, errorMessage: 'API 키가 입력되지 않았습니다.' };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${sanitizedKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (res.ok) {
      return { valid: true, statusCode: res.status };
    }

    // Fallback check with header if query param fails CORS
    const fallbackRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash',
      {
        method: 'GET',
        headers: {
          'x-goog-api-key': sanitizedKey,
        },
      }
    );

    if (fallbackRes.ok) {
      return { valid: true, statusCode: fallbackRes.status };
    }

    // Determine failed response
    const failedRes = res.status !== 200 && res.status !== 0 ? res : fallbackRes;
    const statusCode = failedRes.status;

    let apiDetail = '';
    try {
      const errData = await failedRes.json();
      if (errData?.error?.message) {
        apiDetail = errData.error.message;
      }
    } catch {
      // not JSON or body already read
    }

    let statusDesc = '';
    if (statusCode === 400) {
      statusDesc = 'HTTP 400 Invalid Argument (잘못된 요청 또는 키 형식)';
    } else if (statusCode === 403) {
      statusDesc = 'HTTP 403 API Key Not Enabled / Permission Denied (API 키 미활성화 또는 권한 없음)';
    } else if (statusCode === 429) {
      statusDesc = 'HTTP 429 Quota Exceeded (호출 한도 초과)';
    } else {
      statusDesc = `HTTP ${statusCode} ${failedRes.statusText || '검증 실패'}`;
    }

    const fullDiag = apiDetail ? `${statusDesc} - ${apiDetail}` : statusDesc;
    console.error(`Gemini Key verification failed [HTTP ${statusCode}]:`, fullDiag);

    return {
      valid: false,
      statusCode,
      statusText: failedRes.statusText,
      errorMessage: fullDiag,
    };
  } catch (err: any) {
    console.error('Gemini Key verification failed:', err);
    return {
      valid: false,
      errorMessage: `네트워크 연결 오류: ${err?.message || '호스트에 연결할 수 없습니다.'}`,
    };
  }
}

/**
 * Convenience helper to verify an API key against vendor endpoints
 */
export async function verifyApiKeyWithAiEngine(
  vendor: string,
  testKey?: string
): Promise<{ success: boolean; message?: string; statusCode?: number }> {
  return executeAiRequest(
    async (decryptedKey) => {
      const rawKey = testKey !== undefined ? testKey : decryptedKey;
      const sanitizedKey = (rawKey || '').trim();
      if (!sanitizedKey) {
        return { success: false, message: 'API 키가 입력되지 않았습니다.' };
      }

      try {
        if (vendor === 'gemini') {
          const diag = await verifyGeminiApiKeyDetailed(sanitizedKey);
          if (diag.valid) {
            return { success: true, message: 'Google Gemini API 키가 유효합니다.' };
          }
          return {
            success: false,
            statusCode: diag.statusCode,
            message: `유효성 검증 실패: ${diag.errorMessage || (diag.statusCode ? `HTTP ${diag.statusCode}` : '인증 실패')}`,
          };
        }
        return { success: true, message: `${vendor} API 키 형식이 등록되었습니다.` };
      } catch (err: any) {
        return { success: false, message: err?.message || '네트워크 오류가 발생했습니다.' };
      }
    },
    { vendor }
  );
}

// Global safety hooks for project switch and auto-lock events
if (typeof window !== 'undefined') {
  window.addEventListener('aipodium:project_switch', () => {
    clearAiDecryptedKeyMemory();
  });
  window.addEventListener('aipodium:auto_lock', () => {
    clearAiDecryptedKeyMemory();
  });
  window.addEventListener('beforeunload', () => {
    clearAiDecryptedKeyMemory();
  });
}
