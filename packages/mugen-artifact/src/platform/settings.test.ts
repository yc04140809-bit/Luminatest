import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

// Minimal localStorage stand-in for the node test environment.
function installStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  return store;
}

describe('settings (player preferences, never world state)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns defaults when nothing is stored', () => {
    installStorage();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', () => {
    installStorage();
    const next = {
      masterVolume: 0.7,
      bgmVolume: 0.2,
      sfxVolume: 0.4,
      voiceVolume: 0.6,
      hapticEnabled: false,
      reducedMotion: true,
      openingMode: 'OFF' as const,
    };
    saveSettings(next);
    expect(loadSettings()).toEqual(next);
  });

  it('starts with MASTER all the way up, and the other three under it', () => {
    installStorage();
    const loaded = loadSettings();
    expect(loaded.masterVolume).toBe(1);
    expect(loaded.bgmVolume).toBe(0.35);
    expect(loaded.sfxVolume).toBe(0.8);
    expect(loaded.voiceVolume).toBe(0.8);
  });

  /**
   * The effects slider was `seVolume` when there was one of it.
   * Somebody who turned effects down months ago must not find them
   * loud again because the field was renamed.
   */
  it('reads an old seVolume as the effects slider it was', () => {
    installStorage({
      'mugen-zero-settings': JSON.stringify({ bgmVolume: 0.5, seVolume: 0.15 }),
    });
    expect(loadSettings().sfxVolume).toBe(0.15);
  });

  it('prefers the new name when a save carries both', () => {
    installStorage({
      'mugen-zero-settings': JSON.stringify({ sfxVolume: 0.9, seVolume: 0.1 }),
    });
    expect(loadSettings().sfxVolume).toBe(0.9);
  });

  it('reads a save from before MASTER and VOICE existed as their defaults', () => {
    installStorage({
      'mugen-zero-settings': JSON.stringify({ bgmVolume: 0.5, seVolume: 0.5 }),
    });
    const loaded = loadSettings();
    expect(loaded.masterVolume).toBe(DEFAULT_SETTINGS.masterVolume);
    expect(loaded.voiceVolume).toBe(DEFAULT_SETTINGS.voiceVolume);
  });

  it('plays the opening once per run of the app unless told otherwise', () => {
    installStorage();
    expect(DEFAULT_SETTINGS.openingMode).toBe('ONCE_PER_SESSION');
    expect(loadSettings().openingMode).toBe('ONCE_PER_SESSION');
  });

  it('reads settings saved before the opening theme existed as the default', () => {
    // An older save has no openingMode at all. Absent must not read as
    // OFF: somebody who never chose anything gets the opening.
    installStorage({
      'mugen-zero-settings': JSON.stringify({
        bgmVolume: 0.5,
        sfxVolume: 0.5,
        hapticEnabled: true,
        reducedMotion: false,
      }),
    });
    expect(loadSettings().openingMode).toBe('ONCE_PER_SESSION');
  });

  it('ignores an openingMode that is not one of the three', () => {
    installStorage({
      'mugen-zero-settings': JSON.stringify({ openingMode: 'SOMETIMES' }),
    });
    expect(loadSettings().openingMode).toBe('ONCE_PER_SESSION');
  });

  it('falls back to defaults on corrupt data instead of throwing', () => {
    installStorage({ 'mugen-zero-settings': '{ not json' });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps out-of-range volumes and ignores wrong types', () => {
    installStorage({
      'mugen-zero-settings': JSON.stringify({
        masterVolume: 4,
        bgmVolume: 9,
        sfxVolume: -3,
        voiceVolume: 'loud',
        hapticEnabled: 'yes',
      }),
    });
    const loaded = loadSettings();
    expect(loaded.masterVolume).toBe(1);
    expect(loaded.bgmVolume).toBe(1);
    expect(loaded.sfxVolume).toBe(0);
    expect(loaded.voiceVolume).toBe(DEFAULT_SETTINGS.voiceVolume);
    expect(loaded.hapticEnabled).toBe(DEFAULT_SETTINGS.hapticEnabled);
  });

  it('survives storage being unavailable (private mode)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
  });
});
