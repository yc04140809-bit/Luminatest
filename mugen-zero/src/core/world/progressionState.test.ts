import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import { MAX_LEVEL, expForLevel } from '../progression/levelCurve';

/**
 * LEVEL ON THE WORLD'S SIDE: what is written, what is refused, what
 * survives a reload, and what a reset takes with it.
 */

let dbCounter = 0;
const freshDbName = () => `progression-test-${++dbCounter}`;
const openWorld = (dbName: string) => World.open(new IdbMemoryStore(dbName));

async function putRaw(dbName: string, key: string, value: unknown): Promise<void> {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readwrite');
  tx.objectStore(WORLD_STATE_STORE).put({ key, value });
  await txDone(tx);
  db.close();
}

describe('a world nobody has fought in', () => {
  it('has everybody at level one with nothing earned', async () => {
    const world = await openWorld(freshDbName());
    expect(world.getLevel('hero')).toBe(1);
    expect(world.getProgress('kaos')).toEqual({ level: 1, totalExp: 0 });
    // Including somebody who does not exist: a level is never missing.
    expect(world.getLevel('nobody')).toBe(1);
  });
});

describe('earning it', () => {
  it('is remembered after the game is closed and opened again', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.grantExp('hero', 7);
    await world.grantExp('hero', 5);
    expect(world.getProgress('hero').totalExp).toBe(12);

    const reopened = await openWorld(dbName);
    expect(reopened.getProgress('hero').totalExp).toBe(12);
  });

  it('says what the gain did', async () => {
    const world = await openWorld(freshDbName());
    const quiet = await world.grantExp('hero', 1);
    expect(quiet.levelsGained).toBe(0);
    expect(quiet.from).toBe(1);

    const loud = await world.grantExp('hero', expForLevel(4));
    expect(loud.levelsGained).toBeGreaterThan(0);
    expect(loud.to).toBe(world.getLevel('hero'));
  });

  it('keeps each of them separate', async () => {
    const world = await openWorld(freshDbName());
    await world.grantExp('hero', expForLevel(3));
    expect(world.getLevel('hero')).toBe(3);
    expect(world.getLevel('kaos'), 'she was not in that fight').toBe(1);
  });

  /** Nothing earned is not an event: nothing saved, nothing announced. */
  it('does not announce a gain of nothing', async () => {
    const world = await openWorld(freshDbName());
    const before = world.getVersion();
    for (const bad of [0, -20, Number.NaN]) {
      expect((await world.grantExp('hero', bad)).earned, String(bad)).toBe(0);
    }
    expect(world.getVersion()).toBe(before);
    expect(world.getProgress('hero').totalExp).toBe(0);
  });

  it('cannot be poured past the ceiling', async () => {
    const world = await openWorld(freshDbName());
    await world.grantExp('hero', Number.MAX_SAFE_INTEGER);
    expect(world.getLevel('hero')).toBe(MAX_LEVEL);
    expect((await world.grantExp('hero', 1000)).earned).toBe(0);
  });
});

describe('a save written before any of this existed', () => {
  it('opens at level one rather than broken', async () => {
    const dbName = freshDbName();
    const first = await openWorld(dbName);
    await first.markExperienceSeen('anything');

    const reopened = await openWorld(dbName);
    expect(reopened.getLevel('hero')).toBe(1);
    expect((await reopened.grantExp('hero', 30)).earned).toBe(30);
  });

  it('repairs a row whose level disagrees with its total', async () => {
    const dbName = freshDbName();
    await openWorld(dbName);
    await putRaw(dbName, 'progression', {
      hero: { level: 60, totalExp: 0 },
      kaos: { level: 1, totalExp: expForLevel(4) },
      '': { level: 9, totalExp: 9 },
    });
    const world = await openWorld(dbName);
    expect(world.getLevel('hero'), 'a level is a cache of the total').toBe(1);
    expect(world.getLevel('kaos')).toBe(4);
    expect(Object.keys(world.getProgress('hero'))).toEqual(['level', 'totalExp']);
  });
});

describe('RESET WORLD', () => {
  it('takes the levels with everything else', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.grantExp('hero', expForLevel(6));
    await world.resetWorld();
    expect(world.getLevel('hero')).toBe(1);
    expect((await openWorld(dbName)).getLevel('hero')).toBe(1);
  });
});
