import type { FastifyInstance } from "fastify";
import { COUNCIL_CATEGORIES, type CouncilRequestCategory } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";
import type { CouncilRuntime } from "../orchestration/councilRuntime.js";

/** 依頼内容の入力上限。暴走コスト・不正な巨大入力を防ぐ。 */
const MAX_REQUEST_LENGTH = 8000;

function isValidCategory(value: unknown): value is CouncilRequestCategory {
  return COUNCIL_CATEGORIES.some((entry) => entry.id === value);
}

/**
 * AI会議モード（作成役→検証役→統合役→人間承認）ルート。
 * 開始・修正依頼は戦略経営会議と同じく時間のかかる非同期処理のため、
 * 検証（進行中の会議の有無・費用上限）だけ待って202を返し、
 * 実際のAI呼び出しの進捗は /ws/office の council_session_updated イベントで配信する。
 */
export function councilRoutes(runtime: CouncilRuntime) {
  return async function registerCouncilRoutes(app: FastifyInstance): Promise<void> {
    app.get("/api/council", async () => {
      return officeStore.listCouncilSessions();
    });

    app.get("/api/council/:id", async (request, reply) => {
      const { id } = request.params as { id: string };
      const session = officeStore.getCouncilSession(id);
      if (!session) return reply.code(404).send({ error: "session not found" });
      return session;
    });

    app.post("/api/council/start", async (request, reply) => {
      const body = (request.body ?? {}) as { requestText?: string; category?: string; costCapUsd?: number };
      if (!body.requestText?.trim()) {
        return reply.code(400).send({ error: "依頼内容を入力してください" });
      }
      if (body.requestText.length > MAX_REQUEST_LENGTH) {
        return reply.code(400).send({ error: `依頼内容が長すぎます（${MAX_REQUEST_LENGTH}字以内にしてください）` });
      }
      if (!isValidCategory(body.category)) {
        return reply.code(400).send({ error: "依頼の種類を選択してください" });
      }
      if (body.costCapUsd !== undefined && (typeof body.costCapUsd !== "number" || !Number.isFinite(body.costCapUsd) || body.costCapUsd <= 0)) {
        return reply.code(400).send({ error: "費用上限は0より大きい数値で入力してください" });
      }

      try {
        const session = await runtime.startCouncil({
          requestText: body.requestText.trim(),
          category: body.category,
          costCapUsd: body.costCapUsd,
        });
        return reply.code(202).send({ status: "accepted", sessionId: session.id });
      } catch (error) {
        return reply.code(409).send({ error: (error as Error).message });
      }
    });

    app.post("/api/council/:id/revise", async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { instruction?: string };
      if (body.instruction && body.instruction.length > MAX_REQUEST_LENGTH) {
        return reply.code(400).send({ error: `修正指示が長すぎます（${MAX_REQUEST_LENGTH}字以内にしてください）` });
      }

      try {
        const session = await runtime.reviseCouncil({ sessionId: id, instruction: body.instruction?.trim() || undefined });
        return reply.code(202).send({ status: "accepted", sessionId: session.id });
      } catch (error) {
        return reply.code(409).send({ error: (error as Error).message });
      }
    });

    app.post("/api/council/:id/stop", async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        runtime.stopCouncil(id);
        return reply.code(200).send({ status: "stop_requested" });
      } catch (error) {
        return reply.code(404).send({ error: (error as Error).message });
      }
    });

    app.post("/api/council/:id/approve", async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        runtime.setApproval(id, "approved");
        return reply.code(200).send({ status: "approved" });
      } catch (error) {
        return reply.code(409).send({ error: (error as Error).message });
      }
    });

    app.post("/api/council/:id/discard", async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        runtime.setApproval(id, "discarded");
        return reply.code(200).send({ status: "discarded" });
      } catch (error) {
        return reply.code(409).send({ error: (error as Error).message });
      }
    });
  };
}
