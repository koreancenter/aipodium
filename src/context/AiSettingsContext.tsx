import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/authService';

export type CloudVendorId = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq';

export interface CloudApiKeys {
  gemini: string;
  openai: string;
  anthropic: string;
  deepseek: string;
  groq: string;
  [key: string]: string;
}

export interface AiSettingsContextType {
  apiKeys: CloudApiKeys;
  setApiKey: (vendor: string, key: string) => Promise<void>;
  setApiKeys: (keys: Record<string, string>) => Promise<void>;
  getApiKey: (vendor: string) => string;
  hasApiKey: (vendor: string) => boolean;
  activeProvider: 'cloud' | 'local-pc' | 'local-server' | 'webllm';
  setActiveProvider: (provider: 'cloud' | 'local-pc' | 'local-server' | 'webllm') => void;
  defaultModel: string;
  setDefaultModel: (model: string) => void;
  localEndpoint: string;
  setLocalEndpoint: (endpoint: string) => void;
  dynamicProviderModels: Record<string, { id: string; name: string }[]>;
  setDynamicProviderModels: (models: Record<string, { id: string; name: string }[]>) => void;
  updateDynamicModelsForVendor: (vendor: string, models: { id: string; name: string }[]) => void;
}

const DEFAULT_API_KEYS: CloudApiKeys = {
  gemini: '',
  openai: '',
  anthropic: '',
  deepseek: '',
  groq: ''
};

export const AiSettingsContext = createContext<AiSettingsContextType>({
  apiKeys: DEFAULT_API_KEYS,
  setApiKey: async () => {},
  setApiKeys: async () => {},
  getApiKey: () => '',
  hasApiKey: () => false,
  activeProvider: 'cloud',
  setActiveProvider: () => {},
  defaultModel: 'gemini-2.5-flash',
  setDefaultModel: () => {},
  localEndpoint: 'http://localhost:11434',
  setLocalEndpoint: () => {},
  dynamicProviderModels: {},
  setDynamicProviderModels: () => {},
  updateDynamicModelsForVendor: () => {}
});

export const AiSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKeys, setApiKeysState] = useState<CloudApiKeys>(() => {
    try {
      const sessionKeys = sessionStorage.getItem('aipodium_api_keys');
      if (sessionKeys) {
        return { ...DEFAULT_API_KEYS, ...JSON.parse(sessionKeys) };
      }
    } catch {}
    return DEFAULT_API_KEYS;
  });

  const [activeProvider, setActiveProviderState] = useState<'cloud' | 'local-pc' | 'local-server' | 'webllm'>('cloud');
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

  const [localEndpoint, setLocalEndpointState] = useState<string>(() => {
    try {
      return sessionStorage.getItem('aipodium_local_endpoint') || 'http://localhost:11434';
    } catch {
      return 'http://localhost:11434';
    }
  });

  const [dynamicProviderModels, setDynamicProviderModelsState] = useState<Record<string, { id: string; name: string }[]>>({});

  // Initialize encrypted keys from storage on mount
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
        console.warn('[AiSettingsContext] Failed to load encrypted keys:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setApiKey = useCallback(async (vendor: string, key: string) => {
    const cleanKey = key.trim();
    setApiKeysState((prev) => {
      const next = { ...prev, [vendor]: cleanKey };
      try {
        sessionStorage.setItem('aipodium_api_keys', JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      if (vendor === 'gemini') {
        if (cleanKey) {
          await authService.saveEncryptedApiKey(cleanKey);
        } else {
          await authService.removeEncryptedApiKey();
        }
      }
      const updatedMap = { ...apiKeys, [vendor]: cleanKey };
      await authService.saveEncryptedApiKeys(updatedMap);
    } catch (err) {
      console.warn(`[AiSettingsContext] Failed to encrypt key for ${vendor}:`, err);
    }
  }, [apiKeys]);

  const setApiKeys = useCallback(async (keys: Record<string, string>) => {
    const next: CloudApiKeys = {
      ...apiKeys,
      ...keys
    };
    setApiKeysState(next);
    try {
      sessionStorage.setItem('aipodium_api_keys', JSON.stringify(next));
      await authService.saveEncryptedApiKeys(next);
      if (next.gemini) {
        await authService.saveEncryptedApiKey(next.gemini);
      }
    } catch (err) {
      console.warn('[AiSettingsContext] Failed to persist multi-provider keys:', err);
    }
  }, [apiKeys]);

  const getApiKey = useCallback((vendor: string): string => {
    return apiKeys[vendor] || (vendor === 'gemini' ? apiKeys.gemini : '') || '';
  }, [apiKeys]);

  const hasApiKey = useCallback((vendor: string): boolean => {
    const key = apiKeys[vendor];
    return typeof key === 'string' && key.trim().length > 0;
  }, [apiKeys]);

  const setActiveProvider = useCallback((p: 'cloud' | 'local-pc' | 'local-server' | 'webllm') => {
    setActiveProviderState(p);
  }, []);

  const setDefaultModel = useCallback((model: string) => {
    setDefaultModelState(model);
    try {
      const saved = localStorage.getItem('aipodium_preferences');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed.defaultModel = model;
      localStorage.setItem('aipodium_preferences', JSON.stringify(parsed));
    } catch {}
  }, []);

  const setLocalEndpoint = useCallback((ep: string) => {
    const clean = ep.trim().replace(/\/+$/, '') || 'http://localhost:11434';
    setLocalEndpointState(clean);
    try {
      sessionStorage.setItem('aipodium_local_endpoint', clean);
    } catch {}
  }, []);

  const setDynamicProviderModels = useCallback((models: Record<string, { id: string; name: string }[]>) => {
    setDynamicProviderModelsState(models);
  }, []);

  const updateDynamicModelsForVendor = useCallback((vendor: string, models: { id: string; name: string }[]) => {
    setDynamicProviderModelsState((prev) => ({
      ...prev,
      [vendor]: models
    }));
  }, []);

  const value = useMemo<AiSettingsContextType>(() => ({
    apiKeys,
    setApiKey,
    setApiKeys,
    getApiKey,
    hasApiKey,
    activeProvider,
    setActiveProvider,
    defaultModel,
    setDefaultModel,
    localEndpoint,
    setLocalEndpoint,
    dynamicProviderModels,
    setDynamicProviderModels,
    updateDynamicModelsForVendor
  }), [
    apiKeys,
    setApiKey,
    setApiKeys,
    getApiKey,
    hasApiKey,
    activeProvider,
    setActiveProvider,
    defaultModel,
    setDefaultModel,
    localEndpoint,
    setLocalEndpoint,
    dynamicProviderModels,
    setDynamicProviderModels,
    updateDynamicModelsForVendor
  ]);

  return (
    <AiSettingsContext.Provider value={value}>
      {children}
    </AiSettingsContext.Provider>
  );
};

export const useAiSettings = (): AiSettingsContextType => {
  return useContext(AiSettingsContext);
};
