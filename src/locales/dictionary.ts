import type { AppLanguage } from './language';
import { AUTH_TRANSLATIONS, type AuthStrings } from './authLocale';
import { getCoreTranslations, type CoreTranslations } from './coreLocale';
import { getConnectionTranslations, type ConnectionTranslations } from './connectionLocale';
import { getEditorTranslations, type EditorTranslations } from './editorLocale';
import { getSettingsTranslations, type SettingsTranslations } from './settingsLocale';
import { getDocModalsTranslations, type DocModalsTranslations } from './docModalsLocale';
import { getDriveSecurityTranslations, type DriveSecurityTranslations } from './driveSecurityLocale';
import { getPdfViewerTranslations, type PdfViewerTranslations } from './pdfViewerLocale';
import { getAppMessages } from './appMessages';

export interface AppDictionary {
  auth: AuthStrings;
  core: CoreTranslations;
  connection: ConnectionTranslations;
  editor: EditorTranslations;
  settings: SettingsTranslations;
  docModals: DocModalsTranslations;
  driveSecurity: DriveSecurityTranslations;
  pdfViewer: PdfViewerTranslations;
  messages: Record<string, string>;
}

export const dictionary: Record<AppLanguage, AppDictionary> = {
  ko: {
    auth: AUTH_TRANSLATIONS.KR,
    core: getCoreTranslations('ko'),
    connection: getConnectionTranslations('ko'),
    editor: getEditorTranslations('ko'),
    settings: getSettingsTranslations('ko'),
    docModals: getDocModalsTranslations('ko'),
    driveSecurity: getDriveSecurityTranslations('ko'),
    pdfViewer: getPdfViewerTranslations('ko'),
    messages: getAppMessages('ko') as Record<string, string>,
  },
  en: {
    auth: AUTH_TRANSLATIONS.ENG,
    core: getCoreTranslations('en'),
    connection: getConnectionTranslations('en'),
    editor: getEditorTranslations('en'),
    settings: getSettingsTranslations('en'),
    docModals: getDocModalsTranslations('en'),
    driveSecurity: getDriveSecurityTranslations('en'),
    pdfViewer: getPdfViewerTranslations('en'),
    messages: getAppMessages('en') as Record<string, string>,
  },
};

export function getDictionary(language: AppLanguage): AppDictionary {
  return dictionary[language] ?? dictionary.ko;
}
