import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import { KAOS_FLOOR_MS, KAOS_MS, kaosMs, kaosPlan, type KaosStep } from './kaosTiming';

const STEPS = Object.keys(KAOS_MS) as KaosStep[];

describe("Kaos's skill — the order", () => {
  it('she steps in, 双極臨界, 界核崩壊, the burst, then the end', () => {
    for (const speed of BATTLE_SPEEDS) {
      const p = kaosPlan(speed);
      expect(p.critical).toBeGreaterThan(0);
      expect(p.collapse).toBeGreaterThan(p.critical);
      expect(p.burst).toBeGreaterThan(p.collapse);
      expect(p.recover).toBeGreaterThan(p.burst);
      expect(p.end).toBeGreaterThan(p.recover);
    }
  });

  it('is about three seconds at ×1, and 双極臨界 is its longest half', () => {
    const p = kaosPlan(1);
    expect(p.end).toBeGreaterThan(2500);
    expect(p.end).toBeLessThan(3500);
    expect(p.ms.CRITICAL).toBeGreaterThan(p.ms.COLLAPSE);
  });
});

describe("Kaos's skill — ×2", () => {
  it('is shorter as a whole', () => {
    expect(kaosPlan(2).end).toBeLessThan(kaosPlan(1).end);
  });

  it('keeps every step at or over its floor', () => {
    for (const step of STEPS) {
      expect(kaosMs(step, 1)).toBe(KAOS_MS[step]);
      expect(kaosMs(step, 2)).toBeLessThanOrEqual(kaosMs(step, 1));
      for (const speed of BATTLE_SPEEDS) expect(kaosMs(step, speed)).toBeGreaterThanOrEqual(KAOS_FLOOR_MS[step]);
    }
  });
});
