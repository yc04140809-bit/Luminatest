/**
 * エージェント・オーケストレーションのエントリーポイント（Step2で実装）。
 *
 * 想定する責務:
 *  - LLM API（Anthropic/OpenAI等）呼び出しによるタスク実行
 *  - 実行結果に基づく「次の担当エージェント」の指名（ハンドオフ）
 *  - OfficeStore経由でのAgent.status / Task.status 更新とWSブロードキャスト
 *  - セイラちゃん×レヴィちゃんによるタスク分解会議のシミュレーション
 *  - 承認が必要な成果物をawaiting_approvalで止めるゲート制御
 *
 * Step1では型・シード・配線のみを用意し、実行ループは未実装のプレースホルダとする。
 */
export interface AgentRuntime {
  /** 代表からの大雑把な指示を受けてタスク分解〜実行パイプラインを開始する */
  dispatchDirective(directive: string): Promise<void>;
}

export function createAgentRuntime(): AgentRuntime {
  return {
    async dispatchDirective(_directive: string) {
      throw new Error("AgentRuntime is not implemented yet (Step2)");
    },
  };
}
