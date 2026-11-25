import type { ResolvedSeasonId, SeasonThemeId } from '../types/preferences';

export type { ResolvedSeasonId, SeasonThemeId };

export interface ThemeConfig {
  compactness?: 'dense' | 'spacious';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  seasonTheme?: SeasonThemeId;
}

export interface SeasonThemePalette {
  id: ResolvedSeasonId;
  bgMain: string;
  bgSurface: string;
  bgEditor: string;
  bgElevated: string;
  bgElevatedRgb: string;
  bgSurfaceRgb: string;
  borderColor: string;
  textMain: string;
  textSecondary: string;
  textMuted: string;
  textTertiary: string;
  accentPrimary: string;
  accentHover: string;
  accentRgb: string;
  secondaryAccent: string;
  secondaryAccentHover: string;
  selectionBg: string;
  selectionText: string;
  quoteBorder: string;
  tableHighlight: string;
}

export const SEASON_THEME_IDS: readonly ResolvedSeasonId[] = [
  'default',
  'spring',
  'summer',
  'autumn',
  'winter',
] as const;

export const SEASON_THEMES: Record<ResolvedSeasonId, SeasonThemePalette> = {
  default: {
    id: 'default',
    bgMain: '#0D0F14',
    bgSurface: '#11141B',
    bgEditor: '#151922',
    bgElevated: '#1A1F2B',
    bgElevatedRgb: '26, 31, 43',
    bgSurfaceRgb: '17, 20, 27',
    borderColor: 'rgba(255, 255, 255, 0.07)',
    textMain: '#F8FAFC',
    textSecondary: '#E2E8F0',
    textMuted: '#B4C0D3',
    textTertiary: '#94A3B8',
    accentPrimary: '#38BDF8',
    accentHover: '#0EA5E9',
    accentRgb: '56, 189, 248',
    secondaryAccent: '#34D399',
    secondaryAccentHover: '#10B981',
    selectionBg: 'rgba(56, 189, 248, 0.22)',
    selectionText: '#F8FAFC',
    quoteBorder: 'rgba(56, 189, 248, 0.45)',
    tableHighlight: 'rgba(56, 189, 248, 0.14)',
  },
  spring: {
    id: 'spring',
    bgMain: '#100E13',
    bgSurface: '#15121B',
    bgEditor: '#1A1622',
    bgElevated: '#211C2B',
    bgElevatedRgb: '33, 28, 43',
    bgSurfaceRgb: '21, 18, 27',
    borderColor: 'rgba(255, 255, 255, 0.07)',
    textMain: '#FCF9FC',
    textSecondary: '#EAE2F0',
    textMuted: '#C4B8D1',
    textTertiary: '#A89BB5',
    accentPrimary: '#F48FB1',
    accentHover: '#EC407A',
    accentRgb: '244, 143, 177',
    secondaryAccent: '#6EE7B7',
    secondaryAccentHover: '#34D399',
    selectionBg: 'rgba(244, 143, 177, 0.22)',
    selectionText: '#FCF9FC',
    quoteBorder: 'rgba(244, 143, 177, 0.45)',
    tableHighlight: 'rgba(244, 143, 177, 0.14)',
  },
  summer: {
    id: 'summer',
    bgMain: '#0A1015',
    bgSurface: '#0E161D',
    bgEditor: '#131E27',
    bgElevated: '#192632',
    bgElevatedRgb: '25, 38, 50',
    bgSurfaceRgb: '14, 22, 29',
    borderColor: 'rgba(255, 255, 255, 0.07)',
    textMain: '#F8FAFC',
    textSecondary: '#E2E8F0',
    textMuted: '#B4C0D3',
    textTertiary: '#94A3B8',
    accentPrimary: '#2DD4BF',
    accentHover: '#14B8A6',
    accentRgb: '45, 212, 191',
    secondaryAccent: '#38BDF8',
    secondaryAccentHover: '#0EA5E9',
    selectionBg: 'rgba(45, 212, 191, 0.22)',
    selectionText: '#F8FAFC',
    quoteBorder: 'rgba(45, 212, 191, 0.45)',
    tableHighlight: 'rgba(45, 212, 191, 0.14)',
  },
  autumn: {
    id: 'autumn',
    bgMain: '#120F0D',
    bgSurface: '#181412',
    bgEditor: '#1F1A17',
    bgElevated: '#27211D',
    bgElevatedRgb: '39, 33, 29',
    bgSurfaceRgb: '24, 20, 18',
    borderColor: 'rgba(255, 255, 255, 0.07)',
    textMain: '#FAF8F5',
    textSecondary: '#EDE5DC',
    textMuted: '#C7BCB0',
    textTertiary: '#AB9F92',
    accentPrimary: '#F5B041',
    accentHover: '#D99B26',
    accentRgb: '245, 176, 65',
    secondaryAccent: '#F28B6E',
    secondaryAccentHover: '#E07A5F',
    selectionBg: 'rgba(245, 176, 65, 0.22)',
    selectionText: '#FAF8F5',
    quoteBorder: 'rgba(245, 176, 65, 0.45)',
    tableHighlight: 'rgba(245, 176, 65, 0.14)',
  },
  winter: {
    id: 'winter',
    bgMain: '#0C0E14',
    bgSurface: '#10141D',
    bgEditor: '#151A25',
    bgElevated: '#1B2230',
    bgElevatedRgb: '27, 34, 48',
    bgSurfaceRgb: '16, 20, 29',
    borderColor: 'rgba(255, 255, 255, 0.07)',
    textMain: '#F8FAFC',
    textSecondary: '#E2E8F0',
    textMuted: '#B4C0D3',
    textTertiary: '#94A3B8',
    accentPrimary: '#7DD3FC',
    accentHover: '#38BDF8',
    accentRgb: '125, 211, 252',
    secondaryAccent: '#E2E8F0',
    secondaryAccentHover: '#CBD5E1',
    selectionBg: 'rgba(125, 211, 252, 0.22)',
    selectionText: '#F8FAFC',
    quoteBorder: 'rgba(125, 211, 252, 0.45)',
    tableHighlight: 'rgba(125, 211, 252, 0.14)',
  },
};

export function getCalendarSeason(date: Date = new Date()): Exclude<ResolvedSeasonId, 'default'> {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function normalizeSeasonSetting(seasonTheme?: string | null): SeasonThemeId {
  if (
    seasonTheme === 'default' ||
    seasonTheme === 'spring' ||
    seasonTheme === 'summer' ||
    seasonTheme === 'autumn' ||
    seasonTheme === 'winter' ||
    seasonTheme === 'auto'
  ) {
    return seasonTheme;
  }
  return 'default';
}

export function resolveSeasonTheme(
  seasonTheme?: string | null,
  date: Date = new Date()
): ResolvedSeasonId {
  const normalized = normalizeSeasonSetting(seasonTheme);
  if (normalized === 'auto') {
    return getCalendarSeason(date);
  }
  return normalized;
}

export function getSeasonThemePalette(
  seasonTheme?: string | null,
  date: Date = new Date()
): SeasonThemePalette {
  return SEASON_THEMES[resolveSeasonTheme(seasonTheme, date)];
}

function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const l1 = getRelativeLuminance(hexA);
  const l2 = getRelativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function buildThemeCssVariables(
  palette: SeasonThemePalette
): Record<string, string> {
  return {
    '--bg-main': palette.bgMain,
    '--bg-surface': palette.bgSurface,
    '--bg-editor': palette.bgEditor,
    '--bg-elevated': palette.bgElevated,
    '--bg-elevated-rgb': palette.bgElevatedRgb,
    '--bg-surface-rgb': palette.bgSurfaceRgb,
    '--border-color': palette.borderColor,
    '--text-main': palette.textMain,
    '--text-secondary': palette.textSecondary,
    '--text-muted': palette.textMuted,
    '--text-tertiary': palette.textTertiary,
    '--text-subtle': palette.textTertiary,
    '--accent-primary': palette.accentPrimary,

    // App Frame Background
    '--bg-app': palette.bgMain,
    '--bg-app-gradient': palette.bgMain,
    '--bg-primary': palette.bgMain,

    // Sidebars & Elevated Popovers
    '--bg-panel': palette.bgSurface,
    '--bg-editor-surface': palette.bgEditor,
    '--bg-surface-hover': 'rgba(255, 255, 255, 0.04)',
    '--bg-surface-active': 'rgba(255, 255, 255, 0.07)',
    '--bg-secondary': palette.bgSurface,
    '--bg-surface-glass': `rgba(${palette.bgElevatedRgb}, 0.95)`,
    '--bg-surface-glass-subtle': `rgba(${palette.bgSurfaceRgb}, 0.92)`,
    '--bg-surface-glass-card': `rgba(${palette.bgElevatedRgb}, 0.72)`,

    // Restrained Accents
    '--primary': palette.accentPrimary,
    '--primary-hover': palette.accentHover,
    '--primary-point': palette.accentPrimary,
    '--accent-color': palette.accentPrimary,
    '--accent': palette.accentPrimary,
    '--accent-hover': palette.accentHover,
    '--accent-rgb': palette.accentRgb,
    '--accent-surface': `rgba(${palette.accentRgb}, 0.12)`,
    '--glow-accent': 'none',
    '--glow-primary': 'none',

    // Secondary Accent
    '--secondary-accent': palette.secondaryAccent,
    '--secondary-accent-hover': palette.secondaryAccentHover,
    '--accent-cyan': palette.accentPrimary,
    '--accent-teal': palette.secondaryAccent,
    '--glow-teal': 'none',
    '--glow-cyan': 'none',

    // Text Contrast Tiers
    '--text-primary': palette.textMain,

    // Hairline Dividers & Rich Typography Highlights (Glow-Free)
    '--border-structural': 'rgba(255, 255, 255, 0.07)',
    '--border-luminous': 'rgba(255, 255, 255, 0.14)',
    '--rim-glow': 'none',
    '--border-glass': 'rgba(255, 255, 255, 0.07)',
    '--border-color-subtle': 'rgba(255, 255, 255, 0.07)',
    '--border-color-strong': 'rgba(255, 255, 255, 0.14)',
    '--border-glass-subtle': 'rgba(255, 255, 255, 0.07)',
    '--border-glass-strong': 'rgba(255, 255, 255, 0.14)',
    '--selection-bg': palette.selectionBg,
    '--selection-text': palette.selectionText,
    '--quote-border': palette.quoteBorder,
    '--table-highlight': palette.tableHighlight,
  };
}

/**
 * Apply Korean Four Seasons or Cool-Slate Default theme to the document root.
 */
export function applyThemeToDocument(
  compactness: 'dense' | 'spacious' = 'dense',
  fontSize: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  seasonTheme: SeasonThemeId = 'default'
) {
  if (typeof document === 'undefined') return;

  try {
    const root = document.documentElement;
    const body = document.body;
    const normalizedSetting = normalizeSeasonSetting(seasonTheme);
    const resolvedSeason = resolveSeasonTheme(normalizedSetting);
    const palette = SEASON_THEMES[resolvedSeason];

    root.classList.add('dark');
    body?.classList?.add('dark');

    root.dataset.compactness = compactness;
    root.dataset.season = resolvedSeason;
    root.dataset.seasonSetting = normalizedSetting;
    if (body?.dataset) {
      body.dataset.compactness = compactness;
      body.dataset.season = resolvedSeason;
    }

    const varsToSet = buildThemeCssVariables(palette);
    Object.entries(varsToSet).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    const sizeMap: Record<string, string> = { sm: '14px', md: '16px', lg: '18px', xl: '20px' };
    root.style.fontSize = sizeMap[fontSize] || '16px';
    root.style.colorScheme = 'dark';

    if (body) {
      body.style.background = palette.bgMain;
      body.style.color = palette.textMain;
    }

    if (typeof document.querySelector === 'function') {
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute('content', palette.bgMain);
      }
    }

    // Dispatch event only when window is available
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(
          new CustomEvent('aipodium-theme-change', {
            detail: {
              compactness,
              fontSize,
              seasonTheme: normalizedSetting,
              resolvedSeason,
            },
          })
        );
      } catch {}
    }
  } catch (error) {
    console.error('[ThemeManager] Error applying theme:', error);
  }
}

// Backward-compatible alias
export const applyAccentColor = (
  _accent?: string,
  compactness: 'dense' | 'spacious' = 'dense',
  fontSize: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  seasonTheme: SeasonThemeId = 'default'
) => {
  applyThemeToDocument(compactness, fontSize, seasonTheme);
};
