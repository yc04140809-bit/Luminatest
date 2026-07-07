import type { Agent, TaskOutputType, TaskPriority } from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

/** 作戦会議で分解された1つの実行タスク案。 */
export interface SubtaskPlan {
  title: string;
  description: string;
  outputType: TaskOutputType;
  assignedAgentId: string;
  priority: TaskPriority;
  requiresApprovalHint: boolean;
}

export interface DecompositionPlan {
  meetingSummary: string;
  subtasks: SubtaskPlan[];
}

const OUTPUT_TYPES: TaskOutputType[] = [
  "text",
  "document",
  "sns_post",
  "training_material",
  "dev_spec",
  "strategy_note",
  "other",
];

/**
 * 代表の大雑把な指示を、セイラちゃん（経営サポート）とレヴィちゃん（開発指示書）の
 * 作戦会議として実行可能なタスク群へ分解する。
 */
export async function decomposeDirective(params: {
  directive: string;
  strategist: Agent;
  architect: Agent;
  roster: Agent[];
  llm: LlmClient;
}): Promise<DecompositionPlan> {
  const { directive, strategist, architect, roster, llm } = params;

  const rosterText = roster
    .filter((agent) => agent.enabled)
    .map((agent) => `- ${agent.id}: ${agent.name}（${agent.title}） — ${agent.description}`)
    .join("\n");

  const systemPrompt = `${strategist.systemPrompt}

---

この応答では、上記の経営サポートAI「${strategist.name}」と、開発指示書AI「${architect.name}」（${architect.description}）が
共同で作戦会議を行った結果として応答してください。経営視点とタスク分解・進捗管理の視点の両方を反映すること。`;

  const userPrompt = `# 代表からの指示
${directive}

# 社内のAI社員一覧（分解したタスクの割り当て先）
${rosterText}

# 指示
上記の指示を、実行可能な単位のタスクに分解してください。
各タスクには必ず上記一覧からいずれか1名のIDをassignedAgentIdに指定してください。
契約書・対外SNS投稿・重大な意思決定など、代表の最終承認が必要になりそうなタスクはrequiresApprovalHintをtrueにしてください。`;

  return llm.callTool<DecompositionPlan>({
    systemPrompt,
    userPrompt,
    model: strategist.model.model,
    temperature: strategist.model.temperature,
    maxTokens: 2048,
    toolName: "record_task_plan",
    toolDescription: "作戦会議の結論として、タスク分解案を記録する",
    toolSchema: {
      properties: {
        meetingSummary: { type: "string", description: "会議の結論の要約（2〜3文）" },
        subtasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              outputType: { type: "string", enum: OUTPUT_TYPES },
              assignedAgentId: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
              requiresApprovalHint: { type: "boolean" },
            },
            required: [
              "title",
              "description",
              "outputType",
              "assignedAgentId",
              "priority",
              "requiresApprovalHint",
            ],
          },
        },
      },
      required: ["meetingSummary", "subtasks"],
    },
  });
}
