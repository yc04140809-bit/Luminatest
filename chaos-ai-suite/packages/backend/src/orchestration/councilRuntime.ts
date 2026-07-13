import {
  COUNCIL_MAX_CALLS,
  COUNCIL_ROLE_RULES,
  estimateCostUsd,
  type Agent,
  type CouncilRequestCategory,
  type CouncilSession,
  type CouncilVerification,
} from "@chaos-ai-suite/shared";
import type { OfficeStore } from "../store/officeStore.js";
import type { LlmClient } from "./llmClient.js";

/**
 * AI会議モード（作成役→検証役→統合役→人間承認）のオーケストレーター。
 * 戦略経営会議（meetingRuntime.ts）と同じ「officeStoreへの同期await連鎖＋WebSocket即時反映」方式を踏襲するが、
 * 目的が異なる別モード（議論して終わりではなく、成果物＋人間承認ゲートを持つ）のため、
 * meeting.ts系のファイルには一切手を加えず、新しい型・新しいファイルとして独立させている。
 *
 * 1依頼＝最大3回のAI呼び出し（作成・検証・統合）に固定。「修正を依頼」「もう一度検証」は
 * 直前の完成案を土台にした新しいセッション（検証+統合の2回、この上限内）として扱い、
 * 人間の明示的な操作なしに呼び出しが増え続けることがないようにする。
 */

const DRAFT_MAX_TOKENS = 2000;
const VERIFY_MAX_TOKENS = 1500;
const INTEGRATE_MAX_TOKENS = 2000;
/** 実行前の概算費用チェック用。実際の入力トークン数が確定する前の保守的な仮定値。 */
const ASSUMED_INPUT_TOKENS = 1500;

export interface CouncilRuntime {
  /**
   * 検証（既に進行中の会議がないか・費用上限を超えないか）とセッション作成だけを行い、すぐ返す。
   * 実際のAI呼び出し（作成→検証→統合）はバックグラウンドで進行し、進捗はWebSocketで配信される。
   * 検証エラー（進行中の会議がある／費用上限超過／エージェント不在）はこの呼び出し自体が失敗する。
   */
  startCouncil(input: { requestText: string; category: CouncilRequestCategory; costCapUsd?: number }): Promise<CouncilSession>;
  reviseCouncil(input: { sessionId: string; instruction?: string }): Promise<CouncilSession>;
  stopCouncil(sessionId: string): void;
  setApproval(sessionId: string, status: "approved" | "discarded"): void;
}

function requiredAgent(store: OfficeStore, id: string): Agent {
  const agent = store.getAgent(id);
  if (!agent) throw new Error(`AI会議に必要なAI社員（${id}）が見つかりません。エージェント構成を確認してください。`);
  return agent;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

/** 3回分のAI呼び出しの概算費用（保守的な仮定トークン数）。実行前の費用上限チェックに使う。 */
function estimatePipelineCostUsd(agents: { agent: Agent; maxTokens: number }[]): number {
  return agents.reduce((sum, { agent, maxTokens }) => sum + estimateCostUsd(agent.model.model, ASSUMED_INPUT_TOKENS, maxTokens), 0);
}

export function createCouncilRuntime(store: OfficeStore, llm: LlmClient): CouncilRuntime {
  /** 停止ボタンが押されていたら、セッションを「破棄」で安全に終了させる。trueなら以降の処理を打ち切る。 */
  function checkStopped(sessionId: string): boolean {
    const current = store.getCouncilSession(sessionId);
    if (!current?.stopRequested) return false;
    store.updateCouncilSession(sessionId, {
      status: "discarded",
      concludedAt: new Date().toISOString(),
      errorMessage: "ユーザーの操作で処理を停止しました。",
    });
    return true;
  }

  async function callDraft(session: CouncilSession, agent: Agent): Promise<CouncilSession> {
    const startedAt = Date.now();
    store.setAgentStatus(agent.id, { status: "writing", currentTaskSummary: "AI会議: 作成中..." });
    const userPrompt = `# 依頼内容
${session.requestText}

# 指示
上記の依頼に対する最初の成果物案を作成してください。
不明点や、あなたが仮定した前提がある場合は必ず明示してください（勝手に断定しない）。`;

    const result = await llm.callTool<{ draft: string; assumptions: string[] }>({
      systemPrompt: agent.systemPrompt,
      userPrompt,
      model: agent.model.model,
      temperature: agent.model.temperature,
      maxTokens: DRAFT_MAX_TOKENS,
      toolName: "submit_council_draft",
      toolDescription: "依頼に対する最初の成果物案と、不明点・仮定事項を記録する",
      toolSchema: {
        properties: {
          draft: { type: "string", description: "最初の成果物案" },
          assumptions: { type: "array", items: { type: "string" }, description: "不明点や仮定した前提（なければ空配列）" },
        },
        required: ["draft", "assumptions"],
      },
      onUsage: (usage) => {
        store.appendCouncilCallLog(session.id, {
          role: "draft",
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

    const draft = str(result.draft);
    if (!draft) throw new Error("作成役からの応答が空でした。もう一度お試しください。");

    return store.updateCouncilSession(session.id, { draft, draftAssumptions: arr(result.assumptions) }) ?? session;
  }

  async function callVerify(session: CouncilSession, agent: Agent): Promise<CouncilSession> {
    const startedAt = Date.now();
    store.setAgentStatus(agent.id, { status: "writing", currentTaskSummary: "AI会議: 検証中..." });
    const userPrompt = `# 依頼内容
${session.requestText}

# 作成役の成果物案
${session.draft}
${session.draftAssumptions.length > 0 ? `\n# 作成役が明示した不明点・仮定\n${session.draftAssumptions.map((item) => `- ${item}`).join("\n")}\n` : ""}
# 指示
上記の成果物案を批判的に確認してください。新しく作り直すのではなく、問題点と修正案を整理してください。
確認観点: 事実誤認 / 依頼とのズレ / 不足 / 矛盾 / 重複 / 危険な表現 / 過度な断定 / 著作権・個人情報・規約違反の可能性 / 実現性 / 収益性 / スマホ運用 / APIコスト / 既存機能への影響`;

    const result = await llm.callTool<{ issues: string[]; fixSuggestions: string[]; risks: string[] }>({
      systemPrompt: agent.systemPrompt,
      userPrompt,
      model: agent.model.model,
      temperature: agent.model.temperature,
      maxTokens: VERIFY_MAX_TOKENS,
      toolName: "submit_council_verification",
      toolDescription: "成果物案への指摘・修正案・リスクを記録する",
      toolSchema: {
        properties: {
          issues: { type: "array", items: { type: "string" }, description: "問題点（なければ空配列）" },
          fixSuggestions: { type: "array", items: { type: "string" }, description: "修正案（なければ空配列）" },
          risks: { type: "array", items: { type: "string" }, description: "残るリスク（なければ空配列）" },
        },
        required: ["issues", "fixSuggestions", "risks"],
      },
      onUsage: (usage) => {
        store.appendCouncilCallLog(session.id, {
          role: "verify",
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

    const verification: CouncilVerification = { issues: arr(result.issues), fixSuggestions: arr(result.fixSuggestions), risks: arr(result.risks) };
    return store.updateCouncilSession(session.id, { verification }) ?? session;
  }

  async function callIntegrate(session: CouncilSession, agent: Agent): Promise<CouncilSession> {
    const startedAt = Date.now();
    store.setAgentStatus(agent.id, { status: "writing", currentTaskSummary: "AI会議: 統合中..." });
    const verification = session.verification;
    const userPrompt = `# 依頼内容
${session.requestText}
${session.revisionInstruction ? `\n# 人間からの修正依頼\n${session.revisionInstruction}\n` : ""}
# 作成役の成果物案
${session.draft}

# 検証役の指摘
問題点:
${(verification?.issues.length ?? 0) > 0 ? verification!.issues.map((item) => `- ${item}`).join("\n") : "（なし）"}
修正案:
${(verification?.fixSuggestions.length ?? 0) > 0 ? verification!.fixSuggestions.map((item) => `- ${item}`).join("\n") : "（なし）"}
残るリスク:
${(verification?.risks.length ?? 0) > 0 ? verification!.risks.map((item) => `- ${item}`).join("\n") : "（なし）"}

# 指示
作成役の成果物案と検証役の指摘をもとに、最終案を1つへ統合してください。
- 有効な指摘だけを反映すること。依頼に不要な変更は加えないこと
- 人間からの修正依頼がある場合は、その内容を最優先で反映すること
- 完成版は簡潔に整理すること
- 反映しきれなかった／解消できなかったリスクがあれば明示すること`;

    const result = await llm.callTool<{ finalDraft: string; remainingRisks: string[] }>({
      systemPrompt: agent.systemPrompt,
      userPrompt,
      model: agent.model.model,
      temperature: agent.model.temperature,
      maxTokens: INTEGRATE_MAX_TOKENS,
      toolName: "submit_council_integration",
      toolDescription: "統合済みの最終案と残存リスクを記録する",
      toolSchema: {
        properties: {
          finalDraft: { type: "string", description: "統合済みの最終案" },
          remainingRisks: { type: "array", items: { type: "string" }, description: "残っているリスク（なければ空配列）" },
        },
        required: ["finalDraft", "remainingRisks"],
      },
      onUsage: (usage) => {
        store.appendCouncilCallLog(session.id, {
          role: "integrate",
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

    const finalDraft = str(result.finalDraft);
    if (!finalDraft) throw new Error("統合役からの応答が空でした。もう一度お試しください。");

    return store.updateCouncilSession(session.id, { finalDraft, remainingRisks: arr(result.remainingRisks) }) ?? session;
  }

  /** 作成（任意）→検証→統合の連鎖を実行し、人間承認待ちで終える。エラー時は安全に停止する。 */
  async function runPipeline(sessionId: string, agents: { drafter?: Agent; verifier: Agent; integrator: Agent }): Promise<void> {
    const participantIds = [agents.drafter?.id, agents.verifier.id, agents.integrator.id].filter((id): id is string => Boolean(id));
    try {
      let session = store.getCouncilSession(sessionId);
      if (!session) throw new Error(`AI会議セッション（${sessionId}）が見つかりません。`);

      if (agents.drafter) {
        session = store.updateCouncilSession(sessionId, { phase: "drafting" }) ?? session;
        session = await callDraft(session, agents.drafter);
      }
      if (checkStopped(sessionId)) return;

      session = store.updateCouncilSession(sessionId, { phase: "verifying" }) ?? session;
      session = await callVerify(session, agents.verifier);
      if (checkStopped(sessionId)) return;

      session = store.updateCouncilSession(sessionId, { phase: "integrating" }) ?? session;
      session = await callIntegrate(session, agents.integrator);
      if (checkStopped(sessionId)) return;

      store.updateCouncilSession(sessionId, { phase: "done", status: "awaiting_approval" });
    } catch (error) {
      store.updateCouncilSession(sessionId, {
        status: "failed",
        errorMessage: (error as Error).message,
        errorPhase: store.getCouncilSession(sessionId)?.phase,
        concludedAt: new Date().toISOString(),
      });
    } finally {
      for (const id of participantIds) {
        store.setAgentStatus(id, { status: "standby", currentTaskSummary: undefined });
      }
    }
  }

  async function startCouncil(input: { requestText: string; category: CouncilRequestCategory; costCapUsd?: number }): Promise<CouncilSession> {
    if (store.hasRunningCouncilSession()) {
      throw new Error("既に進行中のAI会議があります。終了してから新しい依頼を開始してください。");
    }

    const roles = COUNCIL_ROLE_RULES[input.category];
    const drafter = requiredAgent(store, roles.drafterAgentId);
    const verifier = requiredAgent(store, roles.verifierAgentId);
    const integrator = requiredAgent(store, roles.integratorAgentId);

    if (input.costCapUsd !== undefined) {
      const estimate = estimatePipelineCostUsd([
        { agent: drafter, maxTokens: DRAFT_MAX_TOKENS },
        { agent: verifier, maxTokens: VERIFY_MAX_TOKENS },
        { agent: integrator, maxTokens: INTEGRATE_MAX_TOKENS },
      ]);
      if (estimate > input.costCapUsd) {
        throw new Error(
          `概算費用（最大 約$${estimate.toFixed(4)}）が設定した費用上限（$${input.costCapUsd}）を超える可能性があるため、実行を中止しました。上限を上げるか、依頼内容を短くしてください。`,
        );
      }
    }

    const session = store.createCouncilSession({
      requestText: input.requestText,
      category: input.category,
      drafterAgentId: drafter.id,
      verifierAgentId: verifier.id,
      integratorAgentId: integrator.id,
      maxCalls: COUNCIL_MAX_CALLS,
      costCapUsd: input.costCapUsd,
    });

    void runPipeline(session.id, { drafter, verifier, integrator });
    return session;
  }

  async function reviseCouncil(input: { sessionId: string; instruction?: string }): Promise<CouncilSession> {
    // このセッション自身が「承認待ち」を占有しているため、ここでは進行中チェックをしない
    // （承認待ちの会議を修正・再検証できなくなってしまう）。他の未解決セッションが並行して
    // 存在し得ないことは、startCouncilの同時実行ガードにより保証されている。
    const previous = store.getCouncilSession(input.sessionId);
    if (!previous) throw new Error(`元のAI会議セッション（${input.sessionId}）が見つかりません。`);
    if (previous.status !== "awaiting_approval") {
      throw new Error("この会議は現在、承認待ちの状態ではないため、修正・再検証できません。");
    }
    if (!previous.finalDraft) throw new Error("元のセッションに完成案がないため、修正・再検証できません。");

    const verifier = requiredAgent(store, previous.verifierAgentId);
    const integrator = requiredAgent(store, previous.integratorAgentId);

    if (previous.costCapUsd !== undefined) {
      const estimate = estimatePipelineCostUsd([
        { agent: verifier, maxTokens: VERIFY_MAX_TOKENS },
        { agent: integrator, maxTokens: INTEGRATE_MAX_TOKENS },
      ]);
      if (estimate > previous.costCapUsd) {
        throw new Error(
          `概算費用（最大 約$${estimate.toFixed(4)}）が設定した費用上限（$${previous.costCapUsd}）を超える可能性があるため、実行を中止しました。`,
        );
      }
    }

    const session = store.createCouncilSession({
      requestText: previous.requestText,
      category: previous.category,
      drafterAgentId: previous.drafterAgentId,
      verifierAgentId: verifier.id,
      integratorAgentId: integrator.id,
      maxCalls: COUNCIL_MAX_CALLS,
      costCapUsd: previous.costCapUsd,
      parentSessionId: previous.id,
      revisionInstruction: input.instruction,
      draft: previous.finalDraft,
    });
    // 元セッションはawaiting_approvalのまま残さない（新セッションだけが「今アクティブな会議」になるようにする）
    store.updateCouncilSession(previous.id, { status: "changes_requested", concludedAt: new Date().toISOString() });

    void runPipeline(session.id, { verifier, integrator });
    return session;
  }

  function stopCouncil(sessionId: string): void {
    const session = store.getCouncilSession(sessionId);
    if (!session) throw new Error(`AI会議セッション（${sessionId}）が見つかりません。`);
    store.updateCouncilSession(sessionId, { stopRequested: true });
  }

  function setApproval(sessionId: string, status: "approved" | "discarded"): void {
    const session = store.getCouncilSession(sessionId);
    if (!session) throw new Error(`AI会議セッション（${sessionId}）が見つかりません。`);
    if (session.status !== "awaiting_approval") {
      throw new Error("この会議は現在、承認待ちの状態ではありません。");
    }
    store.updateCouncilSession(sessionId, { status, concludedAt: new Date().toISOString() });
  }

  return { startCouncil, reviseCouncil, stopCouncil, setApproval };
}
