import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { IdbMemoryStore, SAVE_SCHEMA_VERSION } from './idbStore';
import type { MemoryEvent } from './types';

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
  it('stamps saveSchemaVersion on first init', async () => {
    const store = freshStore();
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
    await store.clearAll();
    expect(await store.getAll()).toEqual([]);
    store.close();
  });
});
