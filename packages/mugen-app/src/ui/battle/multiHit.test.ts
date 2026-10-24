import { describe, expect, it } from 'vitest';
import { MULTI_HIT, MULTI_HIT_GAP_FLOOR_MS, MULTI_HIT_GAP_MS, multiHitGap, multiHitOf, splitDamage } from './multiHit';

// 《瞬断》 three cuts (作者 2026-10-24 A): the same amount, shown as three.

describe('a move of several cuts', () => {
  it('《瞬断》 cuts three times, the last the heaviest; every other move once', () => {
    expect(multiHitOf('shundan')).toEqual([0.3, 0.3, 0.4]);
    expect(multiHitOf('goudan')).toBeNull();
    expect(multiHitOf(undefined)).toBeNull();
    for (const shares of Object.values(MULTI_HIT)) expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('the three numbers add up to the amount exactly — the total is never changed', () => {
    const shares = MULTI_HIT.shundan;
    for (let total = 0; total <= 999; total++) {
      const parts = splitDamage(total, shares);
      expect(parts).toHaveLength(3);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      for (const p of parts) expect(Number.isInteger(p) && p >= 0).toBe(true);
      // Enough to go round: every cut shows a number, the last at least as big as the others.
      if (total >= 3) {
        expect(Math.min(...parts)).toBeGreaterThanOrEqual(1);
        expect(parts[2]).toBeGreaterThanOrEqual(Math.max(parts[0], parts[1]));
      }
    }
    expect(splitDamage(40, shares)).toEqual([12, 12, 16]);
    expect(splitDamage(2, shares)).toEqual([0, 1, 1]);
  });

  it('the cuts are never closer than the floor, so ×2 does not blur them into one', () => {
    expect(multiHitGap(1)).toBe(MULTI_HIT_GAP_MS);
    expect(multiHitGap(0.5)).toBeGreaterThanOrEqual(MULTI_HIT_GAP_FLOOR_MS);
    expect(multiHitGap(0.25)).toBe(MULTI_HIT_GAP_FLOOR_MS);
  });
});
