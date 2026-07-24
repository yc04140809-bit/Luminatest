import { FileText, Plus } from "lucide-react";
import type { LuminaBrainNote } from "@chaos-ai-suite/shared";

interface NoteListProps {
  notes: LuminaBrainNote[];
  loading: boolean;
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  creating: boolean;
}

function previewText(body: string): string {
  const firstLine = body.split("\n").find((line) => line.trim() !== "") ?? "";
  return firstLine.length > 40 ? `${firstLine.slice(0, 40)}...` : firstLine;
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** ノート一覧。作成・選択のみを扱う（プロジェクト/タグ/検索/ピン留めはStep2以降）。 */
export function NoteList({ notes, loading, selectedNoteId, onSelect, onCreate, creating }: NoteListProps) {
  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onCreate}
        disabled={creating}
        className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Plus size={16} />
        {creating ? "作成中..." : "新規ノート"}
      </button>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {loading && <p className="px-1 py-4 text-center text-xs text-office-muted">読み込み中...</p>}

        {!loading && notes.length === 0 && (
          <div className="rounded-lg border border-dashed border-office-border px-3 py-6 text-center text-xs text-office-muted">
            <FileText size={20} className="mx-auto mb-2 opacity-50" />
            まだノートがありません。
            <br />
            「新規ノート」から作成できます。
          </div>
        )}

        {!loading &&
          notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onSelect(note.id)}
              className={`w-full min-h-11 rounded-lg border px-3 py-2 text-left transition ${
                note.id === selectedNoteId
                  ? "border-office-gold bg-office-gold/10"
                  : "border-office-border bg-office-bg hover:border-office-gold/50"
              }`}
            >
              <p className="truncate text-sm font-semibold text-office-text">{note.title || "（無題のノート）"}</p>
              {previewText(note.body) && (
                <p className="mt-0.5 truncate text-xs text-office-muted">{previewText(note.body)}</p>
              )}
              <p className="mt-0.5 text-[10px] text-office-muted">更新: {formatUpdatedAt(note.updatedAt)}</p>
            </button>
          ))}
      </div>
    </div>
  );
}
