import type {
  NoteAnalysisResult,
  NoteEditLevelId,
  NoteEditModeId,
  NoteEditResult,
  NotePromoPack,
} from "@chaos-ai-suite/shared";

/**
 * AI Note Editorの作業状態をこの端末(localStorage)に自動保存する。
 * スマホでの利用中にブラウザがリロードされても、直前の入力・結果・編集履歴が復元される。
 * 履歴保存はAIを呼ばない（コスト対策）。
 * 将来ユーザーアカウント＋クラウド保存へ移行する場合も、このNoteDraftをそのまま
 * サーバーへ送る形にできるよう、1オブジェクトに閉じた構造にしている。
 */

/** 記事の1つの版。AI編集・部分編集・手動修正のたびに積まれる。 */
export interface NoteVersion {
  id: string;
  /** 版の由来（例: "AI編集（読みやすくする）" / "部分編集: もっと短く" / "手動修正"） */
  label: string;
  markdown: string;
  createdAt: string;
}

export interface NoteDraft {
  content: string;
  modeId: NoteEditModeId;
  levelId?: NoteEditLevelId;
  /** 最後のAI編集のメタ情報（編集内容の要約・強調箇所） */
  editResult?: NoteEditResult;
  analysisResult?: NoteAnalysisResult;
  /** 版の履歴（古い順）。現在表示中の版は versionIndex が指す。 */
  versions?: NoteVersion[];
  versionIndex?: number;
  /** 宣伝パック（生成済みの場合のみ） */
  promoPack?: NotePromoPack;
  updatedAt: string;
}

const STORAGE_KEY = "chaos-ai-suite:note-draft";

export function newVersion(label: string, markdown: string): NoteVersion {
  return {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    markdown,
    createdAt: new Date().toISOString(),
  };
}

export function loadNoteDraft(): NoteDraft | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const draft = JSON.parse(raw) as NoteDraft;
    // 旧形式（履歴なし）からの移行: 編集結果があれば最初の版として履歴化する
    if (!draft.versions && draft.editResult?.editedMarkdown) {
      draft.versions = [newVersion("AI編集", draft.editResult.editedMarkdown)];
      draft.versionIndex = 0;
    }
    return draft;
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
