import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SEASON_THEMES,
  applyThemeToDocument,
  getCalendarSeason,
  getContrastRatio,
  resolveSeasonTheme,
} from '../src/utils/themeManager.ts';
import type { ResolvedSeasonId } from '../src/types/preferences.ts';

function createDomMock() {
  const dataset: Record<string, string> = {};
  const bodyDataset: Record<string, string> = {};
  const styleProps: Record<string, string> = {};
  const classListSet = new Set<string>();
  const bodyClassListSet = new Set<string>();
  const metaTheme = {
    content: '',
    setAttribute: (_key: string, val: string) => {
      metaTheme.content = val;
    },
  };

  (globalThis as any).document = {
    documentElement: {
      dataset,
      classList: {
        add: (cls: string) => classListSet.add(cls),
        remove: (cls: string) => classListSet.delete(cls),
      },
      style: {
        fontSize: '16px',
        setProperty: (key: string, val: string) => {
          styleProps[key] = val;
        },
      },
    },
    body: {
      dataset: bodyDataset,
      classList: {
        add: (cls: string) => bodyClassListSet.add(cls),
        remove: (cls: string) => bodyClassListSet.delete(cls),
      },
      style: {
        background: '',
        color: '',
      },
    },
    querySelector: (selector: string) => {
      if (selector === 'meta[name="theme-color"]') {
        return metaTheme;
      }
      return null;
    },
  };

  return { dataset, bodyDataset, styleProps, classListSet, bodyClassListSet, metaTheme };
}

test('resolveSeasonTheme maps auto mode to Korean four-season calendar months', () => {
  assert.equal(getCalendarSeason(new Date('2026-03-15T00:00:00Z')), 'spring');
  assert.equal(getCalendarSeason(new Date('2026-05-01T00:00:00Z')), 'spring');
  assert.equal(getCalendarSeason(new Date('2026-06-15T00:00:00Z')), 'summer');
  assert.equal(getCalendarSeason(new Date('2026-08-20T00:00:00Z')), 'summer');
  assert.equal(getCalendarSeason(new Date('2026-09-10T00:00:00Z')), 'autumn');
  assert.equal(getCalendarSeason(new Date('2026-11-25T00:00:00Z')), 'autumn');
  assert.equal(getCalendarSeason(new Date('2026-12-05T00:00:00Z')), 'winter');
  assert.equal(getCalendarSeason(new Date('2026-01-15T00:00:00Z')), 'winter');
  assert.equal(getCalendarSeason(new Date('2026-02-28T00:00:00Z')), 'winter');

  assert.equal(resolveSeasonTheme('auto', new Date('2026-04-01T00:00:00Z')), 'spring');
  assert.equal(resolveSeasonTheme('autumn', new Date('2026-04-01T00:00:00Z')), 'autumn');
});

test('applyThemeToDocument applies all seasonal palettes, DOM datasets, meta theme-color, and compactness/fontSize', () => {
  const { dataset, styleProps, metaTheme } = createDomMock();

  const seasons: ResolvedSeasonId[] = ['default', 'spring', 'summer', 'autumn', 'winter'];
  for (const season of seasons) {
    const palette = SEASON_THEMES[season];
    applyThemeToDocument('dense', 'md', season);

    assert.equal(dataset.season, season);
    assert.equal(dataset.seasonSetting, season);
    assert.equal(dataset.compactness, 'dense');
    assert.equal(styleProps['--bg-main'], palette.bgMain);
    assert.equal(styleProps['--bg-surface'], palette.bgSurface);
    assert.equal(styleProps['--bg-editor'], palette.bgEditor);
    assert.equal(styleProps['--bg-elevated'], palette.bgElevated);
    assert.equal(styleProps['--text-main'], palette.textMain);
    assert.equal(styleProps['--text-secondary'], palette.textSecondary);
    assert.equal(styleProps['--text-muted'], palette.textMuted);
    assert.equal(styleProps['--text-tertiary'], palette.textTertiary);
    assert.equal(styleProps['--accent-primary'], palette.accentPrimary);
    assert.equal(styleProps['--secondary-accent'], palette.secondaryAccent);
    assert.equal((globalThis as any).document.body.style.background, palette.bgMain);
    assert.equal((globalThis as any).document.body.style.color, palette.textMain);
    assert.equal(metaTheme.content, palette.bgMain);
  }

  applyThemeToDocument('spacious', 'lg', 'spring');
  assert.equal(dataset.compactness, 'spacious');
  assert.equal(dataset.season, 'spring');
  assert.equal((globalThis as any).document.documentElement.style.fontSize, '18px');

  delete (globalThis as any).document;
});

test('All Korean four-season palettes satisfy WCAG AA (>= 4.5:1) contrast across every surface and foreground pair', () => {
  const seasons: ResolvedSeasonId[] = ['default', 'spring', 'summer', 'autumn', 'winter'];

  for (const season of seasons) {
    const p = SEASON_THEMES[season];
    const backgrounds = [
      ['bgMain', p.bgMain],
      ['bgSurface', p.bgSurface],
      ['bgEditor', p.bgEditor],
      ['bgElevated', p.bgElevated],
    ] as const;

    const foregrounds = [
      ['textMain', p.textMain],
      ['textSecondary', p.textSecondary],
      ['textMuted', p.textMuted],
      ['textTertiary', p.textTertiary],
      ['accentPrimary', p.accentPrimary],
      ['secondaryAccent', p.secondaryAccent],
    ] as const;

    for (const [bgName, bgHex] of backgrounds) {
      for (const [fgName, fgHex] of foregrounds) {
        const ratio = getContrastRatio(bgHex, fgHex);
        assert.ok(
          ratio >= 4.5,
          `${season}: ${fgName} (${fgHex}) on ${bgName} (${bgHex}) contrast ${ratio.toFixed(2)} < 4.5`
        );
      }
    }
  }
});
