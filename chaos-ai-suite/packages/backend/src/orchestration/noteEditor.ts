import {
  NOTE_EDIT_MODES,
  NOTE_SCORE_KEYS,
  NOTE_SCORE_LABELS,
  type Agent,
  type NoteAnalysisResult,
  type NoteEditModeId,
  type NoteEditResult,
  type NoteScoreKey,
} from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

/**
 * AI Note Editor（売れるnote編集AI）のMVPオーケストレーション。
 * 編集役のエージェント（通常はネムリ＝書類作成AI）のsystemPromptをそのまま使うため、
 * GUIからネムリの人格・方針を編集すると編集スタイルも追従する。
 *
 * 「編集」と「診断」を別々のLLM呼び出しに分けている理由:
 * - 編集は記事全文を出力するため出力トークンが大きく、診断まで同居させると
 *   長文記事で出力上限に達して両方壊れるリスクがある
 * - 分けることでUI側は編集結果を先に表示でき、体感速度も上がる
 */

/** 編集呼び出しの出力上限。記事全文（数千字）＋要約が収まるサイズ。 */
const EDIT_MAX_TOKENS = 8192;
/** 診断呼び出しの出力上限。 */
const ANALYZE_MAX_TOKENS = 3000;

function modePolicy(modeId: NoteEditModeId): string {
  const mode = NOTE_EDIT_MODES.find((entry) => entry.id === modeId);
  return mode ? `【編集モード: ${mode.label}】${mode.policy}` : "";
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

export async function editNoteArticle(params: {
  editor: Agent;
  content: string;
  modeId: NoteEditModeId;
  llm: LlmClient;
}): Promise<NoteEditResult> {
  const { editor, content, modeId, llm } = params;

  const userPrompt = `# 編集対象の記事（AIまたは人間による下書き）
${content}

# 指示
あなたはプロのnote編集者として、この記事を「noteにそのまま投稿できる品質」まで編集してください。
${modePolicy(modeId)}

編集ルール:
1. 構成整理: 話の順番を読者に伝わる順に並べ替え、不要な文・重複表現を削除する
2. 見出し生成: 内容を理解し、適切な見出し（## と ###）を付ける。見出しの数は記事の長さに応じて調整する
3. 改行最適化: スマホで読みやすいよう、1つの段落は2〜3行（60〜100文字程度）で区切り、段落間は空行を入れる
4. 強調: 本当に重要な文だけを**太字**にする（多用禁止。1見出しにつき最大1〜2箇所）。読者の心に留めたい一文は > 引用 にする
5. 箇条書き: 列挙・手順・比較は箇条書き（- ）に変換する
6. 著者の声を消さない: 一次体験・感情・口癖はそのまま残す。AIっぽい無機質な文体にしない
7. 事実の改変禁止: 数字・固有名詞・体験の内容は変えない。文章表現のみを編集する

出力:
- editedMarkdown: 編集後の記事全文（Markdown形式。タイトル行は含めない）
- changeSummary: 何をどう変えたかの要約を3〜6個（ユーザーが編集を学べるように具体的に）
- highlights: 太字・引用にした箇所の抜粋とその理由（各1行）`;

  const result = await llm.callTool<{
    editedMarkdown: string;
    changeSummary: string[];
    highlights: { excerpt: string; kind: string; reason: string }[];
  }>({
    systemPrompt: editor.systemPrompt,
    userPrompt,
    model: editor.model.model,
    temperature: editor.model.temperature,
    maxTokens: EDIT_MAX_TOKENS,
    toolName: "submit_edited_article",
    toolDescription: "編集済みのnote記事と編集内容の要約を記録する",
    toolSchema: {
      properties: {
        editedMarkdown: { type: "string", description: "編集後の記事全文（Markdown）" },
        changeSummary: { type: "array", items: { type: "string" }, description: "編集内容の要約3〜6個" },
        highlights: {
          type: "array",
          description: "強調箇所の一覧",
          items: {
            type: "object",
            properties: {
              excerpt: { type: "string", description: "強調した文の抜粋" },
              kind: { type: "string", enum: ["bold", "quote"], description: "強調の種類" },
              reason: { type: "string", description: "強調した理由" },
            },
            required: ["excerpt", "kind", "reason"],
          },
        },
      },
      required: ["editedMarkdown", "changeSummary", "highlights"],
    },
  });

  return {
    editedMarkdown: result.editedMarkdown ?? "",
    changeSummary: Array.isArray(result.changeSummary) ? result.changeSummary : [],
    highlights: (Array.isArray(result.highlights) ? result.highlights : []).map((entry) => ({
      excerpt: entry.excerpt ?? "",
      kind: entry.kind === "quote" ? "quote" : "bold",
      reason: entry.reason ?? "",
    })),
  };
}

export async function analyzeNoteArticle(params: {
  editor: Agent;
  content: string;
  llm: LlmClient;
}): Promise<NoteAnalysisResult> {
  const { editor, content, llm } = params;

  const scoreItemList = NOTE_SCORE_KEYS.map((key) => `- ${key}: ${NOTE_SCORE_LABELS[key]}`).join("\n");

  const userPrompt = `# 診断対象のnote記事
${content}

# 指示
プロのnote編集者として、この記事を診断してください。

1. scores: 以下7項目を各0〜100点で採点（甘くしない。差をつける）
${scoreItemList}

2. improvements: 点数が低い項目を中心に、具体的な改善案を3〜5個

3. dropoffPoints: 読者が離脱しそうな箇所を1〜3個。該当箇所の抜粋（先頭20〜40文字）・離脱理由・直し方をセットで

4. titleCandidates: この記事のタイトル候補を10案。それぞれ「どの読者心理に効くか」の根拠を1行で添える

5. ctaSuggestions: 記事の内容に自然につながるCTA（行動喚起）の文面を3〜5個。フォロー・スキ・コメント・次の記事・有料note等から記事に合うものを選ぶ。押し付けがましくない文面にする`;

  const result = await llm.callTool<{
    scores: Record<string, unknown>;
    improvements: string[];
    dropoffPoints: { excerpt: string; reason: string; fix: string }[];
    titleCandidates: { title: string; appeal: string }[];
    ctaSuggestions: string[];
  }>({
    systemPrompt: editor.systemPrompt,
    userPrompt,
    model: editor.model.model,
    temperature: editor.model.temperature,
    maxTokens: ANALYZE_MAX_TOKENS,
    toolName: "submit_article_analysis",
    toolDescription: "note記事の診断結果（採点・改善案・離脱ポイント・タイトル案・CTA案）を記録する",
    toolSchema: {
      properties: {
        scores: {
          type: "object",
          description: "7項目の採点（各0〜100の整数）",
          properties: Object.fromEntries(
            NOTE_SCORE_KEYS.map((key) => [key, { type: "number", description: `${NOTE_SCORE_LABELS[key]}（0〜100）` }]),
          ),
          required: [...NOTE_SCORE_KEYS],
        },
        improvements: { type: "array", items: { type: "string" }, description: "改善案3〜5個" },
        dropoffPoints: {
          type: "array",
          description: "離脱しそうな箇所1〜3個",
          items: {
            type: "object",
            properties: {
              excerpt: { type: "string", description: "該当箇所の抜粋" },
              reason: { type: "string", description: "離脱理由" },
              fix: { type: "string", description: "直し方" },
            },
            required: ["excerpt", "reason", "fix"],
          },
        },
        titleCandidates: {
          type: "array",
          description: "タイトル候補10案",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "タイトル案" },
              appeal: { type: "string", description: "どの読者心理に効くか" },
            },
            required: ["title", "appeal"],
          },
        },
        ctaSuggestions: { type: "array", items: { type: "string" }, description: "CTA文面3〜5個" },
      },
      required: ["scores", "improvements", "dropoffPoints", "titleCandidates", "ctaSuggestions"],
    },
  });

  const scores = Object.fromEntries(
    NOTE_SCORE_KEYS.map((key) => [key, clampScore(result.scores?.[key])]),
  ) as Record<NoteScoreKey, number>;
  const overallScore = Math.round(NOTE_SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0) / NOTE_SCORE_KEYS.length);

  return {
    scores,
    overallScore,
    improvements: Array.isArray(result.improvements) ? result.improvements : [],
    dropoffPoints: (Array.isArray(result.dropoffPoints) ? result.dropoffPoints : []).map((entry) => ({
      excerpt: entry.excerpt ?? "",
      reason: entry.reason ?? "",
      fix: entry.fix ?? "",
    })),
    titleCandidates: (Array.isArray(result.titleCandidates) ? result.titleCandidates : []).map((entry) => ({
      title: entry.title ?? "",
      appeal: entry.appeal ?? "",
    })),
    ctaSuggestions: Array.isArray(result.ctaSuggestions) ? result.ctaSuggestions : [],
  };
}
