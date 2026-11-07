import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore, META_STORE, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import { SAVE_VERSION } from './saveSchema';

/**
 * A SAVE THAT HAS SOMETHING WRONG WITH IT.
 *
 * Every one of these opens a real database, damages it the way a real
 * save gets damaged — a truncated write, a hand-edited row, a value
 * from a build that no longer exists — and then asks the one question
 * that matters: is the player's world still there?
 *
 * The answer is never "here is a new game". That is the failure mode
 * this whole layer exists to make impossible.
 */

let dbCounter = 0;
const freshDbName = () => `recovery-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));

async function put(dbName: string, store: string, rows: { key: string; value: unknown }[]) {
  const db = await openDatabase(dbName);
  const tx = db.transaction(store, 'readwrite');
  for (const row of rows) tx.objectStore(store).put(row);
  await txDone(tx);
  db.close();
}

async function read(dbName: string, store: string, key: string): Promise<unknown> {
  const db = await openDatabase(dbName);
  const tx = db.transaction(store, 'readonly');
  const value = await new Promise<unknown>((resolve, reject) => {
    const rq = tx.objectStore(store).get(key);
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
  db.close();
  return value;
}

/** A world that has been played in, closed cleanly, and is worth keeping. */
async function aPlayedWorld(dbName: string): Promise<void> {
  const world = await open(dbName);
  await world.addLumi(140);
  await world.grantExp('hero', 60);
  await world.advanceDay();
  // Opened again so the clean state becomes the backup.
  const again = await open(dbName);
  expect(again.getSaveHealth().health).toBe('ok');
}

describe('a save with nothing wrong', () => {
  it('reports itself healthy and stamps the current version', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    const health = world.getSaveHealth();
    expect(health.health).toBe('ok');
    expect(health.version).toBe(SAVE_VERSION);
    expect(health.unreadableKeys).toEqual([]);
    expect(await read(dbName, META_STORE, 'saveSchemaVersion')).toEqual({
      key: 'saveSchemaVersion',
      value: SAVE_VERSION,
    });
  });

  it('becomes the copy the next load can fall back to', async () => {
    const dbName = freshDbName();
    await aPlayedWorld(dbName);
    const backup = (await read(dbName, META_STORE, 'worldBackup')) as
      | { value: { rows: { key: string; value: unknown }[] } }
      | undefined;
    expect(backup, 'a clean load leaves a copy behind').toBeTruthy();
    expect(backup!.value.rows.find((r) => r.key === 'lumi')?.value).toBe(140);
  });
});

describe('a row with something wrong inside it', () => {
  it('is repaired downward, never upward', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, WORLD_STATE_STORE, [
      { key: 'lumi', value: -9999 },
      { key: 'inventory', value: [{ itemId: 'FOREST_HERB', quantity: Number.NaN }] },
    ]);
    const world = await open(dbName);
    expect(world.getLumi(), 'a purse never goes negative').toBe(0);
    expect(world.getInventory(), 'a quantity nobody can read is not an item').toEqual([]);
    expect(world.getSaveHealth().health).toBe('repaired');
  });

  it('is written back repaired, so it is fixed once rather than every load', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, WORLD_STATE_STORE, [{ key: 'lumi', value: -5 }]);
    await open(dbName);
    expect(await read(dbName, WORLD_STATE_STORE, 'lumi')).toEqual({ key: 'lumi', value: 0 });
    // And the second load has nothing left to say about it.
    const second = await open(dbName);
    expect(second.getSaveHealth().repairedKeys).toEqual([]);
  });

  it('keeps the year when only the day is broken', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, WORLD_STATE_STORE, [
      { key: 'world_clock', value: { worldYear: 4, worldDay: Number.NaN } },
    ]);
    const world = await open(dbName);
    expect(world.getClock().worldYear, 'four years are not lost over a bad day').toBe(4);
    expect(world.getClock().worldDay).toBe(1);
  });

  /** Damage must never be a way to get something for nothing. */
  it('cannot be used to invent a level', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, WORLD_STATE_STORE, [
      { key: 'progression', value: { hero: { level: 90, totalExp: 3 } } },
    ]);
    const world = await open(dbName);
    expect(world.getLevel('hero'), 'the level is derived from the total, not believed').toBe(1);
  });
});

describe('a row that is not that kind of thing at all', () => {
  it('falls back to the last copy that loaded cleanly', async () => {
    const dbName = freshDbName();
    await aPlayedWorld(dbName);
    // The kind of damage a half-finished write leaves behind.
    await put(dbName, WORLD_STATE_STORE, [
      { key: 'world_clock', value: 'undefined' },
      { key: 'lumi', value: { broken: true } },
    ]);
    const world = await open(dbName);
    expect(world.getSaveHealth().recoveredFromBackup).toBe(true);
    expect(world.getLumi(), 'the purse came back').toBe(140);
    expect(world.getLevel('hero')).toBeGreaterThan(1);
  });

  it('keeps the damaged rows rather than throwing them away', async () => {
    const dbName = freshDbName();
    await aPlayedWorld(dbName);
    await put(dbName, WORLD_STATE_STORE, [{ key: 'lumi', value: 'gone' }]);
    await open(dbName);
    const damaged = (await read(dbName, META_STORE, 'worldDamaged')) as
      | { value: { rows: { key: string; value: unknown }[]; unreadableKeys: string[] } }
      | undefined;
    expect(damaged, 'nothing is ever silently destroyed').toBeTruthy();
    expect(damaged!.value.unreadableKeys).toContain('lumi');
    expect(damaged!.value.rows.find((r) => r.key === 'lumi')?.value).toBe('gone');
  });

  /**
   * THE ONE THAT MUST NOT HAPPEN. With no backup to reach for, a
   * damaged save still opens — as much of it as could be read — rather
   * than handing the player an empty world.
   */
  it('with no backup, opens anyway and keeps everything else', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.addLumi(75);
    await put(dbName, WORLD_STATE_STORE, [{ key: 'world_clock', value: 'nonsense' }]);
    const damaged = await open(dbName);
    expect(damaged.getSaveHealth().recoveredFromBackup).toBe(false);
    expect(damaged.getLumi(), 'the rest of the world is still there').toBe(75);
    expect(damaged.getClock()).toEqual({ worldYear: 1, worldDay: 1 });
    expect(damaged.hasProgress(), 'and it is still offered back').toBe(true);
  });

  it('does not swap to a backup that is no better', async () => {
    const dbName = freshDbName();
    await open(dbName);
    // A backup as broken as the save it would be rescuing.
    await put(dbName, META_STORE, [
      { key: 'worldBackup', value: { rows: [{ key: 'lumi', value: 'also broken' }] } },
    ]);
    await put(dbName, WORLD_STATE_STORE, [{ key: 'lumi', value: 'broken' }]);
    const world = await open(dbName);
    expect(world.getSaveHealth().recoveredFromBackup).toBe(false);
  });
});

describe('a save written by a later build', () => {
  it('is read as best it can be and never rewritten', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, WORLD_STATE_STORE, [
      { key: 'lumi', value: 31 },
      { key: 'a_row_from_later', value: { deep: true } },
    ]);
    await put(dbName, META_STORE, [{ key: 'saveSchemaVersion', value: SAVE_VERSION + 4 }]);

    const world = await open(dbName);
    expect(world.getSaveHealth().fromTheFuture).toBe(true);
    expect(world.getLumi()).toBe(31);
    // Not stamped backwards, and the row from the future is still there.
    expect(await read(dbName, META_STORE, 'saveSchemaVersion')).toEqual({
      key: 'saveSchemaVersion',
      value: SAVE_VERSION + 4,
    });
    expect(await read(dbName, WORLD_STATE_STORE, 'a_row_from_later')).toEqual({
      key: 'a_row_from_later',
      value: { deep: true },
    });
  });
});

describe('a row from a build that is only slightly later', () => {
  it('survives a round trip through this one', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await put(dbName, WORLD_STATE_STORE, [{ key: 'something_new', value: [1, 2, 3] }]);
    const reopened = await open(dbName);
    // Played in, which rewrites rows around it.
    await reopened.addLumi(5);
    expect(await read(dbName, WORLD_STATE_STORE, 'something_new')).toEqual({
      key: 'something_new',
      value: [1, 2, 3],
    });
    expect(world.getSaveHealth().version).toBe(SAVE_VERSION);
  });
});

describe('a legacy save', () => {
  it('missing every row this build added still opens with its own history', async () => {
    const dbName = freshDbName();
    await open(dbName);
    // Exactly what a save from before the purse, the bag and the levels
    // looks like: the old rows and nothing else.
    const db = await openDatabase(dbName);
    const tx = db.transaction([WORLD_STATE_STORE, META_STORE], 'readwrite');
    tx.objectStore(WORLD_STATE_STORE).clear();
    tx.objectStore(META_STORE).clear();
    tx.objectStore(WORLD_STATE_STORE).put({ key: 'world_clock', value: { worldYear: 2, worldDay: 6 } });
    await txDone(tx);
    db.close();

    const world = await open(dbName);
    expect(world.getClock()).toEqual({ worldYear: 2, worldDay: 6 });
    expect(world.getLumi()).toBe(0);
    expect(world.getInventory()).toEqual([]);
    expect(world.getLevel('hero')).toBe(1);
    expect(world.hasProgress()).toBe(true);
    expect(world.getSaveHealth().unreadableKeys).toEqual([]);
    expect(world.getSaveHealth().migrationsApplied.length).toBeGreaterThan(0);
  });
});

describe('a reset', () => {
  it('takes the world with it and leaves nothing to recover', async () => {
    const dbName = freshDbName();
    await aPlayedWorld(dbName);
    const world = await open(dbName);
    await world.resetWorld();
    const after = await open(dbName);
    expect(after.hasProgress()).toBe(false);
    expect(after.getLumi()).toBe(0);
  });
});

describe('looking at what could not be read', () => {
  /**
   * The point of keeping the damaged rows is being able to look at
   * them. Evidence nobody can read is the same as no evidence.
   */
  it('hands back the rows and the reason, for the developer panel', async () => {
    const dbName = freshDbName();
    await aPlayedWorld(dbName);
    await put(dbName, WORLD_STATE_STORE, [{ key: 'lumi', value: 'gone' }]);
    const world = await open(dbName);
    expect(world.getSaveHealth().recoveredFromBackup).toBe(true);

    const damaged = await world.getDamagedRows();
    expect(damaged).not.toBeNull();
    expect(damaged!.unreadableKeys).toContain('lumi');
    expect(damaged!.rows.find((r) => r.key === 'lumi')?.value).toBe('gone');
    expect(Date.parse(damaged!.savedAt)).not.toBeNaN();
  });

  it('says nothing at all about a save that has never been damaged', async () => {
    const world = await open(freshDbName());
    expect(await world.getDamagedRows()).toBeNull();
  });

  it('forgets them once somebody has actually looked', async () => {
    const dbName = freshDbName();
    await aPlayedWorld(dbName);
    await put(dbName, WORLD_STATE_STORE, [{ key: 'lumi', value: 'gone' }]);
    const world = await open(dbName);
    expect(await world.getDamagedRows()).not.toBeNull();
    await world.clearDamagedRows();
    expect(await world.getDamagedRows()).toBeNull();
  });
});
