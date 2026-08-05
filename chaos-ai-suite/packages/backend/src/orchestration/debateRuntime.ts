import {
  DEBATE_MAX_PARTICIPANTS,
  DEBATE_MIN_PARTICIPANTS,
  estimateCostUsd,
  type Agent,
  type DebateDecision,
  type DebateEntry,
  type DebateScore,
  type DebateSession,
  type DebateSynthesis,
} from "@chaos-ai-suite/shared";
import type { OfficeStore } from "../store/officeStore.js";
import type { LlmClient } from "./llmClient.js";

/**
 * AI社員 討論会（自動討論＋強制反論ループ＋人間承認ゲート）のオーケストレーター。
 * councilRuntime.ts（作成→検証→統合の直列パイプライン）と同じ「officeStoreへの同期await連鎖＋
 * WebSocket即時反映」方式を踏襲するが、目的が異なる別機能のため council.ts 系のファイルには
 * 一切手を加えず、新しい型・新しいファイルとして独立させている。
 *
 * 1依頼＝固定4段階（初期意見→反論→改善案→統合）のみ。ラウンドが無限に増えることはない。
 * 各ラウンド内の参加者への呼び出しは並列実行するが、ラウンド間は直列（前のラウンドの結果を
 * 次のラウンドのプロンプトに渡す必要があるため）。
 */

const OPINION_MAX_TOKENS = 1200;
const REBUTTAL_MAX_TOKENS = 1200;
const IMPROVEMENT_MAX_TOKENS = 1200;
const SYNTHESIS_MAX_TOKENS = 2500;
/** 実行前の概算費用チェック用。実際の入力トークン数が確定する前の保守的な仮定値。 */
const ASSUMED_INPUT_TOKENS = 1500;

export interface DebateRuntime {
  /**
   * 検証（進行中の討論会がないか・参加人数・費用上限）だけ行い、すぐ返す。
   * 実際のAI呼び出し（意見→反論→改善→統合）はバックグラウンドで進行し、進捗はWebSocketで配信される。
   */
  startDebate(input: { topic: string; participantAgentIds?: string[]; costCapUsd?: number }): Promise<DebateSession>;
  stopDebate(sessionId: string): void;
  /** 人間の最終判断（そのまま実行／修正して実行／保留／却下）を記録する。AIはこの判断を代行できない。 */
  decideDebate(sessionId: string, decision: DebateDecision, note?: string): void;
}

function requiredAgent(store: OfficeStore, id: string): Agent {
  const agent = store.getAgent(id);
  if (!agent || !agent.enabled) {
    throw new Error(`討論会に必要なAI社員（${id}）が見つからないか無効化されています。エージェント構成を確認してください。`);
  }
  return agent;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

function score0to100(value: unknown, fallback = 50): number {
  const num = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(0, Math.min(100, num));
}

function entriesByRound(entries: DebateEntry[], round: DebateEntry["round"]): DebateEntry[] {
  return entries.filter((entry) => entry.round === round);
}

function entriesText(entries: DebateEntry[]): string {
  if (entries.length === 0) return "（なし）";
  return entries.map((entry) => `## ${entry.agentName}\n${entry.content}`).join("\n\n");
}

/** 参加者N人×3ラウンド＋統合役1回の概算費用（保守的な仮定トークン数）。 */
function estimateDebateCostUsd(participants: Agent[], integrator: Agent): number {
  const perAgentStages = [OPINION_MAX_TOKENS, REBUTTAL_MAX_TOKENS, IMPROVEMENT_MAX_TOKENS];
  let sum = 0;
  for (const agent of participants) {
    for (const maxTokens of perAgentStages) {
      sum += estimateCostUsd(agent.model.model, ASSUMED_INPUT_TOKENS, maxTokens);
    }
  }
  sum += estimateCostUsd(integrator.model.model, ASSUMED_INPUT_TOKENS, SYNTHESIS_MAX_TOKENS);
  return sum;
}

export function createDebateRuntime(store: OfficeStore, llm: LlmClient): DebateRuntime {
  /** 停止ボタンが押されていたら、セッションを「破棄」で安全に終了させる。trueなら以降の処理を打ち切る。 */
  function checkStopped(sessionId: string): boolean {
    const current = store.getDebateSession(sessionId);
    if (!current?.stopRequested) return false;
    store.updateDebateSession(sessionId, {
      status: "discarded",
      concludedAt: new Date().toISOString(),
      errorMessage: "ユーザーの操作で処理を停止しました。",
    });
    return true;
  }

  async function runOpinionRound(session: DebateSession, participants: Agent[]): Promise<void> {
    await Promise.all(
      participants.map(async (agent) => {
        const startedAt = Date.now();
        store.setAgentStatus(agent.id, { status: "writing", currentTaskSummary: "討論会: 初期意見を作成中..." });

        const userPrompt = `# 議題
${session.topic}

# 指示
あなたの専門知識・性格・立場から、この議題についての最初の意見を述べてください。
まだ他のAI社員の意見は見えていません。他の意見を気にせず、あなた自身の視点で率直に述べてください。
賛成・反対にこだわらず、実務的に見てどう考えるかを述べること。`;

        const result = await llm.callTool<{ opinion: string }>({
          systemPrompt: agent.systemPrompt,
          userPrompt,
          model: agent.model.model,
          temperature: agent.model.temperature,
          maxTokens: OPINION_MAX_TOKENS,
          toolName: "submit_debate_opinion",
          toolDescription: "議題に対する最初の意見を記録する",
          toolSchema: {
            properties: { opinion: { type: "string", description: "議題に対する最初の意見" } },
            required: ["opinion"],
          },
          onUsage: (usage) => {
            store.appendDebateCallLog(session.id, {
              round: "opinion",
              agentId: agent.id,
              agentName: agent.name,
              model: agent.model.model,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              estimatedCostUsd: estimateCostUsd(agent.model.model, usage.inputTokens, usage.outputTokens),
              durationMs: Date.now() - startedAt,
              timestamp: new Date().toISOString(),
            });
          },
        });
        store.setAgentStatus(agent.id, { currentTaskSummary: undefined });

        const opinion = str(result.opinion);
        if (!opinion) throw new Error(`${agent.name}からの意見が空でした。もう一度お試しください。`);

        store.appendDebateEntry(session.id, {
          round: "opinion",
          agentId: agent.id,
          agentName: agent.name,
          content: opinion,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }

  async function runRebuttalRound(session: DebateSession, participants: Agent[]): Promise<void> {
    const current = store.getDebateSession(session.id) ?? session;
    const opinions = entriesByRound(current.entries, "opinion");

    await Promise.all(
      participants.map(async (agent) => {
        const others = opinions.filter((entry) => entry.agentId !== agent.id);
        const startedAt = Date.now();
        store.setAgentStatus(agent.id, { status: "writing", currentTaskSummary: "討論会: 反論を検討中..." });

        const userPrompt = `# 議題
${session.topic}

# 他のAI社員の初期意見
${entriesText(others)}

# 指示
上記の意見に対して、建設的な反論を行ってください。
必ず最低1つ以上、次のいずれかの観点を検討すること:
失敗する可能性 / 論理的な弱点 / 隠れたコスト / ユーザー視点の問題 / 競合上の問題 / 実装上の問題

重要: 「相手の案を否定して終わる」ことが目的ではありません。
目的は、弱点を発見して、より強い案へ改善することです。頭ごなしの否定ではなく、
建設的な指摘にしてください。`;

        const result = await llm.callTool<{ rebuttal: string; weaknesses: string[] }>({
          systemPrompt: agent.systemPrompt,
          userPrompt,
          model: agent.model.model,
          temperature: agent.model.temperature,
          maxTokens: REBUTTAL_MAX_TOKENS,
          toolName: "submit_debate_rebuttal",
          toolDescription: "他のAI社員の意見への建設的な反論と、検討した弱点の一覧を記録する",
          toolSchema: {
            properties: {
              rebuttal: { type: "string", description: "建設的な反論の本文" },
              weaknesses: {
                type: "array",
                items: { type: "string" },
                description: "検討した弱点・リスク（最低1件、失敗可能性/論理的弱点/隠れたコスト/ユーザー視点/競合/実装上の問題のいずれか）",
              },
            },
            required: ["rebuttal", "weaknesses"],
          },
          onUsage: (usage) => {
            store.appendDebateCallLog(session.id, {
              round: "rebuttal",
              agentId: agent.id,
              agentName: agent.name,
              model: agent.model.model,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              estimatedCostUsd: estimateCostUsd(agent.model.model, usage.inputTokens, usage.outputTokens),
              durationMs: Date.now() - startedAt,
              timestamp: new Date().toISOString(),
            });
          },
        });
        store.setAgentStatus(agent.id, { currentTaskSummary: undefined });

        const rebuttal = str(result.rebuttal);
        if (!rebuttal) throw new Error(`${agent.name}からの反論が空でした。もう一度お試しください。`);

        store.appendDebateEntry(session.id, {
          round: "rebuttal",
          agentId: agent.id,
          agentName: agent.name,
          content: rebuttal,
          weaknesses: arr(result.weaknesses),
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }

  async function runImprovementRound(session: DebateSession, participants: Agent[]): Promise<void> {
    const current = store.getDebateSession(session.id) ?? session;
    const opinions = entriesByRound(current.entries, "opinion");
    const rebuttals = entriesByRound(current.entries, "rebuttal");

    await Promise.all(
      participants.map(async (agent) => {
        const ownOpinion = opinions.find((entry) => entry.agentId === agent.id);
        const startedAt = Date.now();
        store.setAgentStatus(agent.id, { status: "writing", currentTaskSummary: "討論会: 改善案を作成中..." });

        const userPrompt = `# 議題
${session.topic}

# あなた自身の初期意見
${ownOpinion?.content ?? "（記録なし）"}

# 他のAI社員からの反論・指摘
${entriesText(rebuttals.filter((entry) => entry.agentId !== agent.id))}

# 指示
上記の反論・指摘を踏まえて、あなた自身の意見を改善してください。
納得できる指摘は取り入れ、納得できない指摘には理由とともに反論してよい。
「壊されて終わり」にせず、より強い案に仕上げること。`;

        const result = await llm.callTool<{ improvement: string }>({
          systemPrompt: agent.systemPrompt,
          userPrompt,
          model: agent.model.model,
          temperature: agent.model.temperature,
          maxTokens: IMPROVEMENT_MAX_TOKENS,
          toolName: "submit_debate_improvement",
          toolDescription: "反論を踏まえた改善後の意見を記録する",
          toolSchema: {
            properties: { improvement: { type: "string", description: "反論を踏まえて改善した意見" } },
            required: ["improvement"],
          },
          onUsage: (usage) => {
            store.appendDebateCallLog(session.id, {
              round: "improvement",
              agentId: agent.id,
              agentName: agent.name,
              model: agent.model.model,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              estimatedCostUsd: estimateCostUsd(agent.model.model, usage.inputTokens, usage.outputTokens),
              durationMs: Date.now() - startedAt,
              timestamp: new Date().toISOString(),
            });
          },
        });
        store.setAgentStatus(agent.id, { currentTaskSummary: undefined });

        const improvement = str(result.improvement);
        if (!improvement) throw new Error(`${agent.name}からの改善案が空でした。もう一度お試しください。`);

        store.appendDebateEntry(session.id, {
          round: "improvement",
          agentId: agent.id,
          agentName: agent.name,
          content: improvement,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }

  async function runIntegration(session: DebateSession, integrator: Agent): Promise<DebateSynthesis> {
    const current = store.getDebateSession(session.id) ?? session;
    const startedAt = Date.now();
    store.setAgentStatus(integrator.id, { status: "writing", currentTaskSummary: "討論会: 統合中..." });

    const userPrompt = `# 議題
${session.topic}

# 討論の全記録

## 初期意見
${entriesText(entriesByRound(current.entries, "opinion"))}

## 反論
${entriesText(entriesByRound(current.entries, "rebuttal"))}

## 改善案
${entriesText(entriesByRound(current.entries, "improvement"))}

# 指示
上記の討論全体を統合し、人間が最終判断するための材料として次を整理してください。
- 最大のメリット
- 最大のリスク
- 意見が割れたポイント
- 改善後の最良案（討論を踏まえた提案）
- 推奨アクション
- 次の5項目を100点満点で評価: 市場性・収益性・実現可能性・差別化・継続性

# 絶対ルール
- あなたは意思決定者ではない。最終判断は必ず人間が行うため、断定的に「実行すべき」と結論づけず、
  判断材料を整理することに徹すること
- 根拠が確認できない場合は推測で断定しない
- 討論で出た有効な指摘を握りつぶさず、意見が割れたままの点は「割れたまま」として明示する`;

    const result = await llm.callTool<Record<string, unknown>>({
      systemPrompt: integrator.systemPrompt,
      userPrompt,
      model: integrator.model.model,
      temperature: integrator.model.temperature,
      maxTokens: SYNTHESIS_MAX_TOKENS,
      toolName: "submit_debate_synthesis",
      toolDescription: "討論全体を統合した判断材料を記録する",
      toolSchema: {
        properties: {
          biggestMerit: { type: "string", description: "最大のメリット" },
          biggestRisk: { type: "string", description: "最大のリスク" },
          disagreementPoints: { type: "array", items: { type: "string" }, description: "意見が割れたポイント" },
          improvedProposal: { type: "string", description: "改善後の最良案" },
          recommendedAction: { type: "string", description: "推奨アクション（断定せず提案として述べる）" },
          marketability: { type: "number", description: "市場性（0〜100）" },
          profitability: { type: "number", description: "収益性（0〜100）" },
          feasibility: { type: "number", description: "実現可能性（0〜100）" },
          differentiation: { type: "number", description: "差別化（0〜100）" },
          sustainability: { type: "number", description: "継続性（0〜100）" },
        },
        required: [
          "biggestMerit", "biggestRisk", "disagreementPoints", "improvedProposal", "recommendedAction",
          "marketability", "profitability", "feasibility", "differentiation", "sustainability",
        ],
      },
      onUsage: (usage) => {
        store.appendDebateCallLog(session.id, {
          round: "integrate",
          agentId: integrator.id,
          agentName: integrator.name,
          model: integrator.model.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          estimatedCostUsd: estimateCostUsd(integrator.model.model, usage.inputTokens, usage.outputTokens),
          durationMs: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
        });
      },
    });
    store.setAgentStatus(integrator.id, { currentTaskSummary: undefined });

    const score: DebateScore = {
      marketability: score0to100(result.marketability),
      profitability: score0to100(result.profitability),
      feasibility: score0to100(result.feasibility),
      differentiation: score0to100(result.differentiation),
      sustainability: score0to100(result.sustainability),
      total: 0,
    };
    score.total = Math.round(
      (score.marketability + score.profitability + score.feasibility + score.differentiation + score.sustainability) / 5,
    );

    const biggestMerit = str(result.biggestMerit);
    const biggestRisk = str(result.biggestRisk);
    const improvedProposal = str(result.improvedProposal);
    if (!biggestMerit || !biggestRisk || !improvedProposal) {
      throw new Error("統合役からの応答が不十分でした。もう一度お試しください。");
    }

    return {
      biggestMerit,
      biggestRisk,
      disagreementPoints: arr(result.disagreementPoints),
      improvedProposal,
      recommendedAction: str(result.recommendedAction),
      score,
    };
  }

  async function runPipeline(sessionId: string, participants: Agent[], integrator: Agent): Promise<void> {
    const participantIds = [...participants.map((agent) => agent.id), integrator.id];
    try {
      let session = store.getDebateSession(sessionId);
      if (!session) throw new Error(`AI討論会セッション（${sessionId}）が見つかりません。`);

      session = store.updateDebateSession(sessionId, { phase: "opinion" }) ?? session;
      await runOpinionRound(session, participants);
      if (checkStopped(sessionId)) return;

      session = store.updateDebateSession(sessionId, { phase: "rebuttal" }) ?? session;
      await runRebuttalRound(session, participants);
      if (checkStopped(sessionId)) return;

      session = store.updateDebateSession(sessionId, { phase: "improvement" }) ?? session;
      await runImprovementRound(session, participants);
      if (checkStopped(sessionId)) return;

      session = store.updateDebateSession(sessionId, { phase: "integrating" }) ?? session;
      session = store.getDebateSession(sessionId) ?? session;
      const synthesis = await runIntegration(session, integrator);
      if (checkStopped(sessionId)) return;

      store.updateDebateSession(sessionId, { phase: "done", status: "awaiting_approval", synthesis });
    } catch (error) {
      const current = store.getDebateSession(sessionId);
      store.updateDebateSession(sessionId, {
        status: "failed",
        errorMessage: (error as Error).message,
        errorPhase: current?.phase,
        concludedAt: new Date().toISOString(),
      });
    } finally {
      for (const id of participantIds) {
        store.setAgentStatus(id, { status: "standby", currentTaskSummary: undefined });
      }
    }
  }

  async function startDebate(input: {
    topic: string;
    participantAgentIds?: string[];
    costCapUsd?: number;
  }): Promise<DebateSession> {
    if (store.hasRunningDebateSession()) {
      throw new Error("既に進行中のAI討論会があります。終了してから新しい議題を開始してください。");
    }

    const requestedIds = input.participantAgentIds && input.participantAgentIds.length > 0
      ? [...new Set(input.participantAgentIds)]
      : ["agent-mirai", "agent-sayla", "agent-levi"];

    if (requestedIds.length < DEBATE_MIN_PARTICIPANTS || requestedIds.length > DEBATE_MAX_PARTICIPANTS) {
      throw new Error(`討論会の参加人数は${DEBATE_MIN_PARTICIPANTS}〜${DEBATE_MAX_PARTICIPANTS}人にしてください。`);
    }

    const participants = requestedIds.map((id) => requiredAgent(store, id));
    const integrator = requiredAgent(store, "agent-chaos");

    if (input.costCapUsd !== undefined) {
      const estimate = estimateDebateCostUsd(participants, integrator);
      if (estimate > input.costCapUsd) {
        throw new Error(
          `概算費用（最大 約$${estimate.toFixed(4)}）が設定した費用上限（$${input.costCapUsd}）を超える可能性があるため、実行を中止しました。上限を上げるか、参加人数を減らしてください。`,
        );
      }
    }

    const session = store.createDebateSession({
      topic: input.topic,
      participantAgentIds: participants.map((agent) => agent.id),
      integratorAgentId: integrator.id,
      costCapUsd: input.costCapUsd,
    });

    void runPipeline(session.id, participants, integrator);
    return session;
  }

  function stopDebate(sessionId: string): void {
    const session = store.getDebateSession(sessionId);
    if (!session) throw new Error(`AI討論会セッション（${sessionId}）が見つかりません。`);
    store.updateDebateSession(sessionId, { stopRequested: true });
  }

  function decideDebate(sessionId: string, decision: DebateDecision, note?: string): void {
    const session = store.getDebateSession(sessionId);
    if (!session) throw new Error(`AI討論会セッション（${sessionId}）が見つかりません。`);
    if (session.status !== "awaiting_approval") {
      throw new Error("この討論会は現在、人間の判断待ちの状態ではありません。");
    }
    store.updateDebateSession(sessionId, {
      status: "concluded",
      decision,
      decisionNote: note,
      concludedAt: new Date().toISOString(),
    });
  }

  return { startDebate, stopDebate, decideDebate };
}
