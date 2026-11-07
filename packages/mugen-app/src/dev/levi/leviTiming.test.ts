import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import { LEVI_FLOOR_MS, LEVI_MS, SPEAR_COUNT, leviMs, leviPlan, type LeviStep } from './leviTiming';

const STEPS = Object.keys(LEVI_MS) as LeviStep[];

describe("Levi's phantom spears — the order", () => {
  it('has six spears', () => {
    expect(SPEAR_COUNT).toBe(6);
    for (const speed of BATTLE_SPEEDS) {
      const plan = leviPlan(speed);
      expect(plan.form).toHaveLength(6);
      expect(plan.launch).toHaveLength(6);
      expect(plan.lodge).toHaveLength(6);
    }
  });

  it('stance, then the spears form, then they strike, then her finish, then she goes', () => {
    for (const speed of BATTLE_SPEEDS) {
      const p = leviPlan(speed);
      expect(p.stance).toBeGreaterThan(0);
      expect(p.form[0]).toBeGreaterThan(p.stance);
      // All six are there before the first strikes.
      expect(p.launch[0]).toBeGreaterThanOrEqual(p.form[5] + p.ms.FORM_IN);
      expect(p.launch[0]).toBeGreaterThanOrEqual(p.stance + p.ms.STANCE);
      // The sixth is in before she moves, and her drive lands after it.
      expect(p.rush).toBeGreaterThan(p.lodge[5]);
      expect(p.impact).toBeGreaterThan(p.rush);
      expect(p.leave).toBeGreaterThan(p.impact);
      expect(p.end).toBeGreaterThan(p.leave);
    }
  });

  it('strikes one at a time — never together, at any speed', () => {
    for (const speed of BATTLE_SPEEDS) {
      const p = leviPlan(speed);
      for (let i = 1; i < 6; i += 1) {
        expect(p.form[i]).toBeGreaterThan(p.form[i - 1]);
        // Each lands on its own: at least 80ms after the one before.
        expect(p.lodge[i] - p.lodge[i - 1]).toBeGreaterThanOrEqual(80);
      }
    }
  });

  it('gives the finish more time than any one spear', () => {
    for (const speed of BATTLE_SPEEDS) {
      const p = leviPlan(speed);
      expect(p.ms.IMPACT).toBeGreaterThan(p.ms.STAB * 2);
    }
  });
});

describe("Levi's phantom spears — ×2", () => {
  it('is shorter as a whole', () => {
    expect(leviPlan(2).end).toBeLessThan(leviPlan(1).end);
  });

  it('keeps every step at or over its floor', () => {
    for (const step of STEPS) {
      expect(leviMs(step, 1)).toBe(LEVI_MS[step]);
      expect(leviMs(step, 2)).toBeLessThanOrEqual(leviMs(step, 1));
      for (const speed of BATTLE_SPEEDS) expect(leviMs(step, speed)).toBeGreaterThanOrEqual(LEVI_FLOOR_MS[step]);
    }
  });
});
