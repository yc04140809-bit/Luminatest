import {
  EIGHT_LAYER_FIELDS,
  MARKETING_COPY_MODES,
  MARKETING_COPY_TYPES,
  type Agent,
  type EightLayerKey,
  type MarketingCopyRequest,
  type MarketingCopyResult,
} from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

/**
 * 刺さるマーケティング生成AIのフェーズ1オーケストレーション。
 * 1回のツール強制呼び出しで「対象読者・狙い・刺さるポイント・8層分析・完成文章・CTA」までをまとめて生成する。
 * 8層の内部分析（読者→場面→感情→本音→放置未来→願望→動けない理由→最初の一歩）は
 * プロンプト内の生成フロー指示としてAIに内部で実行させ、結果を構造化データとして受け取る。
 * 診断（採点）・添削改善・保存履歴はフェーズ2以降で別関数として追加する。
 */

const GENERATE_MAX_TOKENS = 8000;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

/** ケイオス師匠の基本姿勢。ブランド設定の反映がOFFでも常に守られる最低限の事実。 */
const BASELINE_POSITION = `# ケイオス師匠の基本姿勢（常にこれを基準にすること）
「AIに何度も課金したのに、まだ何も完成していない初心者を、スマホとコピペで最初の1個完成まで連れていく実践者」

- 完成された成功者・権威型の専門家ではない
- 介護職として働きながら挑戦している
- スマホ中心でAI・アプリ開発・商品販売・SNS発信を実践している
- 失敗や迷いも隠さず発信する
- 初心者と同じ目線で、難しい言葉を使わずに伝える
- 完璧よりも「最初の1個を完成させる」ことを重視する
- 売り込むより、理解と信頼を積み上げる`;

/** 8層マーケティングの内部分析ロジックの説明。 */
const EIGHT_LAYER_GUIDE = `# 刺さるマーケティング8層（内部で分析してから書くこと）
1. 表面の悩み: 読者が普段口にしている悩み
2. 現実の場面: その悩みが起きている具体的な瞬間（読者が「自分の日常だ」と感じる場面）
3. 感情: その場面で感じている感情
4. 認めたくない本音: 責めずに代弁する、口に出しにくい本音（傷つけない表現にする）
5. 放置した先の未来: 今のまま何もしなかった場合に起きる現実（脅しではなく静かな現実として）
6. 本当の願望: 読者が本当に欲しい未来や感情（商品ではなく変化を見せる）
7. 動けない理由: 行動しない理由を先回りして具体的に解消する（スマホでできる／コピペ中心／1回1機能／戻せる、等）
8. 最初の小さな一歩: 今すぐできる具体的な行動を1つだけ（「人生を変えよう」等の曖昧なCTAは禁止）`;

/** 禁止表現。ブランド設定の反映有無に関わらず常に守る安全ルール。 */
const SAFETY_RULES = `# 表現の安全ルール（常に守ること）
- 強引な煽り、誇大表現、心理操作、恐怖だけで動かす表現は禁止
- 読者を責めない。弱さを利用しない
- 根拠のない実績・体験談を捏造しない（ユーザーが入力していない体験は書かない）
- 次のような表現は使わない: 誰でも必ず稼げる／絶対に成功する／100パーセント売れる／楽して稼げる／放置で稼げる／これだけで人生が変わる／確実にバズる／今買わないと損／行動しない人は負け／稼げないのは努力不足／あなたは間違っている
- 必要な場合は次のように現実的に言い換える: 初心者でも進めやすい／最初の1個を完成させやすい／迷う時間を減らせる／条件によって結果は異なる`;

function optionalLine(label: string, value: string | undefined): string {
  return value && value.trim() ? `${label}: ${value.trim()}\n` : "";
}

function typeGuidance(copyType: string): string {
  const entry = MARKETING_COPY_TYPES.find((item) => item.id === copyType);
  return entry ? `${entry.label}（${entry.guidance}）` : copyType;
}

function modeGuidance(mode: string): string {
  const entry = MARKETING_COPY_MODES.find((item) => item.id === mode);
  return entry ? `${entry.label}: ${entry.description}` : mode;
}

function eightLayerBlock(request: MarketingCopyRequest): string {
  return EIGHT_LAYER_FIELDS.map((field) => {
    const value = request.eightLayers?.[field.key];
    return value && value.trim()
      ? `${field.label}（ユーザー入力・尊重する）: ${value.trim()}`
      : `${field.label}: 未入力（AIが読者・テーマから自然に補完する）`;
  }).join("\n");
}

export async function generateMarketingCopy(params: {
  marketer: Agent;
  request: MarketingCopyRequest;
  /** ケイオス師匠ブランド設定の反映が有効な場合のみ渡す（brandContextForMarketingCopy() の出力） */
  brandContext?: string;
  llm: LlmClient;
}): Promise<MarketingCopyResult> {
  const { marketer, request, llm } = params;

  const optionalBlock = [
    optionalLine("ケイオス師匠自身の体験", request.experience),
    optionalLine("文字数の目安", request.charLength),
    optionalLine("トーン指定", request.tone),
    optionalLine("販売色の強さ", request.salesIntensity),
    optionalLine("使用SNS/媒体", request.snsPlatform),
    optionalLine("商品URL", request.productUrl),
    optionalLine("noteURL", request.noteUrl),
    optionalLine("ココナラURL", request.coconalaUrl),
    optionalLine("過去投稿の参考", request.pastPost),
    optionalLine("含めたいキーワード", request.keywords),
    optionalLine("避けたい表現", request.avoidPhrases),
  ].join("");

  const userPrompt = `${BASELINE_POSITION}

${EIGHT_LAYER_GUIDE}

${SAFETY_RULES}

# 依頼内容
文章タイプ: ${typeGuidance(request.copyType)}
生成モード: ${modeGuidance(request.mode)}
テーマ: ${request.theme.trim()}
読者: ${request.audience.trim()}
読者の悩み: ${request.audienceProblem.trim()}
紹介したい商品または行動: ${request.offer.trim()}

# 8層マーケティング入力
${eightLayerBlock(request)}
${optionalBlock ? `\n# 任意の追加情報\n${optionalBlock}` : ""}
${params.brandContext ? `\n${params.brandContext}\n` : ""}
# 生成フロー（内部で順番に実行してから完成版のみ出力する）
1. 読者を1人に絞る
2. 読者の具体的な日常場面を設定する
3. 感情を特定する
4. 認めたくない本音を特定する
5. 放置した未来を設定する
6. 本当の願望を設定する
7. 動けない理由を特定し、具体的に解消する
8. ケイオス師匠自身の体験があれば自然に入れる（体験の入力がない場合は捏造せず一般的な共感表現にとどめる）
9. 最後の小さな一歩を1つだけ決める
10. 売り込み臭を減らす
11. 読みやすい文章に整える（文章タイプの目安の長さ・改行に合わせる）

# 出力形式
1. targetReader: 対象読者を一言で
2. writingGoal: この文章の狙いを一言で
3. hookPoints: 刺さるポイント（箇条書き2〜4個）
4. eightLayers: 8層それぞれの分析結果（ユーザー入力があればそれを活かした形で、なければAIが補完した内容を記載）
5. finalCopy: そのままコピペして使える完成文章のみ（見出し・解説・点数を含めない）
6. cta: 必要な場合のみの導線文（不要な文章タイプの場合は空文字でよい）`;

  const result = await llm.callTool<{
    targetReader: string;
    writingGoal: string;
    hookPoints: string[];
    eightLayers: Record<string, string>;
    finalCopy: string;
    cta: string;
  }>({
    systemPrompt: marketer.systemPrompt,
    userPrompt,
    model: marketer.model.model,
    temperature: marketer.model.temperature,
    maxTokens: GENERATE_MAX_TOKENS,
    toolName: "submit_marketing_copy",
    toolDescription: "刺さるマーケティング文章と8層分析を記録する",
    toolSchema: {
      properties: {
        targetReader: { type: "string", description: "対象読者" },
        writingGoal: { type: "string", description: "文章の狙い" },
        hookPoints: { type: "array", items: { type: "string" }, description: "刺さるポイント（2〜4個）" },
        eightLayers: {
          type: "object",
          description: "8層マーケティング分析",
          properties: Object.fromEntries(
            EIGHT_LAYER_FIELDS.map((field) => [field.key, { type: "string", description: field.label }]),
          ),
          required: EIGHT_LAYER_FIELDS.map((field) => field.key),
        },
        finalCopy: { type: "string", description: "そのままコピペできる完成文章" },
        cta: { type: "string", description: "必要な場合のみのCTA（不要なら空文字）" },
      },
      required: ["targetReader", "writingGoal", "hookPoints", "eightLayers", "finalCopy", "cta"],
    },
  });

  const eightLayers = Object.fromEntries(
    EIGHT_LAYER_FIELDS.map((field) => [field.key, str(result.eightLayers?.[field.key])]),
  ) as Record<EightLayerKey, string>;

  return {
    targetReader: str(result.targetReader),
    writingGoal: str(result.writingGoal),
    hookPoints: arr(result.hookPoints),
    eightLayers,
    finalCopy: str(result.finalCopy),
    cta: str(result.cta),
  };
}
