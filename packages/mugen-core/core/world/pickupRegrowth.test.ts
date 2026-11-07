import { describe, expect, it } from 'vitest';
import { pickupThere, readRegrowth } from './pickupRegrowth';
import { PICKUP_REGROWTH, regrowthOf } from '../../content/exploration/regrowth';
import { GREENWOOD_WALK } from '../../content/exploration/greenwoodWalk';
import { RUINS_WALK } from '../../content/exploration/ruinsWalk';

describe('things that grow back (2026-10-11)', () => {
  it('never taken: there; taken and not growing back: gone for good', () => {
    expect(pickupThere('ruins_pickup_001', [], {}, 5, null)).toBe(true);
    expect(pickupThere('ruins_pickup_001', ['ruins_pickup_001'], {}, 99, null)).toBe(false);
  });

  it('a herb patch is back two days after it was taken — not before', () => {
    const taken = ['forest_pickup_001'];
    expect(pickupThere('forest_pickup_001', taken, { forest_pickup_001: 4 }, 4, 2)).toBe(false);
    expect(pickupThere('forest_pickup_001', taken, { forest_pickup_001: 4 }, 5, 2)).toBe(false);
    expect(pickupThere('forest_pickup_001', taken, { forest_pickup_001: 4 }, 6, 2)).toBe(true);
    // Taken before the row existed: counted from day 0.
    expect(pickupThere('forest_pickup_001', taken, {}, 2, 2)).toBe(true);
  });

  it('only some of the forest grows back, and nothing in the ruins; the rocks give iron only, never the shard again', () => {
    const forest = GREENWOOD_WALK.roam!.pickups!.map((p) => p.id);
    const ruins = RUINS_WALK.roam!.pickups!.map((p) => p.id);
    for (const id of Object.keys(PICKUP_REGROWTH)) expect(forest).toContain(id);
    for (const id of ruins) expect(regrowthOf(id)).toBeNull();
    expect(regrowthOf('forest_pickup_003')!.items).toEqual([{ itemId: 'IRON_ORE', quantity: 1 }]);
    for (const rule of Object.values(PICKUP_REGROWTH)) {
      expect(rule.days).toBeGreaterThanOrEqual(1);
      expect(rule.days).toBeLessThanOrEqual(2);
      for (const it of rule.items ?? []) expect(['MANA_SHARD', 'ANCIENT_SHARD', 'OLD_COIN']).not.toContain(it.itemId);
    }
  });

  it('the row from a save is repaired, never trusted', () => {
    expect(readRegrowth(null)).toEqual({ value: {}, health: 'ok' });
    expect(readRegrowth([1, 2])).toEqual({ value: {}, health: 'repaired' });
    expect(readRegrowth({ a: 3, b: 'x', c: -1, d: 2.7 })).toEqual({ value: { a: 3, d: 2 }, health: 'repaired' });
    expect(readRegrowth({ a: 3 })).toEqual({ value: { a: 3 }, health: 'ok' });
  });
});
