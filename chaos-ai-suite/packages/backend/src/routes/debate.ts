import type { FastifyInstance } from "fastify";
import { officeStore } from "../store/officeStore.js";
import type { DebateRuntime } from "../orchestration/debateRuntime.js";

/** 議題の入力上限。暴走コスト・不正な巨大入力を防ぐ（AI会議モードのMAX_REQUEST_LENGTHと同じ考え方）。 */
const MAX_TOPIC_LENGTH = 4000;
const DEBATE_DECISIONS = ["run_as_is", "run_modified", "hold", "rejected"] as const;

function isValidDecision(value: unknown): value is (typeof DEBATE_DECISIONS)[number] {
  return DEBATE_DECISIONS.includes(value as (typeof DEBATE_DECISIONS)[number]);
}

/**
 * AI討論会（初期意見→相互反論→改善案→統合→人間承認）ルート。
 * 開始は時間のかかる非同期処理のため、検証（進行中の討論会の有無・参加人数・費用上限）だけ待って
 * 202を返し、実際のAI呼び出しの進捗は /ws/office の debate_session_updated イベントで配信する。
 */
export function debateRoutes(runtime: DebateRuntime) {
  return async function registerDebateRoutes(app: FastifyInstance): Promise<void> {
    app.get("/api/debate", async () => {
      return officeStore.listDebateSessions();
    });

    app.get("/api/debate/:id", async (request, reply) => {
      const { id } = request.params as { id: string };
      const session = officeStore.getDebateSession(id);
      if (!session) return reply.code(404).send({ error: "session not found" });
      return session;
    });

    app.post("/api/debate/start", async (request, reply) => {
      const body = (request.body ?? {}) as { topic?: string; participantAgentIds?: string[]; costCapUsd?: number };
      if (!body.topic?.trim()) {
        return reply.code(400).send({ error: "議題を入力してください" });
      }
      if (body.topic.length > MAX_TOPIC_LENGTH) {
        return reply.code(400).send({ error: `議題が長すぎます（${MAX_TOPIC_LENGTH}字以内にしてください）` });
      }
      if (
        body.participantAgentIds !== undefined &&
        (!Array.isArray(body.participantAgentIds) || body.participantAgentIds.some((id) => typeof id !== "string"))
      ) {
        return reply.code(400).send({ error: "参加AI社員の指定が不正です" });
      }
      if (body.costCapUsd !== undefined && (typeof body.costCapUsd !== "number" || !Number.isFinite(body.costCapUsd) || body.costCapUsd <= 0)) {
        return reply.code(400).send({ error: "費用上限は0より大きい数値で入力してください" });
      }

      try {
        const session = await runtime.startDebate({
          topic: body.topic.trim(),
          participantAgentIds: body.participantAgentIds,
          costCapUsd: body.costCapUsd,
        });
        return reply.code(202).send({ status: "accepted", sessionId: session.id });
      } catch (error) {
        return reply.code(409).send({ error: (error as Error).message });
      }
    });

    app.post("/api/debate/:id/stop", async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        runtime.stopDebate(id);
        return reply.code(200).send({ status: "stop_requested" });
      } catch (error) {
        return reply.code(404).send({ error: (error as Error).message });
      }
    });

    app.post("/api/debate/:id/decide", async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { decision?: string; note?: string };
      if (!isValidDecision(body.decision)) {
        return reply.code(400).send({ error: "判断の種類が不正です" });
      }
      try {
        runtime.decideDebate(id, body.decision, body.note?.trim() || undefined);
        return reply.code(200).send({ status: "decided" });
      } catch (error) {
        return reply.code(409).send({ error: (error as Error).message });
      }
    });
  };
}
