import type { TrendNoteRecord } from "@chaos-ai-suite/shared";

/**
 * トレンドnote生成の履歴データ。この端末のlocalStorageに保存し、
 * バックアップセンターの「note編集データ」カテゴリに含まれる。
 * 重複判定・保存・並び替えはすべてクライアント処理（AI不使用）。
 */

const STORAGE_KEY = "chaos-ai-suite:trend-notes";

export function listTrendNotes(): TrendNoteRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrendNoteRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveTrendNote(record: TrendNoteRecord): TrendNoteRecord[] {
  const all = listTrendNotes();
  const index = all.findIndex((entry) => entry.id === record.id);
  if (index >= 0) all[index] = record;
  else all.unshift(record);
  // 端末容量を守るため履歴は最新50件まで
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)));
  return all;
}

export function removeTrendNote(id: string): TrendNoteRecord[] {
  const all = listTrendNotes().filter((entry) => entry.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

/** 文字2-gramのJaccard係数（0〜1）。日本語の短文向けの軽量な類似度。 */
export function textSimilarity(a: string, b: string): number {
  const grams = (text: string): Set<string> => {
    const normalized = text.toLowerCase().replace(/\s+/g, "");
    const set = new Set<string>();
    for (let i = 0; i < normalized.length - 1; i += 1) set.add(normalized.slice(i, i + 2));
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let overlap = 0;
  for (const gram of ga) if (gb.has(gram)) overlap += 1;
  return overlap / (ga.size + gb.size - overlap);
}

/**
 * 過去に生成したテーマ・タイトル・主要キーワードとの重複を判定する（AI不使用）。
 * 類似度が高い過去記事があればそのタイトルを返し、なければnull。
 */
export function findSimilarPast(
  themeTitle: string,
  keywords: string[],
  history: TrendNoteRecord[],
): { pastTitle: string; similarity: number } | null {
  const target = `${themeTitle} ${keywords.join(" ")}`;
  let best: { pastTitle: string; similarity: number } | null = null;
  for (const record of history) {
    if (!record.research || record.selectedThemeIndex === undefined) continue;
    const past = record.research.themes[record.selectedThemeIndex];
    if (!past) continue;
    const pastText = `${record.article?.title ?? past.title} ${past.searchKeywords.join(" ")}`;
    const similarity = textSimilarity(target, pastText);
    if (similarity >= 0.4 && (!best || similarity > best.similarity)) {
      best = { pastTitle: record.article?.title ?? past.title, similarity };
    }
  }
  return best;
}
