import type { LuminaBrainNote } from "@chaos-ai-suite/shared";
import { IndexedDbStorageAdapter, LUMINA_BRAIN_STORES } from "../storage/indexedDbAdapter.js";
import { NoteRepository } from "./NoteRepository.js";

/**
 * アプリ全体で共有するRepositoryのインスタンス。
 * Phase 1の実体はIndexedDBだが、UIコンポーネントはこのモジュールからRepositoryだけを
 * importする（StorageAdapterの実装をここ以外でnewしない）。将来サーバー保存へ差し替える際は
 * このファイルの生成部分だけを差し替えればよい。
 */
export const noteRepository = new NoteRepository(
  new IndexedDbStorageAdapter<LuminaBrainNote>(LUMINA_BRAIN_STORES.notes),
);

export { NoteRepository } from "./NoteRepository.js";
