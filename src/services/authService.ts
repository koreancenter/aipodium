// Authentication and User Session Service for AI Podium IDE
// Supports Google SSO, GitHub SSO, API Key direct auth, and Guest mode.

import { GoogleUserProfile, googleDriveService } from './googleDriveService';

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
}

const AUTH_STORAGE_KEY = 'podium_auth_session_v1';

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    this.loadSession();
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
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return !!this.currentUser;
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
    // Also clear Google Drive token if present
    try {
      googleDriveService.clearToken();
    } catch {
      // ignore
    }
  }
}

export const authService = new AuthService();
