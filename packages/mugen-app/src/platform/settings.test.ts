import { describe, it, expect, vi, beforeEach } from 'vitest';

const set: unknown[][] = [];
vi.mock('./audio', () => ({ audioManager: { setVolumes: (...a: unknown[]) => set.push(a) } }));
const { DEFAULT_SOUND, applySoundSettings, readSoundSettings } = await import('./settings');
const { ADMIN_LOCK, adminUnlocks } = await import('./adminReset');

describe('設定: the sound as the player has it', () => {
  beforeEach(() => {
    set.length = 0;
  });

  it('nothing stored: the levels the game has always played at', () => {
    expect(readSoundSettings(null)).toEqual({ master: 1, bgm: 0.35, sfx: 0.8, voice: 0.8, muted: false });
    expect(readSoundSettings('not json')).toEqual(DEFAULT_SOUND);
  });

  it('what is stored, read leniently: a broken or missing field is its default, a level held to 0〜1', () => {
    expect(readSoundSettings(JSON.stringify({ voice: 0.5, bgm: 7, sfx: 'loud', muted: true }))).toEqual({ master: 1, bgm: 1, sfx: 0.8, voice: 0.5, muted: true });
    expect(readSoundSettings(JSON.stringify({ master: -1 })).master).toBe(0);
  });

  it('heard at once — 全ミュート is the master at nought, the levels kept for after', () => {
    applySoundSettings({ master: 0.6, bgm: 0.3, sfx: 0.7, voice: 0.9, muted: false });
    applySoundSettings({ master: 0.6, bgm: 0.3, sfx: 0.7, voice: 0.9, muted: true });
    expect(set).toEqual([
      [0.3, 0.7, 0.6, 0.9],
      [0.3, 0.7, 0, 0.9],
    ]);
  });
});

describe('管理者モード: the lock', () => {
  it('opens on its number only', () => {
    expect(ADMIN_LOCK).toBe('4148999');
    expect(adminUnlocks('4148999')).toBe(true);
    expect(adminUnlocks(' 4148999 ')).toBe(true);
    expect(adminUnlocks('414899')).toBe(false);
    expect(adminUnlocks('')).toBe(false);
  });
});
