import type { Agent, AgentStatus, Task, TaskOutputType } from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

/** 1タスク実行の結果。成果物本文と、次に取るべきアクションの判断。 */
export interface ExecutionResult {
  output: string;
  action: "complete" | "handoff" | "request_approval";
  targetAgentId?: string;
  note?: string;
}

const WRITING_OUTPUT_TYPES: TaskOutputType[] = [
  "document",
  "dev_spec",
  "training_material",
  "strategy_note",
];

/** オフィスビューのステータスアイコンを成果物タイプから決める（📝 vs 🤔）。 */
export function statusForOutputType(outputType: TaskOutputType): AgentStatus {
  return WRITING_OUTPUT_TYPES.includes(outputType) ? "writing" : "thinking";
}

/**
 * 1件のタスクを担当エージェントに実行させ、成果物と次アクションを得る。
 * LLMには`submit_task_result`ツールの呼び出しを強制し、構造化レスポンスとして受け取る。
 */
export async function executeAgentTask(params: {
  agent: Agent;
  task: Task;
  roster: Agent[];
  llm: LlmClient;
}): Promise<ExecutionResult> {
  const { agent, task, roster, llm } = params;

  const rosterText = roster
    .filter((candidate) => candidate.id !== agent.id && candidate.enabled)
    .map((candidate) => `- ${candidate.id}: ${candidate.name}（${candidate.title}） — ${candidate.description}`)
    .join("\n");

  const handoffHistory = task.handoffs
    .map((handoff) => `${handoff.fromAgentId} → ${handoff.toAgentId}${handoff.note ? `（${handoff.note}）` : ""}`)
    .join("\n");

  const userPrompt = `# タスク
タイトル: ${task.title}
内容: ${task.description}
優先度: ${task.priority}
成果物タイプ: ${task.outputType}
${handoffHistory ? `\n# これまでの引き継ぎ履歴\n${handoffHistory}\n` : ""}${
    task.output ? `\n# 直前の成果物（叩き台）\n${task.output}\n` : ""
  }
# 社内の他のAI社員
${rosterText || "（他に稼働中のAI社員はいません）"}

# 指示
あなたの専門知識・性格・口調に沿って、このタスクを実際に遂行し、成果物本文を作成してください。
その上で、次に取るべきアクションを判断してください。
- complete: このタスクはあなたの手で完結し、他の確認は不要
- handoff: 別のAI社員に引き継ぐべき（上記の一覧からagentIdを選びtargetAgentIdに指定し、noteに引き継ぎ理由を書く）
- request_approval: 代表（人間）の最終承認が必要な重要な成果物（契約書・対外SNS投稿・重大な意思決定など）`;

  return llm.callTool<ExecutionResult>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: agent.model.maxOutputTokens,
    toolName: "submit_task_result",
    toolDescription: "タスクの成果物本文と次に取るべきアクションを記録する",
    toolSchema: {
      properties: {
        output: { type: "string", description: "成果物本文" },
        action: {
          type: "string",
          enum: ["complete", "handoff", "request_approval"],
          description: "次に取るべきアクション",
        },
        targetAgentId: {
          type: "string",
          description: "action=handoffの場合の引き継ぎ先エージェントID",
        },
        note: {
          type: "string",
          description: "引き継ぎ理由、または承認依頼の理由",
        },
      },
      required: ["output", "action"],
    },
  });
}
