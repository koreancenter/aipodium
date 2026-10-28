export type AppLanguage = 'ko' | 'en';
export type LanguagePreference = 'system' | AppLanguage;

export const LANGUAGE_PREFERENCE_KEY = 'aipodium_language';
export const LEGACY_AUTH_LANGUAGE_KEY = 'aipodium_auth_lang';

export function normalizeLanguagePreference(value: string | null | undefined): LanguagePreference {
  if (value === 'ko' || value === 'en') return value;
  return 'system';
}

export function resolveInitialLanguagePreference(
  savedPreference: string | null | undefined,
  legacyAuthLanguage: string | null | undefined
): LanguagePreference {
  if (savedPreference === 'system' || savedPreference === 'ko' || savedPreference === 'en') {
    return savedPreference;
  }
  if (legacyAuthLanguage === 'KR') return 'ko';
  if (legacyAuthLanguage === 'ENG') return 'en';
  return 'system';
}

export function resolveAppLanguage(
  preference: LanguagePreference,
  browserLanguages: readonly string[]
): AppLanguage {
  if (preference !== 'system') return preference;

  for (const browserLanguage of browserLanguages) {
    const normalized = browserLanguage.toLowerCase();
    if (normalized.startsWith('ko')) return 'ko';
    if (normalized.startsWith('en')) return 'en';
  }

  return 'ko';
}

let activeLanguage: AppLanguage = 'ko';

/** Module-level mirror of the UI language for code that runs outside React render, such as toast callbacks. */
export function setActiveLanguage(language: AppLanguage): void {
  activeLanguage = language;
}

export function getActiveLanguage(): AppLanguage {
  return activeLanguage;
}
