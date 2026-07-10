import type { SnsAnalysisResult, SnsMetrics } from "@chaos-ai-suite/shared";

/**
 * 分析済みのSNS投稿レコード。この端末のブラウザ(localStorage)に保存する。
 * Render無料プランはサーバー側ディスクが再デプロイで消えるため、
 * 手元のスマホ/PCに残るlocalStorageの方が運用上むしろ安全（書類保管庫と同じ方針）。
 */
export interface SnsPostRecord {
  id: string;
  content: string;
  platform: string;
  metrics: SnsMetrics;
  analysis: SnsAnalysisResult;
  createdAt: string;
}

const STORAGE_KEY = "chaos-ai-suite:sns-posts";

export function listSnsPosts(): SnsPostRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SnsPostRecord[];
  } catch {
    return [];
  }
}

export function saveSnsPost(record: Omit<SnsPostRecord, "id" | "createdAt">): SnsPostRecord {
  const saved: SnsPostRecord = {
    id: `sns-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...record,
  };
  const next = [saved, ...listSnsPosts()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return saved;
}

export function removeSnsPost(id: string): void {
  const next = listSnsPosts().filter((record) => record.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
