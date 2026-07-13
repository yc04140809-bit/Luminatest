/**
 * AI社員の自動会議＋人間承認ゲート（AI会議モード）の型定義。
 * 作成役→検証役→統合役の3回のAI呼び出しで完成させ、必ず人間の承認を経てから成果物として扱う。
 * 既存の「戦略経営会議」（StrategyMeeting）とは目的が異なる別モード（成果物＋承認ゲートを持つ）。
 * 依頼あたりのAI呼び出しは最大3回に固定し、無限ループを防止する。
 */

/** 1依頼＝最大3回のAI呼び出し（作成・検証・統合）。修正/再検証は新しいセッションとして扱い、この上限を超えない。 */
export const COUNCIL_MAX_CALLS = 3;

export type CouncilPhase = "drafting" | "verifying" | "integrating" | "done";

export type CouncilStatus = "running" | "awaiting_approval" | "approved" | "changes_requested" | "discarded" | "failed";

export const COUNCIL_PHASE_LABELS: Record<CouncilPhase, string> = {
  drafting: "作成役が作成中",
  verifying: "検証役が確認中",
  integrating: "統合役が統合中",
  done: "完了",
};

/** 依頼の種類。役割の簡易割り当てルールに使う。 */
export const COUNCIL_CATEGORIES = [
  { id: "sns", label: "SNS投稿" },
  { id: "sales", label: "営業文・案件応募" },
  { id: "note", label: "note・文章" },
  { id: "image_plan", label: "画像企画" },
  { id: "other", label: "その他" },
] as const;

export type CouncilRequestCategory = (typeof COUNCIL_CATEGORIES)[number]["id"];

/** 依頼の種類ごとの役割割り当て（簡易ルール、完全自動選択ではない）。検証役は常にレヴィ、統合役は常にケイオス。 */
export const COUNCIL_ROLE_RULES: Record<CouncilRequestCategory, { drafterAgentId: string; verifierAgentId: string; integratorAgentId: string }> = {
  sns: { drafterAgentId: "agent-mirai", verifierAgentId: "agent-levi", integratorAgentId: "agent-chaos" },
  sales: { drafterAgentId: "agent-sayla", verifierAgentId: "agent-levi", integratorAgentId: "agent-chaos" },
  note: { drafterAgentId: "agent-nemuri", verifierAgentId: "agent-levi", integratorAgentId: "agent-chaos" },
  image_plan: { drafterAgentId: "agent-aria", verifierAgentId: "agent-levi", integratorAgentId: "agent-chaos" },
  // 「その他」は分類コストを避けるため、書類作成全般が担当のネムリを既定の作成役にする（フェーズ1の簡易ルール）。
  other: { drafterAgentId: "agent-nemuri", verifierAgentId: "agent-levi", integratorAgentId: "agent-chaos" },
};

/** 1回分のAI呼び出し記録。トークン数・概算費用・実行時間を残す（APIキー等の秘密情報は含めない）。 */
export interface CouncilCallLog {
  role: "draft" | "verify" | "integrate";
  agentId: string;
  agentName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  timestamp: string;
}

export interface CouncilVerification {
  issues: string[];
  fixSuggestions: string[];
  risks: string[];
}

/** AI会議セッション。officeStoreにインメモリで保持し、WebSocketで進行状況を配信する。 */
export interface CouncilSession {
  id: string;
  requestText: string;
  category: CouncilRequestCategory;
  status: CouncilStatus;
  phase: CouncilPhase;
  drafterAgentId: string;
  verifierAgentId: string;
  integratorAgentId: string;

  draft?: string;
  draftAssumptions: string[];
  verification?: CouncilVerification;
  finalDraft?: string;
  remainingRisks: string[];

  calls: CouncilCallLog[];
  maxCalls: number;
  costCapUsd?: number;
  estimatedCostUsd: number;

  /** 「処理停止」ボタンが押された場合にtrueになる。実行中の1回の呼び出しは完了させ、次の段階には進まない。 */
  stopRequested: boolean;

  /** 「修正を依頼」「もう一度検証」で新しいセッションを作った場合、元セッションのIDを残す。 */
  parentSessionId?: string;
  revisionInstruction?: string;

  startedAt: string;
  concludedAt?: string;
  errorMessage?: string;
  errorPhase?: CouncilPhase;
}

/** 開始リクエストの入力。 */
export interface CouncilStartInput {
  requestText: string;
  category: CouncilRequestCategory;
  costCapUsd?: number;
}
