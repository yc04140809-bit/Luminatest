import type { FastifyInstance } from "fastify";
import { officeStore } from "../store/officeStore.js";
import type { MorningBriefingRuntime } from "../orchestration/morningBriefing.js";
import { todayInTokyo } from "../orchestration/dateUtil.js";

/**
 * 朝会ブリーフィングルート。本日まだ未実施の場合のみ202を返し非同期で実行する。
 * 進捗は /ws/office の message_created（briefing）/ briefing_completed イベントで配信される。
 */
export function briefingRoutes(runtime: MorningBriefingRuntime) {
  return async function registerBriefingRoutes(app: FastifyInstance): Promise<void> {
    app.get("/api/briefing/status", async () => {
      const today = todayInTokyo();
      return { today, lastBriefingDate: officeStore.getLastBriefingDate(), due: officeStore.getLastBriefingDate() !== today };
    });

    app.post("/api/briefing", async (request, reply) => {
      if (officeStore.getLastBriefingDate() === todayInTokyo()) {
        return reply.code(409).send({ error: "本日の朝会は実施済みです。" });
      }

      void runtime.runIfDue().catch((error: Error) => {
        app.log.error(error, "runMorningBriefing failed");
      });

      return reply.code(202).send({ status: "accepted" });
    });
  };
}
