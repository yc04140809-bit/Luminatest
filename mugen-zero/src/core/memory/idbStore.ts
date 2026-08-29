// IndexedDB implementation of MemoryEventStore.
// The only module in the codebase that talks to IndexedDB.

import type { MemoryEvent, MemoryEventStore } from './types';

export const DB_NAME = 'mugen-zero-save';
export const DB_VERSION = 1;
export const EVENTS_STORE = 'memory_events';
export const META_STORE = 'meta';
export const SAVE_SCHEMA_VERSION = 1;

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
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });

    // Stamp the schema version on first run. No migration engine yet —
    // a newer-than-known save is only warned about.
    const tx = this.db.transaction(META_STORE, 'readwrite');
    const meta = tx.objectStore(META_STORE);
    const existing = await promisify(meta.get('saveSchemaVersion'));
    if (!existing) {
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
    const tx = this.requireDb().transaction(EVENTS_STORE, 'readwrite');
    // add() (not put) — the DB itself rejects a duplicate id, so a past
    // fact can never be silently overwritten.
    tx.objectStore(EVENTS_STORE).add(event);
    await txDone(tx);
  }

  async clearAll(): Promise<void> {
    const tx = this.requireDb().transaction([EVENTS_STORE, META_STORE], 'readwrite');
    tx.objectStore(EVENTS_STORE).clear();
    tx.objectStore(META_STORE).clear();
    await txDone(tx);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
