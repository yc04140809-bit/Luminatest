import {
  SNS_SCORE_KEYS,
  SNS_SCORE_LABELS,
  SNS_METRIC_LABELS,
  type Agent,
  type SnsAnalysisResult,
  type SnsMetrics,
  type SnsScoreKey,
} from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

/**
 * SNS分析AI（MVP）。投稿本文＋実績データを受け取り、10項目採点・改善点・リライト案を返す。
 * 分析役のエージェント（通常はミライ＝AIマーケティング責任者）のsystemPromptをそのまま使うため、
 * GUIからミライの人格・方針を編集すると分析の観点も追従する。
 *
 * 将来の拡張（トレンド分析AI・投稿生成AI・A/BテストAI・note導線AI・データ分析AI）は、
 * このモジュールと同じ「入力→ツール強制呼び出し→構造化結果」のパターンで
 * orchestration/ に1ファイルずつ追加し、routes/sns.ts にエンドポイントを足していく。
 */

function metricsText(metrics: SnsMetrics): string {
  const entries = (Object.keys(SNS_METRIC_LABELS) as (keyof SnsMetrics)[])
    .map((key) => {
      const value = metrics[key];
      return value === undefined || Number.isNaN(value) ? undefined : `${SNS_METRIC_LABELS[key]}: ${value}`;
    })
    .filter((line): line is string => Boolean(line));
  if (entries.length === 0) return "（実績データ未入力。投稿前の事前診断として本文のみで採点してください）";

  const lines = [...entries];
  const { views, likes, replies, saves, clicks } = metrics;
  if (views && views > 0) {
    const rate = (numerator: number | undefined, label: string) =>
      numerator === undefined ? undefined : `${label}: ${((numerator / views) * 100).toFixed(2)}%`;
    const rates = [rate(likes, "いいね率"), rate(replies, "返信率"), rate(saves, "保存率"), rate(clicks, "クリック率")].filter(
      (line): line is string => Boolean(line),
    );
    if (rates.length > 0) lines.push(`（参考レート） ${rates.join(" / ")}`);
  }
  return lines.join("\n");
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(10, Math.round(num)));
}

export async function analyzeSnsPost(params: {
  analyst: Agent;
  content: string;
  platform: string;
  metrics: SnsMetrics;
  llm: LlmClient;
}): Promise<SnsAnalysisResult> {
  const { analyst, content, platform, metrics, llm } = params;

  const scoreItemList = SNS_SCORE_KEYS.map((key) => `- ${key}: ${SNS_SCORE_LABELS[key]}`).join("\n");

  const userPrompt = `# 分析対象の投稿
プラットフォーム: ${platform}

本文:
${content}

# 投稿後の実績データ
${metricsText(metrics)}

# 指示
あなたはこの投稿のSNS分析を行います。以下の10項目をそれぞれ0〜10点で採点してください。
${scoreItemList}

さらに:
- strengths: この投稿の強み（伸びた/伸びる見込みの理由）を2〜4個。実績データがあれば数字に言及すること。
- improvements: 改善点（伸びなかった/伸びない懸念の理由と直し方）を2〜4個。抽象論ではなく、どこをどう直すか具体的に。
- rewrite: 改善点をすべて反映した、このまま投稿できる完成リライト文。元の投稿の意図・トーンは保つこと。
- summary: 総評を1〜3文で。

採点は甘くしないこと。全項目8点以上を乱発せず、差をつけて評価すること。`;

  const result = await llm.callTool<{
    scores: Record<string, unknown>;
    strengths: string[];
    improvements: string[];
    rewrite: string;
    summary: string;
  }>({
    systemPrompt: analyst.systemPrompt,
    userPrompt,
    model: analyst.model.model,
    temperature: analyst.model.temperature,
    maxTokens: analyst.model.maxOutputTokens,
    toolName: "submit_sns_analysis",
    toolDescription: "SNS投稿の10項目採点・改善点・リライト案を記録する",
    toolSchema: {
      properties: {
        scores: {
          type: "object",
          description: "10項目の採点（各0〜10の整数）",
          properties: Object.fromEntries(
            SNS_SCORE_KEYS.map((key) => [key, { type: "number", description: `${SNS_SCORE_LABELS[key]}（0〜10）` }]),
          ),
          required: [...SNS_SCORE_KEYS],
        },
        strengths: { type: "array", items: { type: "string" }, description: "強み（2〜4個）" },
        improvements: { type: "array", items: { type: "string" }, description: "改善点（2〜4個）" },
        rewrite: { type: "string", description: "このまま投稿できる完成リライト文" },
        summary: { type: "string", description: "総評（1〜3文）" },
      },
      required: ["scores", "strengths", "improvements", "rewrite", "summary"],
    },
  });

  const scores = Object.fromEntries(
    SNS_SCORE_KEYS.map((key) => [key, clampScore(result.scores?.[key])]),
  ) as Record<SnsScoreKey, number>;
  const totalScore = SNS_SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0);

  return {
    scores,
    totalScore,
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    improvements: Array.isArray(result.improvements) ? result.improvements : [],
    rewrite: result.rewrite ?? "",
    summary: result.summary ?? "",
  };
}
