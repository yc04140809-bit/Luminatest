/** タスクの進行状況。承認ゲート(awaiting_approval)は人間参加型フローの要。 */
export type TaskStatus =
  | "pending" // 未着手（次の担当待ち）
  | "in_progress" // 処理中
  | "handed_off" // 次の担当AIへパス済み
  | "awaiting_approval" // 代表の承認待ち（Human-in-the-loop）
  | "approved" // 承認済み
  | "rejected" // 差し戻し
  | "completed" // 完了
  | "blocked"; // ブロック中（要介入）

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskOutputType =
  | "text"
  | "document" // 報告書・議事録・契約書など
  | "sns_post"
  | "training_material"
  | "dev_spec"
  | "strategy_note"
  | "other";

/** 承認（Human-in-the-loop）の記録。契約書やSNS投稿文など重要な成果物に付与。 */
export interface TaskApproval {
  required: boolean;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string; // "user"固定想定だが将来の代理承認者にも対応
  decidedAt?: string;
  comment?: string;
}

/** タスクが別エージェントへ引き継がれた際の1エントリ。ログ・タイムラインビューの元データ。 */
export interface TaskHandoff {
  fromAgentId: string | "user";
  toAgentId: string;
  note?: string;
  timestamp: string;
}

/**
 * 代表の大雑把な指示から分解される実行単位。
 * セイラちゃん/レヴィちゃんの作戦会議で親タスクが子タスクに分解され、
 * 各専門AIへ自動配分されるパイプラインを表現する。
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  outputType: TaskOutputType;
  /** タスクの発生元。代表からの直接指示は"user"。 */
  createdBy: string | "user";
  assignedAgentId?: string;
  /** 大タスクを分解した際の親タスクID */
  parentTaskId?: string;
  /** 分解された子タスクのID一覧 */
  subtaskIds: string[];
  handoffs: TaskHandoff[];
  approval: TaskApproval;
  /** AIが生成した成果物本文（プレビュー・承認対象） */
  output?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
}

export type TaskDraft = Omit<
  Task,
  "id" | "status" | "subtaskIds" | "handoffs" | "createdAt" | "updatedAt"
>;
