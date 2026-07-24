/**
 * Repository層が依存する、永続化方式を問わない汎用CRUDの契約。
 * Phase 1はIndexedDB実装（indexedDbAdapter.ts）のみを使うが、将来Supabase/PostgreSQL等の
 * サーバー保存へ差し替える場合も、この型を満たす実装を用意してRepositoryへ渡すだけでよい。
 * UIコンポーネントはこの層・実装を直接importしない（Repository経由でのみ利用する）。
 */
export interface StorageAdapter<T extends { id: string }> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  put(item: T): Promise<void>;
  delete(id: string): Promise<void>;
}
