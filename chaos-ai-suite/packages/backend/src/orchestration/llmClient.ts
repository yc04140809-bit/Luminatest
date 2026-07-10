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

/** Web検索つき呼び出しのパラメータ。検索回数上限でコストを抑える。 */
export interface WebSearchToolCallRequest extends ToolCallRequest {
  /** Web検索の最大実行回数（サーバーツール web_search の max_uses） */
  maxSearches: number;
}

/**
 * LLM呼び出しの抽象。エージェント実行・タスク分解のロジックはこのインターフェースにのみ依存し、
 * 実LLM(Anthropic)への差し替えやテスト用スタブへの差し替えを可能にする。
 */
export interface LlmClient {
  callTool<T>(request: ToolCallRequest): Promise<T>;
  /**
   * Web検索サーバーツールを有効にした上で、最後に指定ツールで結果を提出させる呼び出し。
   * 検索はAnthropicのサーバー側で実行されるため、この1回のAPI呼び出しに含まれる。
   * 未実装のクライアント（テストスタブ等）ではundefinedのままでよい。
   */
  callToolWithWebSearch?<T>(request: WebSearchToolCallRequest): Promise<T>;
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

    async callToolWithWebSearch<T>(request: WebSearchToolCallRequest): Promise<T> {
      const anthropic = getClient();
      // Web検索とツール提出を両立させるため tool_choice は強制しない
      // （強制するとモデルが検索する前に提出させられてしまう）。
      const params = {
        model: request.model,
        max_tokens: request.maxTokens,
        system: request.systemPrompt,
        tools: [
          { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: request.maxSearches },
          {
            name: request.toolName,
            description: request.toolDescription,
            input_schema: {
              type: "object" as const,
              properties: request.toolSchema.properties,
              required: request.toolSchema.required,
            },
          },
        ],
      };
      const messages: Anthropic.MessageParam[] = [{ role: "user", content: request.userPrompt }];

      // サーバー側検索ループが上限に達すると pause_turn で返るため、続きを再送して完走させる。
      let response = await anthropic.messages.create({ ...params, messages });
      let continuations = 0;
      while (response.stop_reason === "pause_turn" && continuations < 4) {
        messages.push({ role: "assistant", content: response.content });
        response = await anthropic.messages.create({ ...params, messages });
        continuations += 1;
      }

      // 提出ツールの呼び出しは通常最後のブロックに来る。見つからなければ失敗として扱う。
      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === request.toolName,
      );
      const toolUse = toolUses[toolUses.length - 1];
      if (!toolUse) {
        throw new Error(
          `LLM did not submit results via "${request.toolName}" after web search (stop_reason: ${response.stop_reason})`,
        );
      }
      return toolUse.input as T;
    },
  };
}
