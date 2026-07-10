import type { FastifyInstance, FastifyReply } from "fastify";
import { TREND_LENGTHS, TREND_PERIODS, type Agent, type TrendSource, type TrendTheme } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";
import type { LlmClient } from "../orchestration/llmClient.js";
import { generateTrendArticle, researchTrendTopics } from "../orchestration/trendNote.js";

/**
 * トレンドnote生成AIのエンドポイント。
 * research = Web検索つき1回呼び出し（担当ミライ） / generate = 記事一式1回呼び出し（担当ネムリ）。
 * 生成履歴はフロント側(localStorage)に保存され、サーバーには残らない。
 */

function pickAgent(preferredId: string | undefined, reply: FastifyReply): Agent | undefined {
  if (preferredId) {
    const preferred = officeStore.getAgent(preferredId);
    if (preferred?.enabled) return preferred;
  }
  const fallback = officeStore.listAgents().find((agent) => agent.enabled);
  if (!fallback) {
    void reply.code(500).send({ error: "稼働中のAI社員がいません。設定画面のAI社員管理で有効な社員を用意してください。" });
    return undefined;
  }
  return fallback;
}

async function withAgentStatus<T>(agent: Agent, summary: string, run: () => Promise<T>): Promise<T> {
  officeStore.setAgentStatus(agent.id, { status: "writing", currentTaskSummary: summary });
  try {
    return await run();
  } finally {
    officeStore.setAgentStatus(agent.id, { status: "standby", currentTaskSummary: undefined });
  }
}

export function trendRoutes(llm: LlmClient) {
  return async function registerTrendRoutes(app: FastifyInstance): Promise<void> {
    app.post("/api/trend/research", async (request, reply) => {
      const body = (request.body ?? {}) as { genre?: string; audience?: string; period?: string };
      if (!body.genre?.trim()) return reply.code(400).send({ error: "ジャンルを選択または入力してください。" });
      if (!body.audience?.trim()) return reply.code(400).send({ error: "読者を選択してください。" });
      const period = TREND_PERIODS.find((entry) => entry.id === body.period) ?? TREND_PERIODS[1];
      const agent = pickAgent("agent-mirai", reply);
      if (!agent) return;
      try {
        return await withAgentStatus(agent, "最新トレンドを調査中...", () =>
          researchTrendTopics({
            agent,
            genre: body.genre!.trim().slice(0, 100),
            audience: body.audience!.trim().slice(0, 50),
            periodLabel: period.label,
            llm,
          }),
        );
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      }
    });

    app.post("/api/trend/generate", async (request, reply) => {
      const body = (request.body ?? {}) as {
        theme?: TrendTheme;
        sources?: TrendSource[];
        researchDate?: string;
        genre?: string;
        audience?: string;
        format?: string;
        length?: string;
        style?: string;
      };
      if (!body.theme?.title || !Array.isArray(body.sources) || body.sources.length === 0) {
        return reply.code(400).send({ error: "先に調査を実行してテーマを選択してください。" });
      }
      const length = TREND_LENGTHS.find((entry) => entry.id === body.length) ?? TREND_LENGTHS[1];
      const agent = pickAgent("agent-nemuri", reply);
      if (!agent) return;
      try {
        return await withAgentStatus(agent, "トレンドnote記事を作成中...", () =>
          generateTrendArticle({
            agent,
            theme: body.theme!,
            sources: body.sources!.slice(0, 15),
            researchDate: body.researchDate?.trim() || new Date().toISOString().slice(0, 10),
            genre: body.genre?.trim() || "AI",
            audience: body.audience?.trim() || "AI初心者",
            format: body.format?.trim() || "初心者向け解説",
            lengthChars: length.chars,
            style: body.style?.trim() || "親しみやすい",
            llm,
          }),
        );
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      }
    });
  };
}
