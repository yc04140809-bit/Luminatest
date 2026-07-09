import { test } from "node:test";
import assert from "node:assert/strict";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { createMeetingRuntime } from "./meetingRuntime.js";
import { OfficeStore } from "../store/officeStore.js";

/**
 * 決定論的なスタブLLM。各エージェントのsystemPromptは冒頭で必ず「あなたは...「XX」...」と
 * 自己紹介するので、冒頭付近のその名乗りで発言者を特定する（単純な部分一致だと、他エージェントへの
 * 言及—例えば全員の振る舞いルールに登場する「セイラへ報告する」等—と誤マッチしてしまうため、
 * 最初の「あなたは」直後に現れる最初の鉤括弧、という位置で特定している）。
 */
function createStubLlm(options?: { failOn?: (speakerName: string) => boolean }): LlmClient {
  function speakerName(systemPrompt: string): string {
    const match = systemPrompt.match(/あなたは[\s\S]*?「(.+?)」/);
    if (!match) throw new Error(`could not identify speaker from systemPrompt: ${systemPrompt.slice(0, 50)}`);
    return match[1]!;
  }

  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      const name = speakerName(request.systemPrompt);
      if (options?.failOn?.(name)) {
        throw new Error("stub llm failure");
      }
      switch (name) {
        case "セイラ":
          if (request.userPrompt.includes("最終提案")) {
            return { content: "代表、会議の結果、以下のプランを提案します。（テスト提案）" } as T;
          }
          return { content: "会議の目的を定義しました。皆さん意見をお願いします。" } as T;
        case "レヴィ":
          return { content: "開発視点の意見です。" } as T;
        case "ミライ":
          return { content: "拡散・トレンド視点の意見です。" } as T;
        case "ケイオス":
          return { content: "リスク・顧客対応視点の意見です。" } as T;
        case "ネムリ":
          return { content: "議事録: 3名から意見が出ました。" } as T;
        case "アリア":
          return { content: "- タスク1を実施する\n- タスク2を実施する\n- タスク3を実施する" } as T;
        default:
          throw new Error(`unexpected speaker in stub: ${name}`);
      }
    },
  };
}

test("startMeeting runs opening -> discussion(2 rounds x3) -> documentation -> proposal -> concluded", async () => {
  const store = new OfficeStore();
  const runtime = createMeetingRuntime(store, createStubLlm());

  await runtime.startMeeting("新サービスを立ち上げたい");

  const meetings = store.listStrategyMeetings();
  assert.equal(meetings.length, 1);
  const meeting = meetings[0]!;

  assert.equal(meeting.status, "concluded");
  assert.equal(meeting.phase, "concluded");
  assert.ok(meeting.concludedAt);
  assert.deepEqual(meeting.participantAgentIds, [
    "agent-sayla",
    "agent-levi",
    "agent-mirai",
    "agent-chaos",
    "agent-nemuri",
    "agent-aria",
  ]);

  // opening(1) + discussion(2 rounds x 3 specialists = 6) + documentation(2) + proposal(1) = 10
  assert.equal(meeting.statements.length, 10);
  assert.equal(meeting.statements[0]?.agentId, "agent-sayla");
  assert.equal(meeting.statements[0]?.phase, "opening");

  const discussionStatements = meeting.statements.slice(1, 7);
  assert.deepEqual(
    discussionStatements.map((s) => s.agentId),
    ["agent-levi", "agent-mirai", "agent-chaos", "agent-levi", "agent-mirai", "agent-chaos"],
  );
  assert.ok(discussionStatements.every((s) => s.phase === "discussion"));

  assert.equal(meeting.statements[7]?.agentId, "agent-nemuri");
  assert.equal(meeting.statements[7]?.phase, "documentation");
  assert.equal(meeting.statements[8]?.agentId, "agent-aria");
  assert.equal(meeting.statements[8]?.phase, "documentation");

  assert.equal(meeting.statements[9]?.agentId, "agent-sayla");
  assert.equal(meeting.statements[9]?.phase, "proposal");

  assert.ok(meeting.minutes?.includes("議事録"));
  assert.deepEqual(meeting.actionItems, ["タスク1を実施する", "タスク2を実施する", "タスク3を実施する"]);
  assert.ok(meeting.proposal?.includes("代表、会議の結果"));

  assert.equal(meeting.currentSpeakerId, undefined, "no one should still be marked as speaking once concluded");

  // 参加者全員が待機状態に戻っていること
  for (const agentId of meeting.participantAgentIds) {
    const agent = store.getAgent(agentId);
    assert.equal(agent?.status, "standby", `${agentId} should return to standby`);
    assert.equal(agent?.currentTaskId, undefined);
    assert.equal(agent?.currentTaskSummary, undefined);
  }

  // 軽量なActiveMeetingは後片付けされていること
  assert.equal(store.getState().activeMeetings.length, 0);

  // 各発言が社内チャットログにもchatメッセージとして流れていること
  const chatMessages = store.listMessages().filter((m) => m.type === "chat");
  assert.equal(chatMessages.length, 10);
  assert.ok(store.listMessages().some((m) => m.type === "directive" && m.content.includes("【会議開始】")));
});

test("starting a second meeting while one is running is rejected", async () => {
  const store = new OfficeStore();
  const runtime = createMeetingRuntime(store, createStubLlm());

  const first = runtime.startMeeting("1つ目のお題");
  await assert.rejects(() => runtime.startMeeting("2つ目のお題"), /既に進行中/);
  await first;

  assert.equal(store.listStrategyMeetings().length, 1, "the rejected second call should not create a meeting record");
});

test("a failure mid-discussion marks the meeting failed and resets all participants", async () => {
  const store = new OfficeStore();
  const runtime = createMeetingRuntime(
    store,
    createStubLlm({ failOn: (name) => name === "ミライ" }),
  );

  await runtime.startMeeting("失敗するはずのお題");

  const meeting = store.listStrategyMeetings()[0]!;
  assert.equal(meeting.status, "failed");
  assert.ok(meeting.errorMessage?.includes("stub llm failure"));
  assert.equal(meeting.currentSpeakerId, undefined);

  for (const agentId of meeting.participantAgentIds) {
    assert.equal(store.getAgent(agentId)?.status, "standby");
  }
  assert.equal(store.getState().activeMeetings.length, 0);
  assert.ok(store.listMessages().some((m) => m.type === "system_log" && m.content.includes("stub llm failure")));
});
