import type { Agent } from "@chaos-ai-suite/shared";
import type { OfficeStore } from "../store/officeStore.js";
import type { LlmClient } from "./llmClient.js";
import { todayInTokyo } from "./dateUtil.js";

const FACILITATOR_ID = "agent-sayla";

export interface MorningBriefingRuntime {
  /** 本日まだ朝会を実施していなければ実行する。実施済みの場合はエラーを投げる。 */
  runIfDue(): Promise<void>;
}

/** 直近のメッセージから、朝会で報告すべき出来事（チャット・ハンドオフ・エラー等）だけを抜き出す。 */
function digestText(messages: { fromAgentId: string; type: string; content: string }[], roster: Agent[]): string {
  if (messages.length === 0) return "（前回の朝会以降、新しい動きはまだありません）";
  const nameById = new Map(roster.map((agent) => [agent.id, agent.name]));
  const resolveName = (id: string) => (id === "user" ? "代表" : id === "system" ? "システム" : (nameById.get(id) ?? id));
  return messages
    .map((message) => `[${message.type}] ${resolveName(message.fromAgentId)}: ${message.content}`)
    .join("\n");
}

export function createMorningBriefingRuntime(store: OfficeStore, llm: LlmClient): MorningBriefingRuntime {
  async function runIfDue(): Promise<void> {
    const today = todayInTokyo();
    if (store.getLastBriefingDate() === today) {
      throw new Error("本日の朝会は実施済みです。");
    }

    const facilitator = store.getAgent(FACILITATOR_ID);
    if (!facilitator) {
      throw new Error("会議に必要なAI社員（agent-sayla）が見つかりません。エージェント構成を確認してください。");
    }

    const roster = store.listAgents();
    const recentMessages = store.listMessages(60).filter((message) => message.type !== "briefing");
    const pendingTasks = store.getState().pendingApprovalTaskIds.map((id) => store.getTask(id)).filter(
      (task): task is NonNullable<typeof task> => Boolean(task),
    );

    const userPrompt = `# 直近の社内チャットログ
${digestText(recentMessages, roster)}

# 現在、代表の承認待ちになっている案件（${pendingTasks.length}件）
${
  pendingTasks.length === 0
    ? "（承認待ちの案件はありません）"
    : pendingTasks.map((task) => `- ${task.title}`).join("\n")
}

# 指示
上記を踏まえて、代表への「朝会ブリーフィング」を作成してください。
以下を簡潔にまとめること（3〜6文程度）：
- 前回の朝会以降に進んだこと・完了したこと
- 承認待ちで代表の判断が必要なもの
- 特に報告すべき懸念やエラーがあれば一言
新しい動きが何もなければ、その旨を明るく短く伝えるだけでよい。`;

    const result = await llm.callTool<{ content: string }>({
      systemPrompt: facilitator.systemPrompt,
      userPrompt,
      model: facilitator.model.model,
      temperature: facilitator.model.temperature,
      maxTokens: 600,
      toolName: "submit_morning_briefing",
      toolDescription: "朝会ブリーフィングの内容を記録する",
      toolSchema: {
        properties: { content: { type: "string", description: "朝会ブリーフィングの本文" } },
        required: ["content"],
      },
    });

    store.postMessage({
      channel: "command_center",
      fromAgentId: facilitator.id,
      type: "briefing",
      content: result.content,
    });
    store.recordBriefing(today);
  }

  return { runIfDue };
}
