import { describe, expect, it } from 'vitest';
import { ENEMY_REWARDS, rewardForSpecies } from './enemyRewards';
import { expForLevel, gainExp, INITIAL_PROGRESS } from '../../core/progression/levelCurve';
import { itemDef } from '../economy/itemDefs';

describe('what a fight is worth', () => {
  it('gives something, and nothing negative', () => {
    for (const [id, reward] of Object.entries(ENEMY_REWARDS)) {
      expect(reward.exp, id).toBeGreaterThan(0);
      expect(reward.lumi, id).toBeGreaterThanOrEqual(0);
      for (const stack of reward.items) {
        expect(itemDef(stack.itemId), `${id} drops ${stack.itemId}`).not.toBeNull();
        expect(stack.quantity, id).toBeGreaterThan(0);
      }
    }
  });

  it('answers with nothing for a species nobody has priced', () => {
    expect(rewardForSpecies('no_such_creature')).toBeNull();
  });

  /**
   * A LEGIBILITY RULE RATHER THAN A BALANCE ONE. A player whose first
   * fight says only 「EXP +16」 has been shown a number; one whose first
   * fight says 「Lv.1 → Lv.2」 has been shown a system.
   */
  it('levels a new player up on their very first victory', () => {
    const got = gainExp(INITIAL_PROGRESS, ENEMY_REWARDS.moss_rabbit.exp);
    expect(got.to).toBe(2);
    expect(got.levelsGained).toBe(1);
  });

  it('does not level them twice for one rabbit', () => {
    expect(gainExp(INITIAL_PROGRESS, ENEMY_REWARDS.moss_rabbit.exp).to).toBeLessThan(3);
    expect(ENEMY_REWARDS.moss_rabbit.exp).toBeLessThan(expForLevel(3));
  });
});
