import { describe, expect, it } from 'vitest';
import { backTargetFor } from './androidBack';

/**
 * The table is partial on purpose, so what matters is what the GAPS
 * do. An unlisted screen must swallow the press — the safe failure —
 * rather than fall through to something plausible.
 */
describe('what the Android back button means', () => {
  it('comes home from a screen that is off the village', () => {
    expect(backTargetFor('STATUS')).toBe('HOME');
    expect(backTargetFor('BAG')).toBe('HOME');
    expect(backTargetFor('WORLD_MEMORY')).toBe('HOME');
    expect(backTargetFor('ARCHIVE')).toBe('HOME');
    expect(backTargetFor('EXPLORE')).toBe('HOME');
    expect(backTargetFor('GREENWOOD')).toBe('EXPLORE');
    expect(backTargetFor('ITEM_SHOP')).toBe('EXPLORE');
  });

  it('leaves the game only from the title', () => {
    expect(backTargetFor('TITLE')).toBe('EXIT');
  });

  /**
   * THE THREE THAT WOULD COST SOMETHING. A press that walked out of
   * the four answers would be a way to take that decision again; one
   * that left a fight or a scene would leave the game somewhere it
   * has no rules for.
   */
  it('swallows the press where leaving would undo something', () => {
    for (const screen of [
      'LIFE_CHOICE',
      'CHOICE_RESULT',
      'CREATURE_LIFE_CHOICE',
      'BATTLE',
      'BATTLE_RESULT',
      'PROLOGUE',
      'ENDING',
      'FUTURE_SITE',
      'TIME_SHIFT',
    ] as const) {
      expect(backTargetFor(screen), screen).toBeNull();
    }
  });

  it('does not close the game from the village by one press', () => {
    expect(backTargetFor('HOME')).toBeNull();
  });
});
