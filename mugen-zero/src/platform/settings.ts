// Player preferences. Deliberately NOT world state: these live in
// localStorage, never in IndexedDB, and never generate a MEMORY_EVENT.
// A corrupt or missing value falls back to defaults instead of throwing.

const STORAGE_KEY = 'mugen-zero-settings';

/**
 * When the opening theme plays.
 *
 * Three states internally, one switch on the settings screen. A long
 * opening every single time somebody opens a phone game is a good way
 * to teach them to skip it, so the default plays it once per run of
 * the app and then leaves them alone. ALWAYS exists for whoever wants
 * it and for looking at the thing while working on it; it is data, not
 * a button, until there is a reason for it to be one.
 */
export type OpeningPlayMode = 'ONCE_PER_SESSION' | 'ALWAYS' | 'OFF';

export interface GameSettings {
  bgmVolume: number; // 0..1
  seVolume: number; // 0..1
  hapticEnabled: boolean;
  reducedMotion: boolean;
  openingMode: OpeningPlayMode;
}

export const DEFAULT_SETTINGS: GameSettings = {
  bgmVolume: 0.6,
  seVolume: 0.8,
  hapticEnabled: true,
  reducedMotion: false,
  openingMode: 'ONCE_PER_SESSION',
};

function readMode(value: unknown): OpeningPlayMode {
  return value === 'ALWAYS' || value === 'OFF' || value === 'ONCE_PER_SESSION'
    ? value
    : DEFAULT_SETTINGS.openingMode;
}

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
      // Absent in settings saved before this build, which reads as the
      // default rather than as "off".
      openingMode: readMode(parsed.openingMode),
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
