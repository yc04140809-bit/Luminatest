import type { ScoutRecord, ScoutStatusId } from "@chaos-ai-suite/shared";

/**
 * 案件スカウターの履歴データ。この端末のlocalStorageに保存し、
 * バックアップセンターの「案件工房データ」カテゴリに含まれる。
 * 利益計算・集計・並び替えはすべてクライアント処理（AI不使用）。
 */

const STORAGE_KEY = "chaos-ai-suite:scouts";

export function listScouts(): ScoutRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScoutRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveScout(record: ScoutRecord): ScoutRecord[] {
  const next = { ...record, updatedAt: new Date().toISOString() };
  const all = listScouts();
  const index = all.findIndex((entry) => entry.id === next.id);
  if (index >= 0) all[index] = next;
  else all.unshift(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function removeScout(id: string): ScoutRecord[] {
  const all = listScouts().filter((entry) => entry.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function newScoutRecord(): ScoutRecord {
  const now = new Date().toISOString();
  return {
    id: `scout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    body: "",
    status: "undecided",
    feePercent: 22,
    createdAt: now,
    updatedAt: now,
  };
}

export interface ScoutProfit {
  fee: number;
  profit: number;
  totalMinutes: number;
  /** 合計作業時間が0なら undefined */
  hourly?: number;
}

/** 実利益 = 案件金額 − 手数料 − 経費 − AI利用費。想定時給 = 実利益 ÷ (制作+修正+予備時間)。 */
export function calcScoutProfit(record: ScoutRecord): ScoutProfit {
  const price = record.price ?? 0;
  const fee = Math.round((price * (record.feePercent ?? 0)) / 100);
  const profit = price - fee - (record.expenses ?? 0) - (record.aiCost ?? 0);
  const totalMinutes = (record.workMinutes ?? 0) + (record.revisionMinutes ?? 0) + (record.bufferMinutes ?? 0);
  const hourly = totalMinutes > 0 ? Math.round(profit / (totalMinutes / 60)) : undefined;
  return { fee, profit, totalMinutes, hourly };
}

/** 応募済み扱いのステータス（応募率の分子）。 */
const APPLIED_STATUSES: ScoutStatusId[] = ["applied", "waiting", "negotiating", "won", "lost"];
/** 返信あり扱いのステータス。 */
const REPLIED_STATUSES: ScoutStatusId[] = ["negotiating", "won", "lost"];

export interface ScoutStats {
  analyzed: number;
  circles: number;
  applied: number;
  replied: number;
  won: number;
  applyRate?: number;
  replyRate?: number;
  winRate?: number;
  wonAmount: number;
  wonEstimatedProfit: number;
}

/** 成功率データの自動集計（AI不使用）。 */
export function aggregateScoutStats(records: ScoutRecord[]): ScoutStats {
  const analyzed = records.filter((record) => record.analysis).length;
  const circles = records.filter((record) => record.analysis?.decision === "circle").length;
  const appliedRecords = records.filter((record) => APPLIED_STATUSES.includes(record.status));
  const repliedRecords = records.filter((record) => REPLIED_STATUSES.includes(record.status));
  const wonRecords = records.filter((record) => record.status === "won");
  const rate = (numerator: number, denominator: number) =>
    denominator > 0 ? Math.round((numerator / denominator) * 100) : undefined;
  return {
    analyzed,
    circles,
    applied: appliedRecords.length,
    replied: repliedRecords.length,
    won: wonRecords.length,
    applyRate: rate(appliedRecords.length, analyzed),
    replyRate: rate(repliedRecords.length, appliedRecords.length),
    winRate: rate(wonRecords.length, appliedRecords.length),
    wonAmount: wonRecords.reduce((sum, record) => sum + (record.price ?? 0), 0),
    wonEstimatedProfit: wonRecords.reduce((sum, record) => sum + calcScoutProfit(record).profit, 0),
  };
}
