// Authentication and User Session Service for AI Podium IDE
// Supports Google SSO, GitHub SSO, API Key direct auth, and Guest mode.

import { GoogleUserProfile, googleDriveService } from './googleDriveService';
import {
  hasMasterPinConfigured,
  encryptApiKey,
  decryptApiKey,
  EncryptedApiKeyPayload,
  isEncryptedApiKeyPayload
} from '../utils/securityCrypto';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'google' | 'github' | 'apikey' | 'guest';
  role?: string;
  apiKeyMasked?: string;
  githubRepo?: string;
  createdAt: string;
  isGuest?: boolean;
}

const AUTH_STORAGE_KEY = 'podium_auth_session_v1';
export const ENCRYPTED_GEMINI_KEY_STORAGE = 'aipodium_enc_gemini_key_v1';
export const ENCRYPTED_API_KEYS_STORAGE = 'aipodium_enc_api_keys_v1';

const memoryFallbackStore = new Map<string, string>();
function getLocalStorage(): Storage | { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  if (typeof localStorage !== 'undefined' && localStorage) {
    return localStorage;
  }
  return {
    getItem: (k: string) => memoryFallbackStore.get(k) ?? null,
    setItem: (k: string, v: string) => memoryFallbackStore.set(k, String(v)),
    removeItem: (k: string) => memoryFallbackStore.delete(k)
  };
}
function getSessionStorage(): Storage | { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  if (typeof sessionStorage !== 'undefined' && sessionStorage) {
    return sessionStorage;
  }
  return {
    getItem: (k: string) => memoryFallbackStore.get(`sess_${k}`) ?? null,
    setItem: (k: string, v: string) => memoryFallbackStore.set(`sess_${k}`, String(v)),
    removeItem: (k: string) => memoryFallbackStore.delete(`sess_${k}`)
  };
}

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    this.loadSession();
    // Run key migration automatically in background
    if (typeof window !== 'undefined') {
      this.migrateLegacyPlaintextKeys().catch(() => {});
    }
  }

  private loadSession() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      } else {
        // Check if user was previously authenticated via Google Drive
        const googleUser = googleDriveService.getUserProfile();
        if (googleUser && googleDriveService.isAuthenticated()) {
          this.currentUser = {
            id: googleUser.id,
            name: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.picture,
            provider: 'google',
            role: 'Lead Architect',
            createdAt: new Date().toISOString()
          };
          this.saveSession();
        }
      }
    } catch (e) {
      console.warn('Failed to load auth session:', e);
      this.currentUser = null;
    }
  }

  private saveSession() {
    try {
      if (this.currentUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
    this.notify();
  }

  public subscribe(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentUser));
  }

  public getCurrentUser(): AuthUser | null {
    if (!this.currentUser) return null;
    return {
      ...this.currentUser,
      isGuest: this.isGuest()
    };
  }

  public isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  /**
   * Tracks whether the current active user is in guest mode (isGuest: boolean)
   * without a configured PIN or master password.
   */
  public isGuest(): boolean {
    if (!this.currentUser) return true;
    if (this.currentUser.provider === 'guest') return true;
    return !hasMasterPinConfigured();
  }

  public get isGuestMode(): boolean {
    return this.isGuest();
  }

  public isGuestUser(): boolean {
    return this.isGuest();
  }

  public async loginWithGoogle(profile?: GoogleUserProfile): Promise<AuthUser> {
    let googleUser = profile;
    if (!googleUser) {
      try {
        await googleDriveService.signIn();
        googleUser = googleDriveService.getUserProfile() || undefined;
      } catch (err) {
        console.warn('Google sign in prompt failed or dismissed, creating local profile:', err);
      }
    }

    const user: AuthUser = {
      id: googleUser?.id || `google_${Date.now()}`,
      name: googleUser?.name || 'Google Developer',
      email: googleUser?.email || 'developer@google.com',
      avatar: googleUser?.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      provider: 'google',
      isGuest: !hasMasterPinConfigured(),
      role: 'Cloud Architect',
      createdAt: new Date().toISOString()
    };

    this.currentUser = user;
    this.saveSession();
    return user;
  }

  public async loginWithGithub(token: string, username: string, repo?: string): Promise<AuthUser> {
    const cleanUser = username.trim() || 'github-dev';
    let avatarUrl = `https://github.com/${cleanUser}.png`;
    let userEmail = `${cleanUser}@users.noreply.github.com`;

    try {
      if (token) {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.avatar_url) avatarUrl = data.avatar_url;
          if (data.email) userEmail = data.email;
        }
      }
    } catch {
      // Fallback to defaults
    }

    const user: AuthUser = {
      id: `gh_${Date.now()}`,
      name: cleanUser,
      email: userEmail,
      avatar: avatarUrl,
      provider: 'github',
      isGuest: !hasMasterPinConfigured(),
      role: 'Core Contributor',
      githubRepo: repo,
      createdAt: new Date().toISOString()
    };

    this.currentUser = user;
    this.saveSession();
    return user;
  }

  public loginWithApiKey(apiKey: string, devName?: string): AuthUser {
    const trimmed = apiKey.trim();
    const masked = trimmed.length > 8 ? `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}` : '****';
    const name = devName?.trim() || 'AI Engineer';

    const user: AuthUser = {
      id: `key_${Date.now()}`,
      name,
      email: 'api-developer@ai-podium.local',
      provider: 'apikey',
      isGuest: !hasMasterPinConfigured(),
      apiKeyMasked: masked,
      role: 'API Key Master',
      createdAt: new Date().toISOString()
    };

    this.currentUser = user;
    this.saveSession();
    return user;
  }

  public loginAsGuest(guestName?: string): AuthUser {
    const name = guestName?.trim() || 'Guest Developer';
    const user: AuthUser = {
      id: `guest_${Date.now()}`,
      name,
      email: 'guest@ai-podium.workspace',
      provider: 'guest',
      isGuest: true,
      role: 'Workspace Explorer',
      createdAt: new Date().toISOString()
    };

    this.currentUser = user;
    this.saveSession();
    return user;
  }

  public logout() {
    this.currentUser = null;
    this.saveSession();
    // Google Drive integration is independent of app user login; do not clear drive token here
  }

  /**
   * Persists an API key with AES-GCM (256-bit) and PBKDF2 encryption.
   * Deprecates and immediately purges all unencrypted/plaintext keys from storage.
   */
  public async saveEncryptedApiKey(rawKey: string, userSecret?: string): Promise<EncryptedApiKeyPayload | null> {
    if (!rawKey || !rawKey.trim()) {
      await this.removeEncryptedApiKey();
      return null;
    }

    const payload = await encryptApiKey(rawKey.trim(), userSecret);
    try {
      const ls = getLocalStorage();
      const ss = getSessionStorage();
      ls.setItem(ENCRYPTED_GEMINI_KEY_STORAGE, JSON.stringify(payload));
      // Deprecate and immediately purge any plaintext keys across storage
      ls.removeItem('gemini_api_key');
      ls.removeItem('aipodium_cloud_api_key');
      ss.removeItem('aipodium_cloud_api_key');
    } catch (e) {
      console.error('[AuthService] Failed to save encrypted API key:', e);
    }
    return payload;
  }

  /**
   * Decrypts and retrieves the stored API key.
   * If a legacy unencrypted key exists, migrates it immediately to encrypted storage.
   */
  public async getEncryptedApiKey(userSecret?: string): Promise<string> {
    try {
      const ls = getLocalStorage();
      const ss = getSessionStorage();
      const stored = ls.getItem(ENCRYPTED_GEMINI_KEY_STORAGE);
      if (stored) {
        return await decryptApiKey(stored, userSecret);
      }

      // Check legacy plaintext keys for auto-migration
      const legacyKey =
        ls.getItem('gemini_api_key') ||
        ls.getItem('aipodium_cloud_api_key') ||
        ss.getItem('aipodium_cloud_api_key');

      if (legacyKey && legacyKey.trim()) {
        const clean = legacyKey.trim();
        await this.saveEncryptedApiKey(clean, userSecret);
        return clean;
      }
    } catch (e) {
      console.warn('[AuthService] Failed to retrieve or decrypt API key:', e);
    }
    return '';
  }

  /**
   * Persists multi-vendor API keys dictionary in AES-GCM encrypted format.
   */
  public async saveEncryptedApiKeys(keysMap: Record<string, string>, userSecret?: string): Promise<void> {
    try {
      const ls = getLocalStorage();
      const ss = getSessionStorage();
      const payload = await encryptApiKey(JSON.stringify(keysMap), userSecret);
      ls.setItem(ENCRYPTED_API_KEYS_STORAGE, JSON.stringify(payload));
      ls.removeItem('aipodium_api_keys');
      ss.removeItem('aipodium_api_keys');
    } catch (e) {
      console.error('[AuthService] Failed to save encrypted API keys bundle:', e);
    }
  }

  /**
   * Decrypts and retrieves multi-vendor API keys dictionary.
   */
  public async getEncryptedApiKeys(userSecret?: string): Promise<Record<string, string>> {
    try {
      const ls = getLocalStorage();
      const ss = getSessionStorage();
      const stored = ls.getItem(ENCRYPTED_API_KEYS_STORAGE);
      if (stored) {
        const decryptedJson = await decryptApiKey(stored, userSecret);
        return JSON.parse(decryptedJson);
      }

      // Check legacy unencrypted multi-vendor keys
      const legacy = ls.getItem('aipodium_api_keys') || ss.getItem('aipodium_api_keys');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          await this.saveEncryptedApiKeys(parsed, userSecret);
          return parsed;
        } catch {}
      }
    } catch (e) {
      console.warn('[AuthService] Failed to retrieve or decrypt multi-vendor API keys:', e);
    }
    return {};
  }

  /**
   * Completely purges all encrypted and legacy plaintext API keys from browser storage.
   */
  public async removeEncryptedApiKey(): Promise<void> {
    try {
      const ls = getLocalStorage();
      const ss = getSessionStorage();
      ls.removeItem(ENCRYPTED_GEMINI_KEY_STORAGE);
      ls.removeItem(ENCRYPTED_API_KEYS_STORAGE);
      ls.removeItem('gemini_api_key');
      ls.removeItem('aipodium_cloud_api_key');
      ls.removeItem('aipodium_api_keys');
      ss.removeItem('aipodium_cloud_api_key');
      ss.removeItem('aipodium_api_keys');
    } catch {}
  }

  /**
   * Checks whether an encrypted or legacy API key exists in storage.
   */
  public async hasStoredApiKey(): Promise<boolean> {
    try {
      const ls = getLocalStorage();
      const ss = getSessionStorage();
      if (ls.getItem(ENCRYPTED_GEMINI_KEY_STORAGE)) return true;
      if (ls.getItem('gemini_api_key')) return true;
      if (ls.getItem('aipodium_cloud_api_key')) return true;
      if (ss.getItem('aipodium_cloud_api_key')) return true;
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Startup migration routine:
   * Detects legacy plaintext keys (e.g. gemini_api_key, aipodium_cloud_api_key, aipodium_api_keys),
   * encrypts them using AES-GCM (256-bit) and PBKDF2, saves them to encrypted storage,
   * and immediately purges all plaintext entries.
   */
  public async migrateLegacyPlaintextKeys(userSecret?: string): Promise<{ migrated: boolean; count: number }> {
    let count = 0;
    try {
      const ls = getLocalStorage();
      const ss = getSessionStorage();
      const plaintextGemini =
        ls.getItem('gemini_api_key') ||
        ls.getItem('aipodium_cloud_api_key') ||
        ss.getItem('aipodium_cloud_api_key');

      if (plaintextGemini && plaintextGemini.trim()) {
        await this.saveEncryptedApiKey(plaintextGemini.trim(), userSecret);
        count++;
      }

      const plaintextMultiKeys =
        ls.getItem('aipodium_api_keys') ||
        ss.getItem('aipodium_api_keys');

      if (plaintextMultiKeys && plaintextMultiKeys.trim()) {
        try {
          const parsed = JSON.parse(plaintextMultiKeys);
          await this.saveEncryptedApiKeys(parsed, userSecret);
          count++;
        } catch {
          // If not valid json, remove directly
          ls.removeItem('aipodium_api_keys');
          ss.removeItem('aipodium_api_keys');
        }
      }

      // Ensure all plaintext remnants are wiped
      ls.removeItem('gemini_api_key');
      ls.removeItem('aipodium_cloud_api_key');
      ss.removeItem('aipodium_cloud_api_key');
      ls.removeItem('aipodium_api_keys');
      ss.removeItem('aipodium_api_keys');
    } catch (err) {
      console.warn('[AuthService] Error during plaintext key migration:', err);
    }
    return { migrated: count > 0, count };
  }
}

export const authService = new AuthService();
