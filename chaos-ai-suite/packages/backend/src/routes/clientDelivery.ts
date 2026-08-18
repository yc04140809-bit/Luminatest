import type { FastifyInstance, FastifyReply } from "fastify";
import {
  estimateCostUsd,
  type Agent,
  type AiUsageRecord,
  type AuditLogEntry,
  type ClientProjectDraft,
  type HumanDecisionEntry,
  type ImplementationSpec,
  type InterviewEntry,
  type MvpApprovalStatus,
} from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";
import type { LlmClient } from "../orchestration/llmClient.js";
import {
  buildSpecDocument,
  classifyAutomation,
  generateAnalysis,
  generateImplementationSpecContent,
  generateMvpProposals,
  runInterviewStep,
} from "../orchestration/clientDelivery.js";

/** 入力上限。暴走コスト・不正な巨大入力を防ぐ（既存のAI会議モード等と同じ考え方）。 */
const MAX_TEXT_LENGTH = 4000;

const INTERVIEWER_ID = "agent-sayla";
const ANALYST_ID = "agent-sayla";
const AUTOMATION_JUDGE_ID = "agent-levi";
const MVP_PLANNER_ID = "agent-sayla";
const SPEC_GENERATOR_ID = "agent-levi";

function requiredAgent(id: string, reply: FastifyReply): Agent | undefined {
  const agent = officeStore.getAgent(id);
  if (!agent || !agent.enabled) {
    void reply.code(500).send({ error: `必要なAI社員（${id}）が見つからないか無効化されています。エージェント構成を確認してください。` });
    return undefined;
  }
  return agent;
}

async function withAgentStatus<T>(agent: Agent, summary: string, run: () => Promise<T>): Promise<T> {
  officeStore.setAgentStatus(agent.id, { status: "writing", currentTaskSummary: summary });
  try {
    return await run();
  } finally {
    officeStore.setAgentStatus(agent.id, { status: "standby", currentTaskSummary: undefined });
  }
}

function addAudit(projectId: string, event: AuditLogEntry["event"], detail: string): void {
  const project = officeStore.getClientProject(projectId);
  if (!project) return;
  officeStore.updateClientProject(projectId, {
    auditLog: [...project.auditLog, { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, event, detail, createdAt: new Date().toISOString() }],
  });
}

function addUsage(projectId: string, record: Omit<AiUsageRecord, "projectId" | "timestamp">): void {
  const project = officeStore.getClientProject(projectId);
  if (!project) return;
  officeStore.updateClientProject(projectId, {
    usageLog: [...project.usageLog, { ...record, projectId, timestamp: new Date().toISOString() }],
  });
}

function usageCallback(projectId: string, model: string, taskType: string) {
  return (usage: { inputTokens: number; outputTokens: number }) => {
    addUsage(projectId, {
      provider: "anthropic",
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: estimateCostUsd(model, usage.inputTokens, usage.outputTokens),
      taskType,
    });
  };
}

/** AIエラーをそのまま画面へ出さず、日本語の一般向けメッセージへ変換する（secrets・stack traceを露出させない）。 */
function friendlyErrorMessage(error: unknown): string {
  const message = (error as Error)?.message ?? "";
  if (message.includes("ANTHROPIC_API_KEY")) return "AI呼び出しの設定（APIキー）が未設定です。設定画面から登録してください。";
  return "AI処理中にエラーが発生しました。時間をおいてもう一度お試しください（案件データは失われていません）。";
}

export function clientDeliveryRoutes(llm: LlmClient) {
  return async function registerClientDeliveryRoutes(app: FastifyInstance): Promise<void> {
    app.get("/api/client-projects", async () => {
      return officeStore.listClientProjects();
    });

    app.get("/api/client-projects/:id", async (request, reply) => {
      const { id } = request.params as { id: string };
      const project = officeStore.getClientProject(id);
      if (!project) return reply.code(404).send({ error: "project not found" });
      return project;
    });

    app.post("/api/client-projects", async (request, reply) => {
      const body = (request.body ?? {}) as Partial<ClientProjectDraft>;
      if (!body.name?.trim()) return reply.code(400).send({ error: "案件名を入力してください" });
      if ([body.name, body.clientName, body.industry, body.contactName, body.contactNote, body.memo].some((v) => (v?.length ?? 0) > MAX_TEXT_LENGTH)) {
        return reply.code(400).send({ error: `各項目は${MAX_TEXT_LENGTH}字以内にしてください` });
      }
      const project = officeStore.createClientProject({
        name: body.name.trim(),
        clientName: body.clientName?.trim() ?? "",
        industry: body.industry?.trim() ?? "",
        contactName: body.contactName?.trim() ?? "",
        contactNote: body.contactNote?.trim() ?? "",
        memo: body.memo?.trim() ?? "",
      });
      return reply.code(201).send(project);
    });

    // --- ヒアリング ---
    app.post("/api/client-projects/:id/interview/answer", async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { question?: string; answer?: string };
      const project = officeStore.getClientProject(id);
      if (!project) return reply.code(404).send({ error: "project not found" });
      if (!body.question?.trim() || !body.answer?.trim()) return reply.code(400).send({ error: "質問・回答を入力してください" });
      if (body.answer.length > MAX_TEXT_LENGTH) return reply.code(400).send({ error: `回答は${MAX_TEXT_LENGTH}字以内にしてください` });

      const agent = requiredAgent(INTERVIEWER_ID, reply);
      if (!agent) return;

      try {
        const step = await withAgentStatus(agent, "ヒアリング中...", () =>
          runInterviewStep({
            memo: project.memo,
            previousEntries: project.interviews,
            question: body.question!.trim(),
            answer: body.answer!.trim(),
            agent,
            llm,
            onUsage: usageCallback(id, agent.model.model, "interview"),
          }),
        );

        const entry: InterviewEntry = {
          id: `interview-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          question: body.question!.trim(),
          answer: body.answer!.trim(),
          category: step.category,
          createdAt: new Date().toISOString(),
        };

        const updated = officeStore.updateClientProject(id, {
          status: "INTERVIEW",
          interviews: [...project.interviews, entry],
          nextQuestion: step.interviewComplete ? undefined : step.nextQuestion,
          interviewComplete: step.interviewComplete,
          interviewCoverage: step.coverage,
        });
        if (step.interviewComplete) addAudit(id, "interview_completed", "AIの判断によりヒアリングが完了候補になりました。");
        return updated;
      } catch (error) {
        return reply.code(502).send({ error: friendlyErrorMessage(error) });
      }
    });

    app.post("/api/client-projects/:id/interview/complete", async (request, reply) => {
      const { id } = request.params as { id: string };
      const project = officeStore.getClientProject(id);
      if (!project) return reply.code(404).send({ error: "project not found" });
      addAudit(id, "interview_completed", "代表の操作によりヒアリングを完了しました。");
      return officeStore.updateClientProject(id, { interviewComplete: true, nextQuestion: undefined });
    });

    // --- 分析 ---
    app.post("/api/client-projects/:id/analysis", async (request, reply) => {
      const { id } = request.params as { id: string };
      const project = officeStore.getClientProject(id);
      if (!project) return reply.code(404).send({ error: "project not found" });
      if (project.interviews.length === 0) return reply.code(409).send({ error: "先にヒアリングを行ってください" });

      const agent = requiredAgent(ANALYST_ID, reply);
      if (!agent) return;

      try {
        officeStore.updateClientProject(id, { status: "ANALYSIS" });
        const analysis = await withAgentStatus(agent, "案件分析中...", () =>
          generateAnalysis({ memo: project.memo, entries: project.interviews, agent, llm, onUsage: usageCallback(id, agent.model.model, "analysis") }),
        );
        addAudit(id, "analysis_generated", `リスクレベル: ${analysis.riskLevel}`);
        return officeStore.updateClientProject(id, { status: "AUTOMATION_CLASSIFICATION", analysis, riskLevel: analysis.riskLevel });
      } catch (error) {
        officeStore.updateClientProject(id, { errorMessage: friendlyErrorMessage(error) });
        return reply.code(502).send({ error: friendlyErrorMessage(error) });
      }
    });

    // --- 自動化判定 ---
    app.post("/api/client-projects/:id/automation", async (request, reply) => {
      const { id } = request.params as { id: string };
      const project = officeStore.getClientProject(id);
      if (!project) return reply.code(404).send({ error: "project not found" });
      if (!project.analysis) return reply.code(409).send({ error: "先に分析を生成してください" });

      const agent = requiredAgent(AUTOMATION_JUDGE_ID, reply);
      if (!agent) return;

      try {
        const candidates = await withAgentStatus(agent, "自動化判定中...", () =>
          classifyAutomation({ analysis: project.analysis!, agent, llm, onUsage: usageCallback(id, agent.model.model, "automation") }),
        );
        return officeStore.updateClientProject(id, { status: "MVP_PROPOSAL", automationCandidates: candidates });
      } catch (error) {
        return reply.code(502).send({ error: friendlyErrorMessage(error) });
      }
    });

    // --- MVP提案 ---
    app.post("/api/client-projects/:id/mvp", async (request, reply) => {
      const { id } = request.params as { id: string };
      const project = officeStore.getClientProject(id);
      if (!project) return reply.code(404).send({ error: "project not found" });
      if (!project.analysis) return reply.code(409).send({ error: "先に分析を生成してください" });

      const agent = requiredAgent(MVP_PLANNER_ID, reply);
      if (!agent) return;

      try {
        const proposals = await withAgentStatus(agent, "MVP企画中...", () =>
          generateMvpProposals({
            analysis: project.analysis!,
            automationCandidates: project.automationCandidates,
            agent,
            llm,
            onUsage: usageCallback(id, agent.model.model, "mvp_proposal"),
          }),
        );
        addAudit(id, "mvp_proposed", `MVP候補${proposals.length}件を生成しました。`);
        return officeStore.updateClientProject(id, { status: "WAITING_MVP_APPROVAL", mvpProposals: proposals, mvpApproval: undefined });
      } catch (error) {
        return reply.code(502).send({ error: friendlyErrorMessage(error) });
      }
    });

    // --- 人間によるMVP承認（承認/修正依頼/再提案依頼/保留のいずれも人間操作のみ） ---
    app.post("/api/client-projects/:id/mvp/approve", async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { mvpProposalId?: string; status?: MvpApprovalStatus; note?: string; approvedBy?: string };
      const project = officeStore.getClientProject(id);
      if (!project) return reply.code(404).send({ error: "project not found" });
      const validStatuses: MvpApprovalStatus[] = ["approved", "modify_requested", "re_proposal_requested", "on_hold"];
      if (!body.status || !validStatuses.includes(body.status)) return reply.code(400).send({ error: "判断の種類が不正です" });
      const selected = project.mvpProposals.find((p) => p.id === body.mvpProposalId);
      if (body.status === "approved" && !selected) return reply.code(400).send({ error: "承認対象のMVPが見つかりません" });

      const approval = {
        id: `mvp-approval-${Date.now()}`,
        mvpProposalId: body.mvpProposalId ?? "",
        status: body.status,
        approvedBy: body.approvedBy?.trim() || "代表",
        approvedAt: new Date().toISOString(),
        note: body.note?.trim() ?? "",
      };

      const decisionLog: HumanDecisionEntry[] = [...project.decisionLog];
      const recommended = project.mvpProposals.find((p) => p.isRecommended);
      if (selected && recommended && selected.id !== recommended.id) {
        decisionLog.push({
          id: `decision-${Date.now()}`,
          aiRecommendation: `${recommended.label}: ${recommended.title}`,
          humanDecision: `${selected.label}: ${selected.title}`,
          reason: approval.note || "（理由未記入）",
          createdAt: new Date().toISOString(),
        });
      }

      const nextStatus = body.status === "approved" ? "MVP_APPROVED" : "WAITING_MVP_APPROVAL";
      if (body.status === "approved") addAudit(id, "mvp_approved", `${selected?.label ?? ""}: ${selected?.title ?? ""} を承認しました。`);
      else addAudit(id, "mvp_approved", `判断: ${body.status}${approval.note ? `（${approval.note}）` : ""}`);

      return officeStore.updateClientProject(id, { status: nextStatus, mvpApproval: approval, decisionLog });
    });

    // --- 実装指示書生成（MVP承認済みでなければ拒否。バージョンを重ねて保存） ---
    app.post("/api/client-projects/:id/spec", async (request, reply) => {
      const { id } = request.params as { id: string };
      const project = officeStore.getClientProject(id);
      if (!project) return reply.code(404).send({ error: "project not found" });
      if (!project.analysis) return reply.code(409).send({ error: "先に分析を生成してください" });
      if (!project.mvpApproval || project.mvpApproval.status !== "approved") {
        return reply.code(409).send({ error: "MVPが承認されるまで実装指示書は生成できません。" });
      }
      const mvp = project.mvpProposals.find((p) => p.id === project.mvpApproval!.mvpProposalId);
      if (!mvp) return reply.code(409).send({ error: "承認されたMVPが見つかりません。" });

      const agent = requiredAgent(SPEC_GENERATOR_ID, reply);
      if (!agent) return;

      try {
        officeStore.updateClientProject(id, { status: "IMPLEMENTATION_SPEC_GENERATION" });
        const aiContent = await withAgentStatus(agent, "実装指示書を作成中...", () =>
          generateImplementationSpecContent({
            analysis: project.analysis!,
            mvp,
            projectName: project.name,
            agent,
            llm,
            onUsage: usageCallback(id, agent.model.model, "implementation_spec"),
          }),
        );
        const content = buildSpecDocument(aiContent, project.name);
        const spec: ImplementationSpec = {
          id: `spec-${Date.now()}`,
          version: project.implementationSpecs.length + 1,
          content,
          generatedAt: new Date().toISOString(),
        };
        addAudit(id, "implementation_spec_generated", `バージョンv${spec.version}を生成しました。`);
        return officeStore.updateClientProject(id, {
          status: "READY_FOR_BUILD",
          implementationSpecs: [...project.implementationSpecs, spec],
        });
      } catch (error) {
        officeStore.updateClientProject(id, { status: "MVP_APPROVED", errorMessage: friendlyErrorMessage(error) });
        return reply.code(502).send({ error: friendlyErrorMessage(error) });
      }
    });
  };
}
