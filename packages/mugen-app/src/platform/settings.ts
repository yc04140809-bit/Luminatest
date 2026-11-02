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
