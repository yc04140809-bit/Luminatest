import type { Task } from "@chaos-ai-suite/shared";
import type { OfficeStore } from "../store/officeStore.js";
import type { ToolRegistry } from "../tools/toolRegistry.js";

/**
 * Task.pendingToolCallを持つタスクが代表に承認されたときに、実際にツールを実行する。
 * 「承認したら実行」というHuman-in-the-Loopの核であり、ルート層（HTTP）から切り離して
 * 単体テスト可能にするためagentRuntimeと同じ「ストアを注入する」形にしている。
 */
export async function executeApprovedToolCall(
  store: OfficeStore,
  toolRegistry: ToolRegistry,
  task: Task,
  comment: string | undefined,
): Promise<Task | undefined> {
  const pending = task.pendingToolCall;
  if (!pending) throw new Error(`task ${task.id} has no pendingToolCall`);

  const decidedAt = new Date().toISOString();
  const approval = { required: true, status: "approved" as const, decidedBy: "user", decidedAt, comment };
  const executor = toolRegistry.get(pending.toolId);

  if (!executor) {
    const updated = store.updateTask(task.id, { status: "blocked", pendingToolCall: undefined, approval });
    store.postMessage({
      channel: "general",
      fromAgentId: "system",
      type: "system_log",
      content: `未登録の外部ツール（${pending.toolId}）が指定されていたため実行できませんでした。`,
      relatedTaskId: task.id,
    });
    return updated;
  }

  store.updateTask(task.id, { status: "in_progress" });
  try {
    const result = await executor.execute({
      agentId: task.assignedAgentId ?? "system",
      taskId: task.id,
      input: pending.input,
    });
    const updated = store.updateTask(task.id, {
      status: "completed",
      output: [task.output, `[外部連携実行結果] ${result.summary}`].filter(Boolean).join("\n\n"),
      pendingToolCall: undefined,
      approval,
    });
    store.postMessage({
      channel: "general",
      fromAgentId: task.assignedAgentId ?? "system",
      type: "status_update",
      content: `外部連携が完了しました: ${result.summary}`,
      relatedTaskId: task.id,
    });
    return updated;
  } catch (error) {
    const updated = store.updateTask(task.id, { status: "blocked", pendingToolCall: undefined, approval });
    store.postMessage({
      channel: "general",
      fromAgentId: task.assignedAgentId ?? "system",
      type: "system_log",
      content: `外部連携の実行に失敗しました: ${(error as Error).message}`,
      relatedTaskId: task.id,
    });
    return updated;
  }
}
