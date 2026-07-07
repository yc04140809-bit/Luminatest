import { test } from "node:test";
import assert from "node:assert/strict";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { createAgentRuntime } from "./agentRuntime.js";
import { OfficeStore } from "../store/officeStore.js";

/**
 * 決定論的なスタブLLM。
 * userPromptに含まれるタスクタイトルを見て、あらかじめ決めたレスポンスを返す。
 * 実際のAnthropic API呼び出しを行わずに、分解→配分→実行→ハンドオフ→承認ゲートの
 * オーケストレーションロジックを検証する。
 */
function createStubLlm(): LlmClient {
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      if (request.toolName === "record_task_plan") {
        return {
          meetingSummary: "3件のタスクに分解しました。",
          subtasks: [
            {
              title: "議事録の清書",
              description: "会議メモを正式な議事録フォーマットに整える",
              outputType: "document",
              assignedAgentId: "agent-nemuri",
              priority: "medium",
              requiresApprovalHint: false,
            },
            {
              title: "SNS投稿文の作成",
              description: "新サービス告知の投稿文を作成する",
              outputType: "sns_post",
              assignedAgentId: "agent-mirai",
              priority: "high",
              requiresApprovalHint: true,
            },
            {
              title: "設計書レビュー依頼",
              description: "新機能の設計書をレビューしてもらう",
              outputType: "dev_spec",
              assignedAgentId: "agent-levi",
              priority: "high",
              requiresApprovalHint: false,
            },
          ],
        } as T;
      }

      if (request.toolName === "submit_task_result") {
        if (request.userPrompt.includes("議事録の清書")) {
          return { output: "（議事録本文）", action: "complete" } as T;
        }
        if (request.userPrompt.includes("SNS投稿文の作成")) {
          return {
            output: "（投稿文案）",
            action: "request_approval",
            note: "炎上リスクは低いですが念のため確認をお願いします。",
          } as T;
        }
        if (request.userPrompt.includes("設計書レビュー依頼")) {
          const alreadyHandedOff = request.userPrompt.includes("これまでの引き継ぎ履歴");
          if (!alreadyHandedOff) {
            return {
              output: "（設計書ドラフト）",
              action: "handoff",
              targetAgentId: "agent-sayla",
              note: "経営視点でのレビューをお願いします。",
            } as T;
          }
          return { output: "（レビュー済み設計書）", action: "complete" } as T;
        }
      }

      throw new Error(`unexpected tool call in stub: ${request.toolName}`);
    },
  };
}

test("dispatchDirective decomposes, executes, hands off, and gates approval", async () => {
  const store = new OfficeStore();
  const runtime = createAgentRuntime(store, createStubLlm());

  await runtime.dispatchDirective("新サービスを立ち上げたい");

  const tasks = store.listTasks();
  assert.equal(tasks.length, 3, "should create exactly the 3 planned subtasks");

  const docTask = tasks.find((t) => t.title === "議事録の清書");
  assert.equal(docTask?.status, "completed");
  assert.equal(docTask?.output, "（議事録本文）");

  const snsTask = tasks.find((t) => t.title === "SNS投稿文の作成");
  assert.equal(snsTask?.status, "awaiting_approval");
  assert.equal(snsTask?.approval.required, true);
  assert.equal(snsTask?.approval.status, "pending");
  assert.ok(
    store.getState().pendingApprovalTaskIds.includes(snsTask!.id),
    "sns task should be tracked as pending approval",
  );

  const specTask = tasks.find((t) => t.title === "設計書レビュー依頼");
  assert.equal(specTask?.status, "completed");
  assert.equal(specTask?.handoffs.length, 1);
  assert.equal(specTask?.handoffs[0]?.fromAgentId, "agent-levi");
  assert.equal(specTask?.handoffs[0]?.toAgentId, "agent-sayla");
  assert.equal(specTask?.assignedAgentId, "agent-sayla");

  // 全エージェントが待機状態に戻っていること（作業中のまま止まっていない）
  for (const agent of store.listAgents()) {
    assert.equal(agent.status, "standby", `${agent.name} should return to standby`);
    assert.equal(agent.currentTaskId, undefined);
  }

  // 会議が後片付けされていること
  assert.equal(store.getState().activeMeetings.length, 0);

  const messages = store.listMessages();
  assert.ok(messages.some((m) => m.type === "directive" && m.fromAgentId === "user"));
  assert.ok(messages.some((m) => m.type === "task_handoff" && m.toAgentId === "agent-sayla"));
  assert.ok(messages.some((m) => m.type === "approval_request" && m.relatedTaskId === snsTask?.id));
});

test("runTask stops after MAX_HANDOFFS to avoid infinite handoff loops", async () => {
  const store = new OfficeStore();
  const pingPongLlm: LlmClient = {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      if (request.toolName === "record_task_plan") {
        return {
          meetingSummary: "無限ループ検証用のタスクを1件作成しました。",
          subtasks: [
            {
              title: "無限パスタスク",
              description: "常に相手に投げ返すだけのタスク",
              outputType: "text",
              assignedAgentId: "agent-nemuri",
              priority: "low",
              requiresApprovalHint: false,
            },
          ],
        } as T;
      }
      // 常にネムリ⇔アリアの間でハンドオフし続ける
      const toAria = request.systemPrompt.includes("ネムリちゃん");
      return {
        output: "（作業中）",
        action: "handoff",
        targetAgentId: toAria ? "agent-aria" : "agent-nemuri",
        note: "念のため確認してください",
      } as T;
    },
  };

  const runtime = createAgentRuntime(store, pingPongLlm);
  await runtime.dispatchDirective("無限ループになりそうな指示");

  const task = store.listTasks()[0];
  assert.equal(task?.status, "awaiting_approval");
  assert.equal(task?.approval.required, true);
});

test("dispatchMention assigns directly to one agent without a meeting", async () => {
  const store = new OfficeStore();
  const stubLlm: LlmClient = {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      assert.equal(request.toolName, "submit_task_result", "mention flow should skip decomposition");
      return { output: "（ケイオスちゃんの回答）", action: "complete" } as T;
    },
  };

  const runtime = createAgentRuntime(store, stubLlm);
  await runtime.dispatchMention("agent-chaos", "このクレーム対応どう思う？");

  const tasks = store.listTasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.assignedAgentId, "agent-chaos");
  assert.equal(tasks[0]?.status, "completed");
  assert.equal(store.getState().activeMeetings.length, 0);

  const chaos = store.getAgent("agent-chaos");
  assert.equal(chaos?.status, "standby");
});
