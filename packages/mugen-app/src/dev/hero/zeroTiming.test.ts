import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import { ZERO_FLOOR_MS, ZERO_MS, zeroMs, zeroPlan, type ZeroStep } from './zeroTiming';

const STEPS = Object.keys(ZERO_MS) as ZeroStep[];

describe('零閃・天衝 — the order', () => {
  it('gather, dash, instant, red moon (cut inside it), back, the cut lands, recover, home', () => {
    for (const speed of BATTLE_SPEEDS) {
      const p = zeroPlan(speed);
      expect(p.dash).toBeGreaterThan(0);
      expect(p.hitstop).toBeGreaterThan(p.dash);
      expect(p.moon).toBeGreaterThan(p.hitstop);
      expect(p.cut).toBeGreaterThan(p.moon);
      expect(p.pause).toBeGreaterThan(p.cut);
      expect(p.break).toBeGreaterThan(p.pause);
      expect(p.recover).toBeGreaterThan(p.break);
      expect(p.return).toBeGreaterThan(p.recover);
      expect(p.end).toBeGreaterThan(p.return);
    }
  });

  it('gives the red moon the longest part', () => {
    for (const speed of BATTLE_SPEEDS) {
      const p = zeroPlan(speed);
      for (const step of STEPS) if (step !== 'MOON') expect(p.ms.MOON).toBeGreaterThan(p.ms[step]);
    }
  });
});

describe('零閃・天衝 — ×2', () => {
  it('is shorter as a whole, the moon never under 1.4s', () => {
    expect(zeroPlan(2).end).toBeLessThan(zeroPlan(1).end);
    for (const speed of BATTLE_SPEEDS) expect(zeroPlan(speed).ms.MOON).toBeGreaterThanOrEqual(1400);
  });

  it('keeps every step at or over its floor', () => {
    for (const step of STEPS) {
      expect(zeroMs(step, 1)).toBe(ZERO_MS[step]);
      expect(zeroMs(step, 2)).toBeLessThanOrEqual(zeroMs(step, 1));
      for (const speed of BATTLE_SPEEDS) expect(zeroMs(step, speed)).toBeGreaterThanOrEqual(ZERO_FLOOR_MS[step]);
    }
  });
});
