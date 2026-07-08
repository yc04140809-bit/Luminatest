import Anthropic from "@anthropic-ai/sdk";

/** ツール強制呼び出しの1リクエスト分のパラメータ。 */
export interface ToolCallRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  toolName: string;
  toolDescription: string;
  /** JSON Schemaの `properties` / `required`（`type: "object"`は自動付与） */
  toolSchema: { properties: Record<string, unknown>; required: string[] };
}

/**
 * LLM呼び出しの抽象。エージェント実行・タスク分解のロジックはこのインターフェースにのみ依存し、
 * 実LLM(Anthropic)への差し替えやテスト用スタブへの差し替えを可能にする。
 */
export interface LlmClient {
  callTool<T>(request: ToolCallRequest): Promise<T>;
}

/**
 * Anthropic APIを使い、指定ツールの呼び出しを強制して構造化レスポンスを得るクライアント。
 * APIキー未設定でもサーバー起動自体は失敗させず、実際に呼び出された時点でエラーを投げる。
 * getApiKeyはコール毎に評価するコールバック——設定画面からキーが更新された場合、
 * 再起動なしで次回呼び出しから新しいキーが使われる。
 */
export function createAnthropicClient(getApiKey: () => string | undefined): LlmClient {
  let client: Anthropic | undefined;
  let clientKey: string | undefined;

  function getClient(): Anthropic {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not configured. Set it in the backend environment to let AI employees run.",
      );
    }
    if (!client || clientKey !== apiKey) {
      client = new Anthropic({ apiKey });
      clientKey = apiKey;
    }
    return client;
  }

  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      const anthropic = getClient();
      const response = await anthropic.messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        // claude-sonnet-5以降は非デフォルトのtemperatureを送ると400になるため送らない。
        // Agent.model.temperatureは将来的な他プロバイダ対応・UI表示用に型としては残す。
        system: request.systemPrompt,
        messages: [{ role: "user", content: request.userPrompt }],
        tools: [
          {
            name: request.toolName,
            description: request.toolDescription,
            input_schema: {
              type: "object",
              properties: request.toolSchema.properties,
              required: request.toolSchema.required,
            },
          },
        ],
        tool_choice: { type: "tool", name: request.toolName },
      });

      const toolUse = response.content.find((block) => block.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error(`LLM did not return a tool_use block for "${request.toolName}"`);
      }
      return toolUse.input as T;
    },
  };
}
