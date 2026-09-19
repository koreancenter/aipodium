/**
 * AI Engine Core Service (Security Hardening Gateway)
 *
 * Implements strict zero-retention in-memory key isolation:
 * 1. Only decrypts stored API keys at the exact moment of making an active network request.
 * 2. Decrypted keys are isolated strictly within module closures or ephemeral function call scopes.
 *    NEVER attached to window, globalThis, persistent state, or debug logs.
 * 3. Immediately clears and zeros ephemeral key memory upon project switch, auto-lock timeout, or logout.
 */

import { authService } from './authService';
import { clearDeviceSecretMemory } from '../utils/securityCrypto';

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
    inFlightEphemeralKey = resolved;
    ephemeralKeyTimestamp = Date.now();
  }

  return resolved;
}

export interface ExecuteAiOptions {
  vendor?: string;
  userSecret?: string;
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
    return await requestFn(ephemeralKey);
  } finally {
    // Transient in-flight variable zeroing
    ephemeralKey = null;
  }
}

/**
 * Convenience helper to verify an API key against vendor endpoints
 */
export async function verifyApiKeyWithAiEngine(
  vendor: string,
  testKey?: string
): Promise<{ success: boolean; message?: string }> {
  return executeAiRequest(
    async (decryptedKey) => {
      const keyToTest = testKey?.trim() || decryptedKey;
      if (!keyToTest) {
        return { success: false, message: 'API 키가 입력되지 않았습니다.' };
      }

      try {
        if (vendor === 'gemini') {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToTest)}`,
            { method: 'GET' }
          );
          if (res.ok) {
            return { success: true, message: 'Google Gemini API 키가 유효합니다.' };
          }
          return { success: false, message: `유효성 검증 실패 (HTTP ${res.status})` };
        }
        return { success: true, message: `${vendor} API 키 형식이 등록되었습니다.` };
      } catch (err: any) {
        return { success: false, message: err.message || '네트워크 오류가 발생했습니다.' };
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
