/**
 * Lumina Brain（My Chaos AI Suite内の共有知識・記憶機能）の型定義。
 * Lumina Arcana（別プロジェクト・オラクルカード関連）とは無関係。混同しないこと。
 *
 * Phase 1 Step 1時点ではノート単体のCRUDのみを実装する。projectId/tagIds/pinned/archived/trashedAtは
 * Step2〜4で使う項目だが、後からのスキーマ変更（＝保存済みデータの移行）を避けるため、
 * 型と初期値だけを先に用意しておく（Step1のUIからはこれらを操作しない）。
 *
 * createdByType以下は将来のAI社員連携（記憶の作成者・参照権限・信頼度・承認状態等）のための
 * 予約項目。Step1では常に人間作成・既定値のまま保存し、AIが書き込むことはない。
 */

export type LuminaBrainAccessLevel = "private" | "team" | "public";
export type LuminaBrainConfidence = "verified" | "high" | "medium" | "low" | "unverified";
export type LuminaBrainNoteStatus = "draft" | "active" | "needs_review" | "archived";
export type LuminaBrainApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export interface LuminaBrainNote {
  id: string;
  title: string;
  /** Markdown本文。[[ノート名]]によるリンク記法はStep3で解釈する。 */
  body: string;
  createdAt: string;
  updatedAt: string;

  // --- Step2で使用（Step1では常に既定値） ---
  projectId?: string;
  tagIds: string[];
  pinned: boolean;
  archived: boolean;

  // --- Step4で使用（Step1では常にundefined＝ゴミ箱に入っていない） ---
  trashedAt?: string;

  // --- 将来のAI社員連携用の予約項目（Step1では常に既定値・AIは書き込まない） ---
  createdByType: "human" | "ai_employee";
  createdByAgentId?: string;
  accessLevel: LuminaBrainAccessLevel;
  confidence: LuminaBrainConfidence;
  status: LuminaBrainNoteStatus;
  approvalStatus: LuminaBrainApprovalStatus;
  /** 参照元（URL・他ノートID等）。将来の出典表示用。 */
  sourceRef?: string;
}

export interface LuminaBrainNoteDraft {
  title: string;
  body: string;
}
