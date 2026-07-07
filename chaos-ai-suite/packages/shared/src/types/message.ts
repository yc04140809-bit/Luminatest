/** 社内チャットログのチャンネル種別。 */
export type MessageChannel =
  | "general" // 全社雑談・自律連携ログ
  | "command_center" // 代表からの全体指示・個別メンション
  | "direct" // エージェント間の1対1
  | "system"; // システム通知（エラー・承認待ちなど）

/** メッセージの意味づけ。UIでのアイコン・強調表示の出し分けに使う。 */
export type MessageType =
  | "chat" // 通常の会話
  | "task_handoff" // タスクのパス
  | "status_update" // ステータス変化の共有
  | "approval_request" // 代表への承認依頼
  | "directive" // 代表からの指示
  | "system_log"; // システムログ（エラー等）

/**
 * 社内チャット（Slack/Discord風ログ）の1メッセージ。
 * エージェント同士が自律的にタスクをパスし合う様子を可視化する元データ。
 */
export interface Message {
  id: string;
  channel: MessageChannel;
  /** 送信者。代表の指示は"user"、システムイベントは"system"。 */
  fromAgentId: string | "user" | "system";
  /** @メンション先（個別指示や名指しのパス先） */
  toAgentId?: string;
  type: MessageType;
  content: string;
  relatedTaskId?: string;
  timestamp: string;
}

export type MessageDraft = Omit<Message, "id" | "timestamp">;
