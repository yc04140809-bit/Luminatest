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
    const next = { bgmVolume: 0.2, seVolume: 0.4, hapticEnabled: false, reducedMotion: true };
    saveSettings(next);
    expect(loadSettings()).toEqual(next);
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
