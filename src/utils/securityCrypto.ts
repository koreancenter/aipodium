/**
 * Security & Cryptography Utilities for AI Podium
 * Implements AES-256-GCM encryption, PBKDF2 key derivation & rate-limiting using the Web Crypto API.
 */

// Storage Keys for Local Lock & Recovery
export const LOCAL_PIN_HASH_KEY = 'aipodium_local_pin_hash_v1';
export const LOCAL_LOCK_ENABLED_KEY = 'aipodium_local_lock_enabled_v1';
export const LOCAL_RECOVERY_KEY_HASH = 'aipodium_local_recovery_hash_v1';
export const LOCAL_LOCKOUT_ATTEMPTS_KEY = 'aipodium_lockout_attempts_v1';
export const LOCAL_LOCKOUT_UNTIL_KEY = 'aipodium_lockout_until_v1';
export const LOCAL_VAULT_KEY_PIN_ENC = 'aipodium_vault_key_by_pin_v1';
export const LOCAL_VAULT_KEY_REC_ENC = 'aipodium_vault_key_by_rec_v1';

// Rate Limiting Constants
export const MAX_CONSECUTIVE_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30000; // 30 seconds

// Fallback in-memory storage for non-browser runtime (e.g. Node.js test runner)
const memoryStorage = new Map<string, string>();

function getStorage(): { getItem: (key: string) => string | null; setItem: (key: string, val: string) => void; removeItem: (key: string) => void } {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      return localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {}
  return {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, val: string) => { memoryStorage.set(key, val); },
    removeItem: (key: string) => { memoryStorage.delete(key); }
  };
}

// Helper to access standard Web Crypto in both browser and Node.js test environments
function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return (globalThis as any).crypto;
}

// Helper to convert Uint8Array to Hex string
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert Hex string to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Constant-time string equality check to prevent timing side-channel attacks.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let mismatch = a.length === b.length ? 0 : 1;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const charA = a.charCodeAt(i % a.length);
    const charB = b.charCodeAt(i % b.length);
    mismatch |= charA ^ charB;
  }
  return mismatch === 0;
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from a user passcode using PBKDF2.
 */
async function deriveKeyFromPasscode(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(passcode);
  const cryptoObj = getCrypto();

  const baseKey = await cryptoObj.subtle.importKey(
    'raw',
    rawKey,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Hashes a passcode using native Web Crypto PBKDF2 with 100,000 iterations and a CSPRNG 16-byte random salt.
 * Format: PBKDF2:SHA256:100000:{salt_hex}:{hash_hex}
 */
export async function hashPasscode(passcode: string, customSalt?: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(passcode);
  const cryptoObj = getCrypto();
  const salt = customSalt || cryptoObj.getRandomValues(new Uint8Array(16));

  const baseKey = await cryptoObj.subtle.importKey(
    'raw',
    rawKey,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );

  const saltHex = bufferToHex(salt);
  const hashHex = bufferToHex(derivedBits);
  return `PBKDF2:SHA256:100000:${saltHex}:${hashHex}`;
}

/**
 * Verifies a passcode against a stored hash using constant-time comparison.
 * Supports PBKDF2 with 100,000 iterations as well as legacy SHA-256 format for backward compatibility.
 */
export async function verifyPasscodeHash(passcode: string, storedHash?: string | null): Promise<boolean> {
  if (!storedHash || !passcode) return false;

  // PBKDF2 Format: PBKDF2:SHA256:100000:{salt_hex}:{hash_hex}
  if (storedHash.startsWith('PBKDF2:SHA256:100000:')) {
    const parts = storedHash.split(':');
    if (parts.length === 5) {
      const saltHex = parts[3];
      const expectedHash = parts[4];
      const salt = hexToBuffer(saltHex);
      const computed = await hashPasscode(passcode, salt);
      const computedParts = computed.split(':');
      if (computedParts.length === 5) {
        return constantTimeEqual(computedParts[4], expectedHash);
      }
    }
  }

  // Legacy SHA-256 direct hex format
  if (storedHash.startsWith('SHA256:')) {
    const expected = storedHash.slice(7);
    const computed = await computeSha256(passcode);
    return constantTimeEqual(computed, expected);
  }

  // Legacy SHA-256 with static prefix fallback
  const enc = new TextEncoder();
  const data = enc.encode(`aipodium_salt_prefix_${passcode}`);
  const cryptoObj = getCrypto();
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  if (constantTimeEqual(bufferToHex(hashBuffer), storedHash)) return true;

  // Direct raw SHA-256 hex fallback
  const rawHash = await computeSha256(passcode);
  return constantTimeEqual(rawHash, storedHash);
}

/**
 * Computes standard SHA-256 hash in hex string using native window.crypto.subtle.
 */
export async function computeSha256(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const cryptoObj = getCrypto();
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Hashes a master PIN using PBKDF2 with SHA-256, 100,000 iterations, and a CSPRNG 16-byte salt.
 */
export async function hashMasterPin(pin: string): Promise<string> {
  return hashPasscode(pin);
}

/**
 * Verifies a master PIN against a stored hash using constant-time comparison.
 */
export async function verifyMasterPin(pin: string, storedHash: string): Promise<boolean> {
  if (!pin || !storedHash) return false;
  return verifyPasscodeHash(pin, storedHash);
}

/**
 * Generates a cryptographically secure 16-character Master Recovery Key.
 * Uses unambiguous characters (excluding 0, O, 1, I, L) formatted in 4 blocks of 4 chars: "XXXX-XXXX-XXXX-XXXX"
 */
export function generateMasterRecoveryKey(): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const cryptoObj = getCrypto();
  const randomBytes = cryptoObj.getRandomValues(new Uint8Array(16));
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += alphabet[randomBytes[i] % alphabet.length];
    if (i % 4 === 3 && i !== 15) {
      result += '-';
    }
  }
  return result;
}

/**
 * Normalizes user input for the recovery key by stripping whitespace and hyphens and converting to uppercase.
 */
export function normalizeRecoveryKey(key: string): string {
  if (typeof key !== 'string') return '';
  return key.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Hashes the Master Recovery Key using PBKDF2.
 */
export async function hashRecoveryKey(key: string): Promise<string> {
  const cleanKey = normalizeRecoveryKey(key);
  if (!cleanKey || cleanKey.length !== 16) {
    throw new Error('Master Recovery Key must be exactly 16 alphanumeric characters.');
  }
  return hashPasscode(cleanKey);
}

/**
 * Verifies the user-entered recovery key against the stored PBKDF2 hash.
 */
export async function verifyRecoveryKey(enteredKey: string, storedHash: string): Promise<boolean> {
  const cleanKey = normalizeRecoveryKey(enteredKey);
  if (!cleanKey || !storedHash) return false;
  return verifyPasscodeHash(cleanKey, storedHash);
}

/**
 * Rate Limiting: Retrieves current lockout status from persistent local storage.
 */
export function getLockoutStatus(): { isLockedOut: boolean; remainingSeconds: number; attempts: number } {
  try {
    const storage = getStorage();
    const rawUntil = storage.getItem(LOCAL_LOCKOUT_UNTIL_KEY);
    const rawAttempts = storage.getItem(LOCAL_LOCKOUT_ATTEMPTS_KEY);

    const attempts = rawAttempts ? parseInt(rawAttempts, 10) || 0 : 0;
    const until = rawUntil ? parseInt(rawUntil, 10) || 0 : 0;
    const now = Date.now();

    if (until > now) {
      const remainingSeconds = Math.max(1, Math.ceil((until - now) / 1000));
      return { isLockedOut: true, remainingSeconds, attempts };
    }

    if (until > 0 && until <= now) {
      // Lockout window passed, reset attempts
      storage.removeItem(LOCAL_LOCKOUT_UNTIL_KEY);
      storage.setItem(LOCAL_LOCKOUT_ATTEMPTS_KEY, '0');
      return { isLockedOut: false, remainingSeconds: 0, attempts: 0 };
    }

    return { isLockedOut: false, remainingSeconds: 0, attempts };
  } catch {
    return { isLockedOut: false, remainingSeconds: 0, attempts: 0 };
  }
}

/**
 * Rate Limiting: Records a failed unlock attempt and triggers a 30s lockout if attempts reach 5.
 */
export function recordFailedAttempt(): { isLockedOut: boolean; remainingSeconds: number; attempts: number } {
  try {
    const storage = getStorage();
    const current = getLockoutStatus();
    if (current.isLockedOut) {
      return current;
    }

    const nextAttempts = current.attempts + 1;
    storage.setItem(LOCAL_LOCKOUT_ATTEMPTS_KEY, String(nextAttempts));

    if (nextAttempts >= MAX_CONSECUTIVE_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      storage.setItem(LOCAL_LOCKOUT_UNTIL_KEY, String(lockoutUntil));
      return { isLockedOut: true, remainingSeconds: 30, attempts: nextAttempts };
    }

    return { isLockedOut: false, remainingSeconds: 0, attempts: nextAttempts };
  } catch {
    return { isLockedOut: false, remainingSeconds: 0, attempts: 1 };
  }
}

/**
 * Rate Limiting: Clears all failed attempts and lockout timers upon successful authentication.
 */
export function resetFailedAttempts(): void {
  try {
    const storage = getStorage();
    storage.removeItem(LOCAL_LOCKOUT_ATTEMPTS_KEY);
    storage.removeItem(LOCAL_LOCKOUT_UNTIL_KEY);
  } catch {}
}

/**
 * Encrypts a plaintext string (e.g. API Key or Endpoint) using AES-256-GCM.
 * Returns a self-contained bundle format: ENC:AES256:GCM:{salt_hex}:{iv_hex}:{ciphertext_hex}
 */
export async function encryptDataWithPasscode(plaintext: string, passcode: string): Promise<string> {
  if (!plaintext) return '';
  if (!passcode) throw new Error('Passcode is required for encryption.');

  const cryptoObj = getCrypto();
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPasscode(passcode, salt);

  const enc = new TextEncoder();
  const encodedPlaintext = enc.encode(plaintext);

  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedPlaintext
  );

  const saltHex = bufferToHex(salt);
  const ivHex = bufferToHex(iv);
  const ciphertextHex = bufferToHex(ciphertextBuffer);

  return `ENC:AES256:GCM:${saltHex}:${ivHex}:${ciphertextHex}`;
}

/**
 * Decrypts an encrypted bundle format using AES-256-GCM and the user passcode.
 */
export async function decryptDataWithPasscode(bundle: string, passcode: string): Promise<string> {
  if (!bundle) return '';
  if (!passcode) throw new Error('Passcode is required for decryption.');

  if (!isEncryptedPayload(bundle)) {
    return bundle;
  }

  const parts = bundle.split(':');
  if (parts.length < 6) {
    throw new Error('Invalid encrypted bundle structure.');
  }

  const saltHex = parts[3];
  const ivHex = parts[4];
  const ciphertextHex = parts[5];

  const salt = hexToBuffer(saltHex);
  const iv = hexToBuffer(ivHex);
  const ciphertext = hexToBuffer(ciphertextHex);

  const key = await deriveKeyFromPasscode(passcode, salt);

  try {
    const cryptoObj = getCrypto();
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('Decryption failed. Incorrect passcode or corrupted ciphertext.');
  }
}

/**
 * Tests if the given passcode can successfully decrypt the bundle without throwing.
 */
export async function verifyPasscode(bundle: string, passcode: string): Promise<boolean> {
  try {
    await decryptDataWithPasscode(bundle, passcode);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string matches the AI Podium encrypted bundle format.
 */
export function isEncryptedPayload(text: any): boolean {
  if (typeof text !== 'string') return false;
  return text.startsWith('ENC:AES256:GCM:') || text.startsWith('ENC:AES256:VAULT:');
}

/**
 * Generates a cryptographically strong 256-bit (32-byte) random Vault Key in hex.
 */
export function generateVaultKey(): string {
  const cryptoObj = getCrypto();
  const bytes = cryptoObj.getRandomValues(new Uint8Array(32));
  return bufferToHex(bytes);
}

/**
 * Initializes the Master Vault Key.
 * Encrypts the Vault Key twice:
 *  1. With the user's Master PIN (via PBKDF2 + AES-256-GCM) -> stored in aipodium_vault_key_by_pin_v1
 *  2. With the 16-digit Emergency Recovery Key -> stored in aipodium_vault_key_by_rec_v1
 * Returns the unencrypted Vault Key for immediate session usage.
 */
export async function initMasterVault(pin: string, recoveryKey: string): Promise<string> {
  const storage = getStorage();
  const vaultKey = generateVaultKey();
  const encByPin = await encryptDataWithPasscode(vaultKey, pin);
  const encByRec = await encryptDataWithPasscode(vaultKey, normalizeRecoveryKey(recoveryKey));

  storage.setItem(LOCAL_VAULT_KEY_PIN_ENC, encByPin);
  storage.setItem(LOCAL_VAULT_KEY_REC_ENC, encByRec);
  return vaultKey;
}

/**
 * Unlocks the Master Vault Key using the user's Master PIN.
 * Returns the Vault Key in hex, or null if decryption fails.
 */
export async function unlockVaultWithPin(pin: string): Promise<string | null> {
  const storage = getStorage();
  const encByPin = storage.getItem(LOCAL_VAULT_KEY_PIN_ENC);
  if (!encByPin) return null;
  try {
    return await decryptDataWithPasscode(encByPin, pin);
  } catch {
    return null;
  }
}

/**
 * Unlocks the Master Vault Key using the 16-character Emergency Recovery Key.
 * Returns the Vault Key in hex, or null if decryption fails.
 */
export async function unlockVaultWithRecoveryKey(recoveryKey: string): Promise<string | null> {
  const storage = getStorage();
  const encByRec = storage.getItem(LOCAL_VAULT_KEY_REC_ENC);
  if (!encByRec) return null;
  try {
    return await decryptDataWithPasscode(encByRec, normalizeRecoveryKey(recoveryKey));
  } catch {
    return null;
  }
}

/**
 * Re-encrypts the existing Vault Key with a newly set PIN (and optional new Recovery Key).
 */
export async function rekeyVaultWithNewPin(vaultKey: string, newPin: string, newRecoveryKey?: string): Promise<void> {
  const storage = getStorage();
  const encByPin = await encryptDataWithPasscode(vaultKey, newPin);
  storage.setItem(LOCAL_VAULT_KEY_PIN_ENC, encByPin);
  if (newRecoveryKey) {
    const encByRec = await encryptDataWithPasscode(vaultKey, normalizeRecoveryKey(newRecoveryKey));
    storage.setItem(LOCAL_VAULT_KEY_REC_ENC, encByRec);
  }
}

/**
 * Purges the Master Vault Key configurations from local storage.
 */
export function purgeVaultKey(): void {
  const storage = getStorage();
  storage.removeItem(LOCAL_VAULT_KEY_PIN_ENC);
  storage.removeItem(LOCAL_VAULT_KEY_REC_ENC);
  storage.removeItem(LOCAL_PIN_HASH_KEY);
  storage.removeItem(LOCAL_RECOVERY_KEY_HASH);
}

/**
 * Checks if a Master Vault Key is currently configured.
 */
export function hasVaultKeyConfigured(): boolean {
  const storage = getStorage();
  return Boolean(storage.getItem(LOCAL_VAULT_KEY_PIN_ENC));
}

/**
 * Checks if a Master PIN or Vault Key is configured on the local device.
 */
export function hasMasterPinConfigured(): boolean {
  const storage = getStorage();
  return Boolean(storage.getItem(LOCAL_PIN_HASH_KEY) || storage.getItem(LOCAL_VAULT_KEY_PIN_ENC));
}

/**
 * Completely purges guest / temporary test workspace data from local storage, session storage, and IndexedDB.
 * Ensures zero data lingering when unauthenticated or guest users lock, log out, or return to AuthPage.
 */
export async function purgeGuestWorkspaceData(): Promise<void> {
  const storage = getStorage();

  // 1. All workspace storage keys used for local persistence
  const guestKeysToRemove = [
    'notebooklm_files',
    'notebooklm_file_folders',
    'notebooklm_editor_content',
    'notebooklm_active_file',
    'notebooklm_sessions',
    'notebooklm_active_session_id',
    'notebooklm_open_tabs',
    'notebooklm_trash_sessions',
    'notebooklm_chat_messages',
    'notebooklm_chat_threads',
    'notebooklm_custom_templates',
    'aipodium_guest_init_v1',
    'aipodium_api_keys',
    'aipodium_cloud_api_key',
    'aipodium_auth_user',
    'aipodium_github_config',
    'aipodium_current_active_file'
  ];

  for (const k of guestKeysToRemove) {
    storage.removeItem(k);
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage) {
        sessionStorage.removeItem(k);
      }
    } catch {}
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.removeItem(k);
      }
    } catch {}
  }

  // 2. Clear IndexedDB document database if supported
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB) {
      const { clearDb } = await import('../services/indexedDbService');
      await clearDb();
    }
  } catch (err) {
    console.warn('[purgeGuestWorkspaceData] IndexedDB clear warning:', err);
  }

  // 3. Clear sensitive clipboard memory
  clearSensitiveClipboard();
}

/**
 * High-performance AES-256-GCM encryption using the high-entropy Master Vault Key.
 * Bypasses PBKDF2 because the Vault Key is already a 256-bit cryptographically random key.
 * Execution speed is sub-millisecond, ideal for real-time document auto-saving.
 * Returns bundle: ENC:AES256:VAULT:{iv_hex}:{ciphertext_hex}
 */
export async function encryptWithVaultKey(plaintext: string, vaultKeyHex: string): Promise<string> {
  if (!plaintext) return '';
  if (!vaultKeyHex) throw new Error('Vault key is required for encryption.');

  const cryptoObj = getCrypto();
  const rawKeyBytes = hexToBuffer(vaultKeyHex);
  const key = await cryptoObj.subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  const ivHex = bufferToHex(iv);
  const ciphertextHex = bufferToHex(ciphertextBuffer);
  return `ENC:AES256:VAULT:${ivHex}:${ciphertextHex}`;
}

/**
 * High-performance AES-256-GCM decryption using the Master Vault Key.
 */
export async function decryptWithVaultKey(bundle: string, vaultKeyHex: string): Promise<string> {
  if (!bundle) return '';
  if (!bundle.startsWith('ENC:AES256:VAULT:')) {
    // If not a vault bundle (legacy or plain), return as is
    return bundle;
  }
  if (!vaultKeyHex) throw new Error('Vault key is required for decryption.');

  const parts = bundle.split(':');
  if (parts.length < 5) {
    throw new Error('Invalid vault ciphertext bundle format.');
  }

  const ivHex = parts[3];
  const ciphertextHex = parts[4];
  const iv = hexToBuffer(ivHex);
  const ciphertext = hexToBuffer(ciphertextHex);

  const cryptoObj = getCrypto();
  const rawKeyBytes = hexToBuffer(vaultKeyHex);
  const key = await cryptoObj.subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch {
    throw new Error('Vault decryption failed. Invalid key or corrupted data.');
  }
}

/**
 * Encrypts an arbitrary JSON-serializable value using the Master Vault Key.
 */
export async function encryptObjectWithVaultKey<T>(value: T, vaultKeyHex: string): Promise<string> {
  const json = JSON.stringify(value);
  return encryptWithVaultKey(json, vaultKeyHex);
}

/**
 * Decrypts a bundle into its original typed object.
 * Transparently supports unencrypted legacy data as well.
 */
export async function decryptObjectWithVaultKey<T>(data: any, vaultKeyHex: string): Promise<T> {
  if (typeof data !== 'string') {
    return data as T;
  }
  if (!isEncryptedPayload(data)) {
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }
  const decryptedJson = await decryptWithVaultKey(data, vaultKeyHex);
  return JSON.parse(decryptedJson) as T;
}

/**
 * Clipboard Anti-Skimming Protection:
 * Copies sensitive secrets (such as Recovery Keys or API tokens) to the system clipboard
 * and schedules an automatic wipe after a designated period (default: 60 seconds)
 * to prevent persistent exposure to other applications, browser extensions, or clipboard skimming.
 */
let clipboardWipeTimeout: any = null;
let lastCopiedSecret: string | null = null;

export async function copySensitiveWithAutoClear(
  text: string,
  clearDelaySeconds: number = 60
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    lastCopiedSecret = text;

    if (clipboardWipeTimeout) {
      clearTimeout(clipboardWipeTimeout);
      clipboardWipeTimeout = null;
    }

    clipboardWipeTimeout = setTimeout(async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText('');
        }
      } catch {
        // Silently catch clipboard permission changes
      } finally {
        lastCopiedSecret = null;
        clipboardWipeTimeout = null;
      }
    }, clearDelaySeconds * 1000);

    return true;
  } catch {
    return false;
  }
}

export async function clearSensitiveClipboard(): Promise<void> {
  if (clipboardWipeTimeout) {
    clearTimeout(clipboardWipeTimeout);
    clipboardWipeTimeout = null;
  }
  if (lastCopiedSecret) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText('');
      }
    } catch {
      // Silently catch
    } finally {
      lastCopiedSecret = null;
    }
  }
}


