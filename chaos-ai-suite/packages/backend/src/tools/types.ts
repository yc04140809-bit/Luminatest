import type { ToolDefinition } from "@chaos-ai-suite/shared";

/** 1回のツール実行リクエストの入力。 */
export interface ToolExecutionContext {
  agentId: string;
  /** 実行の起点となったタスクID（会話ログのrelatedTaskIdに使う） */
  taskId: string;
  input: Record<string, unknown>;
}

/**
 * ツール実行が成功した場合の結果。失敗時はExecutorがErrorをthrowし、
 * 呼び出し側（agentRuntime）がexecuteAgentTaskと同じ形でcatchしてタスクをblockedにする
 * ——成功/失敗を真偽値で持ち回るのではなく、成功パスのみを型で表現する。
 */
export interface ToolExecutionResult {
  /** チャットログや承認履歴に表示する短い要約 */
  summary: string;
  /** 生の実行結果（デバッグ・将来の追跡表示用。ログには出さない想定） */
  data?: unknown;
}

/**
 * 外部ツール（Notion / Google Drive / Slack / Google Calendar / SNS等）実行の共通インターフェース。
 * 実装は「設定（APIキー等）が無ければ実行時に分かりやすいエラーを投げる」という
 * llmClient.tsと同じ遅延失敗方針に従う——サーバー起動やツール一覧表示自体は
 * 未設定でも失敗させない。
 */
export interface ToolExecutor {
  definition: ToolDefinition;
  execute(context: ToolExecutionContext): Promise<ToolExecutionResult>;
}
