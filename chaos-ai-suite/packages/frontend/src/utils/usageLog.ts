import { estimateCostUsd, outcomeStatusOf, type OutcomeRecord, type UsageLogEntry } from "@chaos-ai-suite/shared";

/**
 * AI利用・成果ダッシュボードのデータ層。
 * チャット（コマンドセンター経由でAI社員に実行させたタスク）が完了するたびに1件記録する。
 * 会話本文や個人情報は保存しない（保存するのはトークン数・モデル名・成果物タイプ・ユーザーが手動入力した成果情報のみ）。
 * 外部サービスへの送信は一切行わない。すべてこの端末のlocalStorageに閉じる。
 */

const STORAGE_KEY = "chaos-ai-suite:usage-log";
/** 端末容量を守るため保持件数の上限（超えた分は古いものから削除） */
const MAX_ENTRIES = 500;

export function listUsageEntries(): UsageLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UsageLogEntry[]) : [];
  } catch {
    return [];
  }
}

function saveAll(entries: UsageLogEntry[]): void {
  const sorted = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted.slice(0, MAX_ENTRIES)));
}

/** タスク完了時に1件記録する。同じidが既にあれば何もしない（二重記録防止）。 */
export function recordUsageEntryIfNew(params: {
  id: string;
  agentId: string;
  agentName: string;
  feature: string;
  outputType: string;
  createdAt: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): void {
  const all = listUsageEntries();
  if (all.some((entry) => entry.id === params.id)) return;

  const entry: UsageLogEntry = {
    id: params.id,
    agentId: params.agentId,
    agentName: params.agentName,
    feature: params.feature,
    outputType: params.outputType,
    createdAt: params.createdAt,
    tokenUsage: { model: params.model, inputTokens: params.inputTokens, outputTokens: params.outputTokens },
    estimatedCostUsd: estimateCostUsd(params.model, params.inputTokens, params.outputTokens),
    outcome: {},
  };
  saveAll([...all, entry]);
}

/** 成果記録を更新する。 */
export function updateOutcome(id: string, outcome: OutcomeRecord): UsageLogEntry[] {
  const all = listUsageEntries();
  const updated = all.map((entry) =>
    entry.id === id ? { ...entry, outcome: { ...outcome, updatedAt: new Date().toISOString() } } : entry,
  );
  saveAll(updated);
  return updated;
}

export interface PeriodSummary {
  key: string;
  label: string;
  usageCount: number;
  artifactCount: number;
  models: string[];
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  timeSavedMinutes: number;
  ledToSalesCount: number;
  unconfirmedCount: number;
  successCount: number;
  noSuccessCount: number;
}

function emptySummary(key: string, label: string): PeriodSummary {
  return {
    key,
    label,
    usageCount: 0,
    artifactCount: 0,
    models: [],
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    timeSavedMinutes: 0,
    ledToSalesCount: 0,
    unconfirmedCount: 0,
    successCount: 0,
    noSuccessCount: 0,
  };
}

function isoWeekKey(date: Date): string {
  // 週の開始を月曜として、その週の月曜日の日付をキーにする（シンプルな日本語向け週区切り）
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 月曜=0
  d.setDate(d.getDate() - day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function periodKey(dateIso: string, granularity: "day" | "week" | "month"): { key: string; label: string } {
  const date = new Date(dateIso);
  if (granularity === "day") {
    const key = date.toISOString().slice(0, 10);
    return { key, label: key };
  }
  if (granularity === "week") {
    const key = isoWeekKey(date);
    return { key, label: `${key}の週` };
  }
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return { key, label: key };
}

/** 日別・週別・月別の集計。新しい期間が先頭に来るよう降順で返す。 */
export function aggregateByPeriod(entries: UsageLogEntry[], granularity: "day" | "week" | "month"): PeriodSummary[] {
  const map = new Map<string, PeriodSummary>();
  for (const entry of entries) {
    const { key, label } = periodKey(entry.createdAt, granularity);
    const summary = map.get(key) ?? emptySummary(key, label);
    summary.usageCount += 1;
    summary.artifactCount += 1;
    if (!summary.models.includes(entry.tokenUsage.model)) summary.models.push(entry.tokenUsage.model);
    summary.inputTokens += entry.tokenUsage.inputTokens;
    summary.outputTokens += entry.tokenUsage.outputTokens;
    summary.estimatedCostUsd += entry.estimatedCostUsd;
    summary.timeSavedMinutes += entry.outcome.timeSavedMinutes ?? 0;
    if (entry.outcome.ledToSales) summary.ledToSalesCount += 1;
    const status = outcomeStatusOf(entry.outcome);
    if (status === "unconfirmed") summary.unconfirmedCount += 1;
    else if (status === "success") summary.successCount += 1;
    else summary.noSuccessCount += 1;
    map.set(key, summary);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export interface AgentSummary {
  agentId: string;
  agentName: string;
  usageCount: number;
  artifactCount: number;
}

/** AI社員別の利用回数・成果物数。 */
export function aggregateByAgent(entries: UsageLogEntry[]): AgentSummary[] {
  const map = new Map<string, AgentSummary>();
  for (const entry of entries) {
    const summary = map.get(entry.agentId) ?? {
      agentId: entry.agentId,
      agentName: entry.agentName,
      usageCount: 0,
      artifactCount: 0,
    };
    summary.usageCount += 1;
    summary.artifactCount += 1;
    map.set(entry.agentId, summary);
  }
  return [...map.values()].sort((a, b) => b.usageCount - a.usageCount);
}

function isSameMonth(dateIso: string, reference: Date): boolean {
  const date = new Date(dateIso);
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

export interface MonthlyOverview {
  usageCount: number;
  estimatedCostUsd: number;
  artifactCount: number;
  timeSavedMinutes: number;
  ledToSalesCount: number;
  topAgentName: string | null;
}

/** 今月分のダッシュボード用サマリー（今月のAI利用回数・概算費用・成果物数・推定短縮時間・売上につながった件数・最も使われたAI社員）。 */
export function monthlyOverview(entries: UsageLogEntry[], now = new Date()): MonthlyOverview {
  const thisMonth = entries.filter((entry) => isSameMonth(entry.createdAt, now));
  const byAgent = aggregateByAgent(thisMonth);
  return {
    usageCount: thisMonth.length,
    estimatedCostUsd: thisMonth.reduce((sum, entry) => sum + entry.estimatedCostUsd, 0),
    artifactCount: thisMonth.length,
    timeSavedMinutes: thisMonth.reduce((sum, entry) => sum + (entry.outcome.timeSavedMinutes ?? 0), 0),
    ledToSalesCount: thisMonth.filter((entry) => entry.outcome.ledToSales).length,
    topAgentName: byAgent[0]?.agentName ?? null,
  };
}
