// IndexedDB implementation of MemoryEventStore.
// The only module in the codebase that talks to IndexedDB.

import type { MemoryEvent, MemoryEventStore, WorldStateRow } from './types';

export const DB_NAME = 'mugen-zero-save';
export const DB_VERSION = 2;
export const EVENTS_STORE = 'memory_events';
export const META_STORE = 'meta';
export const WORLD_STATE_STORE = 'world_state';
export const SAVE_SCHEMA_VERSION = 2;

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolves once the transaction has durably committed. */
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export class IdbMemoryStore implements MemoryEventStore {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;

  constructor(dbName: string = DB_NAME) {
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    if (this.db) return;
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(this.dbName, DB_VERSION);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains(EVENTS_STORE)) {
          db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
        // v2: current world state (clock, character states).
        if (!db.objectStoreNames.contains(WORLD_STATE_STORE)) {
          db.createObjectStore(WORLD_STATE_STORE, { keyPath: 'key' });
        }
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });

    // Stamp / upgrade the schema version. No migration engine yet —
    // v1 saves only lacked the world_state store (absent rows fall back
    // to defaults), so stamping forward is the whole migration.
    const tx = this.db.transaction(META_STORE, 'readwrite');
    const meta = tx.objectStore(META_STORE);
    const existing = await promisify(meta.get('saveSchemaVersion'));
    if (!existing || existing.value < SAVE_SCHEMA_VERSION) {
      meta.put({ key: 'saveSchemaVersion', value: SAVE_SCHEMA_VERSION });
    } else if (existing.value > SAVE_SCHEMA_VERSION) {
      console.warn(
        `Save schema version ${existing.value} is newer than supported ${SAVE_SCHEMA_VERSION}`,
      );
    }
    await txDone(tx);
  }

  private requireDb(): IDBDatabase {
    if (!this.db) throw new Error('IdbMemoryStore not initialized — call init() first');
    return this.db;
  }

  async getSchemaVersion(): Promise<number | null> {
    const tx = this.requireDb().transaction(META_STORE, 'readonly');
    const row = await promisify(tx.objectStore(META_STORE).get('saveSchemaVersion'));
    return row ? row.value : null;
  }

  async getAll(): Promise<MemoryEvent[]> {
    const tx = this.requireDb().transaction(EVENTS_STORE, 'readonly');
    return promisify(tx.objectStore(EVENTS_STORE).getAll());
  }

  async add(event: MemoryEvent): Promise<void> {
    await this.commit({ addEvents: [event] });
  }

  async commit(changes: {
    addEvents?: MemoryEvent[];
    putState?: WorldStateRow[];
    deleteEventIds?: string[];
  }): Promise<void> {
    const { addEvents = [], putState = [], deleteEventIds = [] } = changes;
    if (addEvents.length === 0 && putState.length === 0 && deleteEventIds.length === 0) return;

    // One transaction over both stores: new past facts and the updated
    // current state land together, or not at all.
    const tx = this.requireDb().transaction([EVENTS_STORE, WORLD_STATE_STORE], 'readwrite');
    const events = tx.objectStore(EVENTS_STORE);
    for (const id of deleteEventIds) {
      events.delete(id);
    }
    for (const event of addEvents) {
      // add() (not put) — the DB itself rejects a duplicate id, so a past
      // fact can never be silently overwritten; the abort rolls back the
      // whole commit, state rows included.
      events.add(event);
    }
    const state = tx.objectStore(WORLD_STATE_STORE);
    for (const row of putState) {
      state.put(row);
    }
    await txDone(tx);
  }

  async getStateValue(key: string): Promise<unknown | undefined> {
    const tx = this.requireDb().transaction(WORLD_STATE_STORE, 'readonly');
    const row = await promisify(tx.objectStore(WORLD_STATE_STORE).get(key));
    return row ? (row as WorldStateRow).value : undefined;
  }

  async clearAll(): Promise<void> {
    const tx = this.requireDb().transaction(
      [EVENTS_STORE, META_STORE, WORLD_STATE_STORE],
      'readwrite',
    );
    tx.objectStore(EVENTS_STORE).clear();
    tx.objectStore(META_STORE).clear();
    tx.objectStore(WORLD_STATE_STORE).clear();
    await txDone(tx);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
