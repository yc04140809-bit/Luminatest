import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import {
  FACT_CHECK_STATUSES,
  TREND_AUDIENCES,
  TREND_FORMATS,
  TREND_GENRES,
  TREND_LENGTHS,
  TREND_LEVELS,
  TREND_NOTE_STATUSES,
  TREND_PERIODS,
  TREND_STYLES,
  type TrendNoteRecord,
  type TrendTheme,
} from "@chaos-ai-suite/shared";
import { generateTrendArticle, researchTrendTopics } from "../api/officeApi.js";
import { findSimilarPast, listTrendNotes, removeTrendNote, saveTrendNote } from "../utils/trendNotes.js";

/** 生成の進行ステップ7段階（表示用。実際のAI呼び出しは調査1回+生成1回）。 */
const STEPS = [
  "最新情報を調査中",
  "トレンド候補を分析中",
  "記事テーマを選定中",
  "情報源を確認中",
  "note記事を作成中",
  "SNS告知文を作成中",
  "完成",
] as const;

const RESULT_TABS = [
  { id: "research", label: "調査結果" },
  { id: "article", label: "note本文" },
  { id: "sns", label: "SNS告知" },
  { id: "titles", label: "タイトル案" },
] as const;

type ResultTabId = (typeof RESULT_TABS)[number]["id"];

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelCls = "mb-1 block text-[11px] font-semibold text-office-muted";
const btnPrimary = "w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const btnSub = "rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40";
const copyChip = "flex items-center gap-1 rounded-full border border-office-border px-2 py-0.5 text-[10px] text-office-muted hover:border-office-gold hover:text-office-gold";

function levelLabel(id: string): string {
  return TREND_LEVELS.find((entry) => entry.id === id)?.label ?? id;
}

function levelColor(id: string): string {
  if (id === "high") return "bg-emerald-500/15 text-emerald-400";
  if (id === "low") return "bg-office-border/40 text-office-muted";
  return "bg-amber-500/15 text-amber-400";
}

function factColor(id: string): string {
  if (id === "verified" || id === "multi") return "bg-emerald-500/15 text-emerald-400";
  if (id === "single") return "bg-amber-500/15 text-amber-400";
  if (id === "inference") return "bg-sky-500/15 text-sky-400";
  return "bg-red-500/15 text-red-400";
}

function newRecordId(): string {
  return `trend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-office-border bg-office-panel">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-3 text-left">
        {open ? <ChevronDown size={14} className="shrink-0 text-office-muted" /> : <ChevronRight size={14} className="shrink-0 text-office-muted" />}
        <span className="flex-1 text-sm font-semibold text-office-text">{title}</span>
      </button>
      {open && <div className="border-t border-office-border px-3 py-3">{children}</div>}
    </div>
  );
}

/**
 * トレンドnote生成AI。設定を選んでボタンを押すと、①Web検索つきリサーチ（1回のAI呼び出し）で
 * テーマ3件＋情報源を取得 → ②テーマを1つ選ぶと記事本文・SNS告知・推奨タイトル+別候補4案・
 * ファクトチェックを1回の呼び出しでまとめて生成する。履歴・重複判定・コピーはAI不使用。
 * 自動投稿は行わない（コピーしてnoteへ貼り付ける）。
 */
export function TrendNoteStudio() {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<TrendNoteRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [genre, setGenre] = useState<string>(TREND_GENRES[0]);
  const [freeGenre, setFreeGenre] = useState("");
  const [audience, setAudience] = useState<string>(TREND_AUDIENCES[0]);
  const [period, setPeriod] = useState<string>("d7");
  const [format, setFormat] = useState<string>(TREND_FORMATS[0]);
  const [length, setLength] = useState<string>("medium");
  const [style, setStyle] = useState<string>(TREND_STYLES[0]);

  const [phase, setPhase] = useState<"idle" | "researching" | "generating">("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; danger?: boolean; onOk: () => void } | null>(null);
  const [tab, setTab] = useState<ResultTabId>("research");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["themes"]));

  useEffect(() => {
    if (open) setRecords(listTrendNotes());
  }, [open]);

  // 進行ステップの演出: リサーチ中は1〜4、生成中は5〜6をゆっくり進める（処理自体とは独立した表示）
  useEffect(() => {
    if (stepTimer.current) clearInterval(stepTimer.current);
    if (phase === "researching") {
      setStepIndex(0);
      stepTimer.current = setInterval(() => setStepIndex((prev) => Math.min(prev + 1, 3)), 9000);
    } else if (phase === "generating") {
      setStepIndex(4);
      stepTimer.current = setInterval(() => setStepIndex((prev) => Math.min(prev + 1, 5)), 15000);
    }
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, [phase]);

  const active = records.find((entry) => entry.id === activeId) ?? null;
  const effectiveGenre = genre === "自由入力" ? freeGenre.trim() : genre;

  function update(record: TrendNoteRecord): void {
    setRecords(saveTrendNote(record));
  }

  function toggleSection(id: string): void {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setToast("クリップボードにコピーしました");
      setTimeout(() => setToast(null), 1600);
    } catch {
      setError("コピーできませんでした。テキストを長押しして手動でコピーしてください。");
    }
  }

  // ---------- ①リサーチ（Web検索つき・AI呼び出し1回） ----------

  function runResearch(): void {
    if (!effectiveGenre) {
      setError("ジャンルを選択するか、自由入力欄にテーマを入力してください。");
      return;
    }
    setConfirm({
      message:
        `Claude APIとWeb検索を使って「${effectiveGenre}」の最新トレンドを調査します（検索は最大5回、完了まで30秒〜2分）。\n\n` +
        `調査後にテーマ候補が3件提案され、選んだ1件だけが記事になります。よろしいですか？`,
      onOk: () => {
        if (phase !== "idle") return;
        setPhase("researching");
        setError(null);
        void (async () => {
          try {
            const research = await researchTrendTopics({ genre: effectiveGenre, audience, period });
            const record: TrendNoteRecord = {
              id: newRecordId(),
              createdAt: new Date().toISOString(),
              researchDate: research.researchDate,
              genre: effectiveGenre,
              audience,
              period: period as TrendNoteRecord["period"],
              format,
              length: length as TrendNoteRecord["length"],
              style,
              research,
              status: "draft",
            };
            update(record);
            setActiveId(record.id);
            setOpenSections(new Set(["themes"]));
            setTab("research");
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setPhase("idle");
          }
        })();
      },
    });
  }

  // ---------- ②記事生成（選択テーマ・AI呼び出し1回） ----------

  function runGenerate(record: TrendNoteRecord, themeIndex: number): void {
    const theme = record.research?.themes[themeIndex];
    if (!record.research || !theme) return;

    const exec = () => {
      if (phase !== "idle") return;
      setPhase("generating");
      setError(null);
      void (async () => {
        try {
          const article = await generateTrendArticle({
            theme,
            sources: record.research!.sources,
            researchDate: record.researchDate,
            genre: record.genre,
            audience: record.audience,
            format: record.format,
            length: record.length,
            style: record.style,
          });
          update({ ...record, selectedThemeIndex: themeIndex, article, userEdits: undefined });
          setTab("article");
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setPhase("idle");
        }
      })();
    };

    // 過去記事との重複チェック（クライアント処理・AI不使用）
    const similar = findSimilarPast(
      theme.title,
      theme.searchKeywords,
      records.filter((entry) => entry.id !== record.id),
    );
    const alternatives = record.research.themes
      .map((entry, index) => ({ entry, index }))
      .filter(({ index }) => index !== themeIndex);
    if (similar) {
      setConfirm({
        message:
          `過去の記事と内容が似ています。別の切り口を選択してください。\n\n` +
          `似ている過去記事: 「${similar.pastTitle}」\n\n` +
          `代替案:\n` +
          alternatives.map(({ entry }, i) => `${i + 1}. ${entry.title}`).join("\n") +
          `\n${alternatives.length + 1}. このまま生成する（切り口「${theme.angle}」を活かして差別化する）\n\n` +
          `このまま生成しますか？`,
        onOk: exec,
      });
      return;
    }
    if (record.article) {
      setConfirm({ message: "Claude APIを使用して記事を作り直します。現在の記事は置き換えられます。よろしいですか？", onOk: exec });
      return;
    }
    setConfirm({
      message: `Claude APIを1回使用して、テーマ「${theme.title}」のnote本文・SNS告知・タイトル案をまとめて生成します。よろしいですか？`,
      onOk: exec,
    });
  }

  // ---------- 表示 ----------

  const busy = phase !== "idle";
  const article = active?.article;
  const selectedTheme = active?.research && active.selectedThemeIndex !== undefined ? active.research.themes[active.selectedThemeIndex] : undefined;
  const currentBody = active?.userEdits ?? article?.body ?? "";
  const uncheckedCount = article?.factChecks.filter((item) => item.status === "check").length ?? 0;
  const fullText = article ? `${article.title}\n\n${currentBody}\n\n${article.hashtags.join(" ")}` : "";

  return (
    <>
      <section className="rounded-xl border border-office-border bg-office-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
          <TrendingUp size={18} />
          トレンドnote生成
        </h2>
        <p className="mb-3 text-xs text-office-muted">SNS・検索・ニュースの話題を調査し、今学ぶ価値があるテーマをnote記事にします。</p>
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold">
          今日のトレンドを開く
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
          <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-xl text-office-gold">
              {active ? (
                <button type="button" onClick={() => setActiveId(null)} className="flex items-center gap-1 text-office-muted hover:text-office-gold">
                  <ChevronLeft size={20} />
                </button>
              ) : (
                <TrendingUp size={20} />
              )}
              今日のトレンドからnoteを作る
            </h2>
            <button type="button" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold">
              <X size={16} /> 戻る
            </button>
          </div>

          <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
            {toast && <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">✓ {toast}</p>}

            {/* 進行ステップ表示 */}
            {busy && (
              <div className="rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-3">
                {STEPS.map((step, index) => (
                  <p key={step} className={`flex items-center gap-2 py-0.5 text-xs ${index === stepIndex ? "font-semibold text-office-gold" : index < stepIndex ? "text-emerald-400" : "text-office-muted"}`}>
                    {index < stepIndex ? <Check size={12} /> : index === stepIndex ? <Loader2 size={12} className="animate-spin" /> : <span className="inline-block w-3" />}
                    {index + 1}. {step}
                  </p>
                ))}
              </div>
            )}

            {!active ? (
              <>
                {/* ===== 入力設定 ===== */}
                <div className="rounded-lg border border-office-border bg-office-panel p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>ジャンル</label>
                      <select value={genre} onChange={(event) => setGenre(event.target.value)} className={inputCls}>
                        {TREND_GENRES.map((entry) => (<option key={entry} value={entry}>{entry}</option>))}
                        <option value="自由入力">自由入力</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>読者</label>
                      <select value={audience} onChange={(event) => setAudience(event.target.value)} className={inputCls}>
                        {TREND_AUDIENCES.map((entry) => (<option key={entry} value={entry}>{entry}</option>))}
                      </select>
                    </div>
                    {genre === "自由入力" && (
                      <div className="col-span-2">
                        <label className={labelCls}>調査したいテーマ（自由入力）</label>
                        <input value={freeGenre} onChange={(event) => setFreeGenre(event.target.value)} className={inputCls} placeholder="例: AI音声、Notion活用 など" />
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>調査期間</label>
                      <select value={period} onChange={(event) => setPeriod(event.target.value)} className={inputCls}>
                        {TREND_PERIODS.map((entry) => (<option key={entry.id} value={entry.id}>{entry.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>記事形式</label>
                      <select value={format} onChange={(event) => setFormat(event.target.value)} className={inputCls}>
                        {TREND_FORMATS.map((entry) => (<option key={entry} value={entry}>{entry}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>文字数</label>
                      <select value={length} onChange={(event) => setLength(event.target.value)} className={inputCls}>
                        {TREND_LENGTHS.map((entry) => (<option key={entry.id} value={entry.id}>{entry.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>文体</label>
                      <select value={style} onChange={(event) => setStyle(event.target.value)} className={inputCls}>
                        {TREND_STYLES.map((entry) => (<option key={entry} value={entry}>{entry}</option>))}
                      </select>
                    </div>
                  </div>

                  <button type="button" onClick={runResearch} disabled={busy} className={`${btnPrimary} mt-3`}>
                    {phase === "researching" ? "ミライが調査中...（30秒〜2分）" : "今日の記事を生成する"}
                  </button>
                  <p className="mt-1.5 text-[10px] text-office-muted">
                    ※ 調査1回＋記事生成1回の計2回のAI呼び出しで完成します。生成された記事は必ず内容を確認してから投稿してください（自動投稿はされません）。
                  </p>
                </div>

                {/* ===== 生成履歴 ===== */}
                {records.length > 0 && <h3 className="pt-1 text-xs font-semibold text-office-muted">生成履歴</h3>}
                {records.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-office-border bg-office-panel px-3 py-3">
                    <button type="button" onClick={() => { setActiveId(entry.id); setTab(entry.article ? "article" : "research"); setOpenSections(new Set(["themes"])); }} className="block w-full text-left">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-office-text">
                          {entry.article?.title ?? `${entry.genre}の調査（テーマ未選択）`}
                        </p>
                        <span className="shrink-0 rounded-full border border-office-border px-2 py-0.5 text-[10px] font-semibold text-office-muted">
                          {TREND_NOTE_STATUSES.find((status) => status.id === entry.status)?.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-office-muted">
                        調査日: {entry.researchDate} ・ {entry.genre} ・ {entry.audience}
                      </p>
                    </button>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <select
                        value={entry.status}
                        onChange={(event) => update({ ...entry, status: event.target.value as TrendNoteRecord["status"] })}
                        className="rounded-lg border border-office-border bg-office-bg px-2 py-1 text-[11px] text-office-text"
                      >
                        {TREND_NOTE_STATUSES.map((status) => (<option key={status.id} value={status.id}>{status.label}</option>))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setConfirm({ message: "この生成履歴を削除します。よろしいですか？", danger: true, onOk: () => setRecords(removeTrendNote(entry.id)) })}
                        className="flex items-center gap-1 rounded-lg border border-office-border px-2 py-1 text-[11px] text-office-muted hover:border-red-400 hover:text-red-400"
                      >
                        <Trash2 size={11} /> 削除
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {/* ===== 生成結果 ===== */}

                {/* テーマ選択（記事未生成 or 再選択用） */}
                {active.research && (
                  <Section title={`テーマ候補（${active.research.themes.length}件）`} open={openSections.has("themes")} onToggle={() => toggleSection("themes")}>
                    <div className="space-y-2">
                      {active.research.themes.map((theme, index) => (
                        <ThemeCard
                          key={index}
                          theme={theme}
                          selected={active.selectedThemeIndex === index}
                          busy={busy}
                          onSelect={() => runGenerate(active, index)}
                        />
                      ))}
                    </div>
                  </Section>
                )}

                {/* タブ */}
                <div className="flex gap-1.5">
                  {RESULT_TABS.map((entry) => (
                    <button key={entry.id} type="button" onClick={() => setTab(entry.id)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${tab === entry.id ? "bg-office-gold/20 text-office-gold" : "border border-office-border text-office-muted"}`}>
                      {entry.label}
                    </button>
                  ))}
                </div>

                {/* タブ1: 調査結果 */}
                {tab === "research" && active.research && (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-office-border bg-office-panel p-3 text-xs text-office-text">
                      <p><span className="font-semibold text-office-gold">調査日:</span> {active.researchDate}</p>
                      {selectedTheme && (
                        <>
                          <p className="mt-1"><span className="font-semibold text-office-gold">おすすめテーマ:</span> {selectedTheme.title}</p>
                          <p><span className="font-semibold text-office-gold">総合評価:</span> {selectedTheme.totalScore}点（参考値）</p>
                          <p className="mt-1"><span className="font-semibold text-office-gold">注目されている理由:</span> {selectedTheme.reason}</p>
                          <p><span className="font-semibold text-office-gold">想定読者:</span> {selectedTheme.targetReader}</p>
                          <p><span className="font-semibold text-office-gold">推奨検索キーワード:</span> {selectedTheme.searchKeywords.join(" / ") || "（なし）"}</p>
                        </>
                      )}
                    </div>

                    <Section title={`情報源一覧（${active.research.sources.length}件）`} open={openSections.has("sources")} onToggle={() => toggleSection("sources")}>
                      <div className="space-y-1.5">
                        {active.research.sources.map((source, index) => (
                          <div key={index} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                            <div className="mb-0.5 flex items-center gap-2">
                              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-office-text">{source.title}</p>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelColor(source.reliability)}`}>信頼性: {levelLabel(source.reliability)}</span>
                            </div>
                            <p className="text-[10px] text-office-muted">
                              {source.sourceName}（{source.platform}） ・ 公開日: {source.publishedAt} ・ 取得: {new Date(source.retrievedAt).toLocaleDateString("ja-JP")}
                            </p>
                            <p className="mt-0.5 text-[11px] text-office-text">{source.summary}</p>
                            {source.url && (
                              <a href={source.url} target="_blank" rel="noreferrer" className="break-all text-[10px] text-sky-400 underline">{source.url}</a>
                            )}
                          </div>
                        ))}
                      </div>
                    </Section>

                    {active.research.notes.length > 0 && (
                      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                        <h4 className="mb-1 text-xs font-semibold text-amber-400">注意事項</h4>
                        <ul className="list-inside list-disc space-y-0.5 text-[11px] text-amber-300">
                          {active.research.notes.map((note, index) => (<li key={index}>{note}</li>))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* タブ2: note本文 */}
                {tab === "article" && (
                  !article ? (
                    <p className="py-6 text-center text-sm text-office-muted">上のテーマ候補から1件選ぶと記事が生成されます。</p>
                  ) : (
                    <div className="space-y-2">
                      {uncheckedCount > 0 && (
                        <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                          ⚠ 「要確認」の主張が{uncheckedCount}件残っています。投稿前に必ず内容を確認・修正してください。
                        </p>
                      )}
                      <div className="rounded-lg border border-office-border bg-office-panel p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <h3 className="min-w-0 flex-1 text-sm font-semibold text-office-text">{article.title}</h3>
                          <button type="button" onClick={() => void copyText(article.title)} className={copyChip}><Copy size={10} /> タイトル</button>
                        </div>
                        <textarea
                          value={currentBody}
                          onChange={(event) => update({ ...active, userEdits: event.target.value })}
                          rows={16}
                          className={`${inputCls} text-xs leading-relaxed`}
                        />
                        <p className="mt-1 text-[10px] text-office-muted">本文はこの欄で直接編集できます（編集内容は自動保存）。</p>
                        <p className="mt-1.5 text-xs text-office-gold">{article.hashtags.join(" ")}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => void copyText(fullText)} className={btnSub}>全文コピー</button>
                          <button type="button" onClick={() => void copyText(currentBody)} className={btnSub}>本文のみコピー</button>
                          <button type="button" onClick={() => void copyText(article.hashtags.join(" "))} className={btnSub}>ハッシュタグのみコピー</button>
                        </div>
                      </div>

                      <Section title={`ファクトチェック（${article.factChecks.length}件）`} open={openSections.has("facts")} onToggle={() => toggleSection("facts")}>
                        <div className="space-y-1.5">
                          {article.factChecks.map((item, index) => (
                            <div key={index} className="flex items-start gap-2 rounded-lg border border-office-border bg-office-bg p-2">
                              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${factColor(item.status)}`}>
                                {FACT_CHECK_STATUSES.find((status) => status.id === item.status)?.label}
                              </span>
                              <p className="text-[11px] text-office-text">{item.claim}</p>
                            </div>
                          ))}
                          <p className="text-[10px] text-office-muted">※「単一情報源」「推測を含む」「要確認」の内容は、投稿前にご自身で確認することをおすすめします。</p>
                        </div>
                      </Section>
                    </div>
                  )
                )}

                {/* タブ3: SNS告知 */}
                {tab === "sns" && (
                  !article ? (
                    <p className="py-6 text-center text-sm text-office-muted">記事を生成するとSNS告知文が表示されます。</p>
                  ) : (
                    <div className="space-y-2">
                      {(
                        [
                          ["Threads短文", article.sns.threadsShort],
                          ["Threadsツリー", article.sns.threadsThread.join("\n\n---\n\n")],
                          ...article.sns.x.map((post, index) => [`X投稿 ${index + 1}`, post] as [string, string]),
                          ["Instagram紹介文", article.sns.instagram],
                        ] as [string, string][]
                      ).map(([label, text]) =>
                        text ? (
                          <div key={label} className="rounded-lg border border-office-border bg-office-panel p-2.5">
                            <div className="mb-1 flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-office-gold">{label}</h4>
                              <button type="button" onClick={() => void copyText(text)} className={copyChip}><Copy size={10} /> コピー</button>
                            </div>
                            <p className="whitespace-pre-wrap text-xs text-office-text">{text}</p>
                          </div>
                        ) : null,
                      )}
                      <p className="text-[10px] text-office-muted">※ 自動投稿はされません。コピーして各SNSから投稿してください。</p>
                    </div>
                  )
                )}

                {/* タブ4: タイトル案 */}
                {tab === "titles" && (
                  !article ? (
                    <p className="py-6 text-center text-sm text-office-muted">記事を生成すると、推奨タイトルに加えて別のタイトル候補4案が表示されます。</p>
                  ) : (
                    <div className="space-y-1.5">
                      {article.titleIdeas.map((idea, index) => (
                        <div key={index} className="flex items-center gap-2 rounded-lg border border-office-border bg-office-panel p-2.5">
                          <span className="shrink-0 rounded-full bg-office-gold/15 px-2 py-0.5 text-[10px] font-semibold text-office-gold">{idea.tag}</span>
                          <p className="min-w-0 flex-1 text-xs text-office-text">{idea.title}</p>
                          <button type="button" onClick={() => void copyText(idea.title)} className={copyChip}><Copy size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 状態 */}
                <div className="flex items-center gap-2 pb-8">
                  <label className="text-[11px] font-semibold text-office-muted">状態:</label>
                  <select
                    value={active.status}
                    onChange={(event) => update({ ...active, status: event.target.value as TrendNoteRecord["status"] })}
                    className="rounded-lg border border-office-border bg-office-bg px-2 py-1.5 text-xs text-office-text"
                  >
                    {TREND_NOTE_STATUSES.map((status) => (<option key={status.id} value={status.id}>{status.label}</option>))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* 確認ダイアログ */}
          {confirm && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6">
              <div className={`w-full max-w-sm rounded-xl border bg-office-panel p-5 ${confirm.danger ? "border-red-500/50" : "border-office-gold/50"}`}>
                <h4 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${confirm.danger ? "text-red-400" : "text-office-gold"}`}>
                  <AlertTriangle size={16} /> 確認
                </h4>
                <p className="mb-4 whitespace-pre-wrap text-xs leading-relaxed text-office-text">{confirm.message}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-lg border border-office-border px-3 py-2.5 text-sm font-semibold text-office-text">キャンセル</button>
                  <button type="button" onClick={() => { const action = confirm.onOk; setConfirm(null); action(); }} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-white ${confirm.danger ? "bg-red-600" : "bg-office-accent"}`}>
                    実行する
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** テーマ候補カード。評価は高・中・低の相対表示（推測の数値は出さない）。 */
function ThemeCard({ theme, selected, busy, onSelect }: { theme: TrendTheme; selected: boolean; busy: boolean; onSelect: () => void }) {
  return (
    <div className={`rounded-lg border p-2.5 ${selected ? "border-office-gold bg-office-gold/10" : "border-office-border bg-office-bg"}`}>
      <div className="mb-1 flex items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-office-text">{theme.title}</p>
        <span className="shrink-0 rounded-full bg-office-gold/15 px-2 py-0.5 text-[10px] font-semibold text-office-gold">{theme.totalScore}点</span>
      </div>
      <p className="mb-1 text-[11px] text-office-muted">{theme.reason}</p>
      <div className="mb-1.5 flex flex-wrap gap-1">
        {(
          [
            ["新しさ", theme.freshness],
            ["検索需要", theme.demand],
            ["初心者需要", theme.beginnerFit],
            ["記事化", theme.writability],
            ["収益化", theme.monetizeFit],
          ] as const
        ).map(([label, value]) => (
          <span key={label} className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${levelColor(value)}`}>
            {label}: {levelLabel(value)}
          </span>
        ))}
      </div>
      {theme.cautions.length > 0 && (
        <p className="mb-1.5 text-[10px] text-amber-400">注意: {theme.cautions.join(" / ")}</p>
      )}
      <button type="button" onClick={onSelect} disabled={busy} className="w-full rounded-lg bg-office-accent px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40">
        {selected ? "このテーマで作り直す（AI・1回）" : "このテーマで記事を作る（AI・1回）"}
      </button>
    </div>
  );
}
