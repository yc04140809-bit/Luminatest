import { useEffect, useState } from "react";
import { ArrowLeft, Cpu } from "lucide-react";
import type { LuminaBrainNote } from "@chaos-ai-suite/shared";
import { noteRepository } from "../../lumina-brain/repositories/index.js";
import { NoteList } from "./NoteList.js";
import { NoteEditor } from "./NoteEditor.js";
import { StorageUsageBanner } from "./StorageUsageBanner.js";

interface LuminaBrainScreenProps {
  onClose: () => void;
}

/**
 * Lumina Brain（My Chaos AI Suite内の共有知識・記憶機能）の専用フルスクリーン画面。
 * Lumina Arcana（別プロジェクト・オラクルカード関連）とは無関係。
 * Step1: ノート一覧・作成・編集・自動保存・削除のみ。プロジェクト/タグ/検索/双方向リンク/
 * ゴミ箱・インポートエクスポートはStep2以降で追加する。
 * データはRepository（noteRepository）経由でのみ読み書きし、IndexedDBを直接扱わない。
 */
export function LuminaBrainScreen({ onClose }: LuminaBrainScreenProps) {
  const [notes, setNotes] = useState<LuminaBrainNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    noteRepository
      .list()
      .then((result) => {
        if (cancelled) return;
        setNotes(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("ノートの読み込みに失敗しました。時間をおいて再度開いてください。");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(): Promise<void> {
    setCreating(true);
    try {
      const note = await noteRepository.create({ title: "", body: "" });
      setNotes((prev) => [note, ...prev]);
      setSelectedNoteId(note.id);
    } catch {
      setLoadError("ノートを作成できませんでした。");
    } finally {
      setCreating(false);
    }
  }

  function handleSaved(updated: LuminaBrainNote): void {
    setNotes((prev) =>
      [...prev.map((note) => (note.id === updated.id ? updated : note))].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    );
  }

  function handleDeleted(id: string): void {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    setSelectedNoteId((current) => (current === id ? null : current));
  }

  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
      <header className="flex items-center gap-3 border-b border-purple-400/30 bg-office-panel px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-lg border border-office-border px-2.5 py-1.5 text-xs text-office-muted transition hover:border-office-gold hover:text-office-gold"
        >
          <ArrowLeft size={14} />
          オフィスへ戻る
        </button>
        <div className="flex items-center gap-2">
          <Cpu size={18} className="text-purple-300" />
          <div>
            <h1 className="font-display text-base leading-tight text-purple-200">LUMINA BRAIN</h1>
            <p className="text-[10px] leading-tight text-office-muted">My Chaos Central Intelligence</p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {loadError && (
          <div className="mb-3 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {loadError}
          </div>
        )}

        <StorageUsageBanner />

        <div className="grid h-[calc(100%-3rem)] grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
          <div className={`min-h-0 ${selectedNote ? "hidden md:block" : "block"}`}>
            <NoteList
              notes={notes}
              loading={loading}
              selectedNoteId={selectedNoteId}
              onSelect={setSelectedNoteId}
              onCreate={handleCreate}
              creating={creating}
            />
          </div>

          <div className={`min-h-0 rounded-lg border border-office-border bg-office-panel p-3 ${selectedNote ? "block" : "hidden md:block"}`}>
            {selectedNote ? (
              <NoteEditor
                note={selectedNote}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
                onBackMobile={() => setSelectedNoteId(null)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-office-muted">
                左の一覧からノートを選ぶか、「新規ノート」で作成してください。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
