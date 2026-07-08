import type { FastifyInstance } from "fastify";
import { officeStore } from "../store/officeStore.js";
import type { MeetingRuntime } from "../orchestration/meetingRuntime.js";

/**
 * 戦略経営会議ルート。会議の開始は時間のかかる非同期処理のため202を即返し、
 * 進捗は /ws/office の strategy_meeting_updated イベントで配信する。
 */
export function meetingRoutes(runtime: MeetingRuntime) {
  return async function registerMeetingRoutes(app: FastifyInstance): Promise<void> {
    app.get("/api/meetings", async () => {
      return officeStore.listStrategyMeetings();
    });

    app.get("/api/meetings/:id", async (request, reply) => {
      const { id } = request.params as { id: string };
      const meeting = officeStore.getStrategyMeeting(id);
      if (!meeting) return reply.code(404).send({ error: "meeting not found" });
      return meeting;
    });

    app.post("/api/meetings", async (request, reply) => {
      const { topic } = (request.body as { topic?: string }) ?? {};
      if (!topic?.trim()) {
        return reply.code(400).send({ error: "topic is required" });
      }
      if (officeStore.listStrategyMeetings().some((meeting) => meeting.status === "running")) {
        return reply.code(409).send({ error: "既に進行中の会議があります。終了してから新しい会議を開始してください。" });
      }

      void runtime.startMeeting(topic).catch((error: Error) => {
        app.log.error(error, "startMeeting failed");
      });

      return reply.code(202).send({ status: "accepted" });
    });
  };
}
