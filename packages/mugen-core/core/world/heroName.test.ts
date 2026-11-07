import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HERO_NAME,
  HERO_NAME_MAX_LENGTH,
  heroNameLength,
  isUsableHeroName,
  normaliseHeroName,
  readHeroName,
} from './heroName';

describe('what the player calls themselves', () => {
  it('takes a name as typed, in either width', () => {
    expect(normaliseHeroName('レイ')).toBe('レイ');
    expect(normaliseHeroName('Rey')).toBe('Rey');
    expect(normaliseHeroName('ﾚｲ')).toBe('ﾚｲ');
  });

  /** A trailing space is invisible, and would make two names look the same. */
  it('trims both ends, and keeps the space inside a name', () => {
    expect(normaliseHeroName('  レイ  ')).toBe('レイ');
    expect(normaliseHeroName('山田 太郎')).toBe('山田 太郎');
  });

  it('refuses a name that is only space, in either width', () => {
    expect(normaliseHeroName('   ')).toBeNull();
    expect(normaliseHeroName('　　')).toBeNull();
    expect(normaliseHeroName('')).toBeNull();
    expect(isUsableHeroName('　')).toBe(false);
  });

  it('stops at the limit', () => {
    expect(normaliseHeroName('あ'.repeat(HERO_NAME_MAX_LENGTH))).toHaveLength(
      HERO_NAME_MAX_LENGTH,
    );
    expect(normaliseHeroName('あ'.repeat(HERO_NAME_MAX_LENGTH + 1))).toBeNull();
  });

  /**
   * Counted as a person counts, not as UTF-16 does. A character needing
   * a surrogate pair is one character to whoever typed it.
   */
  it('counts a character as one character', () => {
    expect(heroNameLength('𠮷野')).toBe(2);
    expect(normaliseHeroName('𠮷'.repeat(HERO_NAME_MAX_LENGTH))).not.toBeNull();
  });

  describe('reading one out of a save', () => {
    /**
     * THE COMPATIBILITY RULE. A save written before this feature has no
     * name row at all, and that must read as the default rather than as
     * damage — which is why nothing had to be migrated.
     */
    it('reads an absent name as the default, and calls it healthy', () => {
      expect(readHeroName(undefined)).toEqual({ value: DEFAULT_HERO_NAME, health: 'ok' });
    });

    it('never fails, whatever a save holds', () => {
      for (const junk of [null, 42, {}, [], true]) {
        const read = readHeroName(junk);
        expect(read.value).toBe(DEFAULT_HERO_NAME);
        expect(read.health).toBe('repaired');
      }
    });

    /** What they chose is still mostly what they see. */
    it('cuts an over-long name rather than throwing it away', () => {
      const read = readHeroName('あ'.repeat(HERO_NAME_MAX_LENGTH + 5));
      expect(read.value).toBe('あ'.repeat(HERO_NAME_MAX_LENGTH));
      expect(read.health).toBe('repaired');
    });

    it('keeps a good name exactly as it was', () => {
      expect(readHeroName('レイ')).toEqual({ value: 'レイ', health: 'ok' });
    });
  });
});
