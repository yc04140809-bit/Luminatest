import { test } from "node:test";
import assert from "node:assert/strict";
import type { Agent } from "@chaos-ai-suite/shared";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { createOfficeBanterRuntime } from "./officeBanter.js";
import { OfficeStore } from "../store/officeStore.js";

function createStubLlm(): LlmClient {
  let counter = 0;
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      assert.equal(request.toolName, "submit_banter_line");
      counter += 1;
      return { content: `雑談ライン${counter}` } as T;
    },
  };
}

/** テストを決定論的にするため、常に同じ2名を選ぶ固定pick関数。 */
function pickFixed(a: string, b: string): (agents: Agent[]) => [Agent, Agent] {
  return (agents) => {
    const agentA = agents.find((agent) => agent.id === a)!;
    const agentB = agents.find((agent) => agent.id === b)!;
    return [agentA, agentB];
  };
}

test("runBanter posts alternating banter messages between two agents", async () => {
  const store = new OfficeStore();
  const runtime = createOfficeBanterRuntime(store, createStubLlm(), pickFixed("agent-chaos", "agent-levi"));

  await runtime.runBanter();

  const banterMessages = store.listMessages().filter((m) => m.type === "banter");
  assert.equal(banterMessages.length, 3);
  assert.deepEqual(
    banterMessages.map((m) => m.fromAgentId),
    ["agent-chaos", "agent-levi", "agent-chaos"],
  );
  assert.equal(runtime.isRunning(), false);
});

test("runBanter rejects when banter is already in progress", async () => {
  const store = new OfficeStore();
  const runtime = createOfficeBanterRuntime(store, createStubLlm(), pickFixed("agent-chaos", "agent-levi"));

  const first = runtime.runBanter();
  await assert.rejects(() => runtime.runBanter(), /既に雑談が進行中/);
  await first;
  assert.equal(runtime.isRunning(), false);
});

test("runBanter throws if fewer than two agents are enabled", async () => {
  const store = new OfficeStore();
  for (const agent of store.listAgents().slice(1)) {
    store.updateAgent(agent.id, { enabled: false });
  }

  const runtime = createOfficeBanterRuntime(store, createStubLlm());
  await assert.rejects(() => runtime.runBanter(), /最低2名/);
});
