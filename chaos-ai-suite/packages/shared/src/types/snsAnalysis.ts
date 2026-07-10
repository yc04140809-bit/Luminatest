/**
 * SNS分析AI（ミライ）のMVP用の型定義。
 * 将来の拡張（トレンド分析AI・投稿生成AI・A/BテストAI・note導線AI・データ分析AI）も
 * この `/api/sns/*` 系統に同じパターン（入力→構造化分析結果）で追加していく想定。
 */

/** 採点10項目のキー。順序はUIの表示順にもそのまま使う。 */
export const SNS_SCORE_KEYS = [
  "hook",
  "concreteness",
  "readability",
  "empathy",
  "saveValue",
  "shareability",
  "cta",
  "targetFit",
  "credibility",
  "brandConsistency",
] as const;

export type SnsScoreKey = (typeof SNS_SCORE_KEYS)[number];

export const SNS_SCORE_LABELS: Record<SnsScoreKey, string> = {
  hook: "フック力（冒頭の引き）",
  concreteness: "具体性（数字・事例）",
  readability: "読みやすさ",
  empathy: "共感性",
  saveValue: "保存価値",
  shareability: "拡散性",
  cta: "行動喚起（次のアクション）",
  targetFit: "ターゲット適合",
  credibility: "信頼性（根拠）",
  brandConsistency: "ブランド一貫性",
};

export type SnsPlatform = "Threads" | "X" | "Instagram" | "note" | "その他";

/** 投稿後の実績データ。未入力の項目は分析時に「データなし」として扱う。 */
export interface SnsMetrics {
  views?: number;
  likes?: number;
  replies?: number;
  saves?: number;
  clicks?: number;
}

export const SNS_METRIC_LABELS: Record<keyof SnsMetrics, string> = {
  views: "閲覧数",
  likes: "いいね数",
  replies: "返信数",
  saves: "保存数",
  clicks: "クリック数",
};

/** SNS分析AIの構造化された分析結果。 */
export interface SnsAnalysisResult {
  /** 各項目0〜10点 */
  scores: Record<SnsScoreKey, number>;
  /** 10項目の合計（0〜100点） */
  totalScore: number;
  /** 伸びた/伸びる見込みの理由（強み） */
  strengths: string[];
  /** 伸びなかった/伸びない懸念の理由と改善点 */
  improvements: string[];
  /** すぐ投稿できるリライト案（コピペ可能な完成文） */
  rewrite: string;
  /** 総評（1〜3文） */
  summary: string;
}
