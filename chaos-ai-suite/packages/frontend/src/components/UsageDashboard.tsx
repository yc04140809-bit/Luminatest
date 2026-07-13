import { useEffect, useMemo, useState } from "react";
import { BarChart3, Copy, X } from "lucide-react";
import { OUTCOME_STATUSES, USAGE_PURPOSES, outcomeStatusOf, type Agent, type OutcomeRecord, type Task, type UsageLogEntry, type UsagePurpose } from "@chaos-ai-suite/shared";
import { aggregateByPeriod, listUsageEntries, monthlyOverview, recordUsageEntryIfNew, updateOutcome } from "../utils/usageLog.js";

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelCls = "mb-1 block text-[11px] font-semibold text-office-muted";
const btnSub = "rounded-lg border border-office-border px-2.5 py-1.5 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold";

const PERIOD_TABS = [
  { id: "day", label: "日別" },
  { id: "week", label: "週別" },
  { id: "month", label: "月別" },
] as const;
type PeriodGranularity = (typeof PERIOD_TABS)[number]["id"];

const STATUS_BADGE: Record<string, string> = {
  unconfirmed: "bg-office-border/60 text-office-muted",
  success: "bg-emerald-500/15 text-emerald-400",
  no_success: "bg-red-500/10 text-red-400",
};

function statusLabel(id: string): string {
  return OUTCOME_STATUSES.find((entry) => entry.id === id)?.label ?? "未確認";
}

function fmtUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function fmtMinutes(value: number): string {
  if (value >= 60) return `${(value / 60).toFixed(1)}時間`;
  return `${value}分`;
}

interface OutcomeFormProps {
  entry: UsageLogEntry;
  onSave: (outcome: OutcomeRecord) => void;
}

function OutcomeForm({ entry, onSave }: OutcomeFormProps) {
  const [purpose, setPurpose] = useState<UsagePurpose | "">(entry.outcome.purpose ?? "");
  const [actuallyUsed, setActuallyUsed] = useState<boolean | undefined>(entry.outcome.actuallyUsed);
  const [ledToSales, setLedToSales] = useState<boolean | undefined>(entry.outcome.ledToSales);
  const [amountYen, setAmountYen] = useState(entry.outcome.amountYen?.toString() ?? "");
  const [timeSavedMinutes, setTimeSavedMinutes] = useState(entry.outcome.timeSavedMinutes?.toString() ?? "");
  const [memo, setMemo] = useState(entry.outcome.memo ?? "");

  function handleSave(): void {
    onSave({
      purpose: purpose || undefined,
      actuallyUsed,
      ledToSales,
      amountYen: amountYen.trim() ? Number(amountYen) : undefined,
      timeSavedMinutes: timeSavedMinutes.trim() ? Number(timeSavedMinutes) : undefined,
      memo: memo.trim() || undefined,
    });
  }

  return (
    <div className="mt-2 space-y-2 border-t border-office-border pt-2">
      <div>
        <label className={labelCls}>用途</label>
        <select value={purpose} onChange={(event) => setPurpose(event.target.value as UsagePurpose | "")} className={inputCls}>
          <option value="">未選択</option>
          {USAGE_PURPOSES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-1.5 text-xs text-office-text">
          <input type="checkbox" checked={actuallyUsed ?? false} onChange={(event) => setActuallyUsed(event.target.checked)} />
          実際に使用した
        </label>
        <label className="flex items-center gap-1.5 text-xs text-office-text">
          <input type="checkbox" checked={ledToSales ?? false} onChange={(event) => setLedToSales(event.target.checked)} />
          売上・案件につながった
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>金額（円）</label>
          <input type="number" inputMode="numeric" value={amountYen} onChange={(event) => setAmountYen(event.target.value)} className={inputCls} placeholder="任意" />
        </div>
        <div>
          <label className={labelCls}>削減できた時間（分）</label>
          <input type="number" inputMode="numeric" value={timeSavedMinutes} onChange={(event) => setTimeSavedMinutes(event.target.value)} className={inputCls} placeholder="任意" />
        </div>
      </div>
      <div>
        <label className={labelCls}>メモ</label>
        <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={2} className={inputCls} placeholder="任意" />
      </div>
      <button type="button" onClick={handleSave} className="w-full rounded-lg bg-office-accent px-3 py-2 text-xs font-semibold text-white">
        成果を記録する
      </button>
    </div>
  );
}

/**
 * AI利用・成果ダッシュボード。
 * データ源はチャット（コマンドセンター）タスクのトークン使用量（office.tasksのtokenUsageフィールド）のみ。
 * 会話本文・個人情報は一切保存せず、集計・保存・費用概算はすべて端末内（localStorage）で完結する。AI呼び出しは使わない。
 * note編集・トレンドnote等の個別機能への同様の計装は今回のMVPには含まれない（README参照）。
 */
export function UsageDashboard({ tasks, agents }: { tasks: Record<string, Task>; agents: Record<string, Agent> }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<UsageLogEntry[]>([]);
  const [granularity, setGranularity] = useState<PeriodGranularity>("day");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const before = listUsageEntries().length;
    for (const task of Object.values(tasks)) {
      if (!task.tokenUsage || task.status !== "completed") continue;
      const agent = agents[task.assignedAgentId ?? ""];
      recordUsageEntryIfNew({
        id: task.id,
        agentId: task.assignedAgentId ?? "unknown",
        agentName: agent?.name ?? "不明なAI社員",
        feature: "チャット",
        outputType: task.outputType,
        createdAt: task.updatedAt,
        model: task.tokenUsage.model,
        inputTokens: task.tokenUsage.inputTokens,
        outputTokens: task.tokenUsage.outputTokens,
      });
    }
    if (listUsageEntries().length !== before) setEntries(listUsageEntries());
  }, [tasks, agents]);

  useEffect(() => {
    if (open) setEntries(listUsageEntries());
  }, [open]);

  const overview = useMemo(() => monthlyOverview(entries), [entries]);
  const periodRows = useMemo(() => aggregateByPeriod(entries, granularity), [entries, granularity]);

  function handleSaveOutcome(id: string, outcome: OutcomeRecord): void {
    setEntries(updateOutcome(id, outcome));
    setExpandedId(null);
  }

  const cards = [
    { label: "今月のAI利用回数", value: `${overview.usageCount}回` },
    { label: "今月の概算費用", value: fmtUsd(overview.estimatedCostUsd) },
    { label: "作成成果物数", value: `${overview.artifactCount}件` },
    { label: "推定短縮時間", value: fmtMinutes(overview.timeSavedMinutes) },
    { label: "売上につながった成果物数", value: `${overview.ledToSalesCount}件` },
    { label: "最も使われたAI社員", value: overview.topAgentName ?? "まだありません" },
  ];

  return (
    <>
      <section className="rounded-xl border border-office-border bg-office-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
          <BarChart3 size={18} />
          AI利用・成果ダッシュボード
        </h2>
        <p className="mb-3 text-xs text-office-muted">AI社員の利用回数・費用・成果を確認できます。</p>
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold">
          ダッシュボードを開く
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
          <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-xl text-office-gold">
              <BarChart3 size={20} /> AI利用・成果ダッシュボード
            </h2>
            <button type="button" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold">
              <X size={16} /> 戻る
            </button>
          </div>

          <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <p className="text-[11px] text-office-muted">
              現時点ではコマンドセンター（チャット）経由のAI社員利用のみを記録しています。費用は概算（目安）であり、実際の請求額とは異なる場合があります。
            </p>

            <div className="grid grid-cols-2 gap-2">
              {cards.map((card) => (
                <div key={card.label} className="rounded-lg border border-office-border bg-office-panel p-3">
                  <p className="text-[10px] text-office-muted">{card.label}</p>
                  <p className="mt-1 truncate text-base font-semibold text-office-gold">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-office-border bg-office-panel p-3">
              <div className="mb-2 flex gap-1.5">
                {PERIOD_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setGranularity(tab.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      granularity === tab.id ? "bg-office-gold text-office-bg" : "border border-office-border text-office-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {periodRows.length === 0 ? (
                <p className="py-4 text-center text-xs text-office-muted">まだ記録がありません。</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[11px]">
                    <thead>
                      <tr className="text-office-muted">
                        <th className="py-1 pr-2">期間</th>
                        <th className="py-1 pr-2">利用回数</th>
                        <th className="py-1 pr-2">成果物数</th>
                        <th className="py-1 pr-2">使用モデル</th>
                        <th className="py-1 pr-2">入力Tok</th>
                        <th className="py-1 pr-2">出力Tok</th>
                        <th className="py-1 pr-2">概算費用</th>
                        <th className="py-1 pr-2">短縮時間</th>
                        <th className="py-1 pr-2">未確認/成果あり/成果なし</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodRows.map((row) => (
                        <tr key={row.key} className="border-t border-office-border text-office-text">
                          <td className="py-1 pr-2 whitespace-nowrap">{row.label}</td>
                          <td className="py-1 pr-2">{row.usageCount}</td>
                          <td className="py-1 pr-2">{row.artifactCount}</td>
                          <td className="py-1 pr-2">{row.models.join(", ")}</td>
                          <td className="py-1 pr-2">{row.inputTokens.toLocaleString()}</td>
                          <td className="py-1 pr-2">{row.outputTokens.toLocaleString()}</td>
                          <td className="py-1 pr-2">{fmtUsd(row.estimatedCostUsd)}</td>
                          <td className="py-1 pr-2">{fmtMinutes(row.timeSavedMinutes)}</td>
                          <td className="py-1 pr-2">{row.unconfirmedCount}/{row.successCount}/{row.noSuccessCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-office-text">成果記録（成果物ごとに手動で記録）</h3>
              {entries.length === 0 && <p className="text-xs text-office-muted">まだ成果物がありません。</p>}
              {entries.slice(0, 100).map((entry) => {
                const status = outcomeStatusOf(entry.outcome);
                return (
                  <div key={entry.id} className="rounded-lg border border-office-border bg-office-panel p-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[status]}`}>{statusLabel(status)}</span>
                      <p className="min-w-0 flex-1 truncate text-xs text-office-text">{entry.agentName} ・ {entry.outputType} ・ {new Date(entry.createdAt).toLocaleString("ja-JP")}</p>
                      <button type="button" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} className={btnSub}>
                        {expandedId === entry.id ? "閉じる" : "記録する"}
                      </button>
                    </div>
                    {expandedId === entry.id && <OutcomeForm entry={entry} onSave={(outcome) => handleSaveOutcome(entry.id, outcome)} />}
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-office-border bg-office-bg p-3 text-[11px] text-office-muted">
              <p className="mb-1 flex items-center gap-1 font-semibold text-office-text"><Copy size={11} /> 将来拡張の候補（今回は未実装）</p>
              <p>AI社員別の費用対効果 / 前月比較 / 不要機能の検出 / 改善提案 / 月次レポート出力 / 企業向けAI導入効果レポート / AI利用時間の休憩通知</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
