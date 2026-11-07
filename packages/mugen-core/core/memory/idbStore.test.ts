import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { IdbMemoryStore, SAVE_SCHEMA_VERSION } from './idbStore';
import type { MemoryEvent } from './types';
import { World } from '../world/world';

let dbCounter = 0;
function freshStore(): IdbMemoryStore {
  return new IdbMemoryStore(`test-db-${++dbCounter}`);
}

function sampleEvent(overrides: Partial<MemoryEvent> = {}): MemoryEvent {
  return {
    id: 'evt_test',
    type: 'PLAYER_SPARED_GALD',
    worldYear: 1,
    worldDay: 1,
    location: 'GREENWOOD_FOREST',
    actors: ['PLAYER', 'GALD'],
    importance: 'MAJOR',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('IdbMemoryStore', () => {
  /**
   * OPENING IS NOT MIGRATING, and this used to be one thing.
   *
   * `init` stamped the current version over whatever was there, on
   * every single load, before anything had looked at the rows it was
   * making a claim about. That made the number a record of when the
   * game was last opened rather than of what the data looks like. The
   * stamp is now the LAST thing the migration does, and this test is
   * the guard that keeps the two apart.
   */
  it('does not stamp a version on init — migrating does that', async () => {
    const store = freshStore();
    await store.init();
    expect(await store.getSchemaVersion()).toBeNull();
    store.close();
  });

  it('stamps the version once a world has actually been opened', async () => {
    const name = `test-db-${++dbCounter}`;
    const world = await World.open(new IdbMemoryStore(name));
    expect(world.getSaveHealth().version).toBe(SAVE_SCHEMA_VERSION);
    const store = new IdbMemoryStore(name);
    await store.init();
    expect(await store.getSchemaVersion()).toBe(SAVE_SCHEMA_VERSION);
    store.close();
  });

  it('persists an added event and returns it via getAll', async () => {
    const store = freshStore();
    await store.init();
    const event = sampleEvent();
    await store.add(event);
    expect(await store.getAll()).toEqual([event]);
    store.close();
  });

  it('rejects a duplicate event id (write-once history)', async () => {
    const store = freshStore();
    await store.init();
    await store.add(sampleEvent());
    await expect(store.add(sampleEvent({ type: 'PLAYER_KILLED_GALD' }))).rejects.toBeTruthy();
    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].type).toBe('PLAYER_SPARED_GALD');
    store.close();
  });

  it('keeps data across a close and reopen of the same database', async () => {
    const dbName = `test-db-reopen-${++dbCounter}`;
    const first = new IdbMemoryStore(dbName);
    await first.init();
    await first.add(sampleEvent());
    first.close();

    const second = new IdbMemoryStore(dbName);
    await second.init();
    expect(await second.getAll()).toHaveLength(1);
    second.close();
  });

  it('clearAll removes all saved data', async () => {
    const store = freshStore();
    await store.init();
    await store.add(sampleEvent());
    await store.commit({ putState: [{ key: 'world_clock', value: { worldYear: 1, worldDay: 5 } }] });
    await store.clearAll();
    expect(await store.getAll()).toEqual([]);
    expect(await store.getStateValue('world_clock')).toBeUndefined();
    store.close();
  });

  it('commit persists events and state rows together', async () => {
    const store = freshStore();
    await store.init();
    const event = sampleEvent();
    await store.commit({
      addEvents: [event],
      putState: [{ key: 'world_clock', value: { worldYear: 1, worldDay: 2 } }],
    });
    expect(await store.getAll()).toEqual([event]);
    expect(await store.getStateValue('world_clock')).toEqual({ worldYear: 1, worldDay: 2 });
    store.close();
  });

  it('commit deletes events atomically with other writes (dev reset path)', async () => {
    const store = freshStore();
    await store.init();
    await store.add(sampleEvent());
    await store.commit({
      deleteEventIds: ['evt_test'],
      putState: [{ key: 'character_GALD', value: { age: 27 } }],
    });
    expect(await store.getAll()).toEqual([]);
    expect(await store.getStateValue('character_GALD')).toEqual({ age: 27 });
    store.close();
  });

  it('commit is atomic: a duplicate event id rolls back the state write too', async () => {
    const store = freshStore();
    await store.init();
    await store.add(sampleEvent());
    await store.commit({ putState: [{ key: 'world_clock', value: { worldYear: 1, worldDay: 1 } }] });

    await expect(
      store.commit({
        addEvents: [sampleEvent({ type: 'PLAYER_KILLED_GALD' })], // same id -> abort
        putState: [{ key: 'world_clock', value: { worldYear: 9, worldDay: 9 } }],
      }),
    ).rejects.toBeTruthy();

    // Neither half of the failed commit is visible.
    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].type).toBe('PLAYER_SPARED_GALD');
    expect(await store.getStateValue('world_clock')).toEqual({ worldYear: 1, worldDay: 1 });
    store.close();
  });
});
