/**
 * AI社員 討論会（自動討論＋強制反論ループ＋人間承認ゲート）の型定義。
 * 既存の「AI会議モード」（council.ts、作成→検証→統合の直列パイプライン）とは目的が異なる別機能。
 * 討論会は「提案に賛成するAIを並べる」のではなく、複数AI社員が初期意見→相互反論→改善案を経て、
 * 最後に1人の統合役が判断材料（メリット/リスク/対立点/改善案/推奨アクション/5項目採点）を整理し、
 * 必ず人間が最終判断する。AIは意思決定者ではなく「知恵をぶつけ合う参謀」として位置づける。
 *
 * 無限ループ防止のため、ラウンドは意見→反論→改善の3回＋統合1回に固定する
 * （council.tsのCOUNCIL_MAX_CALLSと同じ思想）。
 */

export type DebateRoundId = "opinion" | "rebuttal" | "improvement";

export const DEBATE_ROUND_LABELS: Record<DebateRoundId, string> = {
  opinion: "初期意見",
  rebuttal: "反論",
  improvement: "改善案",
};

export type DebatePhase = "opinion" | "rebuttal" | "improvement" | "integrating" | "done";

export const DEBATE_PHASE_LABELS: Record<DebatePhase, string> = {
  opinion: "初期意見を集めています",
  rebuttal: "相互に反論しています",
  improvement: "反論を踏まえて改善案を作成中",
  integrating: "統合役が討論をまとめています",
  done: "完了",
};

export type DebateStatus = "running" | "awaiting_approval" | "concluded" | "discarded" | "failed";

/** 人間の最終判断の選択肢。AIはこの4択のいずれも自分では選べない（必ず人間が選ぶ）。 */
export type DebateDecision = "run_as_is" | "run_modified" | "hold" | "rejected";

export const DEBATE_DECISION_LABELS: Record<DebateDecision, string> = {
  run_as_is: "そのまま実行",
  run_modified: "修正して実行",
  hold: "保留",
  rejected: "却下",
};

/** デフォルトの討論参加者（3人）。市場性/差別化=ミライ、収益性/継続性=セイラ、実現可能性=レヴィをカバーする組み合わせ。 */
export const DEBATE_DEFAULT_PARTICIPANT_IDS = ["agent-mirai", "agent-sayla", "agent-levi"];
/** 統合役は参加者と別にし、討論全体を俯瞰する立場を保つ（AI会議モードの統合役＝ケイオスと同じ役割分担の考え方）。 */
export const DEBATE_INTEGRATOR_ID = "agent-chaos";
export const DEBATE_MIN_PARTICIPANTS = 2;
export const DEBATE_MAX_PARTICIPANTS = 4;

/** 討論中の1発言（初期意見・反論・改善案のいずれか）。 */
export interface DebateEntry {
  round: DebateRoundId;
  agentId: string;
  agentName: string;
  content: string;
  /** 反論ラウンドのみ使用。強制反論ルールで検討した弱点・リスクの一覧。 */
  weaknesses?: string[];
  timestamp: string;
}

/** 5項目・100点満点の評価（統合役が討論全体を踏まえて1回だけ採点する）。 */
export interface DebateScore {
  marketability: number;
  profitability: number;
  feasibility: number;
  differentiation: number;
  sustainability: number;
  /** 5項目の単純平均（参考値。成果を保証しない）。 */
  total: number;
}

/** 統合役による最終整理。断定的な結論ではなく、人間が判断するための材料として位置づける。 */
export interface DebateSynthesis {
  biggestMerit: string;
  biggestRisk: string;
  disagreementPoints: string[];
  improvedProposal: string;
  recommendedAction: string;
  score: DebateScore;
}

/** 1回分のAI呼び出し記録。トークン数・概算費用・実行時間を残す（APIキー等の秘密情報は含めない）。 */
export interface DebateCallLog {
  round: DebateRoundId | "integrate";
  agentId: string;
  agentName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  timestamp: string;
}

/** AI討論会セッション。officeStoreにインメモリで保持し、WebSocketで進行状況を配信する。 */
export interface DebateSession {
  id: string;
  topic: string;
  status: DebateStatus;
  phase: DebatePhase;
  participantAgentIds: string[];
  integratorAgentId: string;

  entries: DebateEntry[];
  synthesis?: DebateSynthesis;

  decision?: DebateDecision;
  decisionNote?: string;

  calls: DebateCallLog[];
  costCapUsd?: number;
  estimatedCostUsd: number;

  /** 「処理停止」ボタンが押された場合にtrueになる。実行中のラウンドは完了させ、次のラウンドには進まない。 */
  stopRequested: boolean;

  startedAt: string;
  concludedAt?: string;
  errorMessage?: string;
  errorPhase?: DebatePhase;
}

/** 開始リクエストの入力。 */
export interface DebateStartInput {
  topic: string;
  participantAgentIds?: string[];
  costCapUsd?: number;
}
