// Player preferences. Deliberately NOT world state: these live in
// localStorage, never in IndexedDB, and never generate a MEMORY_EVENT.
// A corrupt or missing value falls back to defaults instead of throwing.

const STORAGE_KEY = 'mugen-zero-settings';

/**
 * Whether the game asks about the theme before the title.
 *
 * ON puts the question there — 「テーマソングを聴く」/「スキップ」 —
 * and OFF goes straight to the title with the question never asked.
 * That is the whole of what the switch means now.
 *
 * ONCE_PER_SESSION is what it meant when the theme started ITSELF on
 * the title and the only question was how often. Nothing starts by
 * itself any more: somebody asks for the song by name, and a person
 * who taps 「聴く」 twice in one session means it twice. The value is
 * kept because it is what is written in every existing save, and it
 * reads as ON.
 */
export type OpeningPlayMode = 'ONCE_PER_SESSION' | 'ALWAYS' | 'OFF';

/**
 * THE FOUR BUSES.
 *
 * MASTER over the top of all of them, then BGM, SFX and VOICE. VOICE
 * is reserved — nothing in the game speaks yet — and it is here rather
 * than added later so that the shape of the panel is settled before
 * there are three sliders' worth of habits built on it.
 *
 * Every one of them is 0..1, and the level a sound actually plays at
 * is MASTER x its own bus. A slider is the player's, and nothing in
 * the game writes to one.
 */
export interface GameSettings {
  masterVolume: number; // 0..1 — over the top of all of them
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
  /** Reserved. Stored and shown, read by nothing: no line is spoken yet. */
  voiceVolume: number; // 0..1
  hapticEnabled: boolean;
  reducedMotion: boolean;
  openingMode: OpeningPlayMode;
}

export const DEFAULT_SETTINGS: GameSettings = {
  /**
   * QUIET BY DEFAULT — 0.35, down from 0.6.
   *
   * Music a player has not asked for arrives on a phone held close to
   * a face, often in a room with other people in it, and the reaction
   * to music that is too loud is not "I will turn it down", it is a
   * thumb on the mute switch and no music for the rest of the game.
   * Quiet enough to be an atmosphere and loud enough to be noticed,
   * with the slider in SETTINGS for anybody who wants more.
   */
  bgmVolume: 0.35,
  /** All the way up, because it is the thing the other three hang off. */
  masterVolume: 1,
  sfxVolume: 0.8,
  voiceVolume: 0.8,
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
      masterVolume: clamp01(parsed.masterVolume, DEFAULT_SETTINGS.masterVolume),
      // MIGRATED, NOT RESET. The effects slider was `seVolume` when
      // there was one of it; somebody who turned effects down months
      // ago must not find them loud again because the field was
      // renamed. The old value is read when the new one is absent.
      sfxVolume: clamp01(
        parsed.sfxVolume ?? (parsed as { seVolume?: unknown }).seVolume,
        DEFAULT_SETTINGS.sfxVolume,
      ),
      voiceVolume: clamp01(parsed.voiceVolume, DEFAULT_SETTINGS.voiceVolume),
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
