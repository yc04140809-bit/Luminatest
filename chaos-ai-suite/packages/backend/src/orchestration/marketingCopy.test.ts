import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_AGENTS } from "@chaos-ai-suite/shared";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { diagnoseMarketingCopy, generateMarketingCopy, reviseMarketingCopy } from "./marketingCopy.js";

const mirai = SEED_AGENTS.find((agent) => agent.id === "agent-mirai")!;

function stubLlm(response: Record<string, unknown>, capture?: { request?: ToolCallRequest }): LlmClient {
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      if (capture) capture.request = request;
      return response as T;
    },
  };
}

test("generateMarketingCopy uses ミライ's persona, normalizes output, and respects user 8-layer input", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(
    {
      targetReader: "既存アプリを壊すのが怖い初心者",
      writingGoal: "安全に改善できると伝える",
      hookPoints: ["同じ悩みを持つ読者の共感", "具体的な戻し方の提示"],
      eightLayers: {
        surfaceProblem: "Claude Codeを開いても指示が出せない",
        realScene: "画面を開いて閉じるだけになる",
        emotion: "焦り",
        hiddenTruth: "", // 欠けているキーは正規化で空文字になることを確認する
        futureIfIgnored: "別のツールを買い続ける",
        trueDesire: "今日中に1つ完成させたい",
        blockers: "難しそう",
        firstStep: "テンプレを1つコピーする",
      },
      finalCopy: "Claude Codeを開いたけど、既存アプリを壊しそうで指示できない。",
      cta: "詳しい内容は固定投稿にまとめています。",
    },
    capture,
  );

  const result = await generateMarketingCopy({
    marketer: mirai,
    request: {
      copyType: "threads",
      mode: "chaos_style",
      theme: "Claude Code初心者向け安全改良テンプレ",
      audience: "既存アプリを壊すのが怖くて改善できない初心者",
      audienceProblem: "Claude Codeを開いても指示が出せない",
      offer: "既存アプリを壊さない安全改良テンプレ集",
      eightLayers: { surfaceProblem: "Claude Codeを開いても指示が出せない" },
      experience: "アプリを壊すのが怖くて何度も作業を止めた",
    },
    llm,
  });

  assert.equal(result.eightLayers.hiddenTruth, "", "欠けているキーは空文字に正規化される");
  assert.equal(result.eightLayers.surfaceProblem, "Claude Codeを開いても指示が出せない");
  assert.equal(result.hookPoints.length, 2);
  assert.equal(capture.request!.systemPrompt, mirai.systemPrompt, "マーケティング人格はミライで行う");

  const prompt = capture.request!.userPrompt;
  assert.ok(prompt.includes("Claude Code初心者向け安全改良テンプレ"), "テーマが渡っている");
  assert.ok(prompt.includes("ユーザー入力・尊重する"), "ユーザー入力済みの8層項目は尊重する指示を含む");
  assert.ok(prompt.includes("AIが読者・テーマから自然に補完する"), "未入力の8層項目はAI補完する指示を含む");
  assert.ok(prompt.includes("誰でも必ず稼げる"), "NG表現の安全ルールを含む");
  assert.ok(prompt.includes("アプリを壊すのが怖くて何度も作業を止めた"), "体験談は任意情報として渡る");
});

test("generateMarketingCopy injects brandContext only when provided", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(
    {
      targetReader: "読者",
      writingGoal: "狙い",
      hookPoints: [],
      eightLayers: {},
      finalCopy: "完成文章",
      cta: "",
    },
    capture,
  );

  await generateMarketingCopy({
    marketer: mirai,
    request: {
      copyType: "profile",
      mode: "gentle",
      theme: "テーマ",
      audience: "読者",
      audienceProblem: "悩み",
      offer: "行動",
    },
    brandContext: "# ケイオス師匠ブランド設定（テスト用ダミー）",
    llm,
  });

  assert.ok(capture.request!.userPrompt.includes("# ケイオス師匠ブランド設定（テスト用ダミー）"));
});

test("reviseMarketingCopy passes the previous copy and edited 8-layer values, falls back eightLayers on missing keys", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(
    {
      targetReader: "読者",
      writingGoal: "狙い",
      hookPoints: ["ポイント1"],
      eightLayers: { surfaceProblem: "更新後の悩み" }, // 他のキーは欠けている
      finalCopy: "修正後の完成文章",
      cta: "",
    },
    capture,
  );

  const result = await reviseMarketingCopy({
    marketer: mirai,
    request: {
      copyType: "threads",
      mode: "deep",
      theme: "テーマ",
      audience: "読者",
      audienceProblem: "悩み",
      offer: "行動",
      previousCopy: "修正前の完成文章",
      eightLayers: {
        surfaceProblem: "元の悩み",
        realScene: "元の場面",
        emotion: "元の感情",
        hiddenTruth: "元の本音",
        futureIfIgnored: "元の未来",
        trueDesire: "元の願望",
        blockers: "元の理由",
        firstStep: "元の一歩",
      },
      instruction: "もっと深く刺す",
    },
    llm,
  });

  assert.equal(result.eightLayers.surfaceProblem, "更新後の悩み", "AIが更新した値を優先する");
  assert.equal(result.eightLayers.realScene, "元の場面", "AIが返さなかったキーは編集済みの値にフォールバックする");
  assert.equal(result.finalCopy, "修正後の完成文章");

  const prompt = capture.request!.userPrompt;
  assert.ok(prompt.includes("修正前の完成文章"), "直前の完成文章を渡している");
  assert.ok(prompt.includes("もっと深く刺す"), "修正指示を渡している");
  assert.ok(prompt.includes("元の場面"), "編集済みの8層分析を渡している");
});

test("diagnoseMarketingCopy clamps scores to 0-10 and sums to totalScore", async () => {
  const llm = stubLlm({
    scores: {
      audienceClarity: 8,
      sceneVividness: 7,
      emotionalResonance: 9,
      hiddenTruthDepth: 6,
      noBlame: 10,
      trueDesireClarity: 7,
      blockerResolution: 5,
      firstStepConcrete: 8,
      chaosStyle: 9,
      uniqueness: 999, // 範囲外の値は10にクランプされることを確認する
    },
    goodPoints: ["体験談が具体的"],
    problems: ["CTAがやや弱い"],
    priorityFixes: ["CTAを明確にする"],
    beforeAfter: { before: "元の一文", after: "改善後の一文" },
    improvedCopy: "改善版の完成文章",
    extraTip: "もう1つ具体例を足すとさらに刺さる",
  });

  const result = await diagnoseMarketingCopy({
    reviewer: mirai,
    request: {
      copyType: "threads",
      audience: "読者",
      audienceProblem: "悩み",
      finalCopy: "診断対象の文章",
    },
    llm,
  });

  assert.equal(result.scores.uniqueness, 10, "範囲外の点数は10にクランプされる");
  assert.equal(result.totalScore, 8 + 7 + 9 + 6 + 10 + 7 + 5 + 8 + 9 + 10, "10項目の合計がtotalScoreになる");
  assert.equal(result.improvedCopy, "改善版の完成文章");
  assert.equal(result.beforeAfter.after, "改善後の一文");
});
