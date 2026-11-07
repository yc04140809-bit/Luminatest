// WHAT VERSION A SAVE IS, AND HOW IT GETS TO THIS ONE.
//
// A save is a set of rows in `world_state`, and the shape of those rows
// has changed twice and will change again. Before this module there was
// a version number and a comment saying "no migration engine yet": the
// number was stamped forward on every load whatever it said, which
// means it recorded when the game was last opened rather than what the
// data looks like. That is a version number that cannot be used for
// anything, which is the same as not having one.
//
// So: STEPS, IN ORDER, EACH DOING ONE THING. A save at v1 opened by a
// build at v3 runs 1->2 and then 2->3, in that order, and a save
// already at v3 runs nothing. Every step is a pure function from rows
// to rows, which is what makes the awkward ones testable without a
// browser anywhere near them.
//
// TWO RULES THE STEPS LIVE BY:
//
//   A missing field is not a migration. Every reader in the game
//   already treats an absent row as "a new world has none of this", so
//   a save from before a feature existed needs no step at all — which
//   is why 1->2 does nothing, and says so, rather than being left out
//   and leaving a hole in the sequence.
//
//   A step never deletes what it does not recognise. A row this build
//   has never heard of belongs to a build that is newer than this one,
//   and dropping it would mean opening the game on an old version
//   quietly ate part of somebody's world.

import type { WorldStateRow } from '../memory/types';

/**
 * The version this build writes.
 *
 * 1  events + meta only.
 * 2  world_state arrives. Nothing moved: absent rows already read as
 *    the defaults a new world has.
 * 3  every known row is read through the validating readers and written
 *    back repaired, so damage is fixed once instead of being worked
 *    around on every single load.
 */
export const SAVE_VERSION = 3;

/** Repairs one row, or says it cannot. Supplied by whoever knows the keys. */
export type RepairRow = (key: string, value: unknown) => { value: unknown; changed: boolean };

export interface SaveMigration {
  /** The version this step produces. */
  to: number;
  describe: string;
  run(rows: readonly WorldStateRow[], repair: RepairRow): WorldStateRow[];
}

export const MIGRATIONS: readonly SaveMigration[] = [
  {
    to: 2,
    describe: 'world_state introduced — absent rows already read as a new world',
    // DELIBERATELY NOTHING. A v1 save has no world_state rows at all,
    // and "no row" is exactly what every reader in the game treats as
    // the starting value. Writing defaults in here would turn an empty
    // save into a save full of zeroes, which is more data saying the
    // same thing and one more shape to get wrong later.
    run: (rows) => [...rows],
  },
  {
    to: 3,
    describe: 'repair damaged rows in place',
    run: (rows, repair) =>
      rows.map((row) => {
        const fixed = repair(row.key, row.value);
        return fixed.changed ? { key: row.key, value: fixed.value } : row;
      }),
  },
];

export interface MigrationResult {
  rows: WorldStateRow[];
  /** The version the rows are at now. */
  version: number;
  /** What ran, in order, for the report and the log. */
  applied: string[];
  /** Rows that actually changed, by key. Nothing else need be written. */
  changedKeys: string[];
  /**
   * True when the save says it was written by a LATER build than this.
   *
   * Nothing is run and nothing is stamped in that case: a newer save is
   * not damaged, it is from the future, and the worst thing an older
   * build can do is rewrite it into a shape the newer one no longer
   * understands. It is read as best it can be and left alone.
   */
  fromTheFuture: boolean;
}

/**
 * Brings a set of rows up to `SAVE_VERSION`, one step at a time.
 *
 * Pure: no IndexedDB, no clock, no randomness. Give it rows and a
 * version and it tells you what the rows should be and what it did.
 */
export function migrateRows(
  rows: readonly WorldStateRow[],
  from: number | null,
  repair: RepairRow,
): MigrationResult {
  // A save with no version stamp at all is v1 — the only build that
  // ever wrote one was the build before the stamp existed.
  const start = typeof from === 'number' && Number.isFinite(from) ? Math.floor(from) : 1;
  if (start > SAVE_VERSION) {
    return {
      rows: [...rows],
      version: start,
      applied: [],
      changedKeys: [],
      fromTheFuture: true,
    };
  }

  let current = [...rows];
  const applied: string[] = [];
  for (const step of MIGRATIONS) {
    if (step.to <= start) continue;
    current = step.run(current, repair);
    applied.push(`${step.to - 1} -> ${step.to}: ${step.describe}`);
  }

  const before = new Map(rows.map((row) => [row.key, row.value]));
  const changedKeys = current
    .filter((row) => !Object.is(before.get(row.key), row.value))
    .map((row) => row.key);

  return { rows: current, version: SAVE_VERSION, applied, changedKeys, fromTheFuture: false };
}
