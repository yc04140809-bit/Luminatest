/**
 * ケイオス師匠ブランド設定。SNS投稿・note記事・商品紹介文などの生成時に、
 * 有効化されていれば用途別に必要な項目だけをプロンプトへ追加する。
 * 現時点では単一プロフィールのみを扱うが、将来複数ブランドに拡張しやすいよう
 * idつきのレコード構造にしてある。
 */
export interface BrandProfile {
  id: string;
  name: string;
  /** ブランド軸（長文） */
  brandStatement: string;
  /** ブランドタイプ・立ち位置（長文） */
  brandTypes: string;
  /** 主な読者 */
  targetAudience: string[];
  /** 読者の悩み */
  audienceProblems: string[];
  /** 提供する価値 */
  providedValue: string[];
  /** 信じること */
  beliefs: string[];
  /** 避けること（姿勢・方針） */
  enemies: string[];
  /** 世界観（長文） */
  worldview: string;
  /** 発信テーマ */
  contentPillars: string[];
  /** 文章トーン */
  toneRules: string[];
  /** 投稿生成の基本構造（ステップ） */
  postStructure: string[];
  /** 買われる心理の流れ（ステップ） */
  trustFlow: string[];
  /** 売り込まずに売れる導線（順序） */
  salesFlow: string[];
  /** 弱い誘導の例文 */
  softCtaExamples: string[];
  /** 避けるべき強い表現 */
  prohibitedExpressions: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BrandProfileDraft = Omit<BrandProfile, "id" | "createdAt" | "updatedAt">;

export type BrandProfileUpdateInput = Partial<BrandProfileDraft>;

/** 生成用途ごとに、プロンプトへ渡す必要のある情報だけを絞り込むための識別子。 */
export type BrandContextKind = "sns" | "note" | "product";
