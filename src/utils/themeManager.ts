export interface ThemeConfig {
  compactness?: 'dense' | 'spacious';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Apply fixed Theme from the Design System guide:
 * - Main Background: 딥 차콜 (Deep Charcoal) #09090b
 * - Surface/Card: 슬레이트 그레이 (Slate Gray) #1E202B
 * - Primary/Point: 일렉트릭 퍼플 (Electric Purple) #6366F1
 * - Secondary Accent: 사이언 블루 (Cyan Blue) #0EA5E9
 * - Text (Main): 오프 화이트 (Off-White) #E2E8F0
 */
export function applyThemeToDocument(
  compactness: 'dense' | 'spacious' = 'dense',
  fontSize: 'sm' | 'md' | 'lg' | 'xl' = 'md'
) {
  if (typeof document === 'undefined') return;

  try {
    const root = document.documentElement;
    const body = document.body;

    // Dark mode is default & fixed
    root.classList.add('dark');
    if (body) body.classList.add('dark');

    root.dataset.compactness = compactness;
    if (body) {
      body.dataset.compactness = compactness;
    }

    // Exact Palette mapping according to the guideline
    const varsToSet: Record<string, string> = {
      // Direct Design System Spec Tokens
      '--bg-main': '#09090b',
      '--bg-surface': '#121214',
      '--bg-editor': '#0c0c0e',
      '--border-color': '#222226',
      '--text-main': '#e2e8f0',
      '--text-muted': '#94a3b8',
      '--accent-primary': '#6366f1',

      // Main Background (#09090b)
      '--bg-app': '#09090b',
      '--bg-app-gradient': 'radial-gradient(circle at 50% 0%, #1a1b24 0%, #09090b 75%)',
      '--bg-primary': '#09090b',

      // Surface / Card (#121214)
      '--bg-panel': '#121214',
      '--bg-editor-surface': '#0c0c0e',
      '--bg-surface-hover': '#18181b',
      '--bg-secondary': '#121214',
      '--bg-surface-glass': 'rgba(30, 32, 43, 0.95)',
      '--bg-surface-glass-subtle': 'rgba(24, 25, 34, 0.9)',
      '--bg-surface-glass-card': 'rgba(30, 32, 43, 0.7)',

      // Primary / Point (#6366f1 - Electric Purple)
      '--primary': '#6366f1',
      '--primary-hover': '#4f46e5',
      '--primary-point': '#6366f1',
      '--accent-color': '#6366f1',
      '--accent': '#6366f1',
      '--accent-hover': '#4f46e5',
      '--accent-rgb': '99, 102, 241',
      '--accent-surface': 'rgba(99, 102, 241, 0.15)',
      '--glow-accent': '0 0 16px -2px rgba(99, 102, 241, 0.35)',
      '--glow-primary': '0 0 16px -2px rgba(99, 102, 241, 0.35)',

      // Secondary Accent (#0ea5e9 - Cyan Blue)
      '--secondary-accent': '#0ea5e9',
      '--secondary-accent-hover': '#0284c7',
      '--accent-cyan': '#0ea5e9',
      '--accent-teal': '#0ea5e9',
      '--glow-teal': '0 0 16px -2px rgba(99, 102, 241, 0.3)',
      '--glow-cyan': '0 0 16px -2px rgba(99, 102, 241, 0.3)',

      // Text Main (#e2e8f0 - Off-White)
      '--text-primary': '#e2e8f0',
      '--text-secondary': '#94a3b8',

      // Borders (#222226)
      '--border-glass': '#222226',
      '--border-color-subtle': 'rgba(255, 255, 255, 0.08)',
      '--border-color-strong': 'rgba(99, 102, 241, 0.35)',
      '--border-glass-subtle': 'rgba(255, 255, 255, 0.08)',
      '--border-glass-strong': 'rgba(99, 102, 241, 0.35)'
    };

    Object.entries(varsToSet).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Font size setting
    const sizeMap: Record<string, string> = { sm: '14px', md: '16px', lg: '18px', xl: '20px' };
    root.style.fontSize = sizeMap[fontSize] || '16px';
    root.style.colorScheme = 'dark';

    if (body) {
      body.style.background = '#09090b';
      body.style.color = '#E2E8F0';
    }

    // Force repaint
    void root.offsetHeight;

    // Dispatch event
    try {
      window.dispatchEvent(
        new CustomEvent('aipodium-theme-change', {
          detail: {
            compactness,
            fontSize
          }
        })
      );
    } catch {}
  } catch (error) {
    console.error('[ThemeManager] Error applying theme:', error);
  }
}

// Backward-compatible alias
export const applyAccentColor = (
  _accent?: string,
  compactness: 'dense' | 'spacious' = 'dense',
  fontSize: 'sm' | 'md' | 'lg' | 'xl' = 'md'
) => {
  applyThemeToDocument(compactness, fontSize);
};
