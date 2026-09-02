/**
 * Security & Cryptography Utilities for AI Podium
 * Implements AES-256-GCM encryption & PBKDF2 key derivation using the Web Crypto API.
 */

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
 * Derives an AES-GCM 256-bit CryptoKey from a user passcode using PBKDF2.
 */
async function deriveKeyFromPasscode(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(passcode);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
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
 * Hashes a passcode with SHA-256 for local PIN verification.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`aipodium_salt_prefix_${passcode}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Encrypts a plaintext string (e.g. API Key or Endpoint) using AES-256-GCM.
 * Returns a self-contained bundle format: ENC:AES256:GCM:{salt_hex}:{iv_hex}:{ciphertext_hex}
 */
export async function encryptDataWithPasscode(plaintext: string, passcode: string): Promise<string> {
  if (!plaintext) return '';
  if (!passcode) throw new Error('Passcode is required for encryption.');

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPasscode(passcode, salt);

  const enc = new TextEncoder();
  const encodedPlaintext = enc.encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
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
    // If not encrypted format, return as-is (e.g. legacy plain text)
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
    const decryptedBuffer = await window.crypto.subtle.decrypt(
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
export function isEncryptedPayload(text: string): boolean {
  if (typeof text !== 'string') return false;
  return text.startsWith('ENC:AES256:GCM:');
}
