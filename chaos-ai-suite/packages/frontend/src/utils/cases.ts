import type { ProjectCase } from "@chaos-ai-suite/shared";

/**
 * 案件工房の案件データ。この端末のlocalStorageに保存する
 * （Render無料プランはサーバー側ディスクが再デプロイで消えるため、既存機能と同じ方針）。
 * バックアップセンターの「案件工房データ」カテゴリに含まれる。
 */

const STORAGE_KEY = "chaos-ai-suite:cases";

export function listCases(): ProjectCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectCase[]) : [];
  } catch {
    return [];
  }
}

/** 案件をupsertして全件を返す。updatedAtはここで更新する。 */
export function saveCase(projectCase: ProjectCase): ProjectCase[] {
  const next = { ...projectCase, updatedAt: new Date().toISOString() };
  const all = listCases();
  const index = all.findIndex((entry) => entry.id === next.id);
  if (index >= 0) all[index] = next;
  else all.unshift(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function removeCase(id: string): ProjectCase[] {
  const all = listCases().filter((entry) => entry.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function newProjectCase(): ProjectCase {
  const now = new Date().toISOString();
  return {
    id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "新しい案件",
    status: "inquiry",
    feeType: "percent",
    createdAt: now,
    updatedAt: now,
  };
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ProfitResult {
  fee: number;
  profit: number;
  /** 作業時間が未入力(0)の場合はundefined */
  hourly?: number;
}

/** 利益計算（AI不使用・クライアント処理）。実利益 = 販売価格 − 手数料 − 経費 − AI利用費。 */
export function calcProfit(projectCase: ProjectCase): ProfitResult {
  const price = projectCase.price ?? 0;
  const feeValue = projectCase.feeValue ?? 0;
  const fee = projectCase.feeType === "fixed" ? feeValue : Math.round((price * feeValue) / 100);
  const profit = price - fee - (projectCase.expenses ?? 0) - (projectCase.aiCost ?? 0);
  const minutes = projectCase.workMinutes ?? 0;
  const hourly = minutes > 0 ? Math.round(profit / (minutes / 60)) : undefined;
  return { fee, profit, hourly };
}
