import { describe, expect, it } from 'vitest';
import { MAX_PARTY, PARTY_FORMATIONS, partyFormation } from './formation';

const SIZES = [1, 2, 3, 4] as const;

describe('party formation', () => {
  it('has a place for everybody, at every party size', () => {
    for (const n of SIZES) {
      expect(partyFormation(n)).toHaveLength(n);
    }
  });

  it('draws four at most', () => {
    expect(MAX_PARTY).toBe(4);
    expect(Object.keys(PARTY_FORMATIONS).map(Number).sort()).toEqual([1, 2, 3, 4]);
  });

  /**
   * The one row that is not provisional.
   *
   * These are the numbers the landscape pass settled on for him and
   * her: 25% in and on the ground, and hard against the edge a step
   * back up the path. They were CSS until the party became one drawing,
   * and this is what stops the move from being a redraw.
   */
  it('stands the two of them exactly where the landscape pass put them', () => {
    expect(partyFormation(2)).toEqual([
      { inset: 0.25, bottom: 0.03, depth: 2 },
      { inset: 0.0, bottom: 0.13, depth: 1 },
    ]);
  });

  it('never puts two of them in the same place', () => {
    for (const n of SIZES) {
      const places = partyFormation(n).map((s) => `${s.inset}/${s.bottom}`);
      expect(new Set(places).size).toBe(n);
    }
  });

  it('never gives two of them the same drawing order', () => {
    for (const n of SIZES) {
      const depths = partyFormation(n).map((s) => s.depth);
      expect(new Set(depths).size).toBe(n);
    }
  });

  it('keeps the front rank nearest the enemy and nearest the viewer', () => {
    for (const n of SIZES) {
      const slots = partyFormation(n);
      for (let i = 1; i < slots.length; i += 1) {
        // Further back up the path, and further from the enemy.
        expect(slots[i].inset).toBeLessThan(slots[i - 1].inset);
        expect(slots[i].bottom).toBeGreaterThan(slots[i - 1].bottom);
        expect(slots[i].depth).toBeLessThan(slots[i - 1].depth);
      }
    }
  });

  it('answers a party size it has no row for rather than throwing', () => {
    expect(partyFormation(0)).toHaveLength(1);
    expect(partyFormation(9)).toHaveLength(MAX_PARTY);
  });
});
