import type { Agent, Message } from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

export interface RiskReviewResult {
  hasConcern: boolean;
  content: string;
}

function recentHistoryText(messages: Message[], roster: Agent[]): string {
  if (messages.length === 0) return "（社内チャットの履歴はまだありません）";
  const nameById = new Map(roster.map((agent) => [agent.id, agent.name]));
  const resolveName = (id: string) => (id === "user" ? "代表" : id === "system" ? "システム" : (nameById.get(id) ?? id));
  return messages.map((message) => `${resolveName(message.fromAgentId)}: ${message.content}`).join("\n");
}

/**
 * 代表の指示・実行計画を、リスク担当AI社員（通常はケイオスちゃん）に自発的にレビューさせる。
 * 看過できない懸念があるときだけhasConcern=trueで理由付きの物申しを返す（＝驚きの物申し機能）。
 * 通常のタスク実行フローを止めない、あくまで助言としての位置づけ。
 */
export async function reviewDirectiveRisk(params: {
  reviewer: Agent;
  directive: string;
  planSummary: string;
  recentMessages: Message[];
  roster: Agent[];
  llm: LlmClient;
}): Promise<RiskReviewResult> {
  const { reviewer, directive, planSummary, recentMessages, roster, llm } = params;

  const userPrompt = `# 代表からの指示
${directive}

# 実行計画の概要
${planSummary}

# 直近の社内チャット履歴（過去の経緯・トラブルの参考に）
${recentHistoryText(recentMessages, roster)}

# 指示
あなたの専門性・性格・口調のまま、上記の指示・計画をレビューしてください。
過去の経緯やあなたの専門分野（リスク・カスタマー対応・現場運用など）に照らして、
看過できない具体的な懸念がある場合のみ hasConcern=true とし、根拠とともに簡潔に（2〜4文）指摘してください。
遠慮は不要です。逆に、特筆すべき懸念がなければ hasConcern=false としてください（この場合はcontentは使われません）。
些細な言い回しの好み等では懸念を上げないこと。`;

  return llm.callTool<RiskReviewResult>({
    systemPrompt: reviewer.systemPrompt,
    userPrompt,
    model: reviewer.model.model,
    temperature: reviewer.model.temperature,
    maxTokens: 400,
    toolName: "submit_risk_review",
    toolDescription: "指示・実行計画に対するリスクレビュー結果を記録する",
    toolSchema: {
      properties: {
        hasConcern: { type: "boolean", description: "看過できない具体的な懸念がある場合のみtrue" },
        content: { type: "string", description: "懸念の指摘内容（hasConcern=trueの場合のみ使用）" },
      },
      required: ["hasConcern", "content"],
    },
  });
}
