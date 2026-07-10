import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, PenLine, RotateCcw, X } from "lucide-react";
import {
  NOTE_EDIT_MODES,
  NOTE_SCORE_KEYS,
  NOTE_SCORE_LABELS,
  type NoteAnalysisResult,
  type NoteEditModeId,
  type NoteEditResult,
} from "@chaos-ai-suite/shared";
import { analyzeNoteArticle, editNoteArticle } from "../api/officeApi.js";
import { renderNotePreviewHtml } from "../utils/markdownPreview.js";
import { clearNoteDraft, loadNoteDraft, saveNoteDraft } from "../utils/noteDraft.js";
import { downloadText } from "../utils/downloadText.js";

type Phase = "idle" | "editing" | "analyzing" | "done";

function scoreColor(score: number): string {
  if (score >= 75) return "#34d399";
  if (score >= 50) return "#d4af37";
  return "#f87171";
}

function overallColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-office-gold";
  return "text-red-400";
}

/**
 * AI Note Editor（売れるnote編集AI）のMVPスタジオ。
 * 流れ: 記事入力 → AI編集 → noteプレビュー/診断 → エクスポート（スマホ縦1画面で完結）。
 * 作業状態はlocalStorageに自動保存され、リロードしても復元される。
 */
export function NoteEditorStudio() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [modeId, setModeId] = useState<NoteEditModeId>("experience");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [editResult, setEditResult] = useState<NoteEditResult | null>(null);
  const [analysis, setAnalysis] = useState<NoteAnalysisResult | null>(null);
  const [view, setView] = useState<"preview" | "markdown">("preview");
  const [copied, setCopied] = useState(false);
  const restored = useRef(false);

  // 初回オープン時に前回の作業を復元する
  useEffect(() => {
    if (!open || restored.current) return;
    restored.current = true;
    const draft = loadNoteDraft();
    if (!draft) return;
    setContent(draft.content);
    setModeId(draft.modeId);
    if (draft.editResult) {
      setEditResult(draft.editResult);
      setAnalysis(draft.analysisResult ?? null);
      setPhase("done");
    }
  }, [open]);

  // 作業状態の自動保存
  useEffect(() => {
    if (!restored.current) return;
    saveNoteDraft({ content, modeId, editResult: editResult ?? undefined, analysisResult: analysis ?? undefined });
  }, [content, modeId, editResult, analysis]);

  const previewHtml = useMemo(
    () => (editResult ? renderNotePreviewHtml(editResult.editedMarkdown) : ""),
    [editResult],
  );

  async function handleEdit(): Promise<void> {
    if (!content.trim() || phase === "editing" || phase === "analyzing") return;
    setError(null);
    setEditResult(null);
    setAnalysis(null);
    setPhase("editing");
    try {
      const edited = await editNoteArticle({ content: content.trim(), mode: modeId });
      setEditResult(edited);
      setPhase("analyzing");
      // 診断は編集後の記事に対して行う。診断だけ失敗しても編集結果は残す。
      try {
        const diagnosed = await analyzeNoteArticle({ content: edited.editedMarkdown });
        setAnalysis(diagnosed);
      } catch (analyzeError) {
        setError(`診断だけ失敗しました（編集結果は使えます）: ${(analyzeError as Error).message}`);
      }
      setPhase("done");
    } catch (editError) {
      setError((editError as Error).message);
      setPhase("idle");
    }
  }

  async function handleCopy(): Promise<void> {
    if (!editResult) return;
    try {
      await navigator.clipboard.writeText(editResult.editedMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // クリップボード非対応環境ではMarkdown表示から手動コピーしてもらう
    }
  }

  function handleReset(): void {
    setContent("");
    setEditResult(null);
    setAnalysis(null);
    setPhase("idle");
    setError(null);
    clearNoteDraft();
  }

  const busy = phase === "editing" || phase === "analyzing";

  return (
    <>
      <section className="rounded-xl border border-office-border bg-office-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
          <PenLine size={18} />
          note編集スタジオ
        </h2>
        <p className="mb-3 text-xs text-office-muted">
          AIで書いた下書きを貼るだけで、ネムリ（書類作成AI）がnoteにそのまま投稿できる品質へ編集。診断・タイトル案・CTA提案つき。
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold"
        >
          スタジオを開く
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
          <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-xl text-office-gold">
              <PenLine size={20} />
              note編集スタジオ
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold"
            >
              <X size={16} /> 戻る
            </button>
          </div>

          <div className="mx-auto w-full max-w-3xl flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Step 1: 記事入力 */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-office-text">① 記事を貼り付ける</h3>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {NOTE_EDIT_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setModeId(mode.id)}
                    title={mode.policy}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      modeId === mode.id
                        ? "bg-office-gold/20 text-office-gold"
                        : "border border-office-border text-office-muted hover:text-office-text"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="ChatGPT・Claude・Geminiなどで作った記事の下書きをここに貼り付けてください（Markdownでも普通の文章でもOK）"
                rows={8}
                className="w-full resize-y rounded-lg border border-office-border bg-office-panel px-3 py-2 text-sm text-office-text placeholder:text-office-muted"
              />
              <p className="mt-1 text-right text-[11px] text-office-muted">{content.length.toLocaleString()}字 / 20,000字</p>
            </section>

            {/* Step 2: AI編集ボタン */}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="button"
              onClick={handleEdit}
              disabled={busy || !content.trim()}
              className="w-full rounded-lg bg-office-accent px-3 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
            >
              {phase === "editing"
                ? "ネムリが編集中...（長い記事は1分ほどかかります）"
                : phase === "analyzing"
                  ? "編集完了。診断中..."
                  : "② AI編集する"}
            </button>

            {/* Step 3: 編集後プレビュー */}
            {editResult && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-office-text">③ 編集後の記事</h3>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setView("preview")}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        view === "preview" ? "bg-office-gold/20 text-office-gold" : "border border-office-border text-office-muted"
                      }`}
                    >
                      noteプレビュー
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("markdown")}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        view === "markdown" ? "bg-office-gold/20 text-office-gold" : "border border-office-border text-office-muted"
                      }`}
                    >
                      Markdown
                    </button>
                  </div>
                </div>

                {view === "preview" ? (
                  <div className="note-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <pre className="whitespace-pre-wrap rounded-lg border border-office-border bg-office-panel p-3 text-xs text-office-text">
                    {editResult.editedMarkdown}
                  </pre>
                )}

                {editResult.changeSummary.length > 0 && (
                  <div className="mt-3 rounded-lg border border-office-border bg-office-panel p-3">
                    <h4 className="mb-1 text-xs font-semibold text-office-gold">✂️ 編集内容</h4>
                    <ul className="list-inside list-disc space-y-0.5 text-xs text-office-text">
                      {editResult.changeSummary.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Step 4: 改善ポイント（診断） */}
            {analysis && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-office-text">④ 読みやすさ診断</h3>
                <div className="rounded-xl border border-office-border bg-office-panel p-4">
                  <div className="mb-3 flex items-baseline gap-2">
                    <span className={`font-display text-4xl ${overallColor(analysis.overallScore)}`}>{analysis.overallScore}</span>
                    <span className="text-sm text-office-muted">/ 100点（7項目平均）</span>
                  </div>
                  <div className="space-y-1.5">
                    {NOTE_SCORE_KEYS.map((key) => (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <span className="w-40 shrink-0 text-office-muted">{NOTE_SCORE_LABELS[key]}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-office-bg">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${analysis.scores[key]}%`, backgroundColor: scoreColor(analysis.scores[key]) }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right font-semibold text-office-text">{analysis.scores[key]}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-office-muted">
                    ※ 記事構成をもとにした参考指標です。実際の閲覧数・売上を保証するものではありません。
                  </p>
                </div>

                {analysis.improvements.length > 0 && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                    <h4 className="mb-1 text-xs font-semibold text-amber-400">🔧 改善案</h4>
                    <ul className="list-inside list-disc space-y-0.5 text-xs text-office-text">
                      {analysis.improvements.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.dropoffPoints.length > 0 && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3">
                    <h4 className="mb-2 text-xs font-semibold text-red-400">🚪 離脱しそうなポイント</h4>
                    <div className="space-y-2">
                      {analysis.dropoffPoints.map((point, index) => (
                        <div key={index} className="text-xs">
                          <p className="text-office-muted">「{point.excerpt}…」</p>
                          <p className="text-office-text">理由: {point.reason}</p>
                          <p className="text-emerald-400">直し方: {point.fix}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.titleCandidates.length > 0 && (
                  <div className="rounded-lg border border-office-border bg-office-panel p-3">
                    <h4 className="mb-2 text-xs font-semibold text-office-gold">📝 タイトル候補（{analysis.titleCandidates.length}案）</h4>
                    <div className="space-y-1.5">
                      {analysis.titleCandidates.map((candidate, index) => (
                        <div key={index} className="text-xs">
                          <p className="font-semibold text-office-text">
                            {index + 1}. {candidate.title}
                          </p>
                          <p className="text-office-muted">→ {candidate.appeal}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.ctaSuggestions.length > 0 && (
                  <div className="rounded-lg border border-office-gold/50 bg-office-gold/10 p-3">
                    <h4 className="mb-1 text-xs font-semibold text-office-gold">📣 CTA（行動喚起）の提案</h4>
                    <ul className="list-inside list-disc space-y-0.5 text-xs text-office-text">
                      {analysis.ctaSuggestions.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Step 5: エクスポート */}
            {editResult && (
              <section className="space-y-2 pb-8">
                <h3 className="text-sm font-semibold text-office-text">⑤ エクスポート</h3>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white"
                >
                  <Copy size={15} /> {copied ? "コピーしました！noteに貼り付けてください" : "記事をコピー（note貼り付け用）"}
                </button>
                <button
                  type="button"
                  onClick={() => downloadText(`note原稿_${new Date().toISOString().slice(0, 10)}.md`, editResult.editedMarkdown)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2.5 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold"
                >
                  <Download size={15} /> ファイルとして保存（.md）
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-xs text-office-muted transition hover:border-red-400 hover:text-red-400"
                >
                  <RotateCcw size={13} /> 新しい記事を書く（現在の作業をクリア）
                </button>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
