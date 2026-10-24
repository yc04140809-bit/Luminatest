import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import { ARIA_FLOOR_MS, ARIA_MS, ariaMs, ariaPlan, type AriaStep } from './ariaTiming';

const STEPS = Object.keys(ARIA_MS) as AriaStep[];

describe("Aria's blue-rose arrow — the order", () => {
  it('draw, shot, landing, rose, blessing — he is back inside the blessing — then the end', () => {
    for (const speed of BATTLE_SPEEDS) {
      const p = ariaPlan(speed);
      expect(p.draw).toBeGreaterThan(0);
      expect(p.shot).toBeGreaterThan(p.draw);
      expect(p.land).toBeGreaterThan(p.shot);
      expect(p.bloom).toBeGreaterThan(p.land);
      expect(p.bless).toBeGreaterThan(p.bloom);
      expect(p.back).toBeGreaterThan(p.bless);
      expect(p.recover).toBeGreaterThan(p.back);
      expect(p.end).toBeGreaterThan(p.recover);
    }
  });

  it('gives the rose longer than the arrow', () => {
    for (const speed of BATTLE_SPEEDS) {
      const p = ariaPlan(speed);
      expect(p.ms.BLOOM).toBeGreaterThan(p.ms.SHOT);
    }
  });
});

describe("Aria's blue-rose arrow — ×2", () => {
  it('is shorter as a whole', () => {
    expect(ariaPlan(2).end).toBeLessThan(ariaPlan(1).end);
  });

  it('keeps every step at or over its floor', () => {
    for (const step of STEPS) {
      expect(ariaMs(step, 1)).toBe(ARIA_MS[step]);
      expect(ariaMs(step, 2)).toBeLessThanOrEqual(ariaMs(step, 1));
      for (const speed of BATTLE_SPEEDS) expect(ariaMs(step, speed)).toBeGreaterThanOrEqual(ARIA_FLOOR_MS[step]);
    }
  });
});
