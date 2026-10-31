// IndexedDB implementation of MemoryEventStore (world canon).
// Schema is shared with the playtest store — see core/memory/idbSchema.

import type { MemoryEvent, MemoryEventStore, WorldStateRow } from './types';
import {
  DB_NAME,
  EVENTS_STORE,
  META_STORE,
  WORLD_STATE_STORE,
  openDatabase,
  promisify,
  txDone,
} from './idbSchema';

export { DB_NAME, DB_VERSION, EVENTS_STORE, META_STORE, WORLD_STATE_STORE } from './idbSchema';

/**
 * Bumped when the shape of saved data changes, not when a store is added.
 *
 * The number and the steps that reach it live together in
 * core/world/saveSchema; this is the name the rest of the code has
 * always used for it.
 */
export { SAVE_VERSION as SAVE_SCHEMA_VERSION } from '../world/saveSchema';

export class IdbMemoryStore implements MemoryEventStore {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;

  constructor(dbName: string = DB_NAME) {
    this.dbName = dbName;
  }

  /**
   * Opens the database. It does NOT touch the version stamp.
   *
   * It used to: every load wrote SAVE_SCHEMA_VERSION over whatever was
   * there, which made the number a record of when the game was last
   * opened rather than of what the data looks like — and a version
   * number that cannot be trusted is worse than none, because things
   * get built on it. Stamping is now the last thing the migration does,
   * after the rows it describes have actually been brought up to date.
   */
  async init(): Promise<void> {
    if (this.db) return;
    this.db = await openDatabase(this.dbName);
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

  async getAllState(): Promise<WorldStateRow[]> {
    const tx = this.requireDb().transaction(WORLD_STATE_STORE, 'readonly');
    const rows = await promisify(tx.objectStore(WORLD_STATE_STORE).getAll());
    return (rows as WorldStateRow[]).filter(
      (row): row is WorldStateRow => !!row && typeof row.key === 'string',
    );
  }

  async getMeta(key: string): Promise<unknown | undefined> {
    const tx = this.requireDb().transaction(META_STORE, 'readonly');
    const row = await promisify(tx.objectStore(META_STORE).get(key));
    return row ? (row as { value: unknown }).value : undefined;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    const tx = this.requireDb().transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put({ key, value });
    await txDone(tx);
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
