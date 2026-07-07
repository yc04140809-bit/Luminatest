import type { FastifyInstance } from "fastify";
import type { Task, TaskDraft } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";
import type { ToolRegistry } from "../tools/toolRegistry.js";
import { executeApprovedToolCall } from "../orchestration/toolApproval.js";

/**
 * タスクルート。承認エンドポイントは、Task.pendingToolCallが設定されている場合
 * （AI社員が外部ツールの実行を申請している場合）、承認と同時に実際にツールを実行する
 * ——これが「代表がApproveを押して初めてAPIが実行される」というHuman-in-the-Loopの実体。
 */
export function taskRoutes(toolRegistry: ToolRegistry) {
  return async function registerTaskRoutes(app: FastifyInstance): Promise<void> {
    app.get("/api/tasks", async () => {
      return officeStore.listTasks();
    });

    app.post("/api/tasks", async (request, reply) => {
      const draft = request.body as TaskDraft;
      const task = officeStore.createTask(draft);
      return reply.code(201).send(task);
    });

    app.patch("/api/tasks/:id", async (request, reply) => {
      const { id } = request.params as { id: string };
      const patch = request.body as Partial<Task>;
      const task = officeStore.updateTask(id, patch);
      if (!task) return reply.code(404).send({ error: "task not found" });
      return task;
    });

    app.post("/api/tasks/:id/approve", async (request, reply) => {
      const { id } = request.params as { id: string };
      const { comment } = (request.body as { comment?: string }) ?? {};
      const task = officeStore.getTask(id);
      if (!task) return reply.code(404).send({ error: "task not found" });

      if (task.pendingToolCall) {
        return executeApprovedToolCall(officeStore, toolRegistry, task, comment);
      }

      return officeStore.updateTask(id, {
        status: "approved",
        approval: {
          required: true,
          status: "approved",
          decidedBy: "user",
          decidedAt: new Date().toISOString(),
          comment,
        },
      });
    });

    app.post("/api/tasks/:id/reject", async (request, reply) => {
      const { id } = request.params as { id: string };
      const { comment } = (request.body as { comment?: string }) ?? {};
      const task = officeStore.getTask(id);
      if (!task) return reply.code(404).send({ error: "task not found" });

      const updated = officeStore.updateTask(id, {
        status: "rejected",
        pendingToolCall: undefined,
        approval: {
          required: true,
          status: "rejected",
          decidedBy: "user",
          decidedAt: new Date().toISOString(),
          comment,
        },
      });

      if (task.pendingToolCall) {
        officeStore.postMessage({
          channel: "general",
          fromAgentId: "system",
          type: "system_log",
          content: "外部連携の実行申請は代表により却下されました。",
          relatedTaskId: id,
        });
      }

      return updated;
    });
  };
}
