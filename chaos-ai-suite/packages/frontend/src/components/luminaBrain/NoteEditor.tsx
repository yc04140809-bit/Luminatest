import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { LuminaBrainNote } from "@chaos-ai-suite/shared";
import { noteRepository } from "../../lumina-brain/repositories/index.js";

interface NoteEditorProps {
  note: LuminaBrainNote;
  /** 自動保存が成功するたびに呼ぶ（一覧側の並び順・プレビューを更新するため）。 */
  onSaved: (note: LuminaBrainNote) => void;
  onDeleted: (id: string) => void;
  /** モバイルでは一覧へ戻るボタンとして使う（デスクトップでは非表示）。 */
  onBackMobile: () => void;
}

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 800;

/** ノート編集画面。タイトル・本文の自動保存と削除（確認ダイアログあり）のみを扱う。 */
export function NoteEditor({ note, onSaved, onDeleted, onBackMobile }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 別のノートに切り替わったら、編集中の内容をリセットする
  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
    setStatus("idle");
    setConfirmingDelete(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [note.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function scheduleSave(nextTitle: string, nextBody: string): void {
    setStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        const updated = await noteRepository.update(note.id, { title: nextTitle, body: nextBody });
        if (updated) {
          setStatus("saved");
          onSaved(updated);
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }, AUTOSAVE_DELAY_MS);
  }

  function handleTitleChange(value: string): void {
    setTitle(value);
    scheduleSave(value, body);
  }

  function handleBodyChange(value: string): void {
    setBody(value);
    scheduleSave(title, value);
  }

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await noteRepository.remove(note.id);
      onDeleted(note.id);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const statusLabel: Record<SaveStatus, string> = {
    idle: "",
    pending: "編集中...",
    saving: "保存中...",
    saved: "保存しました",
    error: "保存できませんでした（再度入力すると再試行します）",
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackMobile}
          className="flex items-center gap-1 text-xs text-office-muted hover:text-office-text md:hidden"
        >
          <ArrowLeft size={14} />
          一覧へ戻る
        </button>
        <span
          className={`text-xs ${status === "error" ? "text-red-400" : "text-office-muted"}`}
          role="status"
          aria-live="polite"
        >
          {statusLabel[status]}
        </span>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="ml-auto flex items-center gap-1 rounded-lg border border-office-border px-2 py-1.5 text-xs text-office-muted transition hover:border-red-500/60 hover:text-red-400"
        >
          <Trash2 size={13} />
          削除
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(event) => handleTitleChange(event.target.value)}
        placeholder="タイトル"
        aria-label="ノートのタイトル"
        className="mb-2 w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-base font-semibold text-office-text placeholder:text-office-muted"
      />

      <textarea
        value={body}
        onChange={(event) => handleBodyChange(event.target.value)}
        placeholder="本文を入力してください（Markdown対応）"
        aria-label="ノートの本文"
        className="min-h-0 flex-1 w-full resize-none rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm leading-relaxed text-office-text placeholder:text-office-muted"
      />

      {confirmingDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xs rounded-xl border border-red-500/50 bg-office-panel p-5 text-center">
            <p className="text-sm text-office-text">
              「{title || "（無題のノート）"}」を削除します。
              <br />
              この操作は取り消せません。よろしいですか？
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-office-border px-3 py-2 text-sm text-office-text disabled:opacity-40"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
