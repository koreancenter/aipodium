/**
 * AI Podium Responsive Golden Ratio Panel Sizing & Layout Engine
 * Calculates default responsive width ratios and manages clamp boundaries.
 */

export interface PanelWidths {
  chat: number;
  explorer: number;
}

export const CHAT_PANEL_MIN_WIDTH = 360;
export const EDITOR_PANEL_MIN_WIDTH = 360;

export const PANEL_WIDTH_LIMITS = {
  CHAT: {
    MIN: CHAT_PANEL_MIN_WIDTH,
    MAX: 520,
  },
  EXPLORER: {
    MIN: 200,
    MAX: 420,
  },
  EDITOR: {
    MIN: EDITOR_PANEL_MIN_WIDTH,
  },
} as const;

export const PANEL_STORAGE_KEY = 'aipodium_panel_widths';

/**
 * Calculates responsive default panel widths based on window width.
 * - Ultra-wide (>= 1920px): Chat 28%, Editor 54%, Explorer 18%
 * - Standard Laptop (1440px - 1600px): Chat 32%, Editor 48%, Explorer 20%
 * - Clamps Chat between 360px and 520px (preventing model selector overlap)
 * - Clamps Explorer between 200px and 420px
 * - Guarantees Editor panel retains at least 360px width
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
    chat: clampChatWidth(rawChat, windowWidth, rawExplorer),
    explorer: clampExplorerWidth(rawExplorer, windowWidth, rawChat),
  };
}

/**
 * Clamps Chat Panel width, enforcing minimum size for both Chat Panel and adjacent Editor Panel.
 */
export function clampChatWidth(
  width: number,
  containerWidth?: number,
  rightPanelWidth: number = 0
): number {
  let maxWidth: number = PANEL_WIDTH_LIMITS.CHAT.MAX;
  if (typeof containerWidth === 'number' && containerWidth > 0) {
    const availableForChat = containerWidth - rightPanelWidth - EDITOR_PANEL_MIN_WIDTH;
    maxWidth = Math.max(CHAT_PANEL_MIN_WIDTH, Math.min(PANEL_WIDTH_LIMITS.CHAT.MAX, availableForChat));
  }
  return Math.min(Math.max(Math.round(width), CHAT_PANEL_MIN_WIDTH), maxWidth);
}

/**
 * Clamps Explorer Panel width, enforcing minimum size for both Explorer Panel and adjacent Editor Panel.
 */
export function clampExplorerWidth(
  width: number,
  containerWidth?: number,
  chatPanelWidth: number = 0
): number {
  let maxWidth: number = PANEL_WIDTH_LIMITS.EXPLORER.MAX;
  if (typeof containerWidth === 'number' && containerWidth > 0) {
    const availableForExplorer = containerWidth - chatPanelWidth - EDITOR_PANEL_MIN_WIDTH;
    maxWidth = Math.max(PANEL_WIDTH_LIMITS.EXPLORER.MIN, Math.min(PANEL_WIDTH_LIMITS.EXPLORER.MAX, availableForExplorer));
  }
  return Math.min(Math.max(Math.round(width), PANEL_WIDTH_LIMITS.EXPLORER.MIN), maxWidth);
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
