// Shared IndexedDB schema for MUGEN ZERO.
//
// Two stores live in the same database — world history (the canon) and
// playtest feedback (not canon). They must agree on the version and the
// upgrade path, or opening one would block the other.

export const DB_NAME = 'mugen-zero-save';
/** v1 events+meta, v2 world_state, v3 playtest_feedback. */
export const DB_VERSION = 3;

export const EVENTS_STORE = 'memory_events';
export const META_STORE = 'meta';
export const WORLD_STATE_STORE = 'world_state';
export const FEEDBACK_STORE = 'playtest_feedback';

/**
 * Creates any missing object store. Only ever additive: existing stores
 * and their contents are left untouched, so an older save survives.
 */
export function upgradeSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(EVENTS_STORE)) {
    db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(META_STORE)) {
    db.createObjectStore(META_STORE, { keyPath: 'key' });
  }
  if (!db.objectStoreNames.contains(WORLD_STATE_STORE)) {
    db.createObjectStore(WORLD_STATE_STORE, { keyPath: 'key' });
  }
  if (!db.objectStoreNames.contains(FEEDBACK_STORE)) {
    const store = db.createObjectStore(FEEDBACK_STORE, { keyPath: 'id' });
    store.createIndex('playSessionId', 'playSessionId', { unique: false });
  }
}

/** Opens the shared database, applying the schema on first use. */
export function openDatabase(dbName: string = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.onupgradeneeded = () => upgradeSchema(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolves once the transaction has durably committed. */
export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}
