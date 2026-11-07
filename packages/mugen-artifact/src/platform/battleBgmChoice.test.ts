import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { battleBgmChoice, setBattleBgmChoice } from './battleBgmChoice';
import { DEFAULT_BATTLE_BGM } from '@mugen/content/audio/battleBgm';

/** Minimal localStorage stand-in, as settings.test.ts uses. */
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

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

/**
 * A PREFERENCE, NOT A SAVE.
 *
 * How somebody likes to listen is not something that happened in their
 * game, so it lives in localStorage beside the volume sliders and never
 * in the world. A save carried to another device does not bring it.
 */
describe('the fighting music a player last chose', () => {
  it('is the default until somebody chooses', () => {
    installStorage();
    expect(battleBgmChoice()).toBe(DEFAULT_BATTLE_BGM);
  });

  it('survives being chosen', () => {
    installStorage();
    setBattleBgmChoice(DEFAULT_BATTLE_BGM);
    expect(battleBgmChoice()).toBe(DEFAULT_BATTLE_BGM);
  });

  /**
   * A piece named in storage that the game no longer has — removed
   * between versions — is not an error and is not silence. It is the
   * default, which is the only answer that can always be played.
   */
  it('falls back rather than trusting a name the game has lost', () => {
    installStorage({ 'mugen-battle-bgm': 'NORMAL_BATTLE_LONG_GONE' });
    expect(battleBgmChoice()).toBe(DEFAULT_BATTLE_BGM);
  });

  it('refuses a real piece that is not fighting music', () => {
    installStorage({ 'mugen-battle-bgm': 'ALDEN_VILLAGE' });
    expect(battleBgmChoice()).toBe(DEFAULT_BATTLE_BGM);
  });

  it('survives storage that refuses to work at all', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => battleBgmChoice()).not.toThrow();
    expect(battleBgmChoice()).toBe(DEFAULT_BATTLE_BGM);
    expect(() => setBattleBgmChoice(DEFAULT_BATTLE_BGM)).not.toThrow();
  });

  it('does not exist as a key at all while the choice is the default', () => {
    // Nothing stored means nothing to go stale, and a save that never
    // touched the music carries no opinion about it.
    const store = installStorage({ 'mugen-battle-bgm': 'NORMAL_BATTLE_LONG_GONE' });
    setBattleBgmChoice(DEFAULT_BATTLE_BGM);
    expect(store.has('mugen-battle-bgm')).toBe(false);
  });
});
