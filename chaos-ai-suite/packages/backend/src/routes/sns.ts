import type { FastifyInstance } from "fastify";
import type { SnsMetrics } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";
import type { LlmClient } from "../orchestration/llmClient.js";
import { analyzeSnsPost } from "../orchestration/snsAnalyst.js";

const ANALYST_AGENT_ID = "agent-mirai";

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

/**
 * SNS分析AI系のエンドポイント。MVPは分析1本のみ。
 * 将来のAI社員（トレンド分析・投稿生成・A/Bテスト・note導線・データ分析）も
 * この /api/sns/* 配下にエンドポイントを追加していく。
 */
export function snsRoutes(llm: LlmClient) {
  return async function registerSnsRoutes(app: FastifyInstance): Promise<void> {
    app.post("/api/sns/analyze", async (request, reply) => {
      const body = (request.body ?? {}) as {
        content?: string;
        platform?: string;
        metrics?: Record<string, unknown>;
      };
      if (!body.content?.trim()) {
        return reply.code(400).send({ error: "content is required" });
      }
      const analyst = officeStore.getAgent(ANALYST_AGENT_ID);
      if (!analyst) {
        return reply.code(500).send({ error: "SNS分析担当のAI社員（ミライ）が見つかりません。エージェント構成を確認してください。" });
      }

      const metrics: SnsMetrics = {
        views: toNumberOrUndefined(body.metrics?.views),
        likes: toNumberOrUndefined(body.metrics?.likes),
        replies: toNumberOrUndefined(body.metrics?.replies),
        saves: toNumberOrUndefined(body.metrics?.saves),
        clicks: toNumberOrUndefined(body.metrics?.clicks),
      };

      officeStore.setAgentStatus(analyst.id, { status: "thinking", currentTaskSummary: "SNS投稿を分析中..." });
      try {
        const result = await analyzeSnsPost({
          analyst,
          content: body.content.trim(),
          platform: body.platform?.trim() || "その他",
          metrics,
          llm,
        });
        officeStore.postMessage({
          channel: "general",
          fromAgentId: analyst.id,
          type: "status_update",
          content: `SNS分析が完了したよ！総合スコアは ${result.totalScore}/100点。詳しくはSNS分析ラボを見てね！`,
        });
        return result;
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      } finally {
        officeStore.setAgentStatus(analyst.id, { status: "standby", currentTaskSummary: undefined });
      }
    });
  };
}
