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
      bgmVolume: 0.2,
      seVolume: 0.4,
      hapticEnabled: false,
      reducedMotion: true,
      openingMode: 'OFF' as const,
    };
    saveSettings(next);
    expect(loadSettings()).toEqual(next);
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
        seVolume: 0.5,
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
        bgmVolume: 9,
        seVolume: -3,
        hapticEnabled: 'yes',
      }),
    });
    const loaded = loadSettings();
    expect(loaded.bgmVolume).toBe(1);
    expect(loaded.seVolume).toBe(0);
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
