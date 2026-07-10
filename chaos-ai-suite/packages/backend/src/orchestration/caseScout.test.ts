import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_AGENTS } from "@chaos-ai-suite/shared";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { analyzeScoutCase } from "./caseScout.js";

const sayla = SEED_AGENTS.find((agent) => agent.id === "agent-sayla")!;

function stubLlm(response: Record<string, unknown>, capture?: { request?: ToolCallRequest }): LlmClient {
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      if (capture) capture.request = request;
      return response as T;
    },
  };
}

/** 最低限の正常レスポンス。テストごとに上書きして使う。 */
function baseResponse(): Record<string, unknown> {
  return {
    decision: "circle",
    summary: "受注候補です。",
    purpose: "note記事の作成",
    deliverables: ["記事1本"],
    mustConditions: ["3000字以上"],
    requiredSkills: ["文章作成"],
    reasons: ["得意領域である"],
    strengths: ["AI社員で対応可能"],
    difficulties: [],
    missingInformation: ["修正回数"],
    failureRisks: [],
    overlookedConditions: [],
    preconditions: [],
    risks: [],
    specialistWarning: false,
    specialistWarningDetail: "",
    estimatedMinutes: 90,
    estimatedRevisionMinutes: 30,
    estimatedAiCost: 150,
    instantDeliveryLevel: "h24",
    availableAgents: [
      { agentId: "agent-nemuri", role: "本文執筆" },
      { agentId: "agent-unknown", role: "存在しない社員" },
    ],
    missingRoles: [],
    humanChecks: ["最終確認"],
    externalTools: [],
    selfContained: true,
    workflow: [
      { title: "要件確認", agentId: "agent-sayla", description: "条件整理", estimatedMinutes: 20, completionCriteria: "条件一覧", humanCheck: true },
      { title: "執筆", agentId: "agent-ghost", description: "本文作成", estimatedMinutes: 60, completionCriteria: "初稿", humanCheck: false },
    ],
    applicationMessages: { polite: "丁寧文", beginnerFriendly: "初心者文", short: "短文", highValue: "高単価文" },
    clientQuestions: { polite: "丁寧質問", short: "短質問", friendly: "親しみ質問" },
  };
}

test("analyzeScoutCase passes through a valid analysis and filters unknown agent ids", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(baseResponse(), capture);

  const result = await analyzeScoutCase({
    agent: sayla,
    title: "note記事作成の募集",
    body: "3000字のnote記事を1本お願いします。予算5000円。",
    price: 5000,
    source: "ココナラ",
    roster: SEED_AGENTS,
    llm,
  });

  assert.equal(result.decision, "circle");
  assert.equal(result.instantDeliveryLevel, "h24");
  assert.equal(result.availableAgents.length, 1, "名簿に無いagentIdは除外される");
  assert.equal(result.availableAgents[0]!.agentId, "agent-nemuri");
  assert.equal(result.workflow.length, 2);
  assert.equal(result.workflow[0]!.agentId, "agent-sayla");
  assert.equal(result.workflow[1]!.agentId, "", "名簿に無い工程担当は空文字にする");
  assert.equal(result.applicationMessages.polite, "丁寧文");
  assert.equal(capture.request!.systemPrompt, sayla.systemPrompt, "審査はセイラの人格で行う");
  assert.ok(capture.request!.userPrompt.includes("募集価格: 5000円"));
});

test("analyzeScoutCase falls back to triangle / after_check on invalid enum values", async () => {
  const llm = stubLlm({
    ...baseResponse(),
    decision: "maybe",
    instantDeliveryLevel: "someday",
  });

  const result = await analyzeScoutCase({
    agent: sayla,
    title: "",
    body: "案件本文",
    roster: SEED_AGENTS,
    llm,
  });

  assert.equal(result.decision, "triangle", "不明な判定は安全側の△に倒す");
  assert.equal(result.instantDeliveryLevel, "after_check", "不明な即納レベルは追加確認後に倒す");
});

test("analyzeScoutCase prompt enforces no-fabrication rules and includes the roster", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(baseResponse(), capture);

  await analyzeScoutCase({ agent: sayla, title: "テスト", body: "本文", roster: SEED_AGENTS, llm });

  const prompt = capture.request!.userPrompt;
  assert.ok(prompt.includes("虚偽表現は禁止"), "応募文の虚偽実績禁止ルールを含む");
  assert.ok(prompt.includes("推測で確定しない"), "推測禁止ルールを含む");
  assert.ok(prompt.includes("募集価格: 未確認"), "価格未入力は未確認として渡す");
  assert.ok(prompt.includes("agent-nemuri"), "AI社員名簿を含む");
  assert.equal(capture.request!.toolName, "submit_scout_analysis");
});

test("analyzeScoutCase normalizes missing fields with safe defaults", async () => {
  const llm = stubLlm({ decision: "cross" });

  const result = await analyzeScoutCase({ agent: sayla, title: "", body: "本文", roster: SEED_AGENTS, llm });

  assert.equal(result.decision, "cross");
  assert.equal(result.purpose, "未確認");
  assert.deepEqual(result.deliverables, []);
  assert.equal(result.specialistWarning, false);
  assert.equal(result.estimatedMinutes, 60, "制作時間の欠損は既定値");
  assert.deepEqual(result.workflow, []);
  assert.equal(result.applicationMessages.short, "");
  assert.equal(result.clientQuestions.friendly, "");
});
