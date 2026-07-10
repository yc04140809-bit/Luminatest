import type { FastifyInstance, FastifyReply } from "fastify";
import type { Agent } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";
import type { LlmClient } from "../orchestration/llmClient.js";
import {
  checkCaseQuality,
  generateCaseDeliverable,
  generateCaseTasks,
  generateClientQuestions,
  generateDeliveryPack,
  organizeCaseRequirements,
} from "../orchestration/caseWorkshop.js";
import { analyzeScoutCase } from "../orchestration/caseScout.js";

const MAX_TEXT_LENGTH = 20000;

/**
 * 希望する担当AI社員を取得する。削除されている場合は稼働中の社員へフォールバックし、
 * 1人もいない場合のみエラーにする（AI社員の追加・削除に依存しない）。
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

/** 案件工房のAIエンドポイント群。案件データ自体はフロント側(localStorage)に保存される。 */
export function caseRoutes(llm: LlmClient) {
  return async function registerCaseRoutes(app: FastifyInstance): Promise<void> {
    app.post("/api/cases/requirements", async (request, reply) => {
      const body = (request.body ?? {}) as { requestText?: string };
      if (!body.requestText?.trim()) return reply.code(400).send({ error: "requestText is required" });
      if (body.requestText.length > MAX_TEXT_LENGTH) return reply.code(400).send({ error: "依頼文が長すぎます（2万字以内にしてください）" });
      const agent = pickAgent("agent-sayla", reply);
      if (!agent) return;
      try {
        return await withAgentStatus(agent, "案件の要件を整理中...", () =>
          organizeCaseRequirements({ agent, requestText: body.requestText!.trim(), llm }),
        );
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      }
    });

    app.post("/api/cases/scout", async (request, reply) => {
      const body = (request.body ?? {}) as {
        title?: string;
        body?: string;
        price?: number;
        applyDeadline?: string;
        deliveryDeadline?: string;
        source?: string;
        category?: string;
      };
      if (!body.body?.trim()) {
        return reply.code(400).send({ error: "案件内容が入力されていません。募集文または依頼文を貼り付けてください。" });
      }
      if (body.body.length > MAX_TEXT_LENGTH) {
        return reply.code(400).send({ error: `案件本文が長すぎます（${MAX_TEXT_LENGTH}字以内にしてください）` });
      }
      const agent = pickAgent("agent-sayla", reply);
      if (!agent) return;
      try {
        return await withAgentStatus(agent, "募集案件を審査中...", () =>
          analyzeScoutCase({
            agent,
            title: body.title?.trim() ?? "",
            body: body.body!.trim(),
            price: typeof body.price === "number" && Number.isFinite(body.price) ? body.price : undefined,
            applyDeadline: body.applyDeadline,
            deliveryDeadline: body.deliveryDeadline,
            source: body.source,
            category: body.category,
            roster: officeStore.listAgents(),
            llm,
          }),
        );
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      }
    });

    app.post("/api/cases/questions", async (request, reply) => {
      const body = (request.body ?? {}) as { missingInfo?: string[]; questions?: string[] };
      const agent = pickAgent("agent-nemuri", reply);
      if (!agent) return;
      try {
        return await withAgentStatus(agent, "クライアント確認文を作成中...", () =>
          generateClientQuestions({
            agent,
            missingInfo: Array.isArray(body.missingInfo) ? body.missingInfo : [],
            questions: Array.isArray(body.questions) ? body.questions : [],
            llm,
          }),
        );
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      }
    });

    app.post("/api/cases/tasks", async (request, reply) => {
      const body = (request.body ?? {}) as { requirementsText?: string };
      if (!body.requirementsText?.trim()) return reply.code(400).send({ error: "requirementsText is required" });
      const agent = pickAgent("agent-levi", reply);
      if (!agent) return;
      try {
        const tasks = await withAgentStatus(agent, "作業工程を分解中...", () =>
          generateCaseTasks({ agent, requirementsText: body.requirementsText!.trim(), roster: officeStore.listAgents(), llm }),
        );
        return { tasks };
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      }
    });

    app.post("/api/cases/deliverable", async (request, reply) => {
      const body = (request.body ?? {}) as {
        agentId?: string;
        caseTitle?: string;
        requirementsText?: string;
        taskTitle?: string;
        taskDescription?: string;
        completionCriteria?: string;
        currentDraft?: string;
        instruction?: string;
      };
      if (!body.taskTitle?.trim()) return reply.code(400).send({ error: "taskTitle is required" });
      const agent = pickAgent(body.agentId, reply);
      if (!agent) return;
      try {
        return await withAgentStatus(agent, `「${body.taskTitle}」の成果物を作成中...`, () =>
          generateCaseDeliverable({
            agent,
            caseTitle: body.caseTitle?.trim() || "無題の案件",
            requirementsText: body.requirementsText?.trim() || "（要件整理は未実施。工程の作業内容に従うこと）",
            taskTitle: body.taskTitle!.trim(),
            taskDescription: body.taskDescription?.trim() || "",
            completionCriteria: body.completionCriteria?.trim() || "",
            currentDraft: body.currentDraft,
            instruction: body.instruction?.trim().slice(0, 200),
            llm,
          }),
        );
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      }
    });

    app.post("/api/cases/quality", async (request, reply) => {
      const body = (request.body ?? {}) as { requirementsText?: string; deliverablesText?: string };
      if (!body.deliverablesText?.trim()) return reply.code(400).send({ error: "deliverablesText is required" });
      const agent = pickAgent("agent-chaos", reply);
      if (!agent) return;
      try {
        return await withAgentStatus(agent, "納品前の品質チェック中...", () =>
          checkCaseQuality({
            agent,
            requirementsText: body.requirementsText?.trim() || "（要件整理は未実施）",
            deliverablesText: body.deliverablesText!.trim().slice(0, MAX_TEXT_LENGTH),
            llm,
          }),
        );
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      }
    });

    app.post("/api/cases/delivery-pack", async (request, reply) => {
      const body = (request.body ?? {}) as { caseTitle?: string; clientName?: string; deliverablesSummary?: string };
      if (!body.deliverablesSummary?.trim()) return reply.code(400).send({ error: "deliverablesSummary is required" });
      const agent = pickAgent("agent-nemuri", reply);
      if (!agent) return;
      try {
        return await withAgentStatus(agent, "納品パックを作成中...", () =>
          generateDeliveryPack({
            agent,
            caseTitle: body.caseTitle?.trim() || "無題の案件",
            clientName: body.clientName?.trim() || "",
            deliverablesSummary: body.deliverablesSummary!.trim().slice(0, MAX_TEXT_LENGTH),
            llm,
          }),
        );
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      }
    });
  };
}
