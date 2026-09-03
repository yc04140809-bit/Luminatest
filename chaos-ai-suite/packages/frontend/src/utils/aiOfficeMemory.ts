/**
 * AI Office用の簡易メモリー（storage layer）。
 * 「直近の仕事」「成果物」「保留中タスク」は既存のTaskデータからその都度導出できるため、
 * ここで新規に永続化するのは既存データに存在しない「タスクへのユーザーフィードバック」のみ
 * （本格RAGは今回不要という指示に沿った最小実装）。
 *
 * 実装はlocalStorageだが、呼び出し側は OfficeMemoryStore インターフェースにのみ依存する。
 * 将来Supabase/Firebase等へ移行する場合は、この interface を満たす実装に差し替えるだけでよい。
 */

export interface OfficeMemoryStore {
  getTaskFeedback(taskId: string): string[];
  addTaskFeedback(taskId: string, feedback: string): void;
}

const STORAGE_KEY = "chaos-ai-suite:office-task-feedback";

function readAll(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, string[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 保存容量オーバー等は無視する（フィードバックは補助情報のため機能を止めない）
  }
}

class LocalOfficeMemoryStore implements OfficeMemoryStore {
  getTaskFeedback(taskId: string): string[] {
    return readAll()[taskId] ?? [];
  }

  addTaskFeedback(taskId: string, feedback: string): void {
    const trimmed = feedback.trim().slice(0, 1000);
    if (!trimmed) return;
    const all = readAll();
    all[taskId] = [...(all[taskId] ?? []), trimmed].slice(-20);
    writeAll(all);
  }
}

export const officeMemoryStore: OfficeMemoryStore = new LocalOfficeMemoryStore();
export const OFFICE_MEMORY_STORAGE_KEY = STORAGE_KEY;
