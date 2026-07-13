/**
 * AI利用・成果ダッシュボードの型定義。
 * 利用ログはチャット（コマンドセンター経由でAI社員に実行させたタスク）1件につき1エントリ。
 * 保存先はフロントエンドのlocalStorage（"chaos-ai-suite:usage-log"）。
 */

/** 1回のAI呼び出しで消費したトークン数。 */
export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** 成果物の用途カテゴリ。 */
export const USAGE_PURPOSES = ["投稿", "note", "商品", "案件", "開発", "その他"] as const;
export type UsagePurpose = (typeof USAGE_PURPOSES)[number];

/** 成果記録の状態。未入力の項目があるものは「未確認」として扱う（成果なしと混同しない）。 */
export const OUTCOME_STATUSES = [
  { id: "unconfirmed", label: "未確認" },
  { id: "success", label: "成果あり" },
  { id: "no_success", label: "成果なし" },
] as const;
export type OutcomeStatusId = (typeof OUTCOME_STATUSES)[number]["id"];

/** ユーザーが手動で記録する成果情報。すべて任意項目。 */
export interface OutcomeRecord {
  purpose?: UsagePurpose;
  /** 実際に使用したか（投稿した／納品した等） */
  actuallyUsed?: boolean;
  /** 売上または案件につながったか */
  ledToSales?: boolean;
  /** 金額（円） */
  amountYen?: number;
  /** 削減できた時間（分） */
  timeSavedMinutes?: number;
  memo?: string;
  updatedAt?: string;
}

/** 利用ログ1件（=完了したチャットタスク1件）。 */
export interface UsageLogEntry {
  /** タスクIDをそのまま利用する */
  id: string;
  agentId: string;
  agentName: string;
  /** 機能名（現時点では常に"チャット"。将来の他機能対応に備えて残す） */
  feature: string;
  outputType: string;
  /** タスク完了日時（ISO） */
  createdAt: string;
  tokenUsage: TokenUsage;
  /** 概算費用（USD）。実際の請求額とは異なる場合がある目安値 */
  estimatedCostUsd: number;
  outcome: OutcomeRecord;
}

/** OutcomeRecordの入力状況から表示ステータスを判定する。未入力なら必ず「未確認」。 */
export function outcomeStatusOf(outcome: OutcomeRecord): OutcomeStatusId {
  if (outcome.ledToSales === undefined && outcome.actuallyUsed === undefined) return "unconfirmed";
  if (outcome.ledToSales === true) return "success";
  if (outcome.actuallyUsed === false || outcome.ledToSales === false) return "no_success";
  return "unconfirmed";
}
