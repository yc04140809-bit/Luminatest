/** AI社員の役割カテゴリ。GUIから新規役割を追加する場合は文字列として自由入力も許容する。 */
export type AgentRoleKey =
  | "customer-care" // ケイオスちゃん: 接遇ガードAI
  | "documentation" // ネムリちゃん: 書類作成AI
  | "training" // アリアちゃん: 研修資料AI
  | "dev-spec" // レヴィちゃん: 開発指示書AI
  | "sns" // ミライちゃん: SNS投稿AI
  | "management" // セイラちゃん: 経営サポートAI
  | (string & {});

/** オフィスビューに表示するAI社員の現在の活動ステータス。 */
export type AgentStatus =
  | "standby" // スタンバイ中 💤
  | "thinking" // 思考中 🤔
  | "writing" // 書類作成中 📝
  | "meeting" // 会議中 💬
  | "reviewing" // レビュー中 👀
  | "offline"; // 停止中

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  standby: "スタンバイ中",
  thinking: "思考中",
  writing: "書類作成中",
  meeting: "会議中",
  reviewing: "レビュー中",
  offline: "停止中",
};

export const AGENT_STATUS_ICON: Record<AgentStatus, string> = {
  standby: "💤",
  thinking: "🤔",
  writing: "📝",
  meeting: "💬",
  reviewing: "👀",
  offline: "⏸️",
};

/** LLM呼び出し設定。エージェントごとにモデル・温度をGUIからカスタマイズ可能にする。 */
export interface AgentModelConfig {
  provider: "anthropic" | "openai" | (string & {});
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

/** オフィスビュー上のデスク座標（グリッド単位）。 */
export interface DeskPosition {
  x: number;
  y: number;
}

/**
 * 自律型AI社員のプロファイル。
 * 代表はGUIから追加・削除・システムプロンプト編集・役割変更を自由に行える。
 */
export interface Agent {
  id: string;
  /** 表示名（例: "ケイオスちゃん"） */
  name: string;
  /** 役職・肩書き（例: "接遇ガードAI担当"） */
  title: string;
  roleKey: AgentRoleKey;
  /** 短い自己紹介・役割サマリー */
  description: string;
  /** 担当業務の一覧（箇条書き） */
  responsibilities: string[];
  /** このエージェントが起動されるきっかけの一覧 */
  triggers: string[];
  /** 性格・口調・専門知識を定義するシステムプロンプト本文 */
  systemPrompt: string;
  /** UI上のテーマカラー（Tailwindクラスまたはhex） */
  accentColor: string;
  avatarUrl?: string;
  deskPosition: DeskPosition;
  model: AgentModelConfig;
  status: AgentStatus;
  /** 現在処理中タスクのID */
  currentTaskId?: string;
  /** オフィスビューの吹き出しに出す短い進捗テキスト */
  currentTaskSummary?: string;
  /** 無効化されたエージェントはタスクを受け取らない（削除ではなく休止） */
  enabled: boolean;
  /** GUIからの編集・削除を許可するか（初期6名も含め既定でtrueにし完全カスタマイズ可能とする） */
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GUIの新規作成・編集フォームが送信するペイロード。 */
export type AgentDraft = Omit<
  Agent,
  "id" | "status" | "currentTaskId" | "currentTaskSummary" | "createdAt" | "updatedAt"
>;
