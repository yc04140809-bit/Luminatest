import { describe, expect, it } from 'vitest';
import {
  INITIAL_PROGRESS,
  MAX_LEVEL,
  expForLevel,
  expToNextLevel,
  gainExp,
  levelBand,
  levelForExp,
  readProgress,
  readProgressTable,
} from './levelCurve';

describe('the curve', () => {
  it('starts everybody at level one with nothing earned', () => {
    expect(INITIAL_PROGRESS).toEqual({ level: 1, totalExp: 0 });
    expect(expForLevel(1)).toBe(0);
  });

  it('only ever goes up, and never flat', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      expect(expForLevel(level), `level ${level}`).toBeGreaterThan(expForLevel(level - 1));
    }
  });

  it('answers sensibly for a level that is not one', () => {
    expect(expForLevel(0)).toBe(0);
    expect(expForLevel(-4)).toBe(0);
    expect(expForLevel(MAX_LEVEL + 50)).toBe(expForLevel(MAX_LEVEL));
  });
});

describe('what a total is worth', () => {
  it('is level one at nothing', () => {
    expect(levelForExp(0)).toBe(1);
  });

  /** The two cases a threshold has: one short, and exactly there. */
  it('is still the old level one point short, and the new one on the dot', () => {
    const two = expForLevel(2);
    expect(levelForExp(two - 1)).toBe(1);
    expect(levelForExp(two)).toBe(2);
    const five = expForLevel(5);
    expect(levelForExp(five - 1)).toBe(4);
    expect(levelForExp(five)).toBe(5);
  });

  it('stops at the ceiling however much is poured in', () => {
    expect(levelForExp(expForLevel(MAX_LEVEL) * 100)).toBe(MAX_LEVEL);
    expect(expToNextLevel({ level: MAX_LEVEL, totalExp: expForLevel(MAX_LEVEL) })).toBeNull();
    expect(levelBand({ level: MAX_LEVEL, totalExp: expForLevel(MAX_LEVEL) })).toBeNull();
  });

  it('says how much further it is, and how far into this one they are', () => {
    const two = expForLevel(2);
    expect(expToNextLevel({ level: 1, totalExp: 0 })).toBe(two);
    expect(expToNextLevel({ level: 1, totalExp: two - 3 })).toBe(3);
    expect(levelBand({ level: 1, totalExp: 4 })).toEqual({ into: 4, span: two });
  });
});

describe('earning it', () => {
  it('adds up without moving anybody', () => {
    const got = gainExp({ level: 1, totalExp: 0 }, 3);
    expect(got.progress).toEqual({ level: 1, totalExp: 3 });
    expect(got.levelsGained).toBe(0);
  });

  it('crosses a threshold and says so', () => {
    const got = gainExp({ level: 1, totalExp: 0 }, expForLevel(2));
    expect(got.progress.level).toBe(2);
    expect(got.levelsGained).toBe(1);
    expect(got.from).toBe(1);
    expect(got.to).toBe(2);
  });

  /** A player back from a long absence crosses several, and all count. */
  it('crosses as many as the number is worth, in one go', () => {
    const got = gainExp({ level: 1, totalExp: 0 }, expForLevel(6));
    expect(got.progress.level).toBe(6);
    expect(got.levelsGained).toBe(5);
  });

  /**
   * THERE IS NO LEVEL DOWN. Whatever bug produced a negative gain, a
   * player losing a level they earned is worse than a reward going
   * missing.
   */
  it('never takes anything away', () => {
    const at = { level: 4, totalExp: expForLevel(4) + 5 };
    for (const bad of [-100, -1, 0, Number.NaN, 0.4]) {
      const got = gainExp(at, bad);
      expect(got.progress, String(bad)).toEqual(at);
      expect(got.levelsGained).toBe(0);
    }
  });

  it('cannot be poured past the ceiling', () => {
    const got = gainExp({ level: 1, totalExp: 0 }, Number.MAX_SAFE_INTEGER);
    expect(got.progress.level).toBe(MAX_LEVEL);
    expect(got.progress.totalExp).toBe(expForLevel(MAX_LEVEL));
  });
});

describe('progress out of a save', () => {
  it('is level one with nothing when the save has never heard of it', () => {
    expect(readProgress(undefined)).toEqual(INITIAL_PROGRESS);
    expect(readProgress(null)).toEqual(INITIAL_PROGRESS);
    expect(readProgress(7)).toEqual(INITIAL_PROGRESS);
    expect(readProgressTable(undefined)).toEqual({});
    expect(readProgressTable([1, 2])).toEqual({});
  });

  /**
   * The level is a CACHE of the total, so a save that disagrees with
   * itself — an older curve, a build with a bug — comes back consistent
   * rather than coming back wrong.
   */
  it('recomputes the level from the total rather than believing it', () => {
    expect(readProgress({ level: 40, totalExp: 0 })).toEqual({ level: 1, totalExp: 0 });
    const five = expForLevel(5);
    expect(readProgress({ level: 1, totalExp: five })).toEqual({ level: 5, totalExp: five });
  });

  it('repairs a total that is not one', () => {
    expect(readProgress({ totalExp: -50 })).toEqual(INITIAL_PROGRESS);
    expect(readProgress({ totalExp: 12.9 }).totalExp).toBe(12);
    expect(readProgress({ totalExp: Number.NaN })).toEqual(INITIAL_PROGRESS);
  });

  it('reads a whole table, and skips what is not a row', () => {
    const table = readProgressTable({ hero: { totalExp: expForLevel(3) }, '': { totalExp: 9 } });
    expect(Object.keys(table)).toEqual(['hero']);
    expect(table.hero.level).toBe(3);
  });
});
