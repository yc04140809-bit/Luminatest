import type { FastifyInstance } from "fastify";
import type { MessageDraft } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/messages", async (request) => {
    const { limit } = request.query as { limit?: string };
    return officeStore.listMessages(limit ? Number(limit) : undefined);
  });

  /** 代表からの全体指示・個別メンション指示（コマンドセンター）の投稿口。 */
  app.post("/api/messages", async (request, reply) => {
    const draft = request.body as MessageDraft;
    const message = officeStore.postMessage(draft);
    return reply.code(201).send(message);
  });
}
