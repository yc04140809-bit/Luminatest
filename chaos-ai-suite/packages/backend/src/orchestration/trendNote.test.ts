import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_AGENTS } from "@chaos-ai-suite/shared";
import type { LlmClient, ToolCallRequest, WebSearchToolCallRequest } from "./llmClient.js";
import { generateTrendArticle, researchTrendTopics } from "./trendNote.js";

const mirai = SEED_AGENTS.find((agent) => agent.id === "agent-mirai")!;
const nemuri = SEED_AGENTS.find((agent) => agent.id === "agent-nemuri")!;

function stubLlm(
  response: Record<string, unknown>,
  capture?: { request?: ToolCallRequest; searchRequest?: WebSearchToolCallRequest },
): LlmClient {
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      if (capture) capture.request = request;
      return response as T;
    },
    async callToolWithWebSearch<T>(request: WebSearchToolCallRequest): Promise<T> {
      if (capture) capture.searchRequest = request;
      return response as T;
    },
  };
}

function themeStub(title: string): Record<string, unknown> {
  return {
    title,
    reason: "複数メディアで話題",
    targetReader: "AI初心者",
    angle: "初心者向け解説",
    searchKeywords: ["AI", "最新"],
    freshness: "high",
    demand: "mid",
    beginnerFit: "high",
    writability: "high",
    monetizeFit: "mid",
    totalScore: 82,
    cautions: ["料金は変わる可能性あり"],
  };
}

function sourceStub(title: string): Record<string, unknown> {
  return {
    title,
    url: `https://example.com/${title}`,
    sourceName: "Example News",
    publishedAt: "2026-07-09",
    summary: "要点",
    platform: "ニュース",
    searchKeyword: "AI 最新",
    reliability: "high",
  };
}

test("researchTrendTopics uses web search call and normalizes levels/scores", async () => {
  const capture: { searchRequest?: WebSearchToolCallRequest } = {};
  const llm = stubLlm(
    {
      themes: [
        themeStub("テーマ1"),
        { ...themeStub("テーマ2"), demand: "とても高い", totalScore: 250 }, // 不正値
        themeStub("テーマ3"),
      ],
      sources: [sourceStub("a"), { ...sourceStub("b"), publishedAt: "", reliability: "unknown" }],
      notes: ["単一情報源の話題を含む"],
    },
    capture,
  );

  const result = await researchTrendTopics({ agent: mirai, genre: "AI", audience: "AI初心者", periodLabel: "過去7日間", llm });

  assert.equal(result.themes.length, 3);
  assert.equal(result.themes[1]!.demand, "mid", "不正な相対評価はmidへフォールバック");
  assert.equal(result.themes[1]!.totalScore, 100, "スコアは0〜100にクランプ");
  assert.equal(result.sources[1]!.publishedAt, "不明", "公開日欠損は「不明」");
  assert.equal(result.sources[1]!.reliability, "mid");
  assert.ok(result.sources[0]!.retrievedAt, "取得日時が付与される");
  assert.equal(result.researchDate, new Date().toISOString().slice(0, 10));
  assert.equal(capture.searchRequest!.maxSearches, 5, "検索回数は上限つき");
  assert.equal(capture.searchRequest!.systemPrompt, mirai.systemPrompt, "リサーチはミライの人格で行う");
  assert.ok(capture.searchRequest!.userPrompt.includes("事実として書かない"), "情報源にない事実の禁止ルールを含む");
  assert.ok(capture.searchRequest!.userPrompt.includes("相対評価にする"), "数値を推測しないルールを含む");
});

test("researchTrendTopics stops when sources are insufficient", async () => {
  const llm = stubLlm({ themes: [themeStub("t1"), themeStub("t2"), themeStub("t3")], sources: [sourceStub("only-one")], notes: [] });
  await assert.rejects(
    researchTrendTopics({ agent: mirai, genre: "AI", audience: "AI初心者", periodLabel: "過去7日間", llm }),
    /信頼できる情報が不足/,
  );
});

test("researchTrendTopics rejects when the client lacks web search support", async () => {
  const llm: LlmClient = { async callTool<T>(): Promise<T> { return {} as T; } };
  await assert.rejects(
    researchTrendTopics({ agent: mirai, genre: "AI", audience: "AI初心者", periodLabel: "過去7日間", llm }),
    /Web検索つき呼び出しに対応していません/,
  );
});

test("generateTrendArticle passes rules and normalizes fact checks", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(
    {
      title: "完成タイトル",
      body: "※ この記事は2026-07-10時点の調査に基づいています。\n\n本文",
      hashtags: ["#AI", "#note"],
      titleIdeas: [{ title: "案1", tag: "初心者向け" }],
      sns: { threadsShort: "短文", threadsThread: ["1", "2"], x: ["x1"], instagram: "insta" },
      factChecks: [
        { claim: "確認済みの主張", status: "multi" },
        { claim: "分類不明の主張", status: "???" }, // 不正値
      ],
    },
    capture,
  );

  const theme = {
    title: "テーマ", reason: "", targetReader: "", angle: "", searchKeywords: [],
    freshness: "high", demand: "mid", beginnerFit: "high", writability: "high", monetizeFit: "mid",
    totalScore: 80, cautions: [],
  } as never;

  const result = await generateTrendArticle({
    agent: nemuri,
    theme,
    sources: [sourceStub("s1") as never, sourceStub("s2") as never],
    researchDate: "2026-07-10",
    genre: "AI",
    audience: "AI初心者",
    format: "初心者向け解説",
    lengthChars: 3000,
    style: "親しみやすい",
    llm,
  });

  assert.equal(result.factChecks[1]!.status, "check", "不明な分類は安全側の「要確認」に倒す");
  assert.equal(result.sns.threadsThread.length, 2);
  assert.equal(capture.request!.systemPrompt, nemuri.systemPrompt, "執筆はネムリの人格で行う");
  const prompt = capture.request!.userPrompt;
  assert.ok(prompt.includes("情報源にない事実を追加しない"));
  assert.ok(prompt.includes("可能性があります"));
  assert.ok(prompt.includes("コピーしない"));
  assert.ok(prompt.includes("2026-07-10時点の調査"), "調査日を冒頭に入れる指示を含む");
  assert.ok(prompt.includes("自分ごと化しやすいか"), "タイトルは自分ごと化しやすさ基準で比較する指示を含む");
  assert.ok(prompt.includes("抽象的で一般的なタイトルは禁止"), "抽象的なタイトルを禁止する指示を含む");
});

test("generateTrendArticle rejects an empty body", async () => {
  const llm = stubLlm({ title: "t", body: "", hashtags: [], titleIdeas: [], sns: {}, factChecks: [] });
  await assert.rejects(
    generateTrendArticle({
      agent: nemuri,
      theme: { title: "t", reason: "", targetReader: "", angle: "", searchKeywords: [], freshness: "mid", demand: "mid", beginnerFit: "mid", writability: "mid", monetizeFit: "mid", totalScore: 50, cautions: [] } as never,
      sources: [sourceStub("s") as never],
      researchDate: "2026-07-10",
      genre: "AI", audience: "AI初心者", format: "初心者向け解説", lengthChars: 1500, style: "シンプル",
      llm,
    }),
    /記事本文を生成できませんでした/,
  );
});
