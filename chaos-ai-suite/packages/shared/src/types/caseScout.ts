/**
 * 案件スカウター（募集案件の受注可否判定）の型定義。
 * 分析は1回のAI呼び出しで判定〜応募文まで生成し、履歴はフロント側
 * （localStorage "chaos-ai-suite:scouts"）に保存する。案件管理そのものは
 * 既存の案件工房（ProjectCase）を再利用し、重複実装しない。
 */

export const SCOUT_SOURCES = [
  "ココナラ",
  "クラウドワークス",
  "ランサーズ",
  "SNS",
  "知人",
  "直接依頼",
  "その他",
] as const;

export const SCOUT_CATEGORIES = [
  "note記事",
  "ブログ記事",
  "SNS投稿",
  "SNS運用",
  "リライト",
  "マニュアル",
  "研修資料",
  "報告書",
  "商品説明文",
  "LP文章",
  "開発指示書",
  "プロンプト設計",
  "AI活用支援",
  "市場調査",
  "画像制作",
  "動画制作",
  "その他",
] as const;

/** 応募・受注の進行状態（ユーザーが手動で変更する）。 */
export const SCOUT_STATUSES = [
  { id: "undecided", label: "未判断" },
  { id: "preparing", label: "応募準備中" },
  { id: "applied", label: "応募済み" },
  { id: "waiting", label: "返信待ち" },
  { id: "negotiating", label: "条件確認中" },
  { id: "won", label: "受注" },
  { id: "lost", label: "不採用" },
  { id: "skipped", label: "見送り" },
  { id: "closed", label: "募集終了" },
] as const;

export type ScoutStatusId = (typeof SCOUT_STATUSES)[number]["id"];

/** 受注判定の3段階。 */
export const SCOUT_DECISIONS = [
  { id: "circle", mark: "⭕", label: "受注候補" },
  { id: "triangle", mark: "△", label: "条件付き" },
  { id: "cross", mark: "❌", label: "見送り推奨" },
] as const;

export type ScoutDecisionId = (typeof SCOUT_DECISIONS)[number]["id"];

/** 即納可能性の5段階。 */
export const INSTANT_LEVELS = [
  { id: "same_day", label: "即日納品可能" },
  { id: "h24", label: "24時間以内なら可能" },
  { id: "d2_3", label: "2〜3日必要" },
  { id: "after_check", label: "追加確認後に判断" },
  { id: "difficult", label: "納品困難" },
] as const;

export type InstantLevelId = (typeof INSTANT_LEVELS)[number]["id"];

/** 受注後の工程案の1ステップ。 */
export interface ScoutWorkflowStep {
  title: string;
  /** 担当AI社員ID（名簿に無い/判断不能なら空文字） */
  agentId: string;
  description: string;
  estimatedMinutes: number;
  completionCriteria: string;
  /** 人間（ユーザー）の確認が必要か */
  humanCheck: boolean;
}

/** 案件分析の結果（1回のAI呼び出しでまとめて生成）。 */
export interface ScoutAnalysis {
  decision: ScoutDecisionId;
  /** 総評（2〜3文） */
  summary: string;
  /** 案件の目的 */
  purpose: string;
  /** 求められている成果物 */
  deliverables: string[];
  /** 必須条件・修正条件・納期・予算などの重要条件 */
  mustConditions: string[];
  /** 必要スキル */
  requiredSkills: string[];
  /** 判定理由 */
  reasons: string[];
  /** 納品可能な理由（現在の機能・AI社員で対応できる根拠） */
  strengths: string[];
  /** 難しい部分 */
  difficulties: string[];
  /** 不明点・クライアントへ確認すべき内容 */
  missingInformation: string[];
  /** 想定される失敗 */
  failureRisks: string[];
  /** 見落としやすい条件 */
  overlookedConditions: string[];
  /** 受注する場合の前提条件 */
  preconditions: string[];
  /** リスク（権利・規約・品質保証など） */
  risks: string[];
  /** 専門資格・法的判断・規約上の確認が必要な可能性 */
  specialistWarning: boolean;
  specialistWarningDetail: string;
  /** 想定制作時間（分） */
  estimatedMinutes: number;
  /** 想定修正時間（分） */
  estimatedRevisionMinutes: number;
  /** AI利用費の概算（円） */
  estimatedAiCost: number;
  instantDeliveryLevel: InstantLevelId;
  /** 対応可能なAI社員（id＋この案件での役割） */
  availableAgents: { agentId: string; role: string }[];
  /** 不足している役割 */
  missingRoles: string[];
  /** 人間が確認すべき作業 */
  humanChecks: string[];
  /** 外部ツールが必要な作業 */
  externalTools: string[];
  /** 現在の機能だけで完結できるか */
  selfContained: boolean;
  /** 受注後の工程案 */
  workflow: ScoutWorkflowStep[];
  /** 応募文4種（虚偽実績の記載は禁止） */
  applicationMessages: {
    polite: string;
    beginnerFriendly: string;
    short: string;
    highValue: string;
  };
  /** 受注前にクライアントへ送る質問文3種 */
  clientQuestions: {
    polite: string;
    short: string;
    friendly: string;
  };
}

/** スカウト案件1件の保存レコード。 */
export interface ScoutRecord {
  id: string;
  title: string;
  /** 案件本文（募集文の貼り付け） */
  body: string;
  price?: number;
  /** 応募期限 */
  applyDeadline?: string;
  /** 納品期限 */
  deliveryDeadline?: string;
  source?: string;
  url?: string;
  category?: string;
  memo?: string;
  /** 利益シミュレーション入力（分析結果から初期値を入れ、ユーザーが編集可能） */
  feePercent?: number;
  expenses?: number;
  aiCost?: number;
  workMinutes?: number;
  revisionMinutes?: number;
  bufferMinutes?: number;
  status: ScoutStatusId;
  analysis?: ScoutAnalysis;
  /** 案件工房へ登録済みの場合、そのProjectCaseのID（二重登録防止） */
  linkedCaseId?: string;
  createdAt: string;
  updatedAt: string;
}
