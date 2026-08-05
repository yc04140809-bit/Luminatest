import { test } from "node:test";
import assert from "node:assert/strict";
import type { DebateSession } from "@chaos-ai-suite/shared";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { createDebateRuntime } from "./debateRuntime.js";
import { OfficeStore } from "../store/officeStore.js";

/** ツール名でラウンドごとの応答を切り替える決定論的なスタブLLM。 */
function createStubLlm(options?: { failOnTool?: string }): LlmClient {
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      if (options?.failOnTool === request.toolName) {
        throw new Error("stub llm failure");
      }
      request.onUsage?.({ inputTokens: 100, outputTokens: 50 });
      switch (request.toolName) {
        case "submit_debate_opinion":
          return { opinion: "初期意見です。" } as T;
        case "submit_debate_rebuttal":
          return { rebuttal: "反論です。", weaknesses: ["隠れたコストがある"] } as T;
        case "submit_debate_improvement":
          return { improvement: "改善案です。" } as T;
        case "submit_debate_synthesis":
          return {
            biggestMerit: "最大のメリットです。",
            biggestRisk: "最大のリスクです。",
            disagreementPoints: ["価格設定で意見が割れた"],
            improvedProposal: "改善後の最良案です。",
            recommendedAction: "小規模で試すことを推奨します。",
            marketability: 70,
            profitability: 60,
            feasibility: 80,
            differentiation: 50,
            sustainability: 65,
          } as T;
        default:
          throw new Error(`unexpected toolName in stub: ${request.toolName}`);
      }
    },
  };
}

async function waitForSession(
  store: OfficeStore,
  id: string,
  predicate: (session: DebateSession) => boolean,
  timeoutMs = 3000,
): Promise<DebateSession> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const session = store.getDebateSession(id);
    if (session && predicate(session)) return session;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("timed out waiting for debate session state");
}

test("startDebate runs opinion -> rebuttal -> improvement -> integrate with default 3 participants and ends awaiting_approval", async () => {
  const store = new OfficeStore();
  const runtime = createDebateRuntime(store, createStubLlm());

  const created = await runtime.startDebate({ topic: "月額980円で販売するべきか？" });
  const session = await waitForSession(store, created.id, (s) => s.status !== "running");

  assert.equal(session.status, "awaiting_approval");
  assert.equal(session.phase, "done");
  assert.deepEqual(session.participantAgentIds, ["agent-mirai", "agent-sayla", "agent-levi"]);
  assert.equal(session.integratorAgentId, "agent-chaos");

  // 3参加者 × 3ラウンド = 9件のentry
  assert.equal(session.entries.length, 9);
  assert.equal(session.entries.filter((e) => e.round === "opinion").length, 3);
  assert.equal(session.entries.filter((e) => e.round === "rebuttal").length, 3);
  assert.equal(session.entries.filter((e) => e.round === "improvement").length, 3);

  assert.ok(session.synthesis);
  assert.equal(session.synthesis?.score.marketability, 70);
  assert.equal(session.synthesis?.score.total, Math.round((70 + 60 + 80 + 50 + 65) / 5));

  // 3参加者 × 3ラウンド + 統合役1回 = 10回のAI呼び出し
  assert.equal(session.calls.length, 10, "無限ループを防ぐため呼び出し回数は固定");
  assert.ok(session.estimatedCostUsd > 0);

  for (const agentId of [...session.participantAgentIds, session.integratorAgentId]) {
    assert.equal(store.getAgent(agentId)?.status, "standby");
  }
});

test("starting a second debate while one is running is rejected synchronously", async () => {
  const store = new OfficeStore();
  const runtime = createDebateRuntime(store, createStubLlm());

  await runtime.startDebate({ topic: "1つ目の議題" });
  await assert.rejects(() => runtime.startDebate({ topic: "2つ目の議題" }), /既に進行中/);

  assert.equal(store.listDebateSessions().length, 1, "拒否された2件目はセッションを作らない");
});

test("participant count outside 2-4 is rejected before any AI call", async () => {
  const store = new OfficeStore();
  const runtime = createDebateRuntime(store, createStubLlm());

  await assert.rejects(
    () => runtime.startDebate({ topic: "参加人数テスト", participantAgentIds: ["agent-mirai"] }),
    /2〜4人/,
  );
  assert.equal(store.listDebateSessions().length, 0);
});

test("a failure during rebuttal marks the session failed (no partial retry)", async () => {
  const store = new OfficeStore();
  const runtime = createDebateRuntime(store, createStubLlm({ failOnTool: "submit_debate_rebuttal" }));

  const created = await runtime.startDebate({ topic: "失敗するはずの議題" });
  const session = await waitForSession(store, created.id, (s) => s.status !== "running");

  assert.equal(session.status, "failed");
  assert.equal(session.errorPhase, "rebuttal");
  assert.ok(session.errorMessage?.includes("stub llm failure"));
  assert.equal(session.entries.filter((e) => e.round === "opinion").length, 3, "初期意見までは記録される");
  assert.equal(session.entries.filter((e) => e.round === "rebuttal").length, 0, "反論ラウンドの失敗以降は記録されない");

  for (const agentId of [...session.participantAgentIds, session.integratorAgentId]) {
    assert.equal(store.getAgent(agentId)?.status, "standby");
  }
});

test("startDebate rejects up front when the pre-execution cost estimate exceeds the cap", async () => {
  const store = new OfficeStore();
  const runtime = createDebateRuntime(store, createStubLlm());

  await assert.rejects(
    () => runtime.startDebate({ topic: "費用上限テスト", costCapUsd: 0.00001 }),
    /費用上限/,
  );
  assert.equal(store.listDebateSessions().length, 0, "費用上限超過時はセッションを作らない");
});

test("decideDebate records the human decision and rejects when not awaiting approval", async () => {
  const store = new OfficeStore();
  const runtime = createDebateRuntime(store, createStubLlm());

  const created = await runtime.startDebate({ topic: "承認テスト" });
  await waitForSession(store, created.id, (s) => s.status === "awaiting_approval");

  runtime.decideDebate(created.id, "run_modified", "価格は680円からにする");
  const decided = store.getDebateSession(created.id);
  assert.equal(decided?.status, "concluded");
  assert.equal(decided?.decision, "run_modified");
  assert.equal(decided?.decisionNote, "価格は680円からにする");

  assert.throws(() => runtime.decideDebate(created.id, "run_as_is"), /判断待ちの状態ではありません/);
});

test("stopDebate halts before the next round instead of the whole pipeline running unattended", async () => {
  const store = new OfficeStore();
  const runtime = createDebateRuntime(store, createStubLlm());

  const created = await runtime.startDebate({ topic: "停止テスト" });
  runtime.stopDebate(created.id);

  const session = await waitForSession(store, created.id, (s) => s.status !== "running");
  assert.equal(session.status, "discarded");
  assert.ok(session.errorMessage?.includes("停止"));
});
