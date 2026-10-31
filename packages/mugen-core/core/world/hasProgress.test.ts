import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';

/**
 * 「つづきから」 — the one question the title asks the world.
 *
 * Getting this wrong towards "no" is the worst answer the game can
 * give: it offers a new game to somebody who already has one, and if
 * they take it, everything they had is gone. So every one of these is
 * a way a player can have been playing, and each is asked on its own —
 * with nothing else set — because the point is that none of them needs
 * any of the others to count.
 */

let dbCounter = 0;
const freshDbName = () => `has-progress-test-${++dbCounter}`;

async function putRaw(dbName: string, rows: Record<string, unknown>): Promise<void> {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readwrite');
  for (const [key, value] of Object.entries(rows)) {
    tx.objectStore(WORLD_STATE_STORE).put({ key, value });
  }
  await txDone(tx);
  db.close();
}

/** Writes rows straight into a save, then opens it as a returning player would. */
async function worldHolding(rows: Record<string, unknown>): Promise<World> {
  const dbName = freshDbName();
  // Opened once so the stores exist, exactly as a first run makes them.
  const first = await World.open(new IdbMemoryStore(dbName));
  expect(first.hasProgress(), 'a brand new world is empty').toBe(false);
  await putRaw(dbName, rows);
  return World.open(new IdbMemoryStore(dbName));
}

describe('a world nobody has touched', () => {
  it('is not offered back', async () => {
    const world = await World.open(new IdbMemoryStore(freshDbName()));
    expect(world.hasProgress()).toBe(false);
  });
});

describe('what counts as having played', () => {
  it('LUMI in the purse', async () => {
    const world = await worldHolding({ lumi: 1 });
    expect(world.getLumi()).toBe(1);
    expect(world.hasProgress()).toBe(true);
  });

  it('anything in the bag', async () => {
    const world = await worldHolding({ inventory: [{ itemId: 'FOREST_HERB', quantity: 1 }] });
    expect(world.hasProgress()).toBe(true);
  });

  it('experience earned, even without a level to show for it', async () => {
    const world = await worldHolding({ progression: { hero: { level: 1, totalExp: 3 } } });
    expect(world.getLevel('hero'), 'three EXP is not a level yet').toBe(1);
    expect(world.hasProgress()).toBe(true);
  });

  it('a level reached', async () => {
    const world = await worldHolding({ progression: { kaos: { level: 4, totalExp: 80 } } });
    expect(world.hasProgress()).toBe(true);
  });

  it('a story that has moved', async () => {
    const before = await World.open(new IdbMemoryStore(freshDbName()));
    const gald = before.getCharacter('GALD');
    expect(gald, 'the cast is there to begin with').not.toBeNull();
    const world = await worldHolding({
      character_GALD: { ...gald, status: 'dead' },
    });
    expect(world.hasProgress()).toBe(true);
  });

  it('a clock that has moved', async () => {
    const world = await worldHolding({ world_clock: { worldYear: 3, worldDay: 1 } });
    expect(world.hasProgress()).toBe(true);
  });
});

describe('what does not count', () => {
  /**
   * The bug this test is really about: a save whose rows exist but hold
   * exactly the starting values. Writing a zero is not playing.
   */
  it('rows that say nothing has happened', async () => {
    const world = await worldHolding({
      lumi: 0,
      inventory: [],
      progression: { hero: { level: 1, totalExp: 0 }, kaos: { level: 1, totalExp: 0 } },
      claimed_rewards: [],
    });
    expect(world.hasProgress()).toBe(false);
  });

  it('a character row identical to the one the world starts with', async () => {
    const before = await World.open(new IdbMemoryStore(freshDbName()));
    const world = await worldHolding({ character_GALD: before.getCharacter('GALD') });
    expect(world.hasProgress()).toBe(false);
  });

  /**
   * SETTINGS ARE NOT A PLAYTHROUGH. They do not live in the world at
   * all — volume, the opening theme and the battle-UI switch are in
   * localStorage — so this is really an assertion that they stayed
   * there. If somebody ever moves a setting into the save, this is the
   * test that should stop them.
   */
  it('nothing in the save is a setting', async () => {
    const dbName = freshDbName();
    await World.open(new IdbMemoryStore(dbName));
    const db = await openDatabase(dbName);
    const tx = db.transaction(WORLD_STATE_STORE, 'readonly');
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const rq = tx.objectStore(WORLD_STATE_STORE).getAllKeys();
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    });
    db.close();
    expect(keys.filter((k) => /volume|theme|setting|ui_/i.test(String(k)))).toEqual([]);
  });
});

describe('a legacy save', () => {
  /**
   * The compatibility that matters: a save written before the purse,
   * the bag and the levels existed. It has none of those rows, and it
   * must read as "nothing there" rather than as damage.
   */
  it('with none of the new rows is still judged on what it does have', async () => {
    const empty = await worldHolding({ world_clock: { worldYear: 1, worldDay: 1 } });
    expect(empty.hasProgress(), 'day one of year one is where everyone starts').toBe(false);

    const lived = await worldHolding({ world_clock: { worldYear: 1, worldDay: 9 } });
    expect(lived.hasProgress()).toBe(true);
  });
});
