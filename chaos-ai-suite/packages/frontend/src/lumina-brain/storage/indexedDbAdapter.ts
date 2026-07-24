import type { StorageAdapter } from "./StorageAdapter.js";

/**
 * Lumina Brain専用のIndexedDB（既存のBGM機能が使う"chaos-ai-suite" DBとは別にする。
 * 無関係な機能同士でDBバージョン管理を共有すると、片方の変更がもう片方の
 * マイグレーションリスクを生むため）。
 * Step2以降で新しいストア（projects/tags等）を追加する際は、DB_VERSIONを上げて
 * onupgradeneededに追加する。
 */
const DB_NAME = "chaos-ai-suite-lumina-brain";
const DB_VERSION = 1;

export const LUMINA_BRAIN_STORES = {
  notes: "notes",
} as const;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("このブラウザはIndexedDBに対応していないため、Lumina Brainのデータを保存できません。"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LUMINA_BRAIN_STORES.notes)) {
        db.createObjectStore(LUMINA_BRAIN_STORES.notes, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lumina BrainのDBを開けませんでした。"));
  });
}

/** 指定ストアに対する汎用IndexedDB実装。1操作ごとに開閉するシンプルな方式（このアプリの規模では十分）。 */
export class IndexedDbStorageAdapter<T extends { id: string }> implements StorageAdapter<T> {
  constructor(private readonly storeName: string) {}

  private async run<R>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    const db = await openDb();
    try {
      return await new Promise<R>((resolve, reject) => {
        const tx = db.transaction(this.storeName, mode);
        const request = fn(tx.objectStore(this.storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Lumina Brainのデータ操作に失敗しました。"));
      });
    } finally {
      db.close();
    }
  }

  async getAll(): Promise<T[]> {
    return this.run("readonly", (store) => store.getAll());
  }

  async getById(id: string): Promise<T | undefined> {
    return this.run("readonly", (store) => store.get(id));
  }

  async put(item: T): Promise<void> {
    await this.run("readwrite", (store) => store.put(item));
  }

  async delete(id: string): Promise<void> {
    await this.run("readwrite", (store) => store.delete(id));
  }
}
