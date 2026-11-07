import { describe, it, expect } from 'vitest';
import { MIGRATIONS, SAVE_VERSION, migrateRows } from './saveSchema';
import type { WorldStateRow } from '../memory/types';

/**
 * THE STEPS, WITHOUT A BROWSER IN SIGHT.
 *
 * Every migration is a pure function from rows to rows, which is the
 * property that makes the frightening ones testable: the awkward cases
 * — a save from the future, a row nobody recognises, a step run twice
 * — are three lines each here and an afternoon with a real database.
 */

/** A repair that only ever touches one key, so the plumbing is visible. */
const repair = (key: string, value: unknown) =>
  key === 'lumi' && typeof value !== 'number'
    ? { value: 0, changed: true }
    : { value, changed: false };

const rows = (obj: Record<string, unknown>): WorldStateRow[] =>
  Object.entries(obj).map(([key, value]) => ({ key, value }));

describe('the steps themselves', () => {
  it('run in order and reach the current version with no gaps', () => {
    const reached = MIGRATIONS.map((m) => m.to);
    expect(reached).toEqual([...reached].sort((a, b) => a - b));
    expect(reached[reached.length - 1]).toBe(SAVE_VERSION);
    // Every version from 2 up has a step. A gap means a save at that
    // version would be stamped forward without the work being done.
    for (let v = 2; v <= SAVE_VERSION; v++) {
      expect(reached, `no step produces v${v}`).toContain(v);
    }
  });

  it('each says what it does', () => {
    for (const step of MIGRATIONS) expect(step.describe.length).toBeGreaterThan(10);
  });
});

describe('an old save', () => {
  it('with no version at all is treated as the first one', () => {
    const result = migrateRows(rows({ lumi: 12 }), null, repair);
    expect(result.version).toBe(SAVE_VERSION);
    expect(result.applied.length).toBe(MIGRATIONS.length);
  });

  it('keeps what it holds — nothing is invented and nothing is lost', () => {
    const result = migrateRows(rows({ lumi: 12, inventory: [{ itemId: 'X', quantity: 2 }] }), 1, repair);
    expect(result.rows.find((r) => r.key === 'lumi')?.value).toBe(12);
    expect(result.rows.find((r) => r.key === 'inventory')?.value).toEqual([
      { itemId: 'X', quantity: 2 },
    ]);
  });

  it('is repaired on the way through, and says which rows changed', () => {
    const result = migrateRows(rows({ lumi: 'lots', world_clock: { worldYear: 2 } }), 2, repair);
    expect(result.rows.find((r) => r.key === 'lumi')?.value).toBe(0);
    expect(result.changedKeys).toEqual(['lumi']);
  });
});

describe('a save already at this version', () => {
  it('runs nothing and changes nothing', () => {
    const before = rows({ lumi: 40 });
    const result = migrateRows(before, SAVE_VERSION, repair);
    expect(result.applied).toEqual([]);
    expect(result.changedKeys).toEqual([]);
    expect(result.rows).toEqual(before);
  });
});

describe('a save from a later build', () => {
  /**
   * The dangerous one. An older build must not rewrite a newer save
   * into a shape the newer build no longer understands — the player
   * opened the game on the wrong device, not on a broken save.
   */
  it('is left completely alone and not stamped backwards', () => {
    const before = rows({ lumi: 40, something_new: { we: 'have never heard of this' } });
    const result = migrateRows(before, SAVE_VERSION + 5, repair);
    expect(result.fromTheFuture).toBe(true);
    expect(result.version).toBe(SAVE_VERSION + 5);
    expect(result.applied).toEqual([]);
    expect(result.changedKeys).toEqual([]);
    expect(result.rows).toEqual(before);
  });
});

describe('a row nobody recognises', () => {
  it('survives the whole sequence untouched', () => {
    const future = { key: 'a_row_from_later', value: { deep: [1, 2, 3] } };
    const result = migrateRows([future, { key: 'lumi', value: 5 }], 1, repair);
    expect(result.rows).toContainEqual(future);
  });
});

describe('running it twice', () => {
  it('is the same as running it once', () => {
    const once = migrateRows(rows({ lumi: 'lots' }), 1, repair);
    const twice = migrateRows(once.rows, once.version, repair);
    expect(twice.rows).toEqual(once.rows);
    expect(twice.applied).toEqual([]);
  });
});
