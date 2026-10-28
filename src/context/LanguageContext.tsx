import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AppLanguage,
  LANGUAGE_PREFERENCE_KEY,
  LEGACY_AUTH_LANGUAGE_KEY,
  LanguagePreference,
  normalizeLanguagePreference,
  resolveAppLanguage,
  resolveInitialLanguagePreference,
  setActiveLanguage
} from '../locales/language';
import { getCoreTranslations } from '../locales/coreLocale';

export interface LanguageContextValue {
  language: AppLanguage;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getBrowserLanguages(): string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return [...navigator.languages];
  return navigator.language ? [navigator.language] : [];
}

function getInitialPreference(): LanguagePreference {
  if (typeof localStorage === 'undefined') return 'system';

  try {
    const preference = localStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    const legacyLanguage = localStorage.getItem(LEGACY_AUTH_LANGUAGE_KEY);
    const initialPreference = resolveInitialLanguagePreference(preference, legacyLanguage);

    if (preference == null && legacyLanguage != null) {
      localStorage.setItem(LANGUAGE_PREFERENCE_KEY, initialPreference);
    }

    return initialPreference;
  } catch {
    return 'system';
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<LanguagePreference>(getInitialPreference);
  const [browserLanguages, setBrowserLanguages] = useState<string[]>(getBrowserLanguages);

  const setPreference = useCallback((nextPreference: LanguagePreference) => {
    setPreferenceState(nextPreference);
    try {
      localStorage.setItem(LANGUAGE_PREFERENCE_KEY, nextPreference);
    } catch (error) {
      console.warn('[LanguageContext] Unable to persist language preference:', error);
    }
  }, []);

  useEffect(() => {
    const updateBrowserLanguages = () => setBrowserLanguages(getBrowserLanguages());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_PREFERENCE_KEY) {
        setPreferenceState(normalizeLanguagePreference(event.newValue));
      }
    };

    window.addEventListener('languagechange', updateBrowserLanguages);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('languagechange', updateBrowserLanguages);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const language = resolveAppLanguage(preference, browserLanguages);
  setActiveLanguage(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = getCoreTranslations(language).appTitle;
  }, [language]);

  const value = useMemo(
    () => ({ language, preference, setPreference }),
    [language, preference, setPreference]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
