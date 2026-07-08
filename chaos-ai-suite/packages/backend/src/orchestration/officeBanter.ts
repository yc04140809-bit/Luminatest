import type { Agent } from "@chaos-ai-suite/shared";
import type { OfficeStore } from "../store/officeStore.js";
import type { LlmClient } from "./llmClient.js";

const BANTER_TURNS = 3;

export interface OfficeBanterRuntime {
  /** 有効なAI社員から2名をランダムに選び、業務外の軽い雑談を数ターン交わさせる。 */
  runBanter(): Promise<void>;
  /** 既に雑談が進行中かどうか（ルート層の多重起動防止に使う）。 */
  isRunning(): boolean;
}

function pickTwoRandom(agents: Agent[]): [Agent, Agent] {
  if (agents.length < 2) {
    throw new Error("雑談には最低2名の稼働中AI社員が必要です。");
  }
  const shuffled = [...agents].sort(() => Math.random() - 0.5);
  return [shuffled[0]!, shuffled[1]!];
}

function transcriptText(lines: { agentId: string; content: string }[], roster: Agent[]): string {
  if (lines.length === 0) return "（まだ発言はありません。あなたから話しかけてください）";
  const nameById = new Map(roster.map((agent) => [agent.id, agent.name]));
  return lines.map((line) => `${nameById.get(line.agentId) ?? line.agentId}: ${line.content}`).join("\n");
}

export function createOfficeBanterRuntime(
  store: OfficeStore,
  llm: LlmClient,
  pick: (agents: Agent[]) => [Agent, Agent] = pickTwoRandom,
): OfficeBanterRuntime {
  let running = false;

  async function runBanter(): Promise<void> {
    if (running) {
      throw new Error("既に雑談が進行中です。終わるまでお待ちください。");
    }
    running = true;
    try {
      const roster = store.listAgents();
      const enabled = roster.filter((agent) => agent.enabled);
      const [speakerA, speakerB] = pick(enabled);

      const lines: { agentId: string; content: string }[] = [];

      for (let turn = 0; turn < BANTER_TURNS; turn += 1) {
        const speaker = turn % 2 === 0 ? speakerA : speakerB;
        const partner = turn % 2 === 0 ? speakerB : speakerA;

        const userPrompt = `# 状況
ここは業務中のオフィスの、ふとした休憩時間です。相手は${partner.name}。

# これまでの会話
${transcriptText(lines, roster)}

# 指示
仕事の話ではなく、雑談・軽口・世間話をしてください。あなたの専門性や性格・口調のまま、
${turn === 0 ? "自分から話しかけてください。" : "相手の発言に自然に反応してください。"}
1〜2文程度、短く。`;

        const result = await llm.callTool<{ content: string }>({
          systemPrompt: speaker.systemPrompt,
          userPrompt,
          model: speaker.model.model,
          temperature: speaker.model.temperature,
          maxTokens: 300,
          toolName: "submit_banter_line",
          toolDescription: "雑談での発言を記録する",
          toolSchema: {
            properties: { content: { type: "string", description: "雑談の発言本文" } },
            required: ["content"],
          },
        });

        lines.push({ agentId: speaker.id, content: result.content });
        store.postMessage({
          channel: "general",
          fromAgentId: speaker.id,
          toAgentId: partner.id,
          type: "banter",
          content: result.content,
        });
      }
    } finally {
      running = false;
    }
  }

  return { runBanter, isRunning: () => running };
}
