import type { Agent, AgentStatus, Task, TaskOutputType, ToolDefinition } from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

/** 1タスク実行の結果。成果物本文と、次に取るべきアクションの判断。 */
export interface ExecutionResult {
  output: string;
  action: "complete" | "handoff" | "request_approval" | "tool_call";
  targetAgentId?: string;
  note?: string;
  /** action=tool_call の場合に呼び出す外部ツールのID（ToolDefinition.id） */
  toolId?: string;
  /** action=tool_call の場合の、そのツールのinputSchemaに沿った入力値 */
  toolInput?: Record<string, unknown>;
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

/** 「来週月曜」等の相対日付表現をAIが正しく解決できるよう、現在の日本時間を明示する。 */
function currentDateTimeText(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function describeTools(tools: ToolDefinition[]): string {
  if (tools.length === 0) return "（利用できる外部ツールはありません）";
  return tools
    .map((tool) => {
      const fields = Object.entries(tool.inputSchema.properties)
        .map(([key, schema]) => {
          const description = typeof schema === "object" && schema && "description" in schema
            ? String((schema as { description?: unknown }).description ?? "")
            : "";
          const required = tool.inputSchema.required.includes(key) ? "必須" : "任意";
          return `    - ${key}（${required}）: ${description}`;
        })
        .join("\n");
      return `- toolId: "${tool.id}"（${tool.name}） — ${tool.description}\n  入力項目:\n${fields}`;
    })
    .join("\n");
}

/**
 * 1件のタスクを担当エージェントに実行させ、成果物と次アクションを得る。
 * LLMには`submit_task_result`ツールの呼び出しを強制し、構造化レスポンスとして受け取る。
 */
export async function executeAgentTask(params: {
  agent: Agent;
  task: Task;
  roster: Agent[];
  availableTools: ToolDefinition[];
  llm: LlmClient;
}): Promise<ExecutionResult> {
  const { agent, task, roster, availableTools, llm } = params;

  const rosterText = roster
    .filter((candidate) => candidate.id !== agent.id && candidate.enabled)
    .map((candidate) => `- ${candidate.id}: ${candidate.name}（${candidate.title}） — ${candidate.description}`)
    .join("\n");

  const handoffHistory = task.handoffs
    .map((handoff) => `${handoff.fromAgentId} → ${handoff.toAgentId}${handoff.note ? `（${handoff.note}）` : ""}`)
    .join("\n");

  const userPrompt = `# 現在日時（日本時間）
${currentDateTimeText()}

# タスク
タイトル: ${task.title}
内容: ${task.description}
優先度: ${task.priority}
成果物タイプ: ${task.outputType}
${handoffHistory ? `\n# これまでの引き継ぎ履歴\n${handoffHistory}\n` : ""}${
    task.output ? `\n# 直前の成果物（叩き台）\n${task.output}\n` : ""
  }
# 社内の他のAI社員
${rosterText || "（他に稼働中のAI社員はいません）"}

# あなたが実行を申請できる外部ツール
${describeTools(availableTools)}

# 指示
あなたの専門知識・性格・口調に沿って、このタスクを実際に遂行し、成果物本文を作成してください。
その上で、次に取るべきアクションを判断してください。
- complete: このタスクはあなたの手で完結し、他の確認は不要
- handoff: 別のAI社員に引き継ぐべき（上記の一覧からagentIdを選びtargetAgentIdに指定し、noteに引き継ぎ理由を書く）
- request_approval: 代表（人間）の最終承認が必要な重要な成果物（外部ツールを使わないもの。契約書の最終確認など）
- tool_call: 上記の外部ツールを使って実際にNotion保存・SNS投稿・カレンダー登録等を行うべき場合。
  toolIdとtoolInput（そのツールの入力項目に沿ったオブジェクト）を指定すること。
  ツール実行は必ず代表の承認を経てから行われるため、ここでは「申請」するだけでよい。
  「来週月曜」「明日」等の相対的な日付表現は、冒頭の「現在日時」を基準に正確な日付へ変換すること。`;

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
          enum: ["complete", "handoff", "request_approval", "tool_call"],
          description: "次に取るべきアクション",
        },
        targetAgentId: {
          type: "string",
          description: "action=handoffの場合の引き継ぎ先エージェントID",
        },
        toolId: {
          type: "string",
          description: "action=tool_callの場合に実行を申請する外部ツールのID",
        },
        toolInput: {
          type: "object",
          description: "action=tool_callの場合の、そのツールの入力項目に沿ったオブジェクト",
        },
        note: {
          type: "string",
          description: "引き継ぎ理由、承認依頼の理由、またはツール実行申請の理由",
        },
      },
      required: ["output", "action"],
    },
  });
}
