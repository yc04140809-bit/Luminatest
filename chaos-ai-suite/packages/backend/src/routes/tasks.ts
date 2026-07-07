import type { FastifyInstance } from "fastify";
import type { Task, TaskDraft } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";

export async function taskRoutes(app: FastifyInstance): Promise<void> {
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

  /** 代表による承認ゲートの操作。Human-in-the-loopの実体はここ。 */
  app.post("/api/tasks/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { comment } = (request.body as { comment?: string }) ?? {};
    const task = officeStore.updateTask(id, {
      status: "approved",
      approval: {
        required: true,
        status: "approved",
        decidedBy: "user",
        decidedAt: new Date().toISOString(),
        comment,
      },
    });
    if (!task) return reply.code(404).send({ error: "task not found" });
    return task;
  });

  app.post("/api/tasks/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { comment } = (request.body as { comment?: string }) ?? {};
    const task = officeStore.updateTask(id, {
      status: "rejected",
      approval: {
        required: true,
        status: "rejected",
        decidedBy: "user",
        decidedAt: new Date().toISOString(),
        comment,
      },
    });
    if (!task) return reply.code(404).send({ error: "task not found" });
    return task;
  });
}
