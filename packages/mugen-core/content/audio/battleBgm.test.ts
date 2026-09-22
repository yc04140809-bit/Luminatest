import { describe, expect, it } from 'vitest';
import {
  BATTLE_BGM_IDS,
  DEFAULT_BATTLE_BGM,
  FORCED_BATTLE_BGM,
  INITIAL_UNLOCKED_BATTLE_BGM,
  battleBgmFor,
  battleBgmLabel,
  canChooseBattleBgm,
  isBattleBgm,
  moreThanOneBattleBgm,
  nextBattleBgm,
  unlockedBattleBgm,
} from './battleBgm';

const BOTH = ['NORMAL_BATTLE', 'BOSS_BATTLE'] as const;

describe('which piece a fight is fought to', () => {
  it('knows the two pieces, and starts with only the ordinary one', () => {
    expect(BATTLE_BGM_IDS).toEqual(['NORMAL_BATTLE', 'BOSS_BATTLE']);
    expect(DEFAULT_BATTLE_BGM).toBe('NORMAL_BATTLE');
    expect(INITIAL_UNLOCKED_BATTLE_BGM).toEqual(['NORMAL_BATTLE']);
  });

  /**
   * THE RULE THE FEATURE EXISTS FOR. A piece you have not won a fight
   * to cannot be chosen — so the first time the boss music plays, it
   * cannot be switched away from.
   */
  describe('before it has been won', () => {
    it('offers nothing but the ordinary piece', () => {
      expect(unlockedBattleBgm(undefined)).toEqual(['NORMAL_BATTLE']);
      expect(unlockedBattleBgm(['NORMAL_BATTLE'])).toEqual(['NORMAL_BATTLE']);
      expect(moreThanOneBattleBgm(['NORMAL_BATTLE'])).toBe(false);
      expect(battleBgmLabel('NORMAL_BATTLE', ['NORMAL_BATTLE'])).toBe('1/1');
    });

    it('will not hand it over by cycling', () => {
      expect(nextBattleBgm('NORMAL_BATTLE', ['NORMAL_BATTLE'])).toBe('NORMAL_BATTLE');
    });

    /** Nor by a save that names it — edited, or from another build. */
    it('will not honour a choice that was never earned', () => {
      expect(battleBgmFor(null, 'BOSS_BATTLE', ['NORMAL_BATTLE'])).toBe('NORMAL_BATTLE');
    });
  });

  describe('once it has been won', () => {
    it('lets it be chosen freely, for any fight', () => {
      expect(unlockedBattleBgm(BOTH)).toEqual(['NORMAL_BATTLE', 'BOSS_BATTLE']);
      expect(moreThanOneBattleBgm(BOTH)).toBe(true);
      expect(nextBattleBgm('NORMAL_BATTLE', BOTH)).toBe('BOSS_BATTLE');
      expect(nextBattleBgm('BOSS_BATTLE', BOTH)).toBe('NORMAL_BATTLE');
      expect(battleBgmFor(null, 'BOSS_BATTLE', BOTH)).toBe('BOSS_BATTLE');
      expect(battleBgmLabel('BOSS_BATTLE', BOTH)).toBe('2/2');
    });
  });

  /**
   * A FIGHT THAT IS ABOUT SOMETHING BRINGS ITS OWN MUSIC, and the
   * choice is not offered rather than being offered and refused.
   */
  describe('the fight the story turns on', () => {
    it('plays the boss piece whatever anybody chose', () => {
      expect(FORCED_BATTLE_BGM.GALD).toBe('BOSS_BATTLE');
      expect(battleBgmFor('GALD', 'NORMAL_BATTLE', BOTH)).toBe('BOSS_BATTLE');
      expect(battleBgmFor('GALD', null, ['NORMAL_BATTLE'])).toBe('BOSS_BATTLE');
    });

    it('hides the control there, even for somebody who has won it', () => {
      expect(canChooseBattleBgm('GALD', BOTH)).toBe(false);
      expect(canChooseBattleBgm(null, BOTH)).toBe(true);
      expect(canChooseBattleBgm(null, ['NORMAL_BATTLE'])).toBe(false);
    });
  });

  /**
   * THE DEFAULT ARGUMENT IS A SAFETY CATCH. Anything written before
   * unlocking existed calls these with one argument, and must keep
   * cycling within the ordinary piece rather than being handed the
   * boss music for free.
   */
  it('gives an un-taught caller only the starting set', () => {
    expect(nextBattleBgm('NORMAL_BATTLE')).toBe('NORMAL_BATTLE');
    expect(moreThanOneBattleBgm()).toBe(false);
    expect(battleBgmLabel('NORMAL_BATTLE')).toBe('1/1');
    expect(battleBgmFor(null, 'BOSS_BATTLE')).toBe('NORMAL_BATTLE');
  });

  /**
   * THE OTHER HALF OF `sceneBgm.test.ts`. No scene reaches the boss
   * piece, so if no fight did either it would be a file nobody plays.
   * Something must bring it, and this is where that is asserted.
   */
  it('is brought by a fight, since no scene brings it', () => {
    const broughtByAFight = new Set(Object.values(FORCED_BATTLE_BGM));
    expect(broughtByAFight.has('BOSS_BATTLE')).toBe(true);
  });

  it('can always play a fight, whatever it is handed', () => {
    expect(unlockedBattleBgm([])).toEqual(['NORMAL_BATTLE']);
    expect(unlockedBattleBgm(['nonsense'])).toEqual(['NORMAL_BATTLE']);
    expect(isBattleBgm('BOSS_BATTLE')).toBe(true);
    expect(isBattleBgm('OPENING')).toBe(false);
  });
});
