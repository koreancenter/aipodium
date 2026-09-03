import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyThemeToDocument
} from '../src/utils/themeManager.ts';

test('applyThemeToDocument applies fixed Deep Charcoal background and Electric Purple / Slate Gray variables in DOM mock', () => {
  const dataset: Record<string, string> = {};
  const styleProps: Record<string, string> = {};
  const classListSet = new Set<string>();

  (globalThis as any).document = {
    documentElement: {
      dataset,
      classList: {
        add: (cls: string) => classListSet.add(cls),
        remove: (cls: string) => classListSet.delete(cls)
      },
      style: {
        setProperty: (key: string, val: string) => {
          styleProps[key] = val;
        }
      }
    }
  };

  applyThemeToDocument('dense', 'md');
  assert.equal(dataset.compactness, 'dense');
  assert.equal(styleProps['--bg-main'], '#121318');
  assert.equal(styleProps['--bg-surface'], '#1e202b');
  assert.equal(styleProps['--bg-editor'], '#16171e');
  assert.equal(styleProps['--border-color'], '#2e3142');
  assert.equal(styleProps['--text-main'], '#e2e8f0');
  assert.equal(styleProps['--text-muted'], '#94a3b8');
  assert.equal(styleProps['--accent-primary'], '#6366f1');

  delete (globalThis as any).document;
});

test('applyThemeToDocument handles spacious compactness and different font sizes', () => {
  const dataset: Record<string, string> = {};
  const styleProps: Record<string, string> = {};
  const classListSet = new Set<string>();

  (globalThis as any).document = {
    documentElement: {
      dataset,
      classList: {
        add: (cls: string) => classListSet.add(cls),
        remove: (cls: string) => classListSet.delete(cls)
      },
      style: {
        fontSize: '16px',
        setProperty: (key: string, val: string) => {
          styleProps[key] = val;
        }
      }
    }
  };

  applyThemeToDocument('spacious', 'lg');
  assert.equal(dataset.compactness, 'spacious');
  assert.equal((globalThis as any).document.documentElement.style.fontSize, '18px');

  delete (globalThis as any).document;
});
