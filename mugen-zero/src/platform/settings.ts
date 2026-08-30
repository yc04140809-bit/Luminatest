// Player preferences. Deliberately NOT world state: these live in
// localStorage, never in IndexedDB, and never generate a MEMORY_EVENT.
// A corrupt or missing value falls back to defaults instead of throwing.

const STORAGE_KEY = 'mugen-zero-settings';

export interface GameSettings {
  bgmVolume: number; // 0..1
  seVolume: number; // 0..1
  hapticEnabled: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  bgmVolume: 0.6,
  seVolume: 0.8,
  hapticEnabled: true,
  reducedMotion: false,
};

function clamp01(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      bgmVolume: clamp01(parsed.bgmVolume, DEFAULT_SETTINGS.bgmVolume),
      seVolume: clamp01(parsed.seVolume, DEFAULT_SETTINGS.seVolume),
      hapticEnabled:
        typeof parsed.hapticEnabled === 'boolean'
          ? parsed.hapticEnabled
          : DEFAULT_SETTINGS.hapticEnabled,
      reducedMotion:
        typeof parsed.reducedMotion === 'boolean'
          ? parsed.reducedMotion
          : DEFAULT_SETTINGS.reducedMotion,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode / blocked storage: preferences simply do not persist.
  }
}

/** Applies the reduced-motion preference to the document root. */
export function applyReducedMotion(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  if (enabled) {
    document.documentElement.setAttribute('data-reduced-motion', 'on');
  } else {
    document.documentElement.removeAttribute('data-reduced-motion');
  }
}
