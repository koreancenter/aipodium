export type AppLanguage = 'ko' | 'en';
export type LanguagePreference = 'auto' | 'system' | AppLanguage;

export const LANGUAGE_PREFERENCE_KEY = 'aipodium_language';
export const LEGACY_AUTH_LANGUAGE_KEY = 'aipodium_auth_lang';

/**
 * Inspects navigator.languages (or navigator.language).
 * If any preferred language starts with 'ko', returns 'ko'.
 * If it starts with 'en', returns 'en'.
 * Default fallback: 'ko'.
 */
export function detectBrowserLanguage(languages?: readonly string[]): AppLanguage {
  const preferredLanguages: readonly string[] =
    languages !== undefined
      ? languages
      : typeof navigator !== 'undefined'
        ? navigator.languages && navigator.languages.length > 0
          ? navigator.languages
          : navigator.language
            ? [navigator.language]
            : []
        : [];

  for (const lang of preferredLanguages) {
    if (!lang) continue;
    const normalized = lang.toLowerCase().trim();
    if (normalized.startsWith('ko')) return 'ko';
    if (normalized.startsWith('en')) return 'en';
  }

  return 'ko';
}

export function normalizeLanguagePreference(value: string | null | undefined): LanguagePreference {
  if (value === 'ko' || value === 'en') return value;
  if (value === 'auto' || value === 'system') return 'auto';
  return 'auto';
}

export function resolveInitialLanguagePreference(
  savedPreference: string | null | undefined,
  legacyAuthLanguage: string | null | undefined
): LanguagePreference {
  if (savedPreference === 'ko' || savedPreference === 'en') {
    return savedPreference;
  }
  if (savedPreference === 'auto' || savedPreference === 'system') {
    return 'auto';
  }
  if (legacyAuthLanguage === 'KR') return 'ko';
  if (legacyAuthLanguage === 'ENG') return 'en';
  return 'auto';
}

export function resolveAppLanguage(
  preference: LanguagePreference,
  browserLanguages?: readonly string[]
): AppLanguage {
  if (preference === 'ko' || preference === 'en') {
    return preference;
  }
  return detectBrowserLanguage(browserLanguages);
}

let activeLanguage: AppLanguage = 'ko';

/** Module-level mirror of the UI language for code that runs outside React render, such as toast callbacks. */
export function setActiveLanguage(language: AppLanguage): void {
  activeLanguage = language;
}

export function getActiveLanguage(): AppLanguage {
  return activeLanguage;
}
