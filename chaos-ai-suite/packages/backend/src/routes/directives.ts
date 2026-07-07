import type { FastifyInstance } from "fastify";
import type { AgentRuntime } from "../orchestration/agentRuntime.js";

/**
 * 代表からの大雑把な指示を受け付けるエンドポイント。
 * LLM呼び出しの連鎖は時間がかかるため、202を即返し、進捗は /ws/office のイベントで配信する。
 */
export function directiveRoutes(runtime: AgentRuntime) {
  return async function registerDirectiveRoutes(app: FastifyInstance): Promise<void> {
    app.post("/api/directives", async (request, reply) => {
      const { directive } = (request.body as { directive?: string }) ?? {};
      if (!directive?.trim()) {
        return reply.code(400).send({ error: "directive is required" });
      }

      void runtime.dispatchDirective(directive).catch((error: Error) => {
        app.log.error(error, "dispatchDirective failed");
      });

      return reply.code(202).send({ status: "accepted" });
    });
  };
}
