import { describe, expect, it } from 'vitest';
import { readEquipment, readOwned } from './equipmentState';

/**
 * THE COMPATIBILITY RULES, which is the whole reason these readers
 * exist rather than a `JSON.parse`. An old save must open, a damaged
 * one must not cost somebody the game, and a save written under looser
 * rules must not leave a character holding something they could never
 * equip now.
 */
describe('equipment out of a save', () => {
  it('reads an absent row as nothing, and calls it healthy', () => {
    expect(readEquipment(undefined)).toEqual({ value: {}, health: 'ok' });
    expect(readOwned(undefined)).toEqual({ value: {}, health: 'ok' });
  });

  it('never fails, whatever a save holds', () => {
    for (const junk of [null, 42, 'x', [], true]) {
      expect(readEquipment(junk).value).toEqual({});
      expect(readOwned(junk).value).toEqual({});
    }
  });

  it('keeps what it can read', () => {
    const read = readEquipment({ hero: { WEAPON: 'weapon/worn_long_sword' } });
    expect(read).toEqual({
      value: { hero: { WEAPON: 'weapon/worn_long_sword' } },
      health: 'ok',
    });
  });

  it('drops an id this build has never heard of', () => {
    const read = readEquipment({ hero: { WEAPON: 'weapon/from_the_future' } });
    expect(read.value).toEqual({});
    expect(read.health).toBe('repaired');
  });

  it('drops a slot that does not exist', () => {
    const read = readEquipment({ hero: { HAT: 'weapon/worn_long_sword' } });
    expect(read.value).toEqual({});
    expect(read.health).toBe('repaired');
  });

  /**
   * The rule that matters most: a save from when anything could be
   * equipped must not leave Kaos holding a longsword now.
   */
  it('takes away a weapon the rules no longer allow', () => {
    const read = readEquipment({ kaos: { WEAPON: 'weapon/worn_long_sword' } });
    expect(read.value).toEqual({});
    expect(read.health).toBe('repaired');
  });

  describe('what is owned', () => {
    it('keeps counts, and drops nonsense ones', () => {
      const read = readOwned({ 'weapon/worn_long_sword': 2, 'weapon/bad': 0, x: -1 });
      expect(read.value).toEqual({ 'weapon/worn_long_sword': 2 });
      expect(read.health).toBe('repaired');
    });

    /**
     * AN UNKNOWN ID IS KEPT HERE, unlike in the table above. It
     * belongs to a newer build, and an older one has no business
     * eating somebody's possessions — it only refuses to WEAR it.
     */
    it('keeps a possession it does not recognise', () => {
      const read = readOwned({ 'weapon/from_the_future': 1 });
      expect(read.value).toEqual({ 'weapon/from_the_future': 1 });
      expect(read.health).toBe('ok');
    });
  });
});
