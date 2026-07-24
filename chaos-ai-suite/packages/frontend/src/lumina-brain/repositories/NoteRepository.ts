import type { LuminaBrainNote, LuminaBrainNoteDraft } from "@chaos-ai-suite/shared";
import type { StorageAdapter } from "../storage/StorageAdapter.js";

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * ノートに対するドメイン操作を提供するRepository。UIコンポーネントはこのクラス経由でのみ
 * ノートを読み書きし、StorageAdapterの実装（IndexedDB等）を直接扱わない。
 * Step1では作成・一覧・取得・更新（自動保存）・削除のみを扱う。
 */
export class NoteRepository {
  constructor(private readonly adapter: StorageAdapter<LuminaBrainNote>) {}

  /** ゴミ箱（Step4で使用）に入っていないノートを更新日時の新しい順で返す。 */
  async list(): Promise<LuminaBrainNote[]> {
    const notes = await this.adapter.getAll();
    return notes
      .filter((note) => !note.trashedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async get(id: string): Promise<LuminaBrainNote | undefined> {
    return this.adapter.getById(id);
  }

  async create(draft: LuminaBrainNoteDraft): Promise<LuminaBrainNote> {
    const now = new Date().toISOString();
    const note: LuminaBrainNote = {
      id: generateId(),
      title: draft.title,
      body: draft.body,
      createdAt: now,
      updatedAt: now,
      tagIds: [],
      pinned: false,
      archived: false,
      createdByType: "human",
      accessLevel: "private",
      confidence: "unverified",
      status: "draft",
      approvalStatus: "not_required",
    };
    await this.adapter.put(note);
    return note;
  }

  /** タイトル・本文の更新（自動保存用）。存在しないIDの場合はundefinedを返す。 */
  async update(id: string, patch: Partial<LuminaBrainNoteDraft>): Promise<LuminaBrainNote | undefined> {
    const existing = await this.adapter.getById(id);
    if (!existing) return undefined;
    const updated: LuminaBrainNote = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await this.adapter.put(updated);
    return updated;
  }

  /** Step1では確認ダイアログ後の完全削除。Step4でゴミ箱（trashedAt）方式に切り替える。 */
  async remove(id: string): Promise<void> {
    await this.adapter.delete(id);
  }
}
