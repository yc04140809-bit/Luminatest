import { describe, it, expect } from 'vitest';
import { BASE_STATS, PER_LEVEL, readStats, statsForLevels } from './levelStats';
import { PLAYER_ATK_MAX_BASE, PLAYER_ATK_MIN_BASE, PLAYER_MAX_MP } from '../../game/battle/battleLogic';

/**
 * THE GUARD THAT MATTERS MOST IS THE FIRST ONE.
 *
 * Every fight in the game was tuned against the four numbers the
 * battle used to hard-code. A curve whose first step moves them has
 * not added growth, it has retuned the whole game quietly.
 */
describe('level one', () => {
  it('is exactly what the battle hard-coded before levels meant anything', () => {
    expect(statsForLevels(1, 1)).toEqual({
      maxHp: 100,
      maxMp: 48,
      attackMin: 8,
      attackMax: 12,
    });
  });

  it('agrees with the battle itself, so the two cannot drift apart', () => {
    expect(BASE_STATS.maxMp).toBe(PLAYER_MAX_MP);
    expect(BASE_STATS.attackMin).toBe(PLAYER_ATK_MIN_BASE);
    expect(BASE_STATS.attackMax).toBe(PLAYER_ATK_MAX_BASE);
  });

  it('is what a level below one, or a nonsense level, comes back as', () => {
    for (const level of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(statsForLevels(level, level), String(level)).toEqual(BASE_STATS);
    }
  });
});

describe('going up', () => {
  it('adds the same amount every level', () => {
    const two = statsForLevels(2, 2);
    expect(two.maxHp).toBe(BASE_STATS.maxHp + PER_LEVEL.maxHp);
    expect(two.maxMp).toBe(BASE_STATS.maxMp + PER_LEVEL.maxMp);
    const ten = statsForLevels(10, 10);
    expect(ten.maxHp).toBe(BASE_STATS.maxHp + PER_LEVEL.maxHp * 9);
  });

  /**
   * Both ends move together. A widening band would mean high levels
   * feel MORE random, which is the opposite of getting stronger.
   */
  it('makes a swing better without making it swingier', () => {
    for (const level of [1, 2, 5, 20, 99]) {
      const stats = statsForLevels(level, 1);
      expect(stats.attackMax - stats.attackMin, `Lv.${level}`).toBe(
        BASE_STATS.attackMax - BASE_STATS.attackMin,
      );
    }
  });

  it('never goes down', () => {
    let last = statsForLevels(1, 1);
    for (let level = 2; level <= 99; level++) {
      const now = statsForLevels(level, level);
      expect(now.maxHp).toBeGreaterThan(last.maxHp);
      expect(now.maxMp).toBeGreaterThan(last.maxMp);
      expect(now.attackMin).toBeGreaterThan(last.attackMin);
      last = now;
    }
  });
});

/** The sword is his and the magic is hers. */
describe('whose level does what', () => {
  it('reads health and the swing off his', () => {
    const his = statsForLevels(5, 1);
    expect(his.maxHp).toBeGreaterThan(BASE_STATS.maxHp);
    expect(his.attackMin).toBeGreaterThan(BASE_STATS.attackMin);
    expect(his.maxMp, 'her pool is not his to grow').toBe(BASE_STATS.maxMp);
  });

  it('reads magic off hers', () => {
    const hers = statsForLevels(1, 5);
    expect(hers.maxMp).toBeGreaterThan(BASE_STATS.maxMp);
    expect(hers.maxHp, 'his health is not hers to grow').toBe(BASE_STATS.maxHp);
    expect(hers.attackMin).toBe(BASE_STATS.attackMin);
  });
});

describe('a stat block from somewhere untrusted', () => {
  it('never reads as less than level one', () => {
    expect(readStats({ maxHp: -50, maxMp: Number.NaN, attackMin: 'lots' })).toEqual(BASE_STATS);
    expect(readStats(null)).toEqual(BASE_STATS);
    expect(readStats('stats')).toEqual(BASE_STATS);
  });

  it('never lets the top of a swing fall below the bottom', () => {
    const stats = readStats({ maxHp: 120, maxMp: 50, attackMin: 30, attackMax: 4 });
    expect(stats.attackMax).toBeGreaterThanOrEqual(stats.attackMin);
  });
});
