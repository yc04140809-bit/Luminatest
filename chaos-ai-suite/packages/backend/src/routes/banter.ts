import type { FastifyInstance } from "fastify";
import type { OfficeBanterRuntime } from "../orchestration/officeBanter.js";

/** オフィス雑談タイムルート。数ターンの短い雑談を非同期で実行する。 */
export function banterRoutes(runtime: OfficeBanterRuntime) {
  return async function registerBanterRoutes(app: FastifyInstance): Promise<void> {
    app.post("/api/banter", async (request, reply) => {
      if (runtime.isRunning()) {
        return reply.code(409).send({ error: "既に雑談が進行中です。終わるまでお待ちください。" });
      }

      void runtime.runBanter().catch((error: Error) => {
        app.log.error(error, "runBanter failed");
      });

      return reply.code(202).send({ status: "accepted" });
    });
  };
}
