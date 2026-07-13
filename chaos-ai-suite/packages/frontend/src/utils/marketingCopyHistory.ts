import type { MarketingCopyHistoryEntry } from "@chaos-ai-suite/shared";

/**
 * 刺さるマーケティング生成の履歴データ。この端末のlocalStorageに保存し、
 * バックアップセンターの「note編集データ」カテゴリに含まれる。
 * トレンドnote生成履歴（trendNotes.ts）と同じ保存パターン（最新50件まで）。
 */

const STORAGE_KEY = "chaos-ai-suite:marketing-copy-history";
const MAX_ENTRIES = 50;

export function listMarketingCopyHistory(): MarketingCopyHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MarketingCopyHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveMarketingCopyHistory(entry: MarketingCopyHistoryEntry): MarketingCopyHistoryEntry[] {
  const all = listMarketingCopyHistory();
  const index = all.findIndex((item) => item.id === entry.id);
  if (index >= 0) all[index] = entry;
  else all.unshift(entry);
  const capped = all.slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  return capped;
}

export function removeMarketingCopyHistory(id: string): MarketingCopyHistoryEntry[] {
  const all = listMarketingCopyHistory().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}
