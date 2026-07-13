import { test } from "node:test";
import assert from "node:assert/strict";
import type { CouncilSession } from "@chaos-ai-suite/shared";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { createCouncilRuntime } from "./councilRuntime.js";
import { OfficeStore } from "../store/officeStore.js";

/** ツール名で作成役/検証役/統合役の応答を切り替える決定論的なスタブLLM。 */
function createStubLlm(options?: { failOnTool?: string }): LlmClient {
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      if (options?.failOnTool === request.toolName) {
        throw new Error("stub llm failure");
      }
      request.onUsage?.({ inputTokens: 100, outputTokens: 50 });
      switch (request.toolName) {
        case "submit_council_draft":
          return { draft: "最初の成果物案です。", assumptions: ["読者は初心者と仮定しました"] } as T;
        case "submit_council_verification":
          return { issues: ["具体例が少ない"], fixSuggestions: ["具体例を1つ追加する"], risks: ["競合との差別化が弱い"] } as T;
        case "submit_council_integration":
          return { finalDraft: "統合済みの最終案です。", remainingRisks: ["効果には個人差がある"] } as T;
        default:
          throw new Error(`unexpected toolName in stub: ${request.toolName}`);
      }
    },
  };
}

async function waitForSession(
  store: OfficeStore,
  id: string,
  predicate: (session: CouncilSession) => boolean,
  timeoutMs = 2000,
): Promise<CouncilSession> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const session = store.getCouncilSession(id);
    if (session && predicate(session)) return session;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("timed out waiting for council session state");
}

test("startCouncil runs draft -> verify -> integrate and ends awaiting_approval with exactly 3 calls", async () => {
  const store = new OfficeStore();
  const runtime = createCouncilRuntime(store, createStubLlm());

  const created = await runtime.startCouncil({ requestText: "初心者向けのThreads投稿を作りたい", category: "sns" });
  const session = await waitForSession(store, created.id, (s) => s.status !== "running");

  assert.equal(session.status, "awaiting_approval");
  assert.equal(session.phase, "done");
  assert.equal(session.drafterAgentId, "agent-mirai");
  assert.equal(session.verifierAgentId, "agent-levi");
  assert.equal(session.integratorAgentId, "agent-chaos");
  assert.equal(session.draft, "最初の成果物案です。");
  assert.deepEqual(session.draftAssumptions, ["読者は初心者と仮定しました"]);
  assert.deepEqual(session.verification, {
    issues: ["具体例が少ない"],
    fixSuggestions: ["具体例を1つ追加する"],
    risks: ["競合との差別化が弱い"],
  });
  assert.equal(session.finalDraft, "統合済みの最終案です。");
  assert.deepEqual(session.remainingRisks, ["効果には個人差がある"]);

  assert.equal(session.calls.length, 3, "1依頼につき最大3回のAI呼び出しに固定する");
  assert.deepEqual(session.calls.map((c) => c.role), ["draft", "verify", "integrate"]);
  assert.ok(session.estimatedCostUsd > 0);

  for (const agentId of [session.drafterAgentId, session.verifierAgentId, session.integratorAgentId]) {
    assert.equal(store.getAgent(agentId)?.status, "standby");
  }
});

test("starting a second council while one is running is rejected synchronously", async () => {
  const store = new OfficeStore();
  const runtime = createCouncilRuntime(store, createStubLlm());

  await runtime.startCouncil({ requestText: "1つ目の依頼", category: "sns" });
  await assert.rejects(() => runtime.startCouncil({ requestText: "2つ目の依頼", category: "sns" }), /既に進行中/);

  assert.equal(store.listCouncilSessions().length, 1, "拒否された2件目はセッションを作らない");
});

test("a failure during verification marks the session failed and resets agents (no partial retry)", async () => {
  const store = new OfficeStore();
  const runtime = createCouncilRuntime(store, createStubLlm({ failOnTool: "submit_council_verification" }));

  const created = await runtime.startCouncil({ requestText: "失敗するはずの依頼", category: "note" });
  const session = await waitForSession(store, created.id, (s) => s.status !== "running");

  assert.equal(session.status, "failed");
  assert.equal(session.errorPhase, "verifying");
  assert.ok(session.errorMessage?.includes("stub llm failure"));
  assert.equal(session.calls.length, 1, "作成役の1回のみ成功し、検証役の失敗以降は呼ばれない");

  for (const agentId of [session.drafterAgentId, session.verifierAgentId, session.integratorAgentId]) {
    assert.equal(store.getAgent(agentId)?.status, "standby");
  }
});

test("startCouncil rejects up front when the pre-execution cost estimate exceeds the cap", async () => {
  const store = new OfficeStore();
  const runtime = createCouncilRuntime(store, createStubLlm());

  await assert.rejects(
    () => runtime.startCouncil({ requestText: "費用上限テスト", category: "sns", costCapUsd: 0.00001 }),
    /費用上限/,
  );
  assert.equal(store.listCouncilSessions().length, 0, "費用上限超過時はセッションを作らない");
});

test("reviseCouncil skips the draft call and reuses the previous finalDraft", async () => {
  const store = new OfficeStore();
  const runtime = createCouncilRuntime(store, createStubLlm());

  const first = await runtime.startCouncil({ requestText: "案件応募文を作りたい", category: "sales" });
  await waitForSession(store, first.id, (s) => s.status === "awaiting_approval");

  const revised = await runtime.reviseCouncil({ sessionId: first.id, instruction: "もっと具体的にしてください" });
  const session = await waitForSession(store, revised.id, (s) => s.status !== "running");

  assert.equal(session.status, "awaiting_approval");
  assert.equal(session.parentSessionId, first.id);
  assert.equal(session.revisionInstruction, "もっと具体的にしてください");
  assert.equal(session.draft, "統合済みの最終案です。", "前回の完成案を土台の作成案として引き継ぐ");
  assert.equal(session.calls.length, 2, "作成役の呼び出しを省略し、検証・統合の2回のみ");
  assert.deepEqual(session.calls.map((c) => c.role), ["verify", "integrate"]);
});

test("setApproval approves an awaiting_approval session and rejects when not awaiting approval", async () => {
  const store = new OfficeStore();
  const runtime = createCouncilRuntime(store, createStubLlm());

  const created = await runtime.startCouncil({ requestText: "承認テスト", category: "image_plan" });
  await waitForSession(store, created.id, (s) => s.status === "awaiting_approval");

  runtime.setApproval(created.id, "approved");
  assert.equal(store.getCouncilSession(created.id)?.status, "approved");

  assert.throws(() => runtime.setApproval(created.id, "approved"), /承認待ちの状態ではありません/);
});

test("stopCouncil halts before the next phase instead of the whole pipeline running unattended", async () => {
  const store = new OfficeStore();
  const runtime = createCouncilRuntime(store, createStubLlm());

  const created = await runtime.startCouncil({ requestText: "停止テスト", category: "sns" });
  runtime.stopCouncil(created.id);

  const session = await waitForSession(store, created.id, (s) => s.status !== "running");
  assert.equal(session.status, "discarded");
  assert.ok(session.errorMessage?.includes("停止"));
});
