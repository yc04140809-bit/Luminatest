/**
 * 案件工房（依頼案件の一元管理）の型定義。
 * 案件データはすべてフロントエンド側（localStorage "chaos-ai-suite:cases"）に保存し、
 * バックエンドはAI処理（要件整理・工程生成・成果物作成・品質チェック・納品パック）のみを担う。
 */

export const CASE_STATUSES = [
  { id: "inquiry", label: "問い合わせ" },
  { id: "requirements", label: "要件確認中" },
  { id: "waiting", label: "作業待ち" },
  { id: "working", label: "作業中" },
  { id: "review", label: "確認待ち" },
  { id: "revising", label: "修正中" },
  { id: "delivery_prep", label: "納品準備" },
  { id: "delivered", label: "納品済み" },
  { id: "done", label: "完了" },
  { id: "hold", label: "保留" },
  { id: "cancelled", label: "キャンセル" },
] as const;

export type CaseStatusId = (typeof CASE_STATUSES)[number]["id"];

export const CASE_SOURCES = [
  "ココナラ",
  "note",
  "Threads",
  "X",
  "Instagram",
  "知人",
  "直接依頼",
  "自社案件",
  "その他",
] as const;

export const CASE_CATEGORIES = [
  "note記事編集",
  "note販売設計",
  "SNS投稿作成",
  "SNS分析",
  "ココナラ出品文",
  "開発指示書",
  "研修資料",
  "報告書",
  "商品設計",
  "AI相談",
  "その他",
] as const;

/** AI要件整理の結果。依頼文に書かれていない項目は「未確認」/空配列とする（AIに推測させない）。 */
export interface CaseRequirements {
  purpose: string;
  audience: string;
  deliverables: string[];
  desiredDeadline: string;
  tone: string;
  mustConditions: string[];
  prohibitions: string[];
  references: string[];
  missingInfo: string[];
  questionsForClient: string[];
  workSteps: string[];
  risks: string[];
  completionCriteria: string;
}

export const CASE_TASK_STATUSES = [
  { id: "not_started", label: "未着手" },
  { id: "working", label: "作業中" },
  { id: "review", label: "確認待ち" },
  { id: "done", label: "完了" },
  { id: "rejected", label: "差し戻し" },
] as const;

export type CaseTaskStatusId = (typeof CASE_TASK_STATUSES)[number]["id"];

export interface CaseTask {
  id: string;
  title: string;
  /** 担当AI社員ID。未設定は undefined（AI社員の追加・削除に依存しない） */
  assignedAgentId?: string;
  description: string;
  completionCriteria: string;
  status: CaseTaskStatusId;
  note?: string;
}

export type DeliverableApproval = "pending" | "approved" | "rejected";

export interface CaseDeliverable {
  id: string;
  title: string;
  taskId?: string;
  agentId?: string;
  agentName?: string;
  content: string;
  approval: DeliverableApproval;
  createdAt: string;
  updatedAt: string;
}

/** クライアント確認文（3トーン）。 */
export interface ClientQuestions {
  polite: string;
  friendly: string;
  short: string;
}

/** 品質チェック結果。 */
export const QUALITY_VERDICTS = [
  { id: "ok", label: "納品可能" },
  { id: "minor", label: "軽微な修正が必要" },
  { id: "fix", label: "要修正" },
] as const;

export type QualityVerdictId = (typeof QUALITY_VERDICTS)[number]["id"];

export interface CaseQualityResult {
  verdict: QualityVerdictId;
  summary: string;
  /** 修正が必要な箇所・懸念（該当なしなら空） */
  issues: string[];
  /** クライアントへ確認が必要な箇所（該当なしなら空） */
  questionsForClient: string[];
}

/** 納品パック（3トーン。それぞれ納品メッセージ〜実績掲載許可のお願いまでを含む完成文）。 */
export interface DeliveryPack {
  coconala: string;
  business: string;
  casual: string;
}

/** 案件振り返り（手動入力）。 */
export interface CaseReview {
  good: string;
  slow: string;
  corrected: string;
  improveNext: string;
  reusable: string;
  template: string;
  clientReaction: string;
  repeatChance: string;
}

export interface ProjectCase {
  id: string;
  title: string;
  clientName?: string;
  category?: string;
  source?: string;
  orderDate?: string;
  deadline?: string;
  price?: number;
  feeType?: "fixed" | "percent";
  feeValue?: number;
  expenses?: number;
  aiCost?: number;
  workMinutes?: number;
  memo?: string;
  status: CaseStatusId;
  requestText?: string;
  requirements?: CaseRequirements;
  clientQuestions?: ClientQuestions;
  tasks?: CaseTask[];
  deliverables?: CaseDeliverable[];
  quality?: CaseQualityResult;
  deliveryPack?: DeliveryPack;
  review?: CaseReview;
  createdAt: string;
  updatedAt: string;
}
