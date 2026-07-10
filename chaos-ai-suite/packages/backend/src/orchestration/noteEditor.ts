import {
  NOTE_EDIT_MODES,
  NOTE_SCORE_KEYS,
  NOTE_SCORE_LABELS,
  type Agent,
  type NoteAnalysisResult,
  type NoteEditLevelId,
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

/** 編集レベルごとの「やること・やらないこと」の指示。 */
const LEVEL_RULES: Record<NoteEditLevelId, string> = {
  layout: `【編集レベル: レイアウトのみ】
本文の意味・表現・語順・語尾は一切変更しないこと。誤字脱字の修正すらしない。
やってよいのは次のレイアウト操作のみ:
- 段落をスマホで読みやすい2〜3行（60〜100文字程度）で区切り、段落間に空行を入れる
- 内容のまとまりに応じて見出し（## と ###）を追加する（見出し文言は本文中の言葉から作る）
- 列挙・手順は箇条書き（- ）に変換する（文言は変えない）
- 特に重要な文を**太字**に、心に留めたい一文を > 引用 にする（文言は変えない）`,
  light: `【編集レベル: 軽く整える】
内容・構成・話の順番は変更しないこと。見出しの追加もしない。
やってよいのは:
- 誤字脱字・句読点の修正
- 段落をスマホで読みやすい2〜3行で区切る改行調整
- 明らかに不自然な表現の微調整（言い回しの大幅な変更は禁止）`,
  readable: `【編集レベル: 読みやすくする】
1. 構成整理: 話の順番を読者に伝わる順に並べ替え、不要な文・重複表現を削除する
2. 見出し生成: 内容を理解し、適切な見出し（## と ###）を付ける。見出しの数は記事の長さに応じて調整する
3. 改行最適化: スマホで読みやすいよう、1つの段落は2〜3行（60〜100文字程度）で区切り、段落間は空行を入れる
4. 強調: 本当に重要な文だけを**太字**にする（多用禁止。1見出しにつき最大1〜2箇所）。読者の心に留めたい一文は > 引用 にする
5. 箇条書き: 列挙・手順・比較は箇条書き（- ）に変換する`,
  sellable: `【編集レベル: 売れる構成へ改善】
「読みやすくする」の全処理（構成整理・見出し・改行・強調・箇条書き）に加えて:
- 冒頭の引き込みを改善する（読者が自分ごと化できる書き出しへ）
- 読者の悩みを明確に言語化するパートを整える
- 結論・メリット・注意点を整理して提示する
- 最後まで読みやすい流れ（次を読みたくなる見出し・つなぎ）へ調整する
- CTA（行動喚起）を自然な形に改善する
構成の並べ替え・文の追加は可。ただし著者の体験・数字・主張は改変しない。`,
  pro: `【編集レベル: プロ編集者モード】
プロ編集者として記事全体を大きく再構成してよい:
- ストーリー設計（読者の感情曲線を意識した流れ）
- 読者心理に基づく見出し構成の再設計
- 離脱ポイントの排除（冗長部の大胆な削除・順序変更）
- 販売導線・CTAの設計
- 表現・語尾の統一
文の追加・大幅な書き換えは可。ただし著者の体験・数字・固有名詞・主張の中身は改変せず、著者の声（口調・人柄）は残すこと。`,
};

function clampScore(value: unknown): number {
  const num = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

export async function editNoteArticle(params: {
  editor: Agent;
  content: string;
  modeId: NoteEditModeId;
  levelId?: NoteEditLevelId;
  llm: LlmClient;
}): Promise<NoteEditResult> {
  const { editor, content, modeId, llm } = params;
  const levelId = params.levelId ?? "readable";

  const userPrompt = `# 編集対象の記事（AIまたは人間による下書き）
${content}

# 指示
あなたはプロのnote編集者として、この記事を「noteにそのまま投稿できる品質」まで編集してください。
${modePolicy(modeId)}

${LEVEL_RULES[levelId]}

全レベル共通の絶対ルール:
- 著者の声を消さない: 一次体験・感情・口癖はそのまま残す。AIっぽい無機質な文体にしない
- 事実の改変禁止: 数字・固有名詞・体験の内容は変えない

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

/** 部分編集の出力上限。選択ブロック（数百字）＋余裕分。 */
const SECTION_MAX_TOKENS = 1500;

/**
 * 部分やり直し編集。選択されたブロックだけをLLMに送り、指示に従って書き直す。
 * 記事全体は送らないため高速・低コスト（コスト対策: 部分編集は選択範囲のみ送信）。
 */
export async function editNoteSection(params: {
  editor: Agent;
  sectionText: string;
  instruction: string;
  llm: LlmClient;
}): Promise<{ revisedText: string }> {
  const { editor, sectionText, instruction, llm } = params;

  const userPrompt = `# 編集対象（note記事の一部分。前後の文脈は省略されています）
${sectionText}

# 指示
上記の部分だけを「${instruction}」の方針で書き直してください。

ルール:
- Markdownの書式（見出し記号・箇条書き・太字・引用）は元の構造を保つ
- 事実・数字・固有名詞は変えない
- 記事の一部分なので、前置きや締めの文を勝手に足さない
- 元と同じ言語・同じ口調で書く`;

  const result = await llm.callTool<{ revisedText: string }>({
    systemPrompt: editor.systemPrompt,
    userPrompt,
    model: editor.model.model,
    temperature: editor.model.temperature,
    maxTokens: SECTION_MAX_TOKENS,
    toolName: "submit_revised_section",
    toolDescription: "書き直した部分テキストを記録する",
    toolSchema: {
      properties: {
        revisedText: { type: "string", description: "書き直し後のテキスト（Markdown書式を維持）" },
      },
      required: ["revisedText"],
    },
  });

  return { revisedText: result.revisedText ?? sectionText };
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
