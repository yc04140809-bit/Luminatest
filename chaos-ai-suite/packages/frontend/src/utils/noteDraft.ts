import type { NoteAnalysisResult, NoteEditModeId, NoteEditResult } from "@chaos-ai-suite/shared";

/**
 * AI Note Editorの作業状態をこの端末(localStorage)に自動保存する。
 * スマホでの利用中にブラウザがリロードされても、直前の入力と結果が復元される。
 * MVPは1スロット（最後の作業のみ）。履歴化はVer1.0で対応予定。
 */
export interface NoteDraft {
  content: string;
  modeId: NoteEditModeId;
  editResult?: NoteEditResult;
  analysisResult?: NoteAnalysisResult;
  updatedAt: string;
}

const STORAGE_KEY = "chaos-ai-suite:note-draft";

export function loadNoteDraft(): NoteDraft | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as NoteDraft;
  } catch {
    return undefined;
  }
}

export function saveNoteDraft(draft: Omit<NoteDraft, "updatedAt">): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
  } catch {
    // 容量超過等で保存できなくても編集自体は続行できる
  }
}

export function clearNoteDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
