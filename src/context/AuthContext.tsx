import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, AuthUser } from '../services/authService';
import { hasMasterPinConfigured } from '../utils/securityCrypto';
import { purgeGuestSession, purgeGuestWorkspaceData } from '../services/workspaceStorageService';

export interface AuthContextType {
  currentUser: AuthUser | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  hasPin: boolean;
  loginAsGuest: (guestName?: string) => AuthUser;
  logout: () => Promise<void> | void;
  purgeGuestSession: (options?: { resetToSampleWorkspace?: boolean }) => Promise<void>;
  purgeGuestWorkspaceData: () => Promise<void>;
  // Multi-vendor API Key central management
  apiKeys: Record<string, string>;
  getApiKey: (vendor: string) => string;
  hasApiKey: (vendor: string) => boolean;
  setApiKey: (vendor: string, key: string) => Promise<void>;
  setApiKeys: (keys: Record<string, string>) => Promise<void>;
  defaultModel: string;
  setDefaultModel: (model: string) => void;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isGuest: true,
  isAuthenticated: false,
  hasPin: false,
  loginAsGuest: () => authService.loginAsGuest(),
  logout: () => authService.logout(),
  purgeGuestSession: (options) => purgeGuestSession(options),
  purgeGuestWorkspaceData: () => purgeGuestWorkspaceData(),
  apiKeys: { gemini: '', openai: '', anthropic: '', deepseek: '', groq: '' },
  getApiKey: () => '',
  hasApiKey: () => false,
  setApiKey: async () => {},
  setApiKeys: async () => {},
  defaultModel: 'gemini-2.5-flash',
  setDefaultModel: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [apiKeys, setApiKeysState] = useState<Record<string, string>>(() => {
    try {
      const sessionKeys = sessionStorage.getItem('aipodium_api_keys');
      if (sessionKeys) {
        return { gemini: '', openai: '', anthropic: '', deepseek: '', groq: '', ...JSON.parse(sessionKeys) };
      }
    } catch {}
    return { gemini: '', openai: '', anthropic: '', deepseek: '', groq: '' };
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [encGemini, encAll] = await Promise.all([
          authService.getEncryptedApiKey().catch(() => ''),
          authService.getEncryptedApiKeys().catch((): Record<string, string> => ({}))
        ]);
        if (!isMounted) return;
        const allKeys = encAll as Record<string, string>;
        setApiKeysState((prev) => ({
          ...prev,
          ...allKeys,
          gemini: encGemini || allKeys.gemini || prev.gemini || ''
        }));
      } catch (err) {
        console.warn('[AuthContext] Load encrypted keys warning:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setApiKey = useCallback(async (vendor: string, key: string) => {
    const clean = key.trim();
    setApiKeysState((prev) => {
      const next = { ...prev, [vendor]: clean };
      try {
        sessionStorage.setItem('aipodium_api_keys', JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      if (vendor === 'gemini') {
        if (clean) await authService.saveEncryptedApiKey(clean);
        else await authService.removeEncryptedApiKey();
      }
      const updated = { ...apiKeys, [vendor]: clean };
      await authService.saveEncryptedApiKeys(updated);
    } catch (err) {
      console.warn(`[AuthContext] Save key error for ${vendor}:`, err);
    }
  }, [apiKeys]);

  const setApiKeys = useCallback(async (keys: Record<string, string>) => {
    const next = { ...apiKeys, ...keys };
    setApiKeysState(next);
    try {
      sessionStorage.setItem('aipodium_api_keys', JSON.stringify(next));
      await authService.saveEncryptedApiKeys(next);
      if (next.gemini) {
        await authService.saveEncryptedApiKey(next.gemini);
      }
    } catch (err) {
      console.warn('[AuthContext] Save keys error:', err);
    }
  }, [apiKeys]);

  const getApiKey = useCallback((vendor: string): string => {
    return apiKeys[vendor] || (vendor === 'gemini' ? apiKeys.gemini : '') || '';
  }, [apiKeys]);

  const hasApiKey = useCallback((vendor: string): boolean => {
    const k = apiKeys[vendor];
    return typeof k === 'string' && k.trim().length > 0;
  }, [apiKeys]);

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const hasPin = hasMasterPinConfigured();
  const isGuest =
    !currentUser ||
    currentUser.provider === 'guest' ||
    currentUser.isGuest === true ||
    !hasPin;

  const handleLogout = useCallback(async () => {
    if (isGuest || !hasPin) {
      try {
        await purgeGuestWorkspaceData();
      } catch (err) {
        console.warn('[AuthContext] Guest purge warning on logout:', err);
      }
    }
    authService.logout();
  }, [isGuest, hasPin]);

  const [defaultModel, setDefaultModelState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('aipodium_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultModel) return parsed.defaultModel;
      }
    } catch {}
    return 'gemini-2.5-flash';
  });

  const setDefaultModel = useCallback((model: string) => {
    setDefaultModelState(model);
    try {
      const saved = localStorage.getItem('aipodium_preferences');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed.defaultModel = model;
      localStorage.setItem('aipodium_preferences', JSON.stringify(parsed));
    } catch {}
  }, []);

  const value: AuthContextType = {
    currentUser,
    isGuest,
    hasPin,
    isAuthenticated: !!currentUser,
    loginAsGuest: (name?: string) => authService.loginAsGuest(name),
    logout: handleLogout,
    purgeGuestSession: (options) => purgeGuestSession(options),
    purgeGuestWorkspaceData: () => purgeGuestWorkspaceData(),
    apiKeys,
    getApiKey,
    hasApiKey,
    setApiKey,
    setApiKeys,
    defaultModel,
    setDefaultModel
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context;
};

