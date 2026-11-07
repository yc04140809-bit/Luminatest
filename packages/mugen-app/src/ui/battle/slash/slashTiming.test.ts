import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import {
  REACH_FLOOR_MS,
  REACH_MS,
  SLASH_FLOOR_MS,
  SLASH_MS,
  reachMs,
  slashMs,
} from './slashTiming';

describe('how long his sword is seen', () => {
  it('is v18-length at ×1, shorter at ×2, and never below its floor', () => {
    for (const part of ['ARC', 'BITE'] as const) {
      expect(slashMs(part, 1)).toBe(SLASH_MS[part]);
      expect(slashMs(part, 2)).toBeLessThan(slashMs(part, 1));
      for (const speed of BATTLE_SPEEDS)
        expect(slashMs(part, speed)).toBeGreaterThanOrEqual(SLASH_FLOOR_MS[part]);
    }
  });

  it('stays an ordinary swing — well under a second, nothing like a cut-in', () => {
    for (const speed of BATTLE_SPEEDS) {
      expect(slashMs('ARC', speed)).toBeLessThan(500);
      expect(slashMs('BITE', speed)).toBeLessThan(500);
    }
  });
});

describe('his walk to the creature and back', () => {
  const steps = Object.keys(REACH_MS) as (keyof typeof REACH_MS)[];
  it("keeps v18's order and strike length, and is shorter at ×2 but never below its floors", () => {
    expect(steps).toEqual(['APPROACH', 'WINDUP', 'STRIKE', 'HOLD', 'RECOVER', 'RETURN']);
    expect(REACH_MS.STRIKE).toBe(240);
    for (const step of steps) {
      expect(reachMs(step, 2)).toBeLessThanOrEqual(reachMs(step, 1));
      for (const speed of BATTLE_SPEEDS)
        expect(reachMs(step, speed)).toBeGreaterThanOrEqual(REACH_FLOOR_MS[step]);
    }
  });

  it("is a normal attack's length: under a second and a half at ×1, under one at ×2", () => {
    const total = (speed: 1 | 2) => steps.reduce((sum, step) => sum + reachMs(step, speed), 0);
    expect(total(1)).toBeLessThan(1500);
    expect(total(2)).toBeLessThan(1000);
  });
});
