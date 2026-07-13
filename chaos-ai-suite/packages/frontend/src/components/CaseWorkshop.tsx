import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  PackageCheck,
  Plus,
  Radar,
  Trash2,
  X,
} from "lucide-react";
import {
  CASE_CATEGORIES,
  CASE_SOURCES,
  CASE_STATUSES,
  CASE_TASK_STATUSES,
  QUALITY_VERDICTS,
  type Agent,
  type CaseDeliverable,
  type CaseRequirements,
  type CaseReview,
  type CaseTask,
  type ProjectCase,
} from "@chaos-ai-suite/shared";
import {
  checkCaseQuality,
  generateCaseDeliverable,
  generateCaseDeliveryPack,
  generateCaseQuestions,
  generateCaseTasks,
  organizeCaseRequirements,
} from "../api/officeApi.js";
import { calcProfit, listCases, newId, newProjectCase, removeCase, saveCase } from "../utils/cases.js";
import { saveDocument } from "../utils/savedDocuments.js";
import { CaseScout } from "./CaseScout.js";

const REVISION_PRESETS = [
  "もっと短く",
  "もっと分かりやすく",
  "もっと丁寧に",
  "もっと親しみやすく",
  "もっと専門的に",
  "誇大表現を減らす",
  "スマホで読みやすくする",
  "具体例を追加",
] as const;

const FILTERS = [
  { id: "all", label: "すべて" },
  { id: "active", label: "進行中" },
  { id: "due", label: "納期が近い" },
  { id: "approval", label: "承認待ち" },
  { id: "done", label: "完了" },
  { id: "hold", label: "保留" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const STATUS_COLOR: Record<string, string> = {
  inquiry: "border-office-border text-office-muted",
  requirements: "border-sky-500/50 text-sky-400",
  waiting: "border-office-border text-office-text",
  working: "border-office-gold/60 text-office-gold",
  review: "border-amber-500/60 text-amber-400",
  revising: "border-amber-500/60 text-amber-400",
  delivery_prep: "border-cyan-500/50 text-cyan-400",
  delivered: "border-emerald-500/50 text-emerald-400",
  done: "border-emerald-500/50 text-emerald-400",
  hold: "border-office-border text-office-muted",
  cancelled: "border-red-500/50 text-red-400",
};

function statusLabel(id: string): string {
  return CASE_STATUSES.find((status) => status.id === id)?.label ?? id;
}

function hasPendingApproval(projectCase: ProjectCase): boolean {
  return (projectCase.deliverables ?? []).some((deliverable) => deliverable.approval === "pending");
}

function isDueSoon(projectCase: ProjectCase): boolean {
  if (!projectCase.deadline) return false;
  if (["done", "delivered", "cancelled"].includes(projectCase.status)) return false;
  const diff = new Date(projectCase.deadline).getTime() - Date.now();
  return diff < 3 * 24 * 60 * 60 * 1000;
}

/** 要件整理オブジェクトをAI入力・比較表示用の読みやすいテキストへ変換する。 */
function requirementsToText(req: CaseRequirements | undefined): string {
  if (!req) return "（要件整理は未実施）";
  const list = (items: string[]) => (items.length > 0 ? items.map((item) => `・${item}`).join("\n") : "（なし）");
  return [
    `【目的】${req.purpose}`,
    `【対象】${req.audience}`,
    `【成果物】\n${list(req.deliverables)}`,
    `【希望納期】${req.desiredDeadline}`,
    `【雰囲気・口調】${req.tone}`,
    `【必須条件】\n${list(req.mustConditions)}`,
    `【禁止事項】\n${list(req.prohibitions)}`,
    `【参考情報】\n${list(req.references)}`,
    `【完了条件】${req.completionCriteria}`,
  ].join("\n");
}

const EMPTY_REVIEW: CaseReview = {
  good: "", slow: "", corrected: "", improveNext: "", reusable: "", template: "", clientReaction: "", repeatChance: "",
};

function Section({
  icon, title, open, onToggle, children, badge,
}: {
  icon: React.ReactNode; title: string; open: boolean; onToggle: () => void; children: React.ReactNode; badge?: string;
}) {
  return (
    <div className="rounded-lg border border-office-border bg-office-panel">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-3 text-left">
        {open ? <ChevronDown size={14} className="shrink-0 text-office-muted" /> : <ChevronRight size={14} className="shrink-0 text-office-muted" />}
        {icon}
        <span className="flex-1 text-sm font-semibold text-office-text">{title}</span>
        {badge && <span className="shrink-0 rounded-full bg-office-gold/15 px-2 py-0.5 text-[10px] font-semibold text-office-gold">{badge}</span>}
      </button>
      {open && <div className="border-t border-office-border px-3 py-3">{children}</div>}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelCls = "mb-1 block text-[11px] font-semibold text-office-muted";
const btnPrimary = "w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const btnSub = "rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40";

/**
 * 案件工房。依頼内容の整理から成果物・納品文の作成までを、案件ごとに一元管理する。
 * 案件データはlocalStorageへ自動保存され、AI処理（要件整理・確認文・工程・成果物・品質・納品パック）は
 * それぞれ1回の呼び出しにまとめている。一覧の絞り込み・検索・利益計算はクライアント処理。
 */
export function CaseWorkshop({ agents }: { agents: Agent[] }) {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<ProjectCase[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyOp, setBusyOp] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; danger?: boolean; onOk: () => void } | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["basic", "request"]));
  const [useBrandProfile, setUseBrandProfile] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [scoutOpen, setScoutOpen] = useState(false);

  const [revisionTarget, setRevisionTarget] = useState<string | null>(null);
  const [revisionInstruction, setRevisionInstruction] = useState<string>(REVISION_PRESETS[0]);
  const [revisionFree, setRevisionFree] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    if (open) setCases(listCases());
  }, [open]);

  const active = cases.find((entry) => entry.id === activeId) ?? null;

  /** 案件の変更を保存（自動保存）。保存中→保存済みの表示つき。 */
  function update(patch: Partial<ProjectCase>): void {
    if (!active) return;
    setSaveState("saving");
    const all = saveCase({ ...active, ...patch });
    setCases(all);
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

  async function runOp(op: string, run: () => Promise<void>): Promise<void> {
    if (busyOp) return;
    setBusyOp(op);
    setError(null);
    try {
      await run();
    } catch (err) {
      setError(`${(err as Error).message}`);
    } finally {
      setBusyOp(null);
    }
  }

  function agentName(id: string | undefined): string {
    if (!id) return "未設定";
    return agents.find((agent) => agent.id === id)?.name ?? "（削除された社員）";
  }

  // ---------- AI operations ----------

  function runRequirements(): void {
    if (!active?.requestText?.trim()) {
      setError("先に「依頼内容を貼り付け」欄に依頼文を入力してください。");
      return;
    }
    const exec = () =>
      void runOp("requirements", async () => {
        const requirements = await organizeCaseRequirements({ requestText: active.requestText!.trim() });
        update({ requirements, status: active.status === "inquiry" ? "requirements" : active.status });
        setOpenSections((prev) => new Set(prev).add("requirements"));
      });
    if (active.requirements) {
      setConfirm({ message: "Claude APIを再度使用します。現在の編集内容を残したまま再整理しますか？（要件整理の結果は上書きされます）", onOk: exec });
    } else exec();
  }

  function runQuestions(): void {
    if (!active?.requirements) return;
    void runOp("questions", async () => {
      const clientQuestions = await generateCaseQuestions({
        missingInfo: active.requirements!.missingInfo,
        questions: active.requirements!.questionsForClient,
      });
      update({ clientQuestions });
      setOpenSections((prev) => new Set(prev).add("questions"));
    });
  }

  function runTasks(): void {
    if (!active) return;
    const exec = () =>
      void runOp("tasks", async () => {
        const { tasks } = await generateCaseTasks({
          requirementsText: `案件名: ${active.title}\n${requirementsToText(active.requirements)}\n\n依頼文:\n${active.requestText ?? "（なし）"}`,
        });
        const caseTasks: CaseTask[] = tasks.map((task) => ({
          id: newId("ctask"),
          title: task.title,
          assignedAgentId: task.assignedAgentId || undefined,
          description: task.description,
          completionCriteria: task.completionCriteria,
          status: "not_started",
        }));
        update({ tasks: caseTasks, status: active.status === "requirements" ? "waiting" : active.status });
      });
    if ((active.tasks ?? []).length > 0) {
      setConfirm({ message: "Claude APIを使用して工程を作り直します。現在の工程一覧は置き換えられます。よろしいですか？", onOk: exec });
    } else exec();
  }

  function runDeliverable(task: CaseTask): void {
    if (!active) return;
    const assigned = agentName(task.assignedAgentId);
    setConfirm({
      message:
        `Claude APIを1回使用して成果物を作成します。\n\n` +
        `工程: ${task.title}\n担当AI社員: ${assigned}\n` +
        `入力: 案件の要件＋この工程の作業内容\n期待する成果物: ${task.completionCriteria || task.description || "工程の完了条件に沿ったテキスト"}`,
      onOk: () =>
        void runOp(`deliverable-${task.id}`, async () => {
          const result = await generateCaseDeliverable({
            agentId: task.assignedAgentId,
            caseTitle: active.title,
            requirementsText: requirementsToText(active.requirements),
            taskTitle: task.title,
            taskDescription: task.description,
            completionCriteria: task.completionCriteria,
            useBrandProfile,
          });
          const now = new Date().toISOString();
          const deliverable: CaseDeliverable = {
            id: newId("cdel"),
            title: result.title,
            taskId: task.id,
            agentId: task.assignedAgentId,
            agentName: assigned,
            content: result.content,
            approval: "pending",
            createdAt: now,
            updatedAt: now,
          };
          update({
            deliverables: [...(active.deliverables ?? []), deliverable],
            tasks: (active.tasks ?? []).map((entry) => (entry.id === task.id ? { ...entry, status: "review" } : entry)),
          });
          setOpenSections((prev) => new Set(prev).add("deliverables"));
        }),
    });
  }

  function runRevision(deliverable: CaseDeliverable): void {
    if (!active) return;
    const instruction = revisionInstruction === "自由入力" ? revisionFree.trim() : revisionInstruction;
    if (!instruction) {
      setError("修正指示を入力してください。");
      return;
    }
    const task = (active.tasks ?? []).find((entry) => entry.id === deliverable.taskId);
    setConfirm({
      message: `Claude APIを1回使用して「${deliverable.title}」を「${instruction}」の方針で修正します。よろしいですか？`,
      onOk: () =>
        void runOp(`revise-${deliverable.id}`, async () => {
          const result = await generateCaseDeliverable({
            agentId: deliverable.agentId,
            caseTitle: active.title,
            requirementsText: requirementsToText(active.requirements),
            taskTitle: task?.title ?? deliverable.title,
            taskDescription: task?.description ?? "",
            completionCriteria: task?.completionCriteria ?? "",
            currentDraft: deliverable.content,
            instruction,
            useBrandProfile,
          });
          update({
            deliverables: (active.deliverables ?? []).map((entry) =>
              entry.id === deliverable.id
                ? { ...entry, content: result.content, approval: "pending", updatedAt: new Date().toISOString() }
                : entry,
            ),
          });
          setRevisionTarget(null);
          setRevisionFree("");
        }),
    });
  }

  function runQuality(): void {
    if (!active) return;
    const deliverables = active.deliverables ?? [];
    if (deliverables.length === 0) {
      setError("品質チェックする成果物がまだありません。");
      return;
    }
    void runOp("quality", async () => {
      const quality = await checkCaseQuality({
        requirementsText: requirementsToText(active.requirements),
        deliverablesText: deliverables.map((entry) => `■ ${entry.title}\n${entry.content}`).join("\n\n"),
      });
      update({ quality });
      setOpenSections((prev) => new Set(prev).add("quality"));
    });
  }

  function runDeliveryPack(): void {
    if (!active) return;
    const deliverables = active.deliverables ?? [];
    if (deliverables.length === 0) {
      setError("納品パックを作る前に、成果物を1つ以上作成してください。");
      return;
    }
    const exec = () =>
      void runOp("delivery", async () => {
        const deliveryPack = await generateCaseDeliveryPack({
          caseTitle: active.title,
          clientName: active.clientName ?? "",
          deliverablesSummary: deliverables.map((entry) => `・${entry.title}`).join("\n"),
        });
        update({ deliveryPack, status: active.status === "working" || active.status === "review" ? "delivery_prep" : active.status });
        setOpenSections((prev) => new Set(prev).add("delivery"));
      });
    if (active.deliveryPack) {
      setConfirm({ message: "Claude APIを使用して納品パックを作り直します。現在の納品文は置き換えられます。よろしいですか？", onOk: exec });
    } else exec();
  }

  // ---------- rendering ----------

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cases.filter((entry) => {
      if (filter === "active" && ["done", "hold", "cancelled"].includes(entry.status)) return false;
      if (filter === "due" && !isDueSoon(entry)) return false;
      if (filter === "approval" && !hasPendingApproval(entry)) return false;
      if (filter === "done" && entry.status !== "done") return false;
      if (filter === "hold" && entry.status !== "hold") return false;
      if (query) {
        const haystack = `${entry.title} ${entry.clientName ?? ""} ${entry.category ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [cases, filter, search]);

  const profit = active ? calcProfit(active) : null;

  return (
    <>
      <section className="rounded-xl border border-office-border bg-office-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
          <BriefcaseBusiness size={18} />
          案件工房
        </h2>
        <p className="mb-3 text-xs text-office-muted">依頼内容の整理から成果物・納品文の作成まで、案件をまとめて管理します。</p>
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold">
          工房を開く
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
                <BriefcaseBusiness size={20} />
              )}
              {active ? active.title : "案件工房"}
            </h2>
            <div className="flex items-center gap-2">
              {active && (
                <span className="text-[10px] text-office-muted">{saveState === "saving" ? "保存中…" : saveState === "saved" ? "保存済み" : ""}</span>
              )}
              <button type="button" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold">
                <X size={16} /> 戻る
              </button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
            {copied && <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">✓ コピーしました</p>}

            {!active ? (
              <>
                {/* ===== 案件一覧 ===== */}
                <button
                  type="button"
                  onClick={() => {
                    const created = newProjectCase();
                    setCases(saveCase(created));
                    setActiveId(created.id);
                    setOpenSections(new Set(["basic", "request"]));
                  }}
                  className={`${btnPrimary} flex items-center justify-center gap-2`}
                >
                  <Plus size={16} /> 新しい案件を作成
                </button>

                <button
                  type="button"
                  onClick={() => setScoutOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-2.5 text-sm font-semibold text-office-gold transition hover:bg-office-gold/20"
                >
                  <Radar size={16} /> 案件スカウター（応募前の受注判定）
                </button>

                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="案件名・クライアント名・種別で検索" className={inputCls} />

                <div className="flex flex-wrap gap-1.5">
                  {FILTERS.map((entry) => (
                    <button key={entry.id} type="button" onClick={() => setFilter(entry.id)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === entry.id ? "bg-office-gold/20 text-office-gold" : "border border-office-border text-office-muted"}`}>
                      {entry.label}
                    </button>
                  ))}
                </div>

                {filtered.length === 0 && <p className="py-6 text-center text-sm text-office-muted">該当する案件はありません。</p>}

                {filtered.map((entry) => (
                  <button key={entry.id} type="button" onClick={() => setActiveId(entry.id)} className="block w-full rounded-lg border border-office-border bg-office-panel px-3 py-3 text-left transition hover:border-office-gold">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-office-text">{entry.title}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[entry.status] ?? "border-office-border text-office-muted"}`}>
                        {statusLabel(entry.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-office-muted">
                      {entry.clientName || "クライアント未設定"} ・ {entry.category || "種別未設定"}
                      {entry.price !== undefined && ` ・ ¥${entry.price.toLocaleString()}`}
                    </p>
                    <p className="text-[11px] text-office-muted">
                      納期: {entry.deadline ? new Date(entry.deadline).toLocaleDateString("ja-JP") : "未設定"}
                      {isDueSoon(entry) && <span className="ml-1 text-amber-400">（間近）</span>}
                      ・ 更新: {new Date(entry.updatedAt).toLocaleString("ja-JP")}
                      {hasPendingApproval(entry) && <span className="ml-1 text-office-gold">・承認待ちあり</span>}
                    </p>
                  </button>
                ))}
              </>
            ) : (
              <>
                {/* ===== 案件詳細 ===== */}

                {/* 基本情報 */}
                <Section icon={<ClipboardList size={14} className="text-office-gold" />} title="基本情報" open={openSections.has("basic")} onToggle={() => toggleSection("basic")}>
                  <div className="space-y-2">
                    <div>
                      <label className={labelCls}>案件名</label>
                      <input value={active.title} onChange={(event) => update({ title: event.target.value })} className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>クライアント名</label>
                        <input value={active.clientName ?? ""} onChange={(event) => update({ clientName: event.target.value })} className={inputCls} placeholder="匿名可" />
                      </div>
                      <div>
                        <label className={labelCls}>ステータス</label>
                        <select value={active.status} onChange={(event) => update({ status: event.target.value as ProjectCase["status"] })} className={inputCls}>
                          {CASE_STATUSES.map((status) => (
                            <option key={status.id} value={status.id}>{status.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>案件種別</label>
                        <select value={active.category ?? ""} onChange={(event) => update({ category: event.target.value || undefined })} className={inputCls}>
                          <option value="">未設定</option>
                          {CASE_CATEGORIES.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>依頼元</label>
                        <select value={active.source ?? ""} onChange={(event) => update({ source: event.target.value || undefined })} className={inputCls}>
                          <option value="">未設定</option>
                          {CASE_SOURCES.map((source) => (
                            <option key={source} value={source}>{source}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>受注日</label>
                        <input type="date" value={active.orderDate ?? ""} onChange={(event) => update({ orderDate: event.target.value || undefined })} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>納期</label>
                        <input type="date" value={active.deadline ?? ""} onChange={(event) => update({ deadline: event.target.value || undefined })} className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>メモ</label>
                      <textarea value={active.memo ?? ""} onChange={(event) => update({ memo: event.target.value })} rows={2} className={inputCls} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirm({ message: `案件「${active.title}」を削除します。この操作は取り消せません。よろしいですか？`, danger: true, onOk: () => { setCases(removeCase(active.id)); setActiveId(null); } })}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-office-border px-3 py-2 text-xs text-office-muted transition hover:border-red-400 hover:text-red-400"
                    >
                      <Trash2 size={13} /> この案件を削除
                    </button>
                  </div>
                </Section>

                {/* 依頼文 */}
                <Section icon={<FileText size={14} className="text-office-gold" />} title="依頼内容を貼り付け" open={openSections.has("request")} onToggle={() => toggleSection("request")}>
                  <p className="mb-2 text-xs text-office-muted">ココナラやSNSのメッセージ、依頼メモなどをそのまま貼り付けてください。</p>
                  <textarea value={active.requestText ?? ""} onChange={(event) => update({ requestText: event.target.value })} rows={6} className={inputCls} />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => { update({}); setSaveState("saved"); }} className={btnSub}>保存</button>
                    <button type="button" onClick={runRequirements} disabled={busyOp !== null} className="rounded-lg bg-office-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
                      {busyOp === "requirements" ? "整理中..." : "要件を整理する"}
                    </button>
                    <button type="button" onClick={() => setConfirm({ message: "依頼文の入力内容をクリアします。よろしいですか？", danger: true, onOk: () => update({ requestText: "" }) })} className={btnSub}>
                      入力をクリア
                    </button>
                  </div>
                </Section>

                {/* 要件整理 */}
                {active.requirements && (
                  <Section icon={<ClipboardList size={14} className="text-office-gold" />} title="要件整理" open={openSections.has("requirements")} onToggle={() => toggleSection("requirements")}>
                    <div className="space-y-2">
                      {(
                        [
                          ["purpose", "依頼の目的"], ["audience", "対象読者・対象者"], ["desiredDeadline", "希望納期"],
                          ["tone", "希望する雰囲気・口調"], ["completionCriteria", "完了条件"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key}>
                          <label className={labelCls}>{label}</label>
                          <input value={active.requirements![key]} onChange={(event) => update({ requirements: { ...active.requirements!, [key]: event.target.value } })} className={inputCls} />
                        </div>
                      ))}
                      {(
                        [
                          ["deliverables", "必要な成果物"], ["mustConditions", "必須条件"], ["prohibitions", "禁止事項"],
                          ["references", "参考情報"], ["missingInfo", "不足している情報"], ["questionsForClient", "確認すべき質問"],
                          ["workSteps", "想定作業工程"], ["risks", "想定されるリスク"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key}>
                          <label className={labelCls}>{label}（1行1項目）</label>
                          <textarea
                            value={active.requirements![key].join("\n")}
                            onChange={(event) => update({ requirements: { ...active.requirements!, [key]: event.target.value.split("\n").filter((line) => line.trim() !== "") } })}
                            rows={Math.max(2, Math.min(4, active.requirements![key].length + 1))}
                            className={inputCls}
                          />
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => { update({}); setSaveState("saved"); }} className={btnSub}>要件を保存</button>
                        <button type="button" onClick={runRequirements} disabled={busyOp !== null} className={btnSub}>AIで再整理</button>
                        <button type="button" onClick={() => setCompareOpen((value) => !value)} className={btnSub}>元の依頼文と比較</button>
                        <button type="button" onClick={runQuestions} disabled={busyOp !== null} className="rounded-lg bg-office-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
                          {busyOp === "questions" ? "作成中..." : "クライアント確認文を作る"}
                        </button>
                      </div>
                      {compareOpen && (
                        <pre className="whitespace-pre-wrap rounded-lg border border-office-border bg-office-bg p-2 text-[11px] text-office-muted">{active.requestText || "（依頼文なし）"}</pre>
                      )}
                    </div>
                  </Section>
                )}

                {/* クライアント確認文 */}
                {active.clientQuestions && (
                  <Section icon={<FileText size={14} className="text-office-gold" />} title="クライアント確認文" open={openSections.has("questions")} onToggle={() => toggleSection("questions")}>
                    <div className="space-y-2">
                      {(
                        [["polite", "丁寧な確認文"], ["friendly", "親しみやすい確認文"], ["short", "短い確認文"]] as const
                      ).map(([key, label]) => (
                        <div key={key} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                          <div className="mb-1 flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-office-gold">{label}</h4>
                            <button type="button" onClick={() => void copyText(active.clientQuestions![key], key)} className="flex items-center gap-1 rounded-full border border-office-border px-2 py-0.5 text-[10px] text-office-muted hover:border-office-gold hover:text-office-gold">
                              <Copy size={10} /> コピー
                            </button>
                          </div>
                          <p className="whitespace-pre-wrap text-xs text-office-text">{active.clientQuestions![key]}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* 作業工程 */}
                <Section icon={<ClipboardList size={14} className="text-office-gold" />} title={`作業工程（${(active.tasks ?? []).length}）`} open={openSections.has("tasks")} onToggle={() => toggleSection("tasks")}>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={runTasks} disabled={busyOp !== null} className="rounded-lg bg-office-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
                        {busyOp === "tasks" ? "生成中..." : "作業工程を作成する（AI）"}
                      </button>
                      <button
                        type="button"
                        onClick={() => update({ tasks: [...(active.tasks ?? []), { id: newId("ctask"), title: "新しい工程", description: "", completionCriteria: "", status: "not_started" }] })}
                        className={btnSub}
                      >
                        工程を手動で追加
                      </button>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-office-text">
                      <input type="checkbox" checked={useBrandProfile} onChange={(event) => setUseBrandProfile(event.target.checked)} />
                      成果物作成にケイオス師匠ブランド設定を反映する
                    </label>

                    {(active.tasks ?? []).map((task) => (
                      <div key={task.id} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                        <input value={task.title} onChange={(event) => update({ tasks: active.tasks!.map((entry) => (entry.id === task.id ? { ...entry, title: event.target.value } : entry)) })} className={`${inputCls} mb-1.5 font-semibold`} />
                        <div className="mb-1.5 grid grid-cols-2 gap-1.5">
                          <select value={task.assignedAgentId ?? ""} onChange={(event) => update({ tasks: active.tasks!.map((entry) => (entry.id === task.id ? { ...entry, assignedAgentId: event.target.value || undefined } : entry)) })} className={inputCls}>
                            <option value="">担当: 未設定</option>
                            {agents.map((agent) => (
                              <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))}
                          </select>
                          <select value={task.status} onChange={(event) => update({ tasks: active.tasks!.map((entry) => (entry.id === task.id ? { ...entry, status: event.target.value as CaseTask["status"] } : entry)) })} className={inputCls}>
                            {CASE_TASK_STATUSES.map((status) => (
                              <option key={status.id} value={status.id}>{status.label}</option>
                            ))}
                          </select>
                        </div>
                        <textarea value={task.description} placeholder="作業内容" onChange={(event) => update({ tasks: active.tasks!.map((entry) => (entry.id === task.id ? { ...entry, description: event.target.value } : entry)) })} rows={2} className={`${inputCls} mb-1.5`} />
                        <input value={task.completionCriteria} placeholder="完了条件" onChange={(event) => update({ tasks: active.tasks!.map((entry) => (entry.id === task.id ? { ...entry, completionCriteria: event.target.value } : entry)) })} className={`${inputCls} mb-1.5`} />
                        <input value={task.note ?? ""} placeholder="メモ" onChange={(event) => update({ tasks: active.tasks!.map((entry) => (entry.id === task.id ? { ...entry, note: event.target.value } : entry)) })} className={`${inputCls} mb-1.5`} />
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => runDeliverable(task)} disabled={busyOp !== null} className="flex-1 rounded-lg bg-office-accent px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40">
                            {busyOp === `deliverable-${task.id}` ? "作成中..." : "成果物を作成"}
                          </button>
                          <button type="button" onClick={() => setConfirm({ message: `工程「${task.title}」を削除しますか？`, danger: true, onOk: () => update({ tasks: active.tasks!.filter((entry) => entry.id !== task.id) }) })} className="rounded-lg border border-office-border px-2 py-1.5 text-[11px] text-office-muted hover:border-red-400 hover:text-red-400">
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* 成果物 */}
                <Section
                  icon={<PackageCheck size={14} className="text-office-gold" />}
                  title={`成果物（${(active.deliverables ?? []).length}）`}
                  badge={hasPendingApproval(active) ? "承認待ちあり" : undefined}
                  open={openSections.has("deliverables")}
                  onToggle={() => toggleSection("deliverables")}
                >
                  <div className="space-y-2">
                    {(active.deliverables ?? []).length === 0 && <p className="text-xs text-office-muted">工程の「成果物を作成」から作成できます。</p>}
                    {(active.deliverables ?? []).map((deliverable) => (
                      <div key={deliverable.id} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-office-text">{deliverable.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${deliverable.approval === "approved" ? "bg-emerald-500/15 text-emerald-400" : deliverable.approval === "rejected" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                            {deliverable.approval === "approved" ? "承認済み" : deliverable.approval === "rejected" ? "差し戻し" : "承認待ち"}
                          </span>
                        </div>
                        <p className="mb-1.5 text-[10px] text-office-muted">
                          担当: {deliverable.agentName ?? "未設定"} ・ 作成: {new Date(deliverable.createdAt).toLocaleString("ja-JP")} ・ 更新: {new Date(deliverable.updatedAt).toLocaleString("ja-JP")}
                        </p>
                        <textarea
                          value={deliverable.content}
                          onChange={(event) => update({ deliverables: active.deliverables!.map((entry) => (entry.id === deliverable.id ? { ...entry, content: event.target.value, updatedAt: new Date().toISOString() } : entry)) })}
                          rows={6}
                          className={`${inputCls} mb-1.5 text-xs`}
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => void copyText(deliverable.content, deliverable.id)} className={btnSub}>コピー</button>
                          <button type="button" onClick={() => setRevisionTarget(revisionTarget === deliverable.id ? null : deliverable.id)} className={btnSub}>修正指示</button>
                          <button type="button" onClick={() => update({ deliverables: active.deliverables!.map((entry) => (entry.id === deliverable.id ? { ...entry, approval: "approved" } : entry)) })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">承認</button>
                          <button type="button" onClick={() => update({ deliverables: active.deliverables!.map((entry) => (entry.id === deliverable.id ? { ...entry, approval: "rejected" } : entry)) })} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white">差し戻し</button>
                          <button type="button" onClick={() => update({ deliverables: [...active.deliverables!, { ...deliverable, id: newId("cdel"), title: `${deliverable.title}（複製）`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] })} className={btnSub}>複製</button>
                          <button type="button" onClick={() => { saveDocument({ title: `${active.title}: ${deliverable.title}`, agentName: deliverable.agentName, content: deliverable.content }); setCopied(deliverable.id); setTimeout(() => setCopied(null), 1600); }} className={`${btnSub} flex items-center gap-1`}>
                            <Archive size={11} /> 保管庫へ
                          </button>
                          <button type="button" onClick={() => setConfirm({ message: `成果物「${deliverable.title}」を削除しますか？`, danger: true, onOk: () => update({ deliverables: active.deliverables!.filter((entry) => entry.id !== deliverable.id) }) })} className={`${btnSub} hover:border-red-400 hover:text-red-400`}>削除</button>
                        </div>

                        {revisionTarget === deliverable.id && (
                          <div className="mt-2 rounded-lg border border-office-border p-2">
                            <div className="mb-1.5 flex flex-wrap gap-1">
                              {[...REVISION_PRESETS, "自由入力"].map((preset) => (
                                <button key={preset} type="button" onClick={() => setRevisionInstruction(preset)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${revisionInstruction === preset ? "bg-office-gold/20 text-office-gold" : "border border-office-border text-office-muted"}`}>
                                  {preset}
                                </button>
                              ))}
                            </div>
                            {revisionInstruction === "自由入力" && (
                              <input value={revisionFree} onChange={(event) => setRevisionFree(event.target.value)} placeholder="修正指示を入力" className={`${inputCls} mb-1.5`} />
                            )}
                            <button type="button" onClick={() => runRevision(deliverable)} disabled={busyOp !== null} className="w-full rounded-lg bg-office-accent px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40">
                              {busyOp === `revise-${deliverable.id}` ? "修正中..." : "この指示で修正する（AI）"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>

                {/* 品質チェック */}
                <Section icon={<PackageCheck size={14} className="text-office-gold" />} title="品質チェック" open={openSections.has("quality")} onToggle={() => toggleSection("quality")}>
                  <button type="button" onClick={runQuality} disabled={busyOp !== null} className={btnPrimary}>
                    {busyOp === "quality" ? "ケイオスがチェック中..." : "品質チェックを実行（AI・案件全体で1回）"}
                  </button>
                  {active.quality && (
                    <div className="mt-2 space-y-2">
                      <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${active.quality.verdict === "ok" ? "bg-emerald-500/15 text-emerald-400" : active.quality.verdict === "minor" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                        判定: {QUALITY_VERDICTS.find((verdict) => verdict.id === active.quality!.verdict)?.label}
                      </p>
                      <p className="text-xs text-office-text">{active.quality.summary}</p>
                      {active.quality.issues.length > 0 && (
                        <ul className="list-inside list-disc text-xs text-amber-400">
                          {active.quality.issues.map((issue, index) => (<li key={index}>{issue}</li>))}
                        </ul>
                      )}
                      {active.quality.questionsForClient.length > 0 && (
                        <ul className="list-inside list-disc text-xs text-office-muted">
                          {active.quality.questionsForClient.map((question, index) => (<li key={index}>要確認: {question}</li>))}
                        </ul>
                      )}
                    </div>
                  )}
                </Section>

                {/* 納品パック */}
                <Section icon={<PackageCheck size={14} className="text-office-gold" />} title="納品パック" open={openSections.has("delivery")} onToggle={() => toggleSection("delivery")}>
                  <button type="button" onClick={runDeliveryPack} disabled={busyOp !== null} className={btnPrimary}>
                    {busyOp === "delivery" ? "ネムリが作成中..." : "納品パックを作成（AI・1回でまとめて生成）"}
                  </button>
                  {active.deliveryPack && (
                    <div className="mt-2 space-y-2">
                      {(
                        [["coconala", "ココナラ向け"], ["business", "丁寧なビジネス向け"], ["casual", "親しみやすい個人向け"]] as const
                      ).map(([key, label]) => (
                        <div key={key} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                          <div className="mb-1 flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-office-gold">{label}</h4>
                            <button type="button" onClick={() => void copyText(active.deliveryPack![key], `dp-${key}`)} className="flex items-center gap-1 rounded-full border border-office-border px-2 py-0.5 text-[10px] text-office-muted hover:border-office-gold hover:text-office-gold">
                              <Copy size={10} /> コピー
                            </button>
                          </div>
                          <p className="whitespace-pre-wrap text-xs text-office-text">{active.deliveryPack![key]}</p>
                        </div>
                      ))}
                      <p className="text-[10px] text-office-muted">※ 自動送信はされません。コピーして各サービスから送信してください。</p>
                    </div>
                  )}
                </Section>

                {/* 利益計算 */}
                <Section icon={<ClipboardList size={14} className="text-office-gold" />} title="利益・振り返り" open={openSections.has("profit")} onToggle={() => toggleSection("profit")}>
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>販売価格（円）</label>
                      <input type="number" min="0" inputMode="numeric" value={active.price ?? ""} onChange={(event) => update({ price: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>手数料の入力方法</label>
                      <select value={active.feeType ?? "percent"} onChange={(event) => update({ feeType: event.target.value as "fixed" | "percent" })} className={inputCls}>
                        <option value="percent">割合（%）</option>
                        <option value="fixed">金額（円）</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>手数料（{active.feeType === "fixed" ? "円" : "%"}）</label>
                      <input type="number" min="0" inputMode="numeric" value={active.feeValue ?? ""} onChange={(event) => update({ feeValue: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} />
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
                      <label className={labelCls}>作業時間（分）</label>
                      <input type="number" min="0" step="5" inputMode="numeric" value={active.workMinutes ?? ""} onChange={(event) => update({ workMinutes: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} placeholder="例: 60" />
                    </div>
                  </div>
                  {profit && (
                    <div className="mb-3 rounded-lg border border-office-gold/50 bg-office-gold/10 px-3 py-2 text-sm">
                      <p className="text-office-text">手数料: ¥{profit.fee.toLocaleString()}</p>
                      <p className="font-semibold text-office-gold">実利益: ¥{profit.profit.toLocaleString()}</p>
                      <p className="text-office-text">時給換算: {profit.hourly !== undefined ? `¥${profit.hourly.toLocaleString()}/時` : "（作業時間を入力すると表示されます）"}</p>
                    </div>
                  )}

                  <h4 className="mb-1.5 text-xs font-semibold text-office-text">案件振り返り（手動入力）</h4>
                  <div className="space-y-1.5">
                    {(
                      [
                        ["good", "良かった点"], ["slow", "時間がかかった点"], ["corrected", "修正された点"], ["improveNext", "次回改善する点"],
                        ["reusable", "再利用できる成果物"], ["template", "テンプレート化できる内容"], ["clientReaction", "顧客の反応"], ["repeatChance", "リピート可能性"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <label className={labelCls}>{label}</label>
                        <textarea
                          value={(active.review ?? EMPTY_REVIEW)[key]}
                          onChange={(event) => update({ review: { ...(active.review ?? EMPTY_REVIEW), [key]: event.target.value } })}
                          rows={1}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                </Section>
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

          {/* 案件スカウター（応募前の受注判定）。登録された案件はそのまま工房の詳細画面へ */}
          <CaseScout
            agents={agents}
            open={scoutOpen}
            onClose={() => setScoutOpen(false)}
            onOpenCase={(caseId) => {
              setScoutOpen(false);
              setCases(listCases());
              setActiveId(caseId);
              setOpenSections(new Set(["basic", "request", "tasks"]));
            }}
          />
        </div>
      )}
    </>
  );
}
