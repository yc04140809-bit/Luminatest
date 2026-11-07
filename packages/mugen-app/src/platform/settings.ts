import { audioManager } from './audio';

/**
 * THE PLAYER'S SETTINGS (設定画面, 作者 2026-11-02) — per device, never the world.
 *
 * The same rule as explorePrefs.ts and battleBgmChoice.ts: a preference, so localStorage, kept across a
 * restart and kept by the admin's reset (which throws away the save, not how this device is set up).
 * Blocked storage leaves the defaults, and a choice made then lasts the session at most.
 *
 * SOUND: four buses as the player sets them (0〜1) and one switch that silences all of them. The defaults
 * are the levels the game has always played at (platform/audio.ts), so a device that never opened the
 * settings hears exactly what it heard before.
 */
export interface SoundSettings {
  master: number;
  bgm: number;
  sfx: number;
  voice: number;
  /** 全ミュート: every bus silent, the levels kept for when it is turned off. */
  muted: boolean;
}

export const DEFAULT_SOUND: SoundSettings = { master: 1, bgm: 0.35, sfx: 0.8, voice: 0.8, muted: false };

const SOUND_KEY = 'mugen-settings-sound';

const level = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** What is stored, read leniently: a missing or broken field is its default. */
export function readSoundSettings(raw: string | null): SoundSettings {
  if (!raw) return { ...DEFAULT_SOUND };
  try {
    const o = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      master: level(o.master, DEFAULT_SOUND.master),
      bgm: level(o.bgm, DEFAULT_SOUND.bgm),
      sfx: level(o.sfx, DEFAULT_SOUND.sfx),
      voice: level(o.voice, DEFAULT_SOUND.voice),
      muted: o.muted === true,
    };
  } catch {
    return { ...DEFAULT_SOUND };
  }
}

export function loadSoundSettings(): SoundSettings {
  try {
    return readSoundSettings(localStorage.getItem(SOUND_KEY));
  } catch {
    return { ...DEFAULT_SOUND };
  }
}

export function saveSoundSettings(s: SoundSettings): void {
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(s));
  } catch {
    /* blocked storage: this session only */
  }
}

/** Heard at once: muted is the master at nought (platform/audio.ts folds the master into every bus). */
export function applySoundSettings(s: SoundSettings): void {
  audioManager.setVolumes(s.bgm, s.sfx, s.muted ? 0 : s.master, s.voice);
}

/**
 * THE SCREEN (段階2, 作者 2026-11-02): how bright it is drawn, the cut-ins, and how the words come.
 *
 *   brightness  0.6〜1.2 — under 1 a dark veil over the game, over 1 the game drawn brighter (ui/settings/
 *               BrightnessVeil), never the phone's own brightness
 *   cutIn       ALWAYS every time; DAILY once a day each (by the phone's own date — 作者: 端末の実際の日付);
 *               OFF never. Not shown, nothing of it is: neither its picture nor its shout (作者: 声も鳴らさない)
 *   textSpeed   INSTANT (all at once — as it has always been, and the default: 作者) or one letter at a time,
 *               SLOW / NORMAL / FAST; a tap while it comes shows it whole (ui/common/Typed)
 */
export type CutInMode = 'ALWAYS' | 'DAILY' | 'OFF';
export type TextSpeed = 'SLOW' | 'NORMAL' | 'FAST' | 'INSTANT';
export interface DisplaySettings {
  brightness: number;
  cutIn: CutInMode;
  textSpeed: TextSpeed;
}

export const DEFAULT_DISPLAY: DisplaySettings = { brightness: 1, cutIn: 'ALWAYS', textSpeed: 'INSTANT' };
export const BRIGHTNESS_RANGE = { min: 0.6, max: 1.2 } as const;

const DISPLAY_KEY = 'mugen-settings-display';
const CUT_INS: readonly CutInMode[] = ['ALWAYS', 'DAILY', 'OFF'];
const SPEEDS: readonly TextSpeed[] = ['SLOW', 'NORMAL', 'FAST', 'INSTANT'];

export function readDisplaySettings(raw: string | null): DisplaySettings {
  if (!raw) return { ...DEFAULT_DISPLAY };
  try {
    const o = JSON.parse(raw) as Partial<DisplaySettings>;
    const b = typeof o.brightness === 'number' && Number.isFinite(o.brightness) ? o.brightness : DEFAULT_DISPLAY.brightness;
    return {
      brightness: Math.min(BRIGHTNESS_RANGE.max, Math.max(BRIGHTNESS_RANGE.min, b)),
      cutIn: CUT_INS.includes(o.cutIn as CutInMode) ? (o.cutIn as CutInMode) : DEFAULT_DISPLAY.cutIn,
      textSpeed: SPEEDS.includes(o.textSpeed as TextSpeed) ? (o.textSpeed as TextSpeed) : DEFAULT_DISPLAY.textSpeed,
    };
  } catch {
    return { ...DEFAULT_DISPLAY };
  }
}

let display: DisplaySettings | null = null;
const watchers = new Set<() => void>();

/** As set now (read from the device the first time). */
export function displaySettings(): DisplaySettings {
  if (!display) {
    try {
      display = readDisplaySettings(localStorage.getItem(DISPLAY_KEY));
    } catch {
      display = { ...DEFAULT_DISPLAY };
    }
  }
  return display;
}

export function setDisplaySettings(next: DisplaySettings): void {
  display = next;
  try {
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(next));
  } catch {
    /* blocked storage: this session only */
  }
  watchers.forEach((w) => w());
}

/** For useSyncExternalStore: told when the screen's settings change. */
export function watchDisplaySettings(onChange: () => void): () => void {
  watchers.add(onChange);
  return () => watchers.delete(onChange);
}

const SEEN_KEY = 'mugen-cutin-seen';

/** The phone's own date, as YYYY-MM-DD (its own time zone). */
export function localDay(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Whether this cut-in (by its name) is shown now — and, shown under DAILY, it is written down as seen today.
 * `mode` and `now` are for a test.
 */
export function cutInShown(name: string, mode: CutInMode = displaySettings().cutIn, now: Date = new Date()): boolean {
  if (mode === 'ALWAYS') return true;
  if (mode === 'OFF') return false;
  const today = localDay(now);
  let seen: Record<string, string> = {};
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string>;
  } catch {
    seen = {};
  }
  if (seen[name] === today) return false;
  seen[name] = today;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* blocked storage: shown each time this session */
  }
  return true;
}
