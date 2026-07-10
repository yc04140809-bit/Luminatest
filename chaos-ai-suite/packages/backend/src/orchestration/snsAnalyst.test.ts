import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_AGENTS, SNS_SCORE_KEYS } from "@chaos-ai-suite/shared";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { analyzeSnsPost } from "./snsAnalyst.js";

const mirai = SEED_AGENTS.find((agent) => agent.id === "agent-mirai")!;

function stubLlm(response: Record<string, unknown>, capture?: { request?: ToolCallRequest }): LlmClient {
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      if (capture) capture.request = request;
      return response as T;
    },
  };
}

function fullScores(value: number): Record<string, number> {
  return Object.fromEntries(SNS_SCORE_KEYS.map((key) => [key, value]));
}

test("analyzeSnsPost sums 10 scores into totalScore and passes metrics into the prompt", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(
    {
      scores: fullScores(7),
      strengths: ["フックが強い"],
      improvements: ["CTAが弱い"],
      rewrite: "リライト済み本文",
      summary: "総評です。",
    },
    capture,
  );

  const result = await analyzeSnsPost({
    analyst: mirai,
    content: "テスト投稿本文",
    platform: "Threads",
    metrics: { views: 1000, likes: 50, saves: 10 },
    llm,
  });

  assert.equal(result.totalScore, 70);
  assert.equal(result.scores.hook, 7);
  assert.equal(result.rewrite, "リライト済み本文");
  assert.ok(capture.request!.userPrompt.includes("閲覧数: 1000"));
  assert.ok(capture.request!.userPrompt.includes("いいね率: 5.00%"), "views>0なら参考レートを添える");
  assert.equal(capture.request!.systemPrompt, mirai.systemPrompt, "分析はミライの人格で行う");
});

test("analyzeSnsPost clamps out-of-range or missing scores into 0..10", async () => {
  const llm = stubLlm({
    scores: { ...fullScores(5), hook: 99, empathy: -3, cta: undefined },
    strengths: [],
    improvements: [],
    rewrite: "",
    summary: "",
  });

  const result = await analyzeSnsPost({
    analyst: mirai,
    content: "本文",
    platform: "X",
    metrics: {},
    llm,
  });

  assert.equal(result.scores.hook, 10, "上限10でクランプ");
  assert.equal(result.scores.empathy, 0, "下限0でクランプ");
  assert.equal(result.scores.cta, 0, "欠損は0扱い");
});

test("analyzeSnsPost marks metrics-less input as a pre-post diagnosis", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(
    { scores: fullScores(5), strengths: [], improvements: [], rewrite: "", summary: "" },
    capture,
  );

  await analyzeSnsPost({ analyst: mirai, content: "本文", platform: "note", metrics: {}, llm });

  assert.ok(capture.request!.userPrompt.includes("実績データ未入力"));
});
