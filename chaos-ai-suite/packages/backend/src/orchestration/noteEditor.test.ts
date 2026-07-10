import { test } from "node:test";
import assert from "node:assert/strict";
import { NOTE_SCORE_KEYS, SEED_AGENTS } from "@chaos-ai-suite/shared";
import type { LlmClient, ToolCallRequest } from "./llmClient.js";
import { analyzeNoteArticle, editNoteArticle, editNoteSection } from "./noteEditor.js";

const nemuri = SEED_AGENTS.find((agent) => agent.id === "agent-nemuri")!;

function stubLlm(response: Record<string, unknown>, capture?: { request?: ToolCallRequest }): LlmClient {
  return {
    async callTool<T>(request: ToolCallRequest): Promise<T> {
      if (capture) capture.request = request;
      return response as T;
    },
  };
}

test("editNoteArticle injects the selected mode policy and returns normalized result", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(
    {
      editedMarkdown: "## 見出し\n\n編集済み本文",
      changeSummary: ["段落を分割した"],
      highlights: [{ excerpt: "重要な一文", kind: "quote", reason: "核心のため" }],
    },
    capture,
  );

  const result = await editNoteArticle({ editor: nemuri, content: "元の記事", modeId: "sales", llm });

  assert.equal(result.editedMarkdown, "## 見出し\n\n編集済み本文");
  assert.equal(result.highlights[0]!.kind, "quote");
  assert.ok(capture.request!.userPrompt.includes("販売向け"), "選択した編集モードの方針がプロンプトに入る");
  assert.equal(capture.request!.systemPrompt, nemuri.systemPrompt, "編集はネムリの人格で行う");
});

test("editNoteArticle normalizes unknown highlight kinds to bold", async () => {
  const llm = stubLlm({
    editedMarkdown: "本文",
    changeSummary: [],
    highlights: [{ excerpt: "文", kind: "underline", reason: "理由" }],
  });
  const result = await editNoteArticle({ editor: nemuri, content: "元", modeId: "beginner", llm });
  assert.equal(result.highlights[0]!.kind, "bold");
});

test("editNoteArticle injects level-specific rules (layout level forbids text changes)", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm(
    { editedMarkdown: "本文", changeSummary: [], highlights: [] },
    capture,
  );

  await editNoteArticle({ editor: nemuri, content: "元", modeId: "experience", levelId: "layout", llm });
  assert.ok(capture.request!.userPrompt.includes("レイアウトのみ"));
  assert.ok(capture.request!.userPrompt.includes("一切変更しないこと"));

  await editNoteArticle({ editor: nemuri, content: "元", modeId: "experience", levelId: "pro", llm });
  assert.ok(capture.request!.userPrompt.includes("プロ編集者モード"));

  // levelId未指定は従来どおり「読みやすくする」で後方互換
  await editNoteArticle({ editor: nemuri, content: "元", modeId: "experience", llm });
  assert.ok(capture.request!.userPrompt.includes("読みやすくする"));
});

test("editNoteSection sends only the selected section with the instruction", async () => {
  const capture: { request?: ToolCallRequest } = {};
  const llm = stubLlm({ revisedText: "短くした文" }, capture);

  const result = await editNoteSection({
    editor: nemuri,
    sectionText: "とても長い段落の文章です。",
    instruction: "もっと短く",
    llm,
  });

  assert.equal(result.revisedText, "短くした文");
  assert.ok(capture.request!.userPrompt.includes("もっと短く"));
  assert.ok(capture.request!.userPrompt.includes("とても長い段落の文章です。"));
  assert.ok(capture.request!.maxTokens <= 2000, "部分編集は小さい呼び出しに抑える");
});

test("analyzeNoteArticle clamps scores into 0..100 and averages overallScore", async () => {
  const scores = Object.fromEntries(NOTE_SCORE_KEYS.map((key) => [key, 80]));
  const llm = stubLlm({
    scores: { ...scores, hook: 150, empathy: -20 },
    improvements: ["改善1"],
    dropoffPoints: [{ excerpt: "冒頭", reason: "長い", fix: "削る" }],
    titleCandidates: [{ title: "案1", appeal: "好奇心" }],
    ctaSuggestions: ["フォローしてね"],
  });

  const result = await analyzeNoteArticle({ editor: nemuri, content: "記事", llm });

  assert.equal(result.scores.hook, 100, "上限100でクランプ");
  assert.equal(result.scores.empathy, 0, "下限0でクランプ");
  // hook=100, empathy=0, 残り5項目=80 → (100+0+400)/7 = 71.43 → 71
  assert.equal(result.overallScore, 71);
  assert.equal(result.dropoffPoints.length, 1);
  assert.equal(result.titleCandidates[0]!.title, "案1");
});
