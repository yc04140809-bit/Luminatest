import { describe, expect, it } from 'vitest';
import { MULTI_HIT, MULTI_HIT_GAP_FLOOR_MS, MULTI_HIT_GAP_MS, multiHitGap, multiHitOf, splitDamage } from './multiHit';
import { SHUNDAN } from '@mugen/content/skills/heroSkills';

// 《瞬断》 three cuts (作者 2026-10-24 A): the same amount, shown as three.

describe('a move of several cuts', () => {
  it('《瞬断》 cuts twice (as many as the fight counts for COMBO — heroSkills SHUNDAN.hits), the second the heavier; every other move once', () => {
    expect(multiHitOf('shundan')).toEqual([0.45, 0.55]);
    expect(multiHitOf('shundan')).toHaveLength(SHUNDAN.hits!);
    expect(multiHitOf('goudan')).toBeNull();
    expect(multiHitOf(undefined)).toBeNull();
    for (const shares of Object.values(MULTI_HIT)) expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('the numbers add up to the amount exactly — the total is never changed (two shares or three)', () => {
    for (const shares of [MULTI_HIT.shundan, [0.3, 0.3, 0.4]]) {
      const n = shares.length;
      for (let total = 0; total <= 999; total++) {
        const parts = splitDamage(total, shares);
        expect(parts).toHaveLength(n);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        for (const p of parts) expect(Number.isInteger(p) && p >= 0).toBe(true);
        // Enough to go round: every cut shows a number, the last at least as big as the others.
        if (total >= n) {
          expect(Math.min(...parts)).toBeGreaterThanOrEqual(1);
          expect(parts[n - 1]).toBeGreaterThanOrEqual(Math.max(...parts.slice(0, -1)));
        }
      }
    }
    expect(splitDamage(40, MULTI_HIT.shundan)).toEqual([18, 22]);
    expect(splitDamage(40, [0.3, 0.3, 0.4])).toEqual([12, 12, 16]);
    expect(splitDamage(2, [0.3, 0.3, 0.4])).toEqual([0, 1, 1]);
  });

  it('the cuts are never closer than the floor, so ×2 does not blur them into one', () => {
    expect(multiHitGap(1)).toBe(MULTI_HIT_GAP_MS);
    expect(multiHitGap(0.5)).toBeGreaterThanOrEqual(MULTI_HIT_GAP_FLOOR_MS);
    expect(multiHitGap(0.25)).toBe(MULTI_HIT_GAP_FLOOR_MS);
  });
});
