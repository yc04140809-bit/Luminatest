import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Radar,
  Trash2,
  X,
} from "lucide-react";
import {
  CASE_CATEGORIES,
  CASE_SOURCES,
  INSTANT_LEVELS,
  SCOUT_CATEGORIES,
  SCOUT_DECISIONS,
  SCOUT_SOURCES,
  SCOUT_STATUSES,
  type Agent,
  type CaseRequirements,
  type CaseTask,
  type ProjectCase,
  type ScoutRecord,
  type ScoutStatusId,
} from "@chaos-ai-suite/shared";
import { analyzeScoutCase } from "../api/officeApi.js";
import { aggregateScoutStats, calcScoutProfit, listScouts, newScoutRecord, removeScout, saveScout } from "../utils/scouts.js";
import { listCases, newId, saveCase } from "../utils/cases.js";

const MAX_BODY_LENGTH = 20000;

const FILTERS = [
  { id: "all", label: "すべて" },
  { id: "circle", label: "⭕のみ" },
  { id: "triangle", label: "△のみ" },
  { id: "cross", label: "❌のみ" },
  { id: "applied", label: "応募済み" },
  { id: "won", label: "受注" },
  { id: "skipped", label: "見送り" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const SORTS = [
  { id: "new", label: "新しい順" },
  { id: "price", label: "金額が高い順" },
  { id: "hourly", label: "想定時給が高い順" },
  { id: "deadline", label: "期限が近い順" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

/** 応募済み扱いのステータス（一覧絞り込み用）。 */
const APPLIED_STATUSES: ScoutStatusId[] = ["applied", "waiting", "negotiating", "won", "lost"];

const DECISION_STYLE: Record<string, string> = {
  circle: "border-emerald-500/60 bg-emerald-500/10 text-emerald-400",
  triangle: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  cross: "border-red-500/60 bg-red-500/10 text-red-400",
};

const STATUS_COLOR: Record<string, string> = {
  undecided: "border-office-border text-office-muted",
  preparing: "border-sky-500/50 text-sky-400",
  applied: "border-office-gold/60 text-office-gold",
  waiting: "border-office-border text-office-text",
  negotiating: "border-amber-500/60 text-amber-400",
  won: "border-emerald-500/50 text-emerald-400",
  lost: "border-red-500/50 text-red-400",
  skipped: "border-office-border text-office-muted",
  closed: "border-office-border text-office-muted",
};

function statusLabel(id: string): string {
  return SCOUT_STATUSES.find((status) => status.id === id)?.label ?? id;
}

function decisionInfo(id: string | undefined) {
  return SCOUT_DECISIONS.find((decision) => decision.id === id);
}

function instantLabel(id: string): string {
  return INSTANT_LEVELS.find((level) => level.id === id)?.label ?? id;
}

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelCls = "mb-1 block text-[11px] font-semibold text-office-muted";
const btnPrimary = "w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const btnSub = "rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40";

function Section({
  title, open, onToggle, children, badge,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode; badge?: string;
}) {
  return (
    <div className="rounded-lg border border-office-border bg-office-panel">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-3 text-left">
        {open ? <ChevronDown size={14} className="shrink-0 text-office-muted" /> : <ChevronRight size={14} className="shrink-0 text-office-muted" />}
        <span className="flex-1 text-sm font-semibold text-office-text">{title}</span>
        {badge && <span className="shrink-0 rounded-full bg-office-gold/15 px-2 py-0.5 text-[10px] font-semibold text-office-gold">{badge}</span>}
      </button>
      {open && <div className="border-t border-office-border px-3 py-3">{children}</div>}
    </div>
  );
}

function BulletList({ items, tone }: { items: string[]; tone?: "warn" | "muted" }) {
  if (items.length === 0) return <p className="text-xs text-office-muted">（なし）</p>;
  return (
    <ul className={`list-inside list-disc space-y-0.5 text-xs ${tone === "warn" ? "text-amber-400" : tone === "muted" ? "text-office-muted" : "text-office-text"}`}>
      {items.map((item, index) => (<li key={index}>{item}</li>))}
    </ul>
  );
}

/**
 * スカウト案件の分析結果を、既存の案件工房のProjectCaseへ変換する（AI不使用・クライアント処理）。
 * 工程案→作業工程、確認質問→クライアント確認文として引き継ぎ、二重実装を避ける。
 */
function scoutToProjectCase(scout: ScoutRecord, agents: Agent[]): ProjectCase {
  const analysis = scout.analysis;
  const now = new Date().toISOString();
  const profit = calcScoutProfit(scout);

  const requirements: CaseRequirements | undefined = analysis
    ? {
        purpose: analysis.purpose || "未確認",
        audience: "未確認",
        deliverables: analysis.deliverables,
        desiredDeadline: scout.deliveryDeadline || "未確認",
        tone: "未確認",
        mustConditions: analysis.mustConditions,
        prohibitions: [],
        references: scout.url ? [scout.url] : [],
        missingInfo: analysis.missingInformation,
        questionsForClient: analysis.missingInformation,
        workSteps: analysis.workflow.map((step) => step.title),
        risks: [...analysis.risks, ...analysis.failureRisks],
        completionCriteria: "未確認",
      }
    : undefined;

  const agentIds = new Set(agents.map((agent) => agent.id));
  const tasks: CaseTask[] | undefined = analysis
    ? analysis.workflow.map((step) => ({
        id: newId("ctask"),
        title: step.title,
        assignedAgentId: step.agentId && agentIds.has(step.agentId) ? step.agentId : undefined,
        description: step.description,
        completionCriteria: step.completionCriteria,
        status: "not_started",
        note: `目安${step.estimatedMinutes}分${step.humanCheck ? " ・ 人の確認が必要" : ""}`,
      }))
    : undefined;

  const decision = decisionInfo(analysis?.decision);
  const memoLines: string[] = [];
  if (decision && analysis) {
    memoLines.push(`【スカウター判定】${decision.mark} ${decision.label}`);
    memoLines.push(analysis.summary);
    if (profit.hourly !== undefined) memoLines.push(`想定時給: ¥${profit.hourly.toLocaleString()}/時（実利益 ¥${profit.profit.toLocaleString()}）`);
  }
  if (scout.source && !(CASE_SOURCES as readonly string[]).includes(scout.source)) memoLines.push(`募集元: ${scout.source}`);
  if (scout.category && !(CASE_CATEGORIES as readonly string[]).includes(scout.category)) memoLines.push(`種別: ${scout.category}`);
  if (scout.url) memoLines.push(`募集URL: ${scout.url}`);
  if (scout.applyDeadline) memoLines.push(`応募期限: ${scout.applyDeadline}`);
  if (scout.memo?.trim()) memoLines.push(`メモ: ${scout.memo.trim()}`);
  if (analysis?.applicationMessages.polite) {
    memoLines.push("--- 応募文（丁寧・スカウターより） ---");
    memoLines.push(analysis.applicationMessages.polite);
  }

  return {
    id: newId("case"),
    title: scout.title.trim() || "スカウト案件",
    category: scout.category && (CASE_CATEGORIES as readonly string[]).includes(scout.category) ? scout.category : undefined,
    source: scout.source ? ((CASE_SOURCES as readonly string[]).includes(scout.source) ? scout.source : "その他") : undefined,
    deadline: scout.deliveryDeadline || undefined,
    price: scout.price,
    feeType: "percent",
    feeValue: scout.feePercent,
    expenses: scout.expenses,
    aiCost: scout.aiCost,
    workMinutes: profit.totalMinutes > 0 ? profit.totalMinutes : undefined,
    memo: memoLines.join("\n"),
    status: "inquiry",
    requestText: scout.body,
    requirements,
    clientQuestions: analysis
      ? { polite: analysis.clientQuestions.polite, friendly: analysis.clientQuestions.friendly, short: analysis.clientQuestions.short }
      : undefined,
    tasks,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 案件スカウター。募集案件の本文を貼り付けると、受注すべきかの判定・理由・リスク・
 * 専門警告・工程案・応募文4種・確認質問3種までを1回のAI呼び出しでまとめて生成する。
 * 応募・送信は一切自動化しない（コピーして自分で送る）。履歴・集計・利益計算はクライアント処理。
 */
export function CaseScout({
  agents,
  open,
  onClose,
  onOpenCase,
}: {
  agents: Agent[];
  open: boolean;
  onClose: () => void;
  /** 案件工房へ登録した（または登録済みの）案件を開く */
  onOpenCase: (caseId: string) => void;
}) {
  const [scouts, setScouts] = useState<ScoutRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("new");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; danger?: boolean; onOk: () => void } | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["input"]));
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (open) setScouts(listScouts());
  }, [open]);

  const active = scouts.find((entry) => entry.id === activeId) ?? null;
  const stats = useMemo(() => aggregateScoutStats(scouts), [scouts]);

  function update(patch: Partial<ScoutRecord>): void {
    if (!active) return;
    setSaveState("saving");
    setScouts(saveScout({ ...active, ...patch }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("saved"), 350);
  }

  function toggleSection(id: string): void {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyText(text: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("コピーできませんでした。テキストを長押しして手動でコピーしてください。");
    }
  }

  function agentName(id: string): string {
    return agents.find((agent) => agent.id === id)?.name ?? "（不在の社員）";
  }

  // ---------- AI判定（1案件につき1回の呼び出し） ----------

  function runAnalyze(): void {
    if (!active) return;
    if (!active.body.trim()) {
      setError("案件内容が入力されていません。募集文または依頼文を貼り付けてください。");
      return;
    }
    if (active.body.length > MAX_BODY_LENGTH) {
      setError(`案件本文が長すぎます（${MAX_BODY_LENGTH.toLocaleString()}字以内にしてください）。`);
      return;
    }
    const exec = () => {
      if (busy) return;
      setBusy(true);
      setError(null);
      void (async () => {
        try {
          const analysis = await analyzeScoutCase({
            title: active.title.trim(),
            body: active.body.trim(),
            price: active.price,
            applyDeadline: active.applyDeadline,
            deliveryDeadline: active.deliveryDeadline,
            source: active.source,
            category: active.category,
          });
          // 利益シミュレーションの空欄にだけ、AIの見積もり値を初期値として入れる（入力済みの値は上書きしない）
          update({
            analysis,
            workMinutes: active.workMinutes ?? analysis.estimatedMinutes,
            revisionMinutes: active.revisionMinutes ?? analysis.estimatedRevisionMinutes,
            aiCost: active.aiCost ?? analysis.estimatedAiCost,
          });
          setOpenSections((prev) => new Set(prev).add("result").add("profit").add("apply"));
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      })();
    };
    if (active.analysis) {
      setConfirm({ message: "Claude APIを使用して案件を再分析します。保存済みの結果がありますが、再実行しますか？", onOk: exec });
    } else {
      exec();
    }
  }

  // ---------- 案件工房への登録（AI不使用・二重登録防止つき） ----------

  function registerToWorkshop(): void {
    if (!active) return;
    if (active.linkedCaseId && listCases().some((entry) => entry.id === active.linkedCaseId)) {
      onOpenCase(active.linkedCaseId);
      return;
    }
    setConfirm({
      message: "この案件を案件工房へ登録します（AIは使いません）。判定結果の工程案・確認質問・応募文も引き継がれます。よろしいですか？",
      onOk: () => {
        const projectCase = scoutToProjectCase(active, agents);
        saveCase(projectCase);
        update({ linkedCaseId: projectCase.id });
        onOpenCase(projectCase.id);
      },
    });
  }

  // ---------- 一覧の絞り込み・並び替え（クライアント処理） ----------

  const filtered = useMemo(() => {
    const list = scouts.filter((entry) => {
      if (filter === "circle" || filter === "triangle" || filter === "cross") return entry.analysis?.decision === filter;
      if (filter === "applied") return APPLIED_STATUSES.includes(entry.status);
      if (filter === "won") return entry.status === "won";
      if (filter === "skipped") return entry.status === "skipped";
      return true;
    });
    const sorted = [...list];
    if (sort === "price") sorted.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    if (sort === "hourly") sorted.sort((a, b) => (calcScoutProfit(b).hourly ?? -Infinity) - (calcScoutProfit(a).hourly ?? -Infinity));
    if (sort === "deadline") {
      const time = (entry: ScoutRecord) => {
        const deadline = entry.applyDeadline || entry.deliveryDeadline;
        return deadline ? new Date(deadline).getTime() : Infinity;
      };
      sorted.sort((a, b) => time(a) - time(b));
    }
    return sorted;
  }, [scouts, filter, sort]);

  const profit = active ? calcScoutProfit(active) : null;
  const analysis = active?.analysis;
  const decision = decisionInfo(analysis?.decision);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-office-bg">
      <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-xl text-office-gold">
          {active ? (
            <button type="button" onClick={() => setActiveId(null)} className="flex items-center gap-1 text-office-muted hover:text-office-gold">
              <ChevronLeft size={20} />
            </button>
          ) : (
            <Radar size={20} />
          )}
          {active ? (active.title.trim() || "無題の案件") : "案件スカウター"}
        </h2>
        <div className="flex items-center gap-2">
          {active && (
            <span className="text-[10px] text-office-muted">{saveState === "saving" ? "保存中…" : saveState === "saved" ? "保存済み" : ""}</span>
          )}
          <button type="button" onClick={onClose} className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold">
            <X size={16} /> 戻る
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        {copied && <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">✓ コピーしました</p>}

        {!active ? (
          <>
            {/* ===== スカウト一覧 ===== */}
            <button
              type="button"
              onClick={() => {
                const created = newScoutRecord();
                setScouts(saveScout(created));
                setActiveId(created.id);
                setOpenSections(new Set(["input"]));
                setError(null);
              }}
              className={`${btnPrimary} flex items-center justify-center gap-2`}
            >
              <Plus size={16} /> 新しい案件を判定する
            </button>

            {/* 成功率カード（自動集計・AI不使用） */}
            <div className="rounded-lg border border-office-border bg-office-panel px-3 py-3">
              <h3 className="mb-1.5 text-xs font-semibold text-office-gold">成功率データ（自動集計）</h3>
              <p className="text-xs text-office-text">
                分析 {stats.analyzed}件 ・ ⭕ {stats.circles}件 ・ 応募 {stats.applied}件 ・ 受注 {stats.won}件
              </p>
              <p className="text-xs text-office-muted">
                応募率 {stats.applyRate !== undefined ? `${stats.applyRate}%` : "—"} ・ 返信率 {stats.replyRate !== undefined ? `${stats.replyRate}%` : "—"} ・ 受注率 {stats.winRate !== undefined ? `${stats.winRate}%` : "—"}
              </p>
              {stats.won > 0 && (
                <p className="text-xs text-office-text">受注合計 ¥{stats.wonAmount.toLocaleString()} ・ 想定実利益 ¥{stats.wonEstimatedProfit.toLocaleString()}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((entry) => (
                <button key={entry.id} type="button" onClick={() => setFilter(entry.id)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === entry.id ? "bg-office-gold/20 text-office-gold" : "border border-office-border text-office-muted"}`}>
                  {entry.label}
                </button>
              ))}
            </div>

            <select value={sort} onChange={(event) => setSort(event.target.value as SortId)} className={inputCls}>
              {SORTS.map((entry) => (
                <option key={entry.id} value={entry.id}>並び替え: {entry.label}</option>
              ))}
            </select>

            {filtered.length === 0 && <p className="py-6 text-center text-sm text-office-muted">該当する案件はありません。</p>}

            {filtered.map((entry) => {
              const entryDecision = decisionInfo(entry.analysis?.decision);
              const entryProfit = calcScoutProfit(entry);
              return (
                <button key={entry.id} type="button" onClick={() => { setActiveId(entry.id); setOpenSections(new Set(entry.analysis ? ["result", "profit"] : ["input"])); }} className="block w-full rounded-lg border border-office-border bg-office-panel px-3 py-3 text-left transition hover:border-office-gold">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="shrink-0 text-base">{entryDecision ? entryDecision.mark : "・"}</span>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-office-text">{entry.title.trim() || "無題の案件"}</p>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[entry.status] ?? "border-office-border text-office-muted"}`}>
                      {statusLabel(entry.status)}
                    </span>
                  </div>
                  <p className="text-[11px] text-office-muted">
                    {entryDecision ? entryDecision.label : "未分析"}
                    {entry.price !== undefined && ` ・ ¥${entry.price.toLocaleString()}`}
                    {entryProfit.hourly !== undefined && ` ・ 想定時給 ¥${entryProfit.hourly.toLocaleString()}`}
                    {entry.linkedCaseId && " ・ 工房登録済み"}
                  </p>
                  <p className="text-[11px] text-office-muted">
                    応募期限: {entry.applyDeadline ? new Date(entry.applyDeadline).toLocaleDateString("ja-JP") : "未設定"}
                    ・ 更新: {new Date(entry.updatedAt).toLocaleString("ja-JP")}
                  </p>
                </button>
              );
            })}
          </>
        ) : (
          <>
            {/* ===== スカウト詳細 ===== */}

            {/* 案件情報の入力 */}
            <Section title="案件情報を入力" open={openSections.has("input")} onToggle={() => toggleSection("input")}>
              <div className="space-y-2">
                <div>
                  <label className={labelCls}>案件タイトル</label>
                  <input value={active.title} onChange={(event) => update({ title: event.target.value })} className={inputCls} placeholder="例: note記事のリライト募集" />
                </div>
                <div>
                  <label className={labelCls}>案件内容を貼り付け</label>
                  <p className="mb-1 text-[11px] text-office-muted">募集文・依頼文・条件などを貼り付けてください。スクリーンショットは読み込めないため、スクリーンショット内の文章をコピーして貼り付けてください。</p>
                  <textarea value={active.body} onChange={(event) => update({ body: event.target.value })} rows={7} className={inputCls} />
                  <p className="mt-1 text-[10px] text-office-muted">※ クライアントの氏名・連絡先などの個人情報は、消してから貼り付けることをおすすめします。</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>提示金額（円）</label>
                    <input type="number" min="0" inputMode="numeric" value={active.price ?? ""} onChange={(event) => update({ price: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>進行状態</label>
                    <select value={active.status} onChange={(event) => update({ status: event.target.value as ScoutStatusId })} className={inputCls}>
                      {SCOUT_STATUSES.map((status) => (
                        <option key={status.id} value={status.id}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>応募期限</label>
                    <input type="date" value={active.applyDeadline ?? ""} onChange={(event) => update({ applyDeadline: event.target.value || undefined })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>納品期限</label>
                    <input type="date" value={active.deliveryDeadline ?? ""} onChange={(event) => update({ deliveryDeadline: event.target.value || undefined })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>募集元</label>
                    <select value={active.source ?? ""} onChange={(event) => update({ source: event.target.value || undefined })} className={inputCls}>
                      <option value="">未設定</option>
                      {SCOUT_SOURCES.map((source) => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>案件の種類</label>
                    <select value={active.category ?? ""} onChange={(event) => update({ category: event.target.value || undefined })} className={inputCls}>
                      <option value="">未設定</option>
                      {SCOUT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>募集ページのURL（任意）</label>
                  <input value={active.url ?? ""} onChange={(event) => update({ url: event.target.value || undefined })} className={inputCls} placeholder="https://..." />
                </div>
                <div>
                  <label className={labelCls}>メモ（任意）</label>
                  <textarea value={active.memo ?? ""} onChange={(event) => update({ memo: event.target.value })} rows={2} className={inputCls} />
                </div>
              </div>
            </Section>

            <button type="button" onClick={runAnalyze} disabled={busy} className={btnPrimary}>
              {busy ? "セイラが審査中...（10〜60秒）" : active.analysis ? "この案件を再判定する（AI・1回）" : "この案件を判定する（AI・1回）"}
            </button>
            <p className="text-[10px] text-office-muted">※ 判定・理由・リスク・工程案・応募文まで1回のAI呼び出しでまとめて生成します。応募や送信が自動で行われることはありません。</p>

            {analysis && decision && (
              <>
                {/* 判定結果ヘッダー */}
                <div className={`rounded-xl border px-4 py-4 ${DECISION_STYLE[analysis.decision] ?? "border-office-border text-office-text"}`}>
                  <p className="mb-1 text-2xl font-bold">{decision.mark} {decision.label}</p>
                  <p className="text-xs leading-relaxed">{analysis.summary}</p>
                </div>

                {analysis.specialistWarning && (
                  <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                      <AlertTriangle size={14} /> この案件には専門資格・権利・規約上の確認が必要な可能性があります。受注前に条件を確認してください。
                    </p>
                    {analysis.specialistWarningDetail && <p className="mt-1 text-[11px] text-red-300">{analysis.specialistWarningDetail}</p>}
                  </div>
                )}

                <div className="rounded-lg border border-office-border bg-office-panel px-3 py-2.5 text-xs text-office-text">
                  <p><span className="font-semibold text-office-gold">即納可能性:</span> {instantLabel(analysis.instantDeliveryLevel)}</p>
                  {analysis.instantDeliveryLevel === "same_day" && (
                    <p className="mt-0.5 text-[11px] text-amber-400">※ 即日対応でも、最終確認と必要な修正を行った後に納品してください。</p>
                  )}
                  <p className="mt-1"><span className="font-semibold text-office-gold">AI見積もり:</span> 制作 約{analysis.estimatedMinutes}分 ・ 修正 約{analysis.estimatedRevisionMinutes}分 ・ AI利用費 約¥{analysis.estimatedAiCost.toLocaleString()}</p>
                  <p className="mt-1"><span className="font-semibold text-office-gold">現在の機能だけで完結:</span> {analysis.selfContained ? "できる見込み" : "できない可能性あり（下の不足項目を確認）"}</p>
                </div>

                {/* 判定の詳細 */}
                <Section title="判定理由・強み・難しい部分" open={openSections.has("result")} onToggle={() => toggleSection("result")}>
                  <div className="space-y-2">
                    <div><h4 className="mb-1 text-[11px] font-semibold text-office-gold">判定理由</h4><BulletList items={analysis.reasons} /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-emerald-400">納品できる根拠（強み）</h4><BulletList items={analysis.strengths} /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-amber-400">難しい部分</h4><BulletList items={analysis.difficulties} tone="warn" /></div>
                  </div>
                </Section>

                <Section title="案件内容の整理" open={openSections.has("detail")} onToggle={() => toggleSection("detail")}>
                  <div className="space-y-2">
                    <div><h4 className="mb-1 text-[11px] font-semibold text-office-gold">案件の目的</h4><p className="text-xs text-office-text">{analysis.purpose}</p></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-office-gold">求められている成果物</h4><BulletList items={analysis.deliverables} /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-office-gold">重要条件（必須・納期・予算など）</h4><BulletList items={analysis.mustConditions} /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-office-gold">必要スキル</h4><BulletList items={analysis.requiredSkills} /></div>
                  </div>
                </Section>

                <Section title="リスク・確認事項" open={openSections.has("risk")} onToggle={() => toggleSection("risk")} badge={analysis.missingInformation.length > 0 ? `未確認 ${analysis.missingInformation.length}件` : undefined}>
                  <div className="space-y-2">
                    <div><h4 className="mb-1 text-[11px] font-semibold text-amber-400">不明点・クライアントへ確認すべきこと</h4><BulletList items={analysis.missingInformation} tone="warn" /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-amber-400">想定される失敗</h4><BulletList items={analysis.failureRisks} tone="warn" /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-amber-400">見落としやすい条件</h4><BulletList items={analysis.overlookedConditions} tone="warn" /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-office-gold">受注する場合の前提条件</h4><BulletList items={analysis.preconditions} /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-red-400">リスク（権利・規約・品質保証など）</h4><BulletList items={analysis.risks} tone="warn" /></div>
                  </div>
                </Section>

                <Section title="AI社員の対応体制" open={openSections.has("team")} onToggle={() => toggleSection("team")}>
                  <div className="space-y-2">
                    <div>
                      <h4 className="mb-1 text-[11px] font-semibold text-office-gold">対応できるAI社員</h4>
                      {analysis.availableAgents.length === 0 ? <p className="text-xs text-office-muted">（なし）</p> : (
                        <ul className="space-y-0.5 text-xs text-office-text">
                          {analysis.availableAgents.map((entry, index) => (
                            <li key={index}>・{agentName(entry.agentId)}: {entry.role}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-amber-400">不足している役割</h4><BulletList items={analysis.missingRoles} tone="warn" /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-office-gold">人間（あなた）が確認すべき作業</h4><BulletList items={analysis.humanChecks} /></div>
                    <div><h4 className="mb-1 text-[11px] font-semibold text-office-gold">外部ツールが必要な作業</h4><BulletList items={analysis.externalTools} tone="muted" /></div>
                  </div>
                </Section>

                <Section title={`受注後の工程案（${analysis.workflow.length}）`} open={openSections.has("workflow")} onToggle={() => toggleSection("workflow")}>
                  <div className="space-y-1.5">
                    {analysis.workflow.map((step, index) => (
                      <div key={index} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                        <p className="text-xs font-semibold text-office-text">{index + 1}. {step.title}</p>
                        <p className="mt-0.5 text-[11px] text-office-muted">{step.description}</p>
                        <p className="mt-0.5 text-[10px] text-office-muted">
                          担当: {step.agentId ? agentName(step.agentId) : "未設定"} ・ 目安{step.estimatedMinutes}分 ・ 完了条件: {step.completionCriteria}
                          {step.humanCheck && <span className="ml-1 font-semibold text-office-gold">・要あなたの確認</span>}
                        </p>
                      </div>
                    ))}
                    <p className="text-[10px] text-office-muted">※ 受注が決まったら「案件工房へ登録」すると、この工程がそのまま作業工程になります。</p>
                  </div>
                </Section>

                {/* 応募文・質問文 */}
                <Section title="応募文（4種・コピーして使う）" open={openSections.has("apply")} onToggle={() => toggleSection("apply")}>
                  <div className="space-y-2">
                    {(
                      [
                        ["polite", "丁寧・実務型"],
                        ["beginnerFriendly", "親しみやすい型"],
                        ["short", "短文・即戦力型"],
                        ["highValue", "提案力アピール型"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                        <div className="mb-1 flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-office-gold">{label}</h4>
                          <button type="button" onClick={() => void copyText(analysis.applicationMessages[key], `app-${key}`)} className="flex items-center gap-1 rounded-full border border-office-border px-2 py-0.5 text-[10px] text-office-muted hover:border-office-gold hover:text-office-gold">
                            <Copy size={10} /> コピー
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap text-xs text-office-text">{analysis.applicationMessages[key]}</p>
                      </div>
                    ))}
                    <p className="text-[10px] text-office-muted">※ 実績のない内容は書かれません。応募は自動送信されないので、内容を確認してご自身で送ってください。</p>
                  </div>
                </Section>

                <Section title="受注前の確認質問（3種）" open={openSections.has("questions")} onToggle={() => toggleSection("questions")}>
                  <div className="space-y-2">
                    {(
                      [["polite", "丁寧な確認文"], ["short", "短い確認文"], ["friendly", "親しみやすい確認文"]] as const
                    ).map(([key, label]) => (
                      <div key={key} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                        <div className="mb-1 flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-office-gold">{label}</h4>
                          <button type="button" onClick={() => void copyText(analysis.clientQuestions[key], `q-${key}`)} className="flex items-center gap-1 rounded-full border border-office-border px-2 py-0.5 text-[10px] text-office-muted hover:border-office-gold hover:text-office-gold">
                            <Copy size={10} /> コピー
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap text-xs text-office-text">{analysis.clientQuestions[key]}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* 利益シミュレーション（AI不使用） */}
            <Section title="利益シミュレーション" open={openSections.has("profit")} onToggle={() => toggleSection("profit")}>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>手数料（%）</label>
                  <input type="number" min="0" inputMode="numeric" value={active.feePercent ?? ""} onChange={(event) => update({ feePercent: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>その他経費（円）</label>
                  <input type="number" min="0" inputMode="numeric" value={active.expenses ?? ""} onChange={(event) => update({ expenses: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>AI利用費（円）</label>
                  <input type="number" min="0" inputMode="numeric" value={active.aiCost ?? ""} onChange={(event) => update({ aiCost: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>制作時間（分）</label>
                  <input type="number" min="0" step="5" inputMode="numeric" value={active.workMinutes ?? ""} onChange={(event) => update({ workMinutes: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>修正時間（分）</label>
                  <input type="number" min="0" step="5" inputMode="numeric" value={active.revisionMinutes ?? ""} onChange={(event) => update({ revisionMinutes: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>予備時間（分）</label>
                  <input type="number" min="0" step="5" inputMode="numeric" value={active.bufferMinutes ?? ""} onChange={(event) => update({ bufferMinutes: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} />
                </div>
              </div>
              {profit && (
                <div className="rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-2 text-sm">
                  <p className="text-office-text">手数料: ¥{profit.fee.toLocaleString()}</p>
                  <p className="font-semibold text-office-gold">実利益: ¥{profit.profit.toLocaleString()}</p>
                  <p className="text-office-text">想定時給: {profit.hourly !== undefined ? `¥${profit.hourly.toLocaleString()}/時` : "（制作・修正・予備時間を入力すると表示されます）"}</p>
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-office-muted">実利益 = 提示金額 − 手数料 − 経費 − AI利用費。AI判定後は見積もり時間が空欄に自動で入ります（編集できます）。</p>
            </Section>

            {/* 案件工房へ登録 */}
            <button type="button" onClick={registerToWorkshop} className={`${btnPrimary} flex items-center justify-center gap-2 !bg-emerald-700`}>
              <BriefcaseBusiness size={16} /> {active.linkedCaseId ? "案件工房で開く（登録済み）" : "案件工房へ登録する"}
            </button>

            <button
              type="button"
              onClick={() => setConfirm({ message: `案件「${active.title.trim() || "無題の案件"}」をスカウト履歴から削除します。この操作は取り消せません。よろしいですか？`, danger: true, onOk: () => { setScouts(removeScout(active.id)); setActiveId(null); } })}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-office-border px-3 py-2 text-xs text-office-muted transition hover:border-red-400 hover:text-red-400"
            >
              <Trash2 size={13} /> この案件を削除
            </button>
          </>
        )}
      </div>

      {/* 確認ダイアログ */}
      {confirm && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-6">
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
  );
}
