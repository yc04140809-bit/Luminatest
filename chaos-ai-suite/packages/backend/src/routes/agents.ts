import type { FastifyInstance } from "fastify";
import type { AgentDraft } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/agents", async () => {
    return officeStore.listAgents();
  });

  app.get("/api/agents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = officeStore.getAgent(id);
    if (!agent) return reply.code(404).send({ error: "agent not found" });
    return agent;
  });

  app.post("/api/agents", async (request, reply) => {
    const draft = request.body as AgentDraft;
    const agent = officeStore.createAgent(draft);
    return reply.code(201).send(agent);
  });

  app.patch("/api/agents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const patch = request.body as Partial<AgentDraft>;
    const agent = officeStore.updateAgent(id, patch);
    if (!agent) return reply.code(404).send({ error: "agent not found" });
    return agent;
  });

  app.delete("/api/agents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = officeStore.deleteAgent(id);
    if (!deleted) return reply.code(404).send({ error: "agent not found" });
    return reply.code(204).send();
  });
}
