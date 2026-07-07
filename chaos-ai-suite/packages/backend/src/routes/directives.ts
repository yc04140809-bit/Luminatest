import type { FastifyInstance } from "fastify";
import type { AgentRuntime } from "../orchestration/agentRuntime.js";

/**
 * 代表からの指示を受け付けるエンドポイント。
 * `targetAgentId` を指定すると特定のAI社員への個別メンション指示（作戦会議を挟まず直接実行）、
 * 未指定なら全体指示（セイラ×レヴィの作戦会議からタスク分解）として扱う。
 * LLM呼び出しの連鎖は時間がかかるため、202を即返し、進捗は /ws/office のイベントで配信する。
 */
export function directiveRoutes(runtime: AgentRuntime) {
  return async function registerDirectiveRoutes(app: FastifyInstance): Promise<void> {
    app.post("/api/directives", async (request, reply) => {
      const { directive, targetAgentId } =
        (request.body as { directive?: string; targetAgentId?: string }) ?? {};
      if (!directive?.trim()) {
        return reply.code(400).send({ error: "directive is required" });
      }

      const dispatch = targetAgentId
        ? runtime.dispatchMention(targetAgentId, directive)
        : runtime.dispatchDirective(directive);

      void dispatch.catch((error: Error) => {
        app.log.error(error, "directive dispatch failed");
      });

      return reply.code(202).send({ status: "accepted" });
    });
  };
}
