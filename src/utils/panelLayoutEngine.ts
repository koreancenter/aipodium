/**
 * AI Podium Responsive Golden Ratio Panel Sizing & Layout Engine
 * Calculates default responsive width ratios and manages clamp boundaries.
 */

export interface PanelWidths {
  chat: number;
  explorer: number;
}

export const PANEL_WIDTH_LIMITS = {
  CHAT: {
    MIN: 280,
    MAX: 520,
  },
  EXPLORER: {
    MIN: 200,
    MAX: 420,
  },
} as const;

export const PANEL_STORAGE_KEY = 'aipodium_panel_widths';

/**
 * Calculates responsive default panel widths based on window width.
 * - Ultra-wide (>= 1920px): Chat 28%, Editor 54%, Explorer 18%
 * - Standard Laptop (1440px - 1600px): Chat 32%, Editor 48%, Explorer 20%
 * - Clamps Chat between 280px and 520px
 * - Clamps Explorer between 200px and 420px
 */
export function calculateDefaultPanelWidths(windowWidth: number): PanelWidths {
  let chatRatio = 0.32;
  let explorerRatio = 0.20;

  if (windowWidth >= 1920) {
    chatRatio = 0.28;
    explorerRatio = 0.18;
  } else if (windowWidth >= 1440 && windowWidth <= 1600) {
    chatRatio = 0.32;
    explorerRatio = 0.20;
  } else if (windowWidth > 1600 && windowWidth < 1920) {
    chatRatio = 0.30;
    explorerRatio = 0.19;
  } else {
    chatRatio = 0.32;
    explorerRatio = 0.20;
  }

  const rawChat = Math.round(windowWidth * chatRatio);
  const rawExplorer = Math.round(windowWidth * explorerRatio);

  return {
    chat: clampChatWidth(rawChat),
    explorer: clampExplorerWidth(rawExplorer),
  };
}

export function clampChatWidth(width: number): number {
  return Math.min(Math.max(Math.round(width), PANEL_WIDTH_LIMITS.CHAT.MIN), PANEL_WIDTH_LIMITS.CHAT.MAX);
}

export function clampExplorerWidth(width: number): number {
  return Math.min(Math.max(Math.round(width), PANEL_WIDTH_LIMITS.EXPLORER.MIN), PANEL_WIDTH_LIMITS.EXPLORER.MAX);
}

export function loadSavedPanelWidths(): PanelWidths | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PANEL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.chat === 'number' && typeof parsed.explorer === 'number') {
      return {
        chat: clampChatWidth(parsed.chat),
        explorer: clampExplorerWidth(parsed.explorer),
      };
    }
  } catch {}
  return null;
}

export function savePanelWidths(widths: PanelWidths): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped: PanelWidths = {
      chat: clampChatWidth(widths.chat),
      explorer: clampExplorerWidth(widths.explorer),
    };
    localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(clamped));
  } catch {}
}
