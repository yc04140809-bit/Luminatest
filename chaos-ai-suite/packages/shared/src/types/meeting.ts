/** 戦略経営会議の進行フェーズ。 */
export type MeetingPhase =
  | "opening" // セイラちゃんが目的を定義し、意見を求める
  | "discussion" // レヴィ・ミライ・ケイオスによるターン制ディスカッション
  | "documentation" // ネムリが議事録化、アリアがタスク化
  | "proposal" // セイラちゃんが代表への最終提案をまとめる
  | "concluded"; // 完了

export type MeetingRunStatus = "running" | "concluded" | "failed";

/** 会議中の1発言。 */
export interface MeetingStatement {
  id: string;
  agentId: string;
  phase: MeetingPhase;
  content: string;
  timestamp: string;
}

/**
 * 自律型・戦略経営会議のセッション。
 * 既存の`ActiveMeeting`（「今会議中で手が離せない」という軽量な社内ステータス）とは別に、
 * フェーズ進行・発言ログ・議事録・タスク化・最終提案までを保持する本格的な会議記録。
 */
export interface StrategyMeeting {
  id: string;
  topic: string;
  status: MeetingRunStatus;
  phase: MeetingPhase;
  /** 参加するAI社員のID一覧（ファシリテーター→専門家3名→議事録担当→タスク化担当の順） */
  participantAgentIds: string[];
  /** 現在発言中のエージェントID（フロントの吹き出し演出のトリガーに使う） */
  currentSpeakerId?: string;
  statements: MeetingStatement[];
  /** ネムリちゃんによる議事録 */
  minutes?: string;
  /** アリアちゃんによる実行可能なタスク・マニュアルの箇条書き */
  actionItems?: string[];
  /** セイラちゃんによる代表への最終提案 */
  proposal?: string;
  startedAt: string;
  concludedAt?: string;
  errorMessage?: string;
}
