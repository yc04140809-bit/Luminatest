import type { ToolDefinition } from "@chaos-ai-suite/shared";
import type { ToolExecutor } from "./types.js";

/**
 * どのAI社員がどの外部ツールを使えるかを管理するレジストリ。
 * agentExecutorはこれを使ってLLMに「今使える外部ツール」を提示し、
 * agentRuntimeは承認後にここからExecutorを引いて実行する。
 */
export class ToolRegistry {
  private executors = new Map<string, ToolExecutor>();

  register(executor: ToolExecutor): void {
    this.executors.set(executor.definition.id, executor);
  }

  get(toolId: string): ToolExecutor | undefined {
    return this.executors.get(toolId);
  }

  list(): ToolDefinition[] {
    return Array.from(this.executors.values()).map((executor) => executor.definition);
  }

  /** 指定したAI社員が使える外部ツールの定義一覧（LLMへの提示・GUI表示用）。 */
  listForAgent(agentId: string): ToolDefinition[] {
    return this.list().filter((definition) => definition.allowedAgentIds.includes(agentId));
  }

  canUse(agentId: string, toolId: string): boolean {
    const executor = this.get(toolId);
    return Boolean(executor?.definition.allowedAgentIds.includes(agentId));
  }
}
