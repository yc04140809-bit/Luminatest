import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import { KAOS_FLOOR_MS, KAOS_MS, KAOS_SKILL_NAME, kaosMs, kaosPlan, type KaosStep } from './kaosTiming';

const STEPS = Object.keys(KAOS_MS) as KaosStep[];

describe("Kaos's 双極崩界 (v19) — the order and the base times", () => {
  it('is the v19 handoff’s: enter 180, channel 1700, lock 720, blast 2800, recover 850', () => {
    expect(KAOS_MS).toEqual({ ENTER: 180, CHANNEL: 1700, LOCK: 720, BLAST: 2800, RECOVER: 850 });
    expect(KAOS_SKILL_NAME).toBe('双極崩界');
  });

  it('she steps in, channels, locks, the blast, then the end', () => {
    for (const speed of BATTLE_SPEEDS) {
      const p = kaosPlan(speed);
      expect(p.channel).toBeGreaterThan(0);
      expect(p.lock).toBeGreaterThan(p.channel);
      expect(p.blast).toBeGreaterThan(p.lock);
      expect(p.recover).toBeGreaterThan(p.blast);
      expect(p.end).toBeGreaterThan(p.recover);
    }
    expect(kaosPlan(1).end).toBe(180 + 1700 + 720 + 2800 + 850);
  });
});

describe("Kaos's 双極崩界 — ×2", () => {
  it('is shorter as a whole, and the blast keeps at least 1800ms (v19)', () => {
    expect(kaosPlan(2).end).toBeLessThan(kaosPlan(1).end);
    expect(kaosMs('BLAST', 2)).toBeGreaterThanOrEqual(1800);
  });

  it('keeps every step at or over its floor', () => {
    for (const step of STEPS) {
      expect(kaosMs(step, 1)).toBe(KAOS_MS[step]);
      expect(kaosMs(step, 2)).toBeLessThanOrEqual(kaosMs(step, 1));
      for (const speed of BATTLE_SPEEDS) expect(kaosMs(step, speed)).toBeGreaterThanOrEqual(KAOS_FLOOR_MS[step]);
    }
  });
});
