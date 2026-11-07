// IndexedDB implementation of FeedbackStore.
// Shares the database with world canon but never touches its stores.

import type { FeedbackStore, PlaytestFeedback } from './types';
import { DB_NAME, FEEDBACK_STORE, openDatabase, promisify, txDone } from '../memory/idbSchema';

export class IdbFeedbackStore implements FeedbackStore {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;

  constructor(dbName: string = DB_NAME) {
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    if (this.db) return;
    this.db = await openDatabase(this.dbName);
  }

  private requireDb(): IDBDatabase {
    if (!this.db) throw new Error('IdbFeedbackStore not initialized — call init() first');
    return this.db;
  }

  async getAll(): Promise<PlaytestFeedback[]> {
    const tx = this.requireDb().transaction(FEEDBACK_STORE, 'readonly');
    const rows = await promisify<PlaytestFeedback[]>(tx.objectStore(FEEDBACK_STORE).getAll());
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async hasFeedbackForSession(playSessionId: string): Promise<boolean> {
    const tx = this.requireDb().transaction(FEEDBACK_STORE, 'readonly');
    const index = tx.objectStore(FEEDBACK_STORE).index('playSessionId');
    const count = await promisify(index.count(IDBKeyRange.only(playSessionId)));
    return count > 0;
  }

  async add(feedback: PlaytestFeedback): Promise<void> {
    // Check inside the same transaction as the write so two rapid taps
    // cannot both pass the check.
    const tx = this.requireDb().transaction(FEEDBACK_STORE, 'readwrite');
    const store = tx.objectStore(FEEDBACK_STORE);
    const existing = await promisify(
      store.index('playSessionId').count(IDBKeyRange.only(feedback.playSessionId)),
    );
    if (existing > 0) {
      tx.abort();
      throw new Error('This play session has already sent feedback');
    }
    store.add(feedback);
    await txDone(tx);
  }

  async deleteAll(): Promise<void> {
    const tx = this.requireDb().transaction(FEEDBACK_STORE, 'readwrite');
    tx.objectStore(FEEDBACK_STORE).clear();
    await txDone(tx);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
