import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import { stepTimes } from './stepTimes';

describe('the length of each step of a showing', () => {
  const BASE = { SHORT: 120, LONG: 1900 } as const;
  const FLOOR = { SHORT: 90, LONG: 1400 } as const;

  it('is the step as written at ×1', () => {
    expect(stepTimes(BASE, FLOOR, 1)).toEqual({ SHORT: 120, LONG: 1900 });
  });

  it('is shorter at ×2, and never under its floor', () => {
    const fast = stepTimes(BASE, FLOOR, 2);
    expect(fast.LONG).toBe(1400);
    expect(fast.SHORT).toBeLessThanOrEqual(120);
    for (const speed of BATTLE_SPEEDS) {
      const at = stepTimes(BASE, FLOOR, speed);
      expect(at.SHORT).toBeGreaterThanOrEqual(FLOOR.SHORT);
      expect(at.LONG).toBeGreaterThanOrEqual(FLOOR.LONG);
    }
  });
});
