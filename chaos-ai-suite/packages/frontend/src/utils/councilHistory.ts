import type { CouncilSession } from "@chaos-ai-suite/shared";

/**
 * AI会議モードで人間が承認した成果物の履歴。承認後のみここへ保存する（未承認のものは保存しない）。
 * サーバー側のセッション記録はインメモリのため再デプロイで消える前提。承認済み成果物はこの端末の
 * localStorageに残す（他の生成履歴と同じ保存パターン、最新50件まで）。
 * 保存する情報: 依頼内容・各AI社員の結果・統合結果・承認状態・使用モデル・概算費用・実行日時・エラー情報。
 * APIキー等の秘密情報は保存しない。
 */

const STORAGE_KEY = "chaos-ai-suite:council-history";
const MAX_ENTRIES = 50;

export function listCouncilHistory(): CouncilSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CouncilSession[]) : [];
  } catch {
    return [];
  }
}

export function saveCouncilHistory(session: CouncilSession): CouncilSession[] {
  const all = listCouncilHistory();
  const index = all.findIndex((item) => item.id === session.id);
  if (index >= 0) all[index] = session;
  else all.unshift(session);
  const capped = all.slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  return capped;
}

export function removeCouncilHistory(id: string): CouncilSession[] {
  const all = listCouncilHistory().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}
