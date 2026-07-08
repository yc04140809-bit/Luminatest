import type { Agent, MeetingPhase, StrategyMeeting } from "@chaos-ai-suite/shared";
import type { OfficeStore } from "../store/officeStore.js";
import type { LlmClient } from "./llmClient.js";

/** ファシリテーター（会議の目的定義・最終提案）。 */
const FACILITATOR_ID = "agent-sayla";
/** 専門的ディスカッションのターン制ループに参加する3名（開発／拡散・トレンド／リスク・顧客対応）。 */
const SPECIALIST_IDS = ["agent-levi", "agent-mirai", "agent-chaos"] as const;
const SPECIALIST_ROLE_INSTRUCTIONS: Record<string, string> = {
  "agent-levi": "開発・実現可能性の観点から意見を述べてください。",
  "agent-mirai": "SNS拡散・トレンド・マーケティングの観点から意見を述べてください。",
  "agent-chaos": "リスク・カスタマー対応・現場運用の観点から意見を述べてください。",
};
const MINUTES_AGENT_ID = "agent-nemuri";
const ACTION_ITEMS_AGENT_ID = "agent-aria";
/** ディスカッションの往復回数。無限に長引かないよう固定回数で区切る（2周＝各専門家が2回ずつ発言）。 */
const DISCUSSION_ROUNDS = 2;

export interface MeetingRuntime {
  /** お題を受けて戦略経営会議を開始する。既に進行中の会議がある場合はエラーを投げる。 */
  startMeeting(topic: string): Promise<void>;
}

function requiredAgent(store: OfficeStore, id: string): Agent {
  const agent = store.getAgent(id);
  if (!agent) throw new Error(`会議に必要なAI社員（${id}）が見つかりません。エージェント構成を確認してください。`);
  return agent;
}

function transcriptText(meeting: StrategyMeeting, roster: Agent[]): string {
  if (meeting.statements.length === 0) return "（まだ発言はありません）";
  const nameById = new Map(roster.map((agent) => [agent.id, agent.name]));
  return meeting.statements
    .map((statement) => `${nameById.get(statement.agentId) ?? statement.agentId}: ${statement.content}`)
    .join("\n\n");
}

async function generateStatement(params: {
  agent: Agent;
  meeting: StrategyMeeting;
  roster: Agent[];
  instruction: string;
  llm: LlmClient;
}): Promise<string> {
  const { agent, meeting, roster, instruction, llm } = params;

  const userPrompt = `# 会議のお題
${meeting.topic}

# これまでの発言
${transcriptText(meeting, roster)}

# あなたへの指示
${instruction}

あなたの専門性・性格・口調のまま、この会議での発言を1つ作成してください。
実際の会議での発言のように、簡潔に（3〜6文程度）まとめてください。長い箇条書きの羅列にはしないこと。`;

  const result = await llm.callTool<{ content: string }>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: 700,
    toolName: "submit_meeting_statement",
    toolDescription: "会議での発言内容を記録する",
    toolSchema: {
      properties: { content: { type: "string", description: "会議での発言本文" } },
      required: ["content"],
    },
  });
  return result.content;
}

const BULLET_PREFIX = /^[-*・]|^\d+[.)]/;

/** 箇条書き行のみを抽出する。頭に「ありがとうございます」等の前置き文（マーカーなし）は捨てる。 */
function parseBulletList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => BULLET_PREFIX.test(line))
    .map((line) => line.replace(/^[-*・\d.)\s]+/, "").trim())
    .filter(Boolean);
}

/**
 * 自律型・戦略経営会議のオーケストレーター。
 * opening（セイラ起動）→ discussion（レヴィ/ミライ/ケイオスのターン制ループ）→
 * documentation（ネムリ議事録→アリアのタスク化）→ proposal（セイラの最終提案）
 * の4フェーズを順に進行し、各発言はStrategyMeetingの発言ログと社内チャットログの両方に記録する。
 */
export function createMeetingRuntime(store: OfficeStore, llm: LlmClient): MeetingRuntime {
  async function speak(
    meeting: StrategyMeeting,
    agent: Agent,
    phase: MeetingPhase,
    instruction: string,
  ): Promise<StrategyMeeting> {
    store.updateStrategyMeeting(meeting.id, { currentSpeakerId: agent.id });
    store.setAgentStatus(agent.id, { status: "meeting", currentTaskSummary: "発言中..." });

    const content = await generateStatement({ agent, meeting, roster: store.listAgents(), instruction, llm });

    const updated = store.appendStrategyMeetingStatement(meeting.id, { agentId: agent.id, phase, content });
    if (!updated) throw new Error(`会議記録（${meeting.id}）が見つかりません。`);

    store.updateStrategyMeeting(meeting.id, { currentSpeakerId: undefined });
    store.setAgentStatus(agent.id, { currentTaskSummary: undefined });

    store.postMessage({ channel: "general", fromAgentId: agent.id, type: "chat", content });

    return updated;
  }

  async function startMeeting(topic: string): Promise<void> {
    if (store.listStrategyMeetings().some((meeting) => meeting.status === "running")) {
      throw new Error("既に進行中の会議があります。終了してから新しい会議を開始してください。");
    }

    const facilitator = requiredAgent(store, FACILITATOR_ID);
    const specialists = SPECIALIST_IDS.map((id) => requiredAgent(store, id));
    const minutesAgent = requiredAgent(store, MINUTES_AGENT_ID);
    const actionAgent = requiredAgent(store, ACTION_ITEMS_AGENT_ID);
    const participantAgentIds = [
      facilitator.id,
      ...specialists.map((agent) => agent.id),
      minutesAgent.id,
      actionAgent.id,
    ];

    let meeting = store.createStrategyMeeting({ topic, participantAgentIds });
    const activeMeeting = store.startMeeting({ topic, participantAgentIds });
    for (const id of participantAgentIds) store.setAgentStatus(id, { status: "meeting" });

    store.postMessage({
      channel: "command_center",
      fromAgentId: "user",
      type: "directive",
      content: `【会議開始】${topic}`,
    });

    try {
      // Phase 1: opening — ファシリテーターが目的を定義し、意見を求める
      meeting = store.updateStrategyMeeting(meeting.id, { phase: "opening" }) ?? meeting;
      meeting = await speak(
        meeting,
        facilitator,
        "opening",
        `代表からのお題「${topic}」について、会議の目的を定義し、各メンバー（${specialists
          .map((agent) => agent.name)
          .join("、")}）に意見を求めてください。`,
      );

      // Phase 2: discussion — 専門家3名のターン制ループ（前の発言を参照しながら深掘りする）
      meeting = store.updateStrategyMeeting(meeting.id, { phase: "discussion" }) ?? meeting;
      for (let round = 0; round < DISCUSSION_ROUNDS; round += 1) {
        for (const specialist of specialists) {
          const roleInstruction = SPECIALIST_ROLE_INSTRUCTIONS[specialist.id] ?? "あなたの専門分野の観点から意見を述べてください。";
          const instruction =
            round === 0
              ? roleInstruction
              : `${roleInstruction} これまでの他のメンバーの発言に反応・言及しながら、議論を深めてください。`;
          meeting = await speak(meeting, specialist, "discussion", instruction);
        }
      }

      // Phase 3: documentation — 議事録化（ネムリ）→ タスク化（アリア）
      meeting = store.updateStrategyMeeting(meeting.id, { phase: "documentation" }) ?? meeting;
      meeting = await speak(
        meeting,
        minutesAgent,
        "documentation",
        "これまでの会議の発言全体を、簡潔な議事録としてまとめてください。",
      );
      const minutes = meeting.statements[meeting.statements.length - 1]!.content;
      meeting = store.updateStrategyMeeting(meeting.id, { minutes }) ?? meeting;

      meeting = await speak(
        meeting,
        actionAgent,
        "documentation",
        "ネムリちゃんがまとめた議事録をもとに、実行可能なタスク・マニュアルを箇条書き（3〜6項目、1行1項目）で提示してください。",
      );
      const actionItemsText = meeting.statements[meeting.statements.length - 1]!.content;
      const actionItems = parseBulletList(actionItemsText);
      meeting = store.updateStrategyMeeting(meeting.id, { actionItems }) ?? meeting;

      // Phase 4: proposal — ファシリテーターが代表へ最終提案
      meeting = store.updateStrategyMeeting(meeting.id, { phase: "proposal" }) ?? meeting;
      meeting = await speak(
        meeting,
        facilitator,
        "proposal",
        `会議全体を踏まえ、「代表、会議の結果、以下のプランを提案します」という形で締めくくり、代表への最終提案をまとめてください。\n\n` +
          `議事録: ${minutes}\n\nタスク案:\n${actionItems.map((item) => `- ${item}`).join("\n")}`,
      );
      const proposal = meeting.statements[meeting.statements.length - 1]!.content;

      store.updateStrategyMeeting(meeting.id, {
        phase: "concluded",
        status: "concluded",
        proposal,
        concludedAt: new Date().toISOString(),
      });
    } catch (error) {
      store.updateStrategyMeeting(meeting.id, {
        status: "failed",
        currentSpeakerId: undefined,
        errorMessage: (error as Error).message,
        concludedAt: new Date().toISOString(),
      });
      store.postMessage({
        channel: "general",
        fromAgentId: facilitator.id,
        type: "system_log",
        content: `会議中にエラーが発生しました: ${(error as Error).message}`,
      });
    } finally {
      store.endMeeting(activeMeeting.id);
      for (const id of participantAgentIds) {
        store.setAgentStatus(id, { status: "standby", currentTaskId: undefined, currentTaskSummary: undefined });
      }
    }
  }

  return { startMeeting };
}
