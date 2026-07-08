import { test } from "node:test";
import assert from "node:assert/strict";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { createMorningBriefingRuntime } from "./morningBriefing.js";
import { OfficeStore } from "../store/officeStore.js";
import { todayInTokyo } from "./dateUtil.js";

function createStubLlm(): LlmClient {
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      assert.equal(request.toolName, "submit_morning_briefing");
      return { content: "朝会ブリーフィング: 本日は特に大きな動きはありません。" } as T;
    },
  };
}

test("runIfDue posts a briefing message and records today's date", async () => {
  const store = new OfficeStore();
  const runtime = createMorningBriefingRuntime(store, createStubLlm());

  assert.equal(store.getLastBriefingDate(), undefined);

  await runtime.runIfDue();

  const briefing = store.listMessages().find((m) => m.type === "briefing");
  assert.ok(briefing, "should post a briefing message");
  assert.equal(briefing?.fromAgentId, "agent-sayla");
  assert.ok(briefing?.content.includes("朝会ブリーフィング"));
  assert.equal(store.getLastBriefingDate(), todayInTokyo());
});

test("runIfDue rejects when today's briefing has already run", async () => {
  const store = new OfficeStore();
  const runtime = createMorningBriefingRuntime(store, createStubLlm());

  await runtime.runIfDue();
  await assert.rejects(() => runtime.runIfDue(), /実施済み/);

  // 二重に投稿されていないこと
  assert.equal(store.listMessages().filter((m) => m.type === "briefing").length, 1);
});

test("runIfDue summarizes pending approvals in the prompt", async () => {
  const store = new OfficeStore();
  store.createTask({
    title: "承認待ちタスク",
    description: "テスト用",
    priority: "medium",
    outputType: "text",
    createdBy: "user",
    assignedAgentId: "agent-sayla",
    approval: { required: true, status: "pending" },
    tags: [],
  });

  let capturedPrompt = "";
  const llm: LlmClient = {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      capturedPrompt = request.userPrompt;
      return { content: "ブリーフィングです。" } as T;
    },
  };

  const runtime = createMorningBriefingRuntime(store, llm);
  await runtime.runIfDue();

  assert.ok(capturedPrompt.includes("承認待ちタスク"));
});
