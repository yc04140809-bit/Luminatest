import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  History,
  LayoutTemplate,
  Megaphone,
  PenLine,
  Redo2,
  RotateCcw,
  Scissors,
  Undo2,
  X,
} from "lucide-react";
import {
  NOTE_CHECKLIST_STATUS_LABELS,
  NOTE_EDIT_LEVELS,
  NOTE_EDIT_MODES,
  NOTE_SCORE_KEYS,
  NOTE_SCORE_LABELS,
  NOTE_SECTION_INSTRUCTIONS,
  NOTE_STRUCTURE_TEMPLATES,
  type NoteAnalysisResult,
  type NoteChecklistStatus,
  type NoteEditLevelId,
  type NoteEditModeId,
  type NoteEditResult,
  type NotePromoPack,
  type NoteStructureTemplateId,
} from "@chaos-ai-suite/shared";
import { analyzeNoteArticle, editNoteArticle, editNoteSection, generateNotePromoPack } from "../api/officeApi.js";
import { renderNotePreviewHtml } from "../utils/markdownPreview.js";
import { clearNoteDraft, loadNoteDraft, newVersion, saveNoteDraft, type NoteVersion } from "../utils/noteDraft.js";
import { toNotePasteText, toPlainText } from "../utils/noteCopy.js";
import { diffSentences } from "../utils/textDiff.js";
import { downloadText } from "../utils/downloadText.js";

type Phase = "idle" | "editing" | "analyzing" | "done";
type ResultTab = "before" | "after" | "diff";

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

const CHECK_STATUS_STYLE: Record<NoteChecklistStatus, { badge: string; icon: string }> = {
  ok: { badge: "bg-emerald-500/15 text-emerald-400", icon: "✓" },
  caution: { badge: "bg-amber-500/15 text-amber-400", icon: "△" },
  fix: { badge: "bg-red-500/15 text-red-400", icon: "！" },
};

/** 折りたたみセクションの共通見出し。 */
function Collapsible({
  icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-office-border bg-office-panel">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        {open ? <ChevronDown size={14} className="text-office-muted" /> : <ChevronRight size={14} className="text-office-muted" />}
        {icon}
        <span className="text-sm font-semibold text-office-text">{title}</span>
      </button>
      {open && <div className="border-t border-office-border px-3 py-3">{children}</div>}
    </div>
  );
}

/**
 * AI Note Editor（売れるnote編集AI）スタジオ。
 * 流れ: 記事入力 → 編集レベル選択 → AI編集 → 比較（編集前/編集後/変更点）→ 診断 → コピー/エクスポート。
 * 部分編集・履歴は折りたたみに収納し、通常画面をシンプルに保つ（スマホファースト）。
 * 比較・コピー・履歴はすべてクライアント処理でAIを呼ばない。
 */
export function NoteEditorStudio() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [modeId, setModeId] = useState<NoteEditModeId>("experience");
  const [levelId, setLevelId] = useState<NoteEditLevelId>("readable");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [editResult, setEditResult] = useState<NoteEditResult | null>(null);
  const [analysis, setAnalysis] = useState<NoteAnalysisResult | null>(null);

  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [versionIndex, setVersionIndex] = useState(0);

  const [resultTab, setResultTab] = useState<ResultTab>("after");
  const [afterView, setAfterView] = useState<"preview" | "markdown">("preview");
  const [manualText, setManualText] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [sectionInstruction, setSectionInstruction] = useState<string>(NOTE_SECTION_INSTRUCTIONS[0]);
  const [sectionBusy, setSectionBusy] = useState(false);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateId, setTemplateId] = useState<NoteStructureTemplateId | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoPack, setPromoPack] = useState<NotePromoPack | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const restored = useRef(false);

  const currentMarkdown = versions[versionIndex]?.markdown ?? null;

  // 初回オープン時に前回の作業を復元する
  useEffect(() => {
    if (!open || restored.current) return;
    restored.current = true;
    const draft = loadNoteDraft();
    if (!draft) return;
    setContent(draft.content);
    setModeId(draft.modeId);
    if (draft.levelId) setLevelId(draft.levelId);
    if (draft.editResult) setEditResult(draft.editResult);
    setAnalysis(draft.analysisResult ?? null);
    setPromoPack(draft.promoPack ?? null);
    if (draft.versions && draft.versions.length > 0) {
      setVersions(draft.versions);
      setVersionIndex(Math.min(draft.versionIndex ?? draft.versions.length - 1, draft.versions.length - 1));
      setPhase("done");
    }
  }, [open]);

  // 作業状態の自動保存（AIを呼ばない）
  useEffect(() => {
    if (!restored.current) return;
    saveNoteDraft({
      content,
      modeId,
      levelId,
      editResult: editResult ?? undefined,
      analysisResult: analysis ?? undefined,
      versions,
      versionIndex,
      promoPack: promoPack ?? undefined,
    });
  }, [content, modeId, levelId, editResult, analysis, versions, versionIndex, promoPack]);

  // 表示中の版が変わったら手動編集テキストを同期する
  useEffect(() => {
    setManualText(currentMarkdown ?? "");
    setSelectedBlock(null);
  }, [currentMarkdown]);

  const previewHtml = useMemo(
    () => (currentMarkdown ? renderNotePreviewHtml(currentMarkdown) : ""),
    [currentMarkdown],
  );

  const diffSegments = useMemo(
    () => (currentMarkdown && resultTab === "diff" ? diffSentences(content, currentMarkdown) : []),
    [content, currentMarkdown, resultTab],
  );

  const blocks = useMemo(() => (currentMarkdown ? currentMarkdown.split(/\n{2,}/) : []), [currentMarkdown]);

  const selectedLevel = NOTE_EDIT_LEVELS.find((level) => level.id === levelId)!;
  const busy = phase === "editing" || phase === "analyzing" || sectionBusy;

  /** 新しい版を積む。表示位置より先の履歴（やり直し分）は破棄する標準的なUndoモデル。 */
  function pushVersion(label: string, markdown: string): void {
    const next = [...versions.slice(0, versionIndex + 1), newVersion(label, markdown)];
    setVersions(next);
    setVersionIndex(next.length - 1);
  }

  async function handleEdit(): Promise<void> {
    if (!content.trim() || busy) return;
    setError(null);
    setAnalysis(null);
    setPhase("editing");
    try {
      const edited = await editNoteArticle({
        content: content.trim(),
        mode: modeId,
        level: levelId,
        template: templateId ?? undefined,
      });
      setEditResult(edited);
      pushVersion(`AI編集（${selectedLevel.label}）`, edited.editedMarkdown);
      setResultTab("after");
      setPhase("analyzing");
      try {
        const diagnosed = await analyzeNoteArticle({ content: edited.editedMarkdown });
        setAnalysis(diagnosed);
      } catch (analyzeError) {
        setError(`診断だけ失敗しました（編集結果は使えます）: ${(analyzeError as Error).message}`);
      }
      setPhase("done");
    } catch (editError) {
      setError((editError as Error).message);
      setPhase(versions.length > 0 ? "done" : "idle");
    }
  }

  async function handleSectionEdit(): Promise<void> {
    if (selectedBlock === null || !currentMarkdown || sectionBusy) return;
    const target = blocks[selectedBlock];
    if (!target?.trim()) return;
    setSectionBusy(true);
    setError(null);
    try {
      const { revisedText } = await editNoteSection({ section: target, instruction: sectionInstruction });
      const nextBlocks = [...blocks];
      nextBlocks[selectedBlock] = revisedText.trim();
      pushVersion(`部分編集: ${sectionInstruction}`, nextBlocks.join("\n\n"));
      setSelectedBlock(null);
    } catch (sectionError) {
      setError(`部分編集に失敗しました: ${(sectionError as Error).message}`);
    } finally {
      setSectionBusy(false);
    }
  }

  function handleManualSave(): void {
    if (!currentMarkdown || manualText === currentMarkdown) return;
    pushVersion("手動修正", manualText);
  }

  async function handlePromoGenerate(): Promise<void> {
    if (!currentMarkdown || promoBusy) return;
    setPromoBusy(true);
    setError(null);
    try {
      const pack = await generateNotePromoPack({ content: currentMarkdown });
      setPromoPack(pack);
    } catch (promoError) {
      setError(`宣伝パックの生成に失敗しました: ${(promoError as Error).message}`);
    } finally {
      setPromoBusy(false);
    }
  }

  /** 参考構成の骨組み（見出しだけの下書き）を本文欄の末尾に挿入する。 */
  function insertTemplateSkeleton(): void {
    const template = NOTE_STRUCTURE_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) return;
    const skeleton = template.outline.map((item) => `## ${item}\n\n（ここに書く）`).join("\n\n");
    setContent((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${skeleton}` : skeleton));
  }

  async function copyWith(label: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(label);
      setTimeout(() => setCopyMessage(null), 2200);
    } catch {
      setCopyMessage("コピーできませんでした。Markdown表示から手動でコピーしてください");
      setTimeout(() => setCopyMessage(null), 3000);
    }
  }

  function handleReset(): void {
    setContent("");
    setEditResult(null);
    setAnalysis(null);
    setVersions([]);
    setVersionIndex(0);
    setPromoPack(null);
    setTemplateId(null);
    setPhase("idle");
    setError(null);
    clearNoteDraft();
  }

  return (
    <>
      <section className="rounded-xl border border-office-border bg-office-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
          <PenLine size={18} />
          note編集スタジオ
        </h2>
        <p className="mb-3 text-xs text-office-muted">
          AIで書いた下書きを貼るだけで、ネムリ（書類作成AI）がnoteにそのまま投稿できる品質へ編集。診断・比較・部分編集・履歴つき。
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

          <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* ① 記事入力 */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-office-text">① 記事を貼り付ける</h3>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="ChatGPT・Claude・Geminiなどで作った記事の下書きをここに貼り付けてください（Markdownでも普通の文章でもOK）"
                rows={7}
                className="w-full resize-y rounded-lg border border-office-border bg-office-panel px-3 py-2 text-sm text-office-text placeholder:text-office-muted"
              />
              <p className="mt-1 text-right text-[11px] text-office-muted">{content.length.toLocaleString()}字 / 20,000字</p>
            </section>

            {/* 編集レベル */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-office-text">② 編集レベルを選ぶ</h3>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {NOTE_EDIT_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setLevelId(level.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      levelId === level.id
                        ? "bg-office-gold/20 text-office-gold"
                        : "border border-office-border text-office-muted hover:text-office-text"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
              <p className="rounded-lg bg-office-panel px-3 py-2 text-xs text-office-muted">
                {selectedLevel.description}
                <span className="ml-1 font-semibold text-office-text">（{selectedLevel.changeAmount}）</span>
              </p>
            </section>

            {/* 詳細編集（編集モード9種） */}
            <Collapsible
              icon={<PenLine size={14} className="text-office-gold" />}
              title={`詳細編集（記事のジャンル: ${NOTE_EDIT_MODES.find((mode) => mode.id === modeId)?.label}）`}
              open={detailOpen}
              onToggle={() => setDetailOpen((value) => !value)}
            >
              <p className="mb-2 text-xs text-office-muted">記事のジャンルに合わせて編集の方向性を変えられます。</p>
              <div className="flex flex-wrap gap-1.5">
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
            </Collapsible>

            {/* 参考構成モード */}
            <Collapsible
              icon={<LayoutTemplate size={14} className="text-office-gold" />}
              title={`参考構成${templateId ? `（${NOTE_STRUCTURE_TEMPLATES.find((entry) => entry.id === templateId)?.label}）` : ""}`}
              open={templateOpen}
              onToggle={() => setTemplateOpen((value) => !value)}
            >
              <p className="mb-2 text-xs text-office-muted">
                記事ジャンルの一般的な構成パターンです。選ぶとAI編集時に構成の指針として使われます。骨組みだけ本文欄に挿入して、ゼロから書き始めることもできます。
              </p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {NOTE_STRUCTURE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(templateId === template.id ? null : template.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      templateId === template.id
                        ? "bg-office-gold/20 text-office-gold"
                        : "border border-office-border text-office-muted hover:text-office-text"
                    }`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
              {templateId && (
                <div className="space-y-2">
                  <ol className="list-inside list-decimal rounded-lg bg-office-bg px-3 py-2 text-xs text-office-text">
                    {NOTE_STRUCTURE_TEMPLATES.find((entry) => entry.id === templateId)?.outline.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    onClick={insertTemplateSkeleton}
                    className="w-full rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold"
                  >
                    この構成の骨組みを本文欄に挿入
                  </button>
                </div>
              )}
            </Collapsible>

            {/* ③ AI編集ボタン */}
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
                  : `③ AI編集する（${selectedLevel.label}）`}
            </button>

            {/* ④ 比較タブ: 編集前 / 編集後 / 変更点 */}
            {currentMarkdown && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-office-text">④ 結果を確認する</h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVersionIndex((index) => Math.max(0, index - 1))}
                      disabled={versionIndex === 0}
                      title="元に戻す"
                      className="rounded-full border border-office-border p-1.5 text-office-muted disabled:opacity-30"
                    >
                      <Undo2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setVersionIndex((index) => Math.min(versions.length - 1, index + 1))}
                      disabled={versionIndex >= versions.length - 1}
                      title="やり直す"
                      className="rounded-full border border-office-border p-1.5 text-office-muted disabled:opacity-30"
                    >
                      <Redo2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mb-2 flex gap-1.5">
                  {(
                    [
                      { id: "before", label: "編集前" },
                      { id: "after", label: "編集後" },
                      { id: "diff", label: "変更点" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setResultTab(tab.id)}
                      className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        resultTab === tab.id
                          ? "bg-office-gold/20 text-office-gold"
                          : "border border-office-border text-office-muted"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {resultTab === "before" && (
                  <pre className="whitespace-pre-wrap rounded-lg border border-office-border bg-office-panel p-3 text-xs text-office-muted">
                    {content || "（編集前の本文がありません）"}
                  </pre>
                )}

                {resultTab === "after" && (
                  <div>
                    <div className="mb-2 flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAfterView("preview")}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          afterView === "preview" ? "bg-office-gold/20 text-office-gold" : "border border-office-border text-office-muted"
                        }`}
                      >
                        noteプレビュー
                      </button>
                      <button
                        type="button"
                        onClick={() => setAfterView("markdown")}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          afterView === "markdown" ? "bg-office-gold/20 text-office-gold" : "border border-office-border text-office-muted"
                        }`}
                      >
                        Markdown（手動修正）
                      </button>
                    </div>
                    {afterView === "preview" ? (
                      <div className="note-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    ) : (
                      <div>
                        <textarea
                          value={manualText}
                          onChange={(event) => setManualText(event.target.value)}
                          rows={14}
                          className="w-full resize-y rounded-lg border border-office-border bg-office-panel px-3 py-2 font-mono text-xs text-office-text"
                        />
                        <button
                          type="button"
                          onClick={handleManualSave}
                          disabled={manualText === currentMarkdown}
                          className="mt-1 w-full rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-30"
                        >
                          手動修正を保存（履歴に追加）
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {resultTab === "diff" && (
                  <div className="space-y-3">
                    {editResult && editResult.changeSummary.length > 0 && (
                      <div className="rounded-lg border border-office-border bg-office-panel p-3">
                        <h4 className="mb-1 text-xs font-semibold text-office-gold">✂️ AIによる編集内容</h4>
                        <ul className="list-inside list-disc space-y-0.5 text-xs text-office-text">
                          {editResult.changeSummary.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="rounded-lg border border-office-border bg-office-panel p-3">
                      <h4 className="mb-2 text-xs font-semibold text-office-gold">📄 本文の差分（文単位）</h4>
                      <p className="mb-2 text-[10px] text-office-muted">
                        <span className="text-emerald-400">緑=追加</span> / <span className="text-red-400 line-through">赤=削除</span> /
                        グレー=変更なし。改行・見出しなどレイアウトだけの変更は差分に出ません（上の編集内容を参照）。
                      </p>
                      <div className="space-y-0.5 text-xs leading-relaxed">
                        {diffSegments.map((segment, index) =>
                          segment.type === "same" ? (
                            <span key={index} className="text-office-muted">
                              {segment.text}{" "}
                            </span>
                          ) : segment.type === "added" ? (
                            <span key={index} className="rounded bg-emerald-500/15 px-0.5 text-emerald-300">
                              {segment.text}{" "}
                            </span>
                          ) : (
                            <span key={index} className="rounded bg-red-500/10 px-0.5 text-red-400 line-through">
                              {segment.text}{" "}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 部分編集（折りたたみ） */}
            {currentMarkdown && (
              <Collapsible
                icon={<Scissors size={14} className="text-office-gold" />}
                title="部分編集（選んだ段落だけやり直す）"
                open={sectionOpen}
                onToggle={() => setSectionOpen((value) => !value)}
              >
                <p className="mb-2 text-xs text-office-muted">直したい段落をタップ → 指示を選んで実行。記事全体は変わりません（履歴から戻せます）。</p>
                <div className="mb-3 max-h-60 space-y-1.5 overflow-y-auto">
                  {blocks.map((block, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedBlock(selectedBlock === index ? null : index)}
                      className={`block w-full rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                        selectedBlock === index
                          ? "border-office-gold bg-office-gold/10 text-office-text"
                          : "border-office-border text-office-muted hover:text-office-text"
                      }`}
                    >
                      {block.length > 80 ? `${block.slice(0, 80)}…` : block}
                    </button>
                  ))}
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {NOTE_SECTION_INSTRUCTIONS.map((instruction) => (
                    <button
                      key={instruction}
                      type="button"
                      onClick={() => setSectionInstruction(instruction)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        sectionInstruction === instruction
                          ? "bg-office-gold/20 text-office-gold"
                          : "border border-office-border text-office-muted"
                      }`}
                    >
                      {instruction}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSectionEdit}
                  disabled={selectedBlock === null || sectionBusy}
                  className="w-full rounded-lg bg-office-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {sectionBusy ? "ネムリが書き直し中..." : `選んだ段落を「${sectionInstruction}」で書き直す`}
                </button>
              </Collapsible>
            )}

            {/* 履歴（折りたたみ） */}
            {versions.length > 0 && (
              <Collapsible
                icon={<History size={14} className="text-office-gold" />}
                title={`履歴（${versions.length}版）`}
                open={historyOpen}
                onToggle={() => setHistoryOpen((value) => !value)}
              >
                <div className="space-y-1.5">
                  {versions.map((version, index) => (
                    <div
                      key={version.id}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                        index === versionIndex ? "border-office-gold bg-office-gold/10" : "border-office-border"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-office-text">
                          {index + 1}. {version.label}
                          {index === versionIndex && <span className="ml-1 text-office-gold">（表示中）</span>}
                        </p>
                        <p className="text-[10px] text-office-muted">{new Date(version.createdAt).toLocaleString("ja-JP")}</p>
                      </div>
                      {index !== versionIndex && (
                        <button
                          type="button"
                          onClick={() => setVersionIndex(index)}
                          className="shrink-0 rounded-full border border-office-border px-2 py-0.5 text-[11px] text-office-muted hover:border-office-gold hover:text-office-gold"
                        >
                          復元
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => pushVersion(`複製: ${version.label}`, version.markdown)}
                        className="shrink-0 rounded-full border border-office-border px-2 py-0.5 text-[11px] text-office-muted hover:border-office-gold hover:text-office-gold"
                      >
                        複製
                      </button>
                    </div>
                  ))}
                </div>
              </Collapsible>
            )}

            {/* ⑤ 診断 */}
            {analysis && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-office-text">⑤ 読みやすさ診断</h3>
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
                    ※ 最後のAI編集時点の内容に対する参考指標です。実際の閲覧数・売上を保証するものではありません。
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

            {/* 投稿前チェックリスト（診断呼び出しに相乗り・エクスポートの直前に表示） */}
            {analysis?.checklist && analysis.checklist.length > 0 && (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-office-text">
                  <ClipboardCheck size={15} className="text-office-gold" /> 投稿前チェック
                </h3>
                <div className="space-y-1.5 rounded-xl border border-office-border bg-office-panel p-3">
                  {analysis.checklist.map((entry, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-semibold ${CHECK_STATUS_STYLE[entry.status].badge}`}
                      >
                        {CHECK_STATUS_STYLE[entry.status].icon} {NOTE_CHECKLIST_STATUS_LABELS[entry.status]}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-office-text">{entry.item}</p>
                        <p className="text-office-muted">{entry.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 宣伝パック（折りたたみ・生成時のみAI呼び出し） */}
            {currentMarkdown && (
              <Collapsible
                icon={<Megaphone size={14} className="text-office-gold" />}
                title={`宣伝パック${promoPack ? "（生成済み）" : ""}`}
                open={promoOpen}
                onToggle={() => setPromoOpen((value) => !value)}
              >
                <p className="mb-2 text-xs text-office-muted">
                  記事完成後に、Threads/X/Instagramなどの宣伝投稿一式をミライ（AIマーケティング責任者）がまとめて作ります。
                </p>
                <button
                  type="button"
                  onClick={handlePromoGenerate}
                  disabled={promoBusy}
                  className="mb-3 w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {promoBusy ? "ミライが作成中...（30秒〜1分ほどかかります）" : promoPack ? "宣伝パックを作り直す" : "宣伝パックを生成"}
                </button>

                {promoPack && (
                  <div className="space-y-3">
                    {(
                      [
                        ["Threads投稿（10本）", promoPack.threads],
                        ["X投稿（5本）", promoPack.x],
                        ["Instagramキャプション（3本）", promoPack.instagram],
                      ] as const
                    ).map(([label, posts]) => (
                      <div key={label}>
                        <h4 className="mb-1.5 text-xs font-semibold text-office-gold">{label}</h4>
                        <div className="space-y-1.5">
                          {posts.map((post, index) => (
                            <div key={index} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="rounded-full bg-office-gold/15 px-2 py-0.5 text-[10px] font-semibold text-office-gold">
                                  {post.type}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyWith("コピーしました", post.text)}
                                  className="flex items-center gap-1 rounded-full border border-office-border px-2 py-0.5 text-[10px] text-office-muted hover:border-office-gold hover:text-office-gold"
                                >
                                  <Copy size={10} /> コピー
                                </button>
                              </div>
                              <p className="whitespace-pre-wrap text-xs text-office-text">{post.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {(promoPack.thumbnails ?? []).length > 0 && (
                      <div>
                        <h4 className="mb-1.5 text-xs font-semibold text-office-gold">サムネイル案（3案・Canva等で再現用）</h4>
                        <div className="space-y-1.5">
                          {(promoPack.thumbnails ?? []).map((idea, index) => (
                            <div key={index} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="rounded-full bg-office-gold/15 px-2 py-0.5 text-[10px] font-semibold text-office-gold">案{index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyWith(
                                      "サムネイル案をコピーしました",
                                      `タイトル: ${idea.title}\nキャッチコピー: ${idea.catchCopy}\nデザイン構成: ${idea.layout}\n配色: ${idea.colorScheme}`,
                                    )
                                  }
                                  className="flex items-center gap-1 rounded-full border border-office-border px-2 py-0.5 text-[10px] text-office-muted hover:border-office-gold hover:text-office-gold"
                                >
                                  <Copy size={10} /> コピー
                                </button>
                              </div>
                              <p className="text-sm font-semibold text-office-text">{idea.title}</p>
                              <p className="mb-1 text-xs text-office-text">{idea.catchCopy}</p>
                              <p className="text-[11px] text-office-muted">構成: {idea.layout}</p>
                              <p className="text-[11px] text-office-muted">配色: {idea.colorScheme}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(
                      [
                        ["短い告知文", promoPack.shortAnnouncements.join("\n\n")],
                        ["記事紹介文", promoPack.articleIntro],
                        ["プロフィール誘導文", promoPack.profileLead],
                        ["販売note用CTA", promoPack.paidCta],
                        ["無料note用CTA", promoPack.freeCta],
                      ] as const
                    ).map(([label, text]) =>
                      text ? (
                        <div key={label} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                          <div className="mb-1 flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-office-gold">{label}</h4>
                            <button
                              type="button"
                              onClick={() => copyWith("コピーしました", text)}
                              className="flex items-center gap-1 rounded-full border border-office-border px-2 py-0.5 text-[10px] text-office-muted hover:border-office-gold hover:text-office-gold"
                            >
                              <Copy size={10} /> コピー
                            </button>
                          </div>
                          <p className="whitespace-pre-wrap text-xs text-office-text">{text}</p>
                        </div>
                      ) : null,
                    )}
                  </div>
                )}
              </Collapsible>
            )}

            {/* ⑥ コピー・エクスポート */}
            {currentMarkdown && (
              <section className="space-y-2 pb-8">
                <h3 className="text-sm font-semibold text-office-text">⑥ コピー・エクスポート</h3>
                {copyMessage && (
                  <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                    ✓ {copyMessage}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => copyWith("note貼り付け用テキストをコピーしました", toNotePasteText(currentMarkdown))}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white"
                >
                  <Copy size={15} /> note用にコピー
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyWith("Markdownをコピーしました", currentMarkdown)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold"
                  >
                    <Copy size={13} /> Markdownでコピー
                  </button>
                  <button
                    type="button"
                    onClick={() => copyWith("プレーンテキストをコピーしました", toPlainText(currentMarkdown))}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold"
                  >
                    <Copy size={13} /> プレーンでコピー
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => downloadText(`note原稿_${new Date().toISOString().slice(0, 10)}.md`, currentMarkdown)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2.5 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold"
                >
                  <Download size={15} /> ファイルとして保存（.md）
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-xs text-office-muted transition hover:border-red-400 hover:text-red-400"
                >
                  <RotateCcw size={13} /> 新しい記事を書く（現在の作業と履歴をクリア）
                </button>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
