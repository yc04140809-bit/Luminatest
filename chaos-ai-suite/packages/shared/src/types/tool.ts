/** 外部ツールの識別子。GUIから将来追加される可能性も考慮し自由文字列も許容する。 */
export type ToolId =
  | "notion_export" // ネムリちゃん: 報告書・議事録・契約書をNotionデータベースへ保存
  | "google_drive_export" // ネムリちゃん: 同上をGoogle Driveへドキュメントとしてアップロード
  | "sns_post" // ミライちゃん: X(Twitter) / Instagramへ投稿
  | "calendar_event" // セイラちゃん: Googleカレンダーへタスク期限を登録
  | "slack_notify" // セイラちゃん: Slackへリマインド通知
  | (string & {});

/** LLMのtool_choiceにもそのまま流用する入力スキーマ（JSON Schemaのproperties/required相当）。 */
export interface ToolInputSchema {
  properties: Record<string, unknown>;
  required: string[];
}

/** 1つの外部ツールの定義。どのAI社員が使えるかもここで宣言する。 */
export interface ToolDefinition {
  id: ToolId;
  /** 表示名（例: "Notionへ保存"） */
  name: string;
  description: string;
  /** このツールを呼び出せるAI社員のID一覧 */
  allowedAgentIds: string[];
  inputSchema: ToolInputSchema;
}

/**
 * AI社員が外部ツールの実行を申請した内容。Taskに紐づけ、既存の承認ゲート
 * （Task.approval / awaiting_approval）をそのまま流用してHuman-in-the-Loopを実現する。
 * 代表が承認すると実際にToolExecutorが実行され、拒否すると何も実行されない。
 */
export interface PendingToolCall {
  toolId: ToolId;
  input: Record<string, unknown>;
  note?: string;
}
