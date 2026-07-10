import {
  INSTANT_LEVELS,
  type Agent,
  type InstantLevelId,
  type ScoutAnalysis,
  type ScoutDecisionId,
  type ScoutWorkflowStep,
} from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

/**
 * 案件スカウターの分析処理。判定・理由・リスク・専門警告・即納レベル・AI社員分析・
 * 工程案・応募文4種・確認質問3種までを【1回のツール強制呼び出し】でまとめて生成する
 * （APIコスト対策の最重要要件）。利益計算・並び替え・集計はフロント側で行い、AIを使わない。
 */

const SCOUT_MAX_TOKENS = 8000;

/** 専門資格・権利・規約リスクのチェックリスト（プロンプトに注入）。 */
const SPECIALIST_CHECKLIST =
  "法律相談 / 税務相談 / 医療判断 / 投資助言 / 診断行為 / 資格保有者限定業務 / 補助金・申請書類の代理作成 / " +
  "契約書の法的保証 / 実績・経歴の偽装 / 他人の著作物の模倣 / 商標・著作権侵害のおそれ / 個人情報の大量処理 / " +
  "不正レビュー / なりすまし / 無断転載 / 虚偽情報の作成 / プラットフォーム規約違反のおそれ";

function str(value: unknown, fallback = "未確認"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

function rosterText(roster: Agent[]): string {
  return roster
    .filter((agent) => agent.enabled)
    .map((agent) => `- id: ${agent.id} / 名前: ${agent.name} / 担当: ${agent.title} / 得意: ${agent.responsibilities.slice(0, 2).join("、")}`)
    .join("\n");
}

export async function analyzeScoutCase(params: {
  agent: Agent;
  title: string;
  body: string;
  price?: number;
  applyDeadline?: string;
  deliveryDeadline?: string;
  source?: string;
  category?: string;
  roster: Agent[];
  llm: LlmClient;
}): Promise<ScoutAnalysis> {
  const { agent, roster, llm } = params;
  const validIds = new Set(roster.map((entry) => entry.id));

  const meta = [
    params.price !== undefined ? `募集価格: ${params.price}円` : "募集価格: 未確認",
    params.applyDeadline ? `応募期限: ${params.applyDeadline}` : "",
    params.deliveryDeadline ? `納品期限: ${params.deliveryDeadline}` : "",
    params.source ? `募集元: ${params.source}` : "",
    params.category ? `カテゴリ: ${params.category}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `あなたはフリーランス案件の受注可否・利益・制作可能性を分析する案件審査AIです。

# 分析対象の募集案件
タイトル: ${params.title || "（無題）"}
${meta}

案件本文:
${params.body}

# ユーザーの環境（前提）
- ユーザーはスマホだけで作業する個人。PCは持っていない
- 制作は「My Chaos AI Suite」のAI社員チーム＋ユーザー自身の確認で行う
- 文章系（記事・SNS・マニュアル・報告書・出品文・プロンプト設計等）が得意領域
- 画像・動画の本格制作、外部システムへの直接アクセスが必要な作業は現状不可

# 現在のAI社員名簿
${rosterText(roster)}

# 判定基準（機械的に当てはめず、総合判断の目安として使う）
⭕受注候補: 想定時給5,000円以上 / 現在の機能で制作可能 / 条件が明確 / 修正回数限定 / 納期に余裕 / 専門資格不要 / 事実確認可能
△条件付き: 想定時給3,000〜5,000円 / 不明条件が残る / 納期が短い / 修正回数不明 / 範囲が広い / 人間の専門確認が必要
❌見送り推奨: 想定時給3,000円未満 / 範囲不明確 / 修正無制限 / 納期が非現実的 / 専門資格必要 / 法的・倫理的リスク / 品質保証不可

# 専門性・危険チェック（該当があればspecialistWarning=trueにし、重大なら判定を△か❌に下げる）
${SPECIALIST_CHECKLIST}

# 絶対ルール
- 案件本文に書かれていない条件・金額・納期を推測で確定しない。不明は「未確認」とする
- ユーザーが持っていない経験・資格・実績を持っていると仮定しない
- 応募文に存在しない実績・経験・資格・評価を書かない。「多数の実績があります」等の虚偽表現は禁止。
  実績が少ない前提で「丁寧な要件確認」「納品前の品質確認」「修正条件の事前すり合わせ」「進捗共有」を安心材料にする
- ⭕判定でもリスクゼロと断定しない（「最終的な事実確認と文章確認はユーザーが行う必要がある」前提を保つ）
- 見送るべき案件は遠慮なく❌にする（金額の高さだけで判断しない）
- workflowは受注後の工程案を5〜10個。各工程のagentIdは名簿のidから選び、判断できなければ空文字。
  重要な確認地点（要件確定前・成果物作成前・品質チェック後・納品前）はhumanCheck=trueにする
- clientQuestionsの質問は最大5件程度に絞り、重要なもの（納品形式・文字数・対象読者・修正回数・納期など）を優先する`;

  const result = await llm.callTool<Record<string, unknown>>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: SCOUT_MAX_TOKENS,
    toolName: "submit_scout_analysis",
    toolDescription: "募集案件の受注可否分析の結果を記録する",
    toolSchema: {
      properties: {
        decision: { type: "string", enum: ["circle", "triangle", "cross"], description: "⭕=circle / △=triangle / ❌=cross" },
        summary: { type: "string", description: "総評（2〜3文）" },
        purpose: { type: "string", description: "案件の目的（不明なら「未確認」）" },
        deliverables: { type: "array", items: { type: "string" }, description: "求められている成果物" },
        mustConditions: { type: "array", items: { type: "string" }, description: "必須条件・納期・予算・修正条件などの重要条件" },
        requiredSkills: { type: "array", items: { type: "string" }, description: "必要スキル" },
        reasons: { type: "array", items: { type: "string" }, description: "判定理由（2〜5個）" },
        strengths: { type: "array", items: { type: "string" }, description: "納品可能な理由" },
        difficulties: { type: "array", items: { type: "string" }, description: "難しい部分" },
        missingInformation: { type: "array", items: { type: "string" }, description: "不明点・確認すべき内容" },
        failureRisks: { type: "array", items: { type: "string" }, description: "想定される失敗" },
        overlookedConditions: { type: "array", items: { type: "string" }, description: "見落としやすい条件" },
        preconditions: { type: "array", items: { type: "string" }, description: "受注する場合の前提条件" },
        risks: { type: "array", items: { type: "string" }, description: "権利・規約・品質保証などのリスク" },
        specialistWarning: { type: "boolean", description: "専門資格・法的・規約上の確認が必要な可能性" },
        specialistWarningDetail: { type: "string", description: "警告の内容（該当なしなら空文字）" },
        estimatedMinutes: { type: "number", description: "想定制作時間（分）" },
        estimatedRevisionMinutes: { type: "number", description: "想定修正時間（分）" },
        estimatedAiCost: { type: "number", description: "AI利用費の概算（円）" },
        instantDeliveryLevel: {
          type: "string",
          enum: ["same_day", "h24", "d2_3", "after_check", "difficult"],
          description: "即納可能性",
        },
        availableAgents: {
          type: "array",
          description: "この案件に対応可能なAI社員とその役割",
          items: {
            type: "object",
            properties: {
              agentId: { type: "string", description: "名簿のid" },
              role: { type: "string", description: "この案件での役割" },
            },
            required: ["agentId", "role"],
          },
        },
        missingRoles: { type: "array", items: { type: "string" }, description: "不足している役割" },
        humanChecks: { type: "array", items: { type: "string" }, description: "人間が確認すべき作業" },
        externalTools: { type: "array", items: { type: "string" }, description: "外部ツールが必要な作業" },
        selfContained: { type: "boolean", description: "現在の機能だけで完結できるか" },
        workflow: {
          type: "array",
          description: "受注後の工程案5〜10個",
          minItems: 3,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              agentId: { type: "string", description: "名簿のid（判断不能なら空文字）" },
              description: { type: "string" },
              estimatedMinutes: { type: "number" },
              completionCriteria: { type: "string" },
              humanCheck: { type: "boolean" },
            },
            required: ["title", "agentId", "description", "estimatedMinutes", "completionCriteria", "humanCheck"],
          },
        },
        applicationMessages: {
          type: "object",
          description: "応募文4種（虚偽実績禁止・自然な締め）",
          properties: {
            polite: { type: "string", description: "丁寧な応募文" },
            beginnerFriendly: { type: "string", description: "実績が少なくても使える応募文" },
            short: { type: "string", description: "短文応募" },
            highValue: { type: "string", description: "高単価案件向け応募文" },
          },
          required: ["polite", "beginnerFriendly", "short", "highValue"],
        },
        clientQuestions: {
          type: "object",
          description: "受注前にクライアントへ送る質問文3種（質問は最大5件程度）",
          properties: {
            polite: { type: "string", description: "丁寧" },
            short: { type: "string", description: "短文" },
            friendly: { type: "string", description: "親しみやすい" },
          },
          required: ["polite", "short", "friendly"],
        },
      },
      required: [
        "decision", "summary", "purpose", "deliverables", "mustConditions", "requiredSkills", "reasons",
        "strengths", "difficulties", "missingInformation", "failureRisks", "overlookedConditions", "preconditions",
        "risks", "specialistWarning", "specialistWarningDetail", "estimatedMinutes", "estimatedRevisionMinutes",
        "estimatedAiCost", "instantDeliveryLevel", "availableAgents", "missingRoles", "humanChecks",
        "externalTools", "selfContained", "workflow", "applicationMessages", "clientQuestions",
      ],
    },
  });

  const decision: ScoutDecisionId =
    result.decision === "circle" || result.decision === "triangle" || result.decision === "cross"
      ? result.decision
      : "triangle";
  const instantLevel: InstantLevelId = INSTANT_LEVELS.some((level) => level.id === result.instantDeliveryLevel)
    ? (result.instantDeliveryLevel as InstantLevelId)
    : "after_check";

  const workflow: ScoutWorkflowStep[] = (Array.isArray(result.workflow) ? result.workflow : []).map((step) => {
    const raw = step as Record<string, unknown>;
    return {
      title: str(raw.title, ""),
      agentId: typeof raw.agentId === "string" && validIds.has(raw.agentId) ? raw.agentId : "",
      description: str(raw.description, ""),
      estimatedMinutes: num(raw.estimatedMinutes, 30),
      completionCriteria: str(raw.completionCriteria, ""),
      humanCheck: raw.humanCheck === true,
    };
  });

  const messages = (result.applicationMessages ?? {}) as Record<string, unknown>;
  const questions = (result.clientQuestions ?? {}) as Record<string, unknown>;

  return {
    decision,
    summary: str(result.summary, ""),
    purpose: str(result.purpose),
    deliverables: arr(result.deliverables),
    mustConditions: arr(result.mustConditions),
    requiredSkills: arr(result.requiredSkills),
    reasons: arr(result.reasons),
    strengths: arr(result.strengths),
    difficulties: arr(result.difficulties),
    missingInformation: arr(result.missingInformation),
    failureRisks: arr(result.failureRisks),
    overlookedConditions: arr(result.overlookedConditions),
    preconditions: arr(result.preconditions),
    risks: arr(result.risks),
    specialistWarning: result.specialistWarning === true,
    specialistWarningDetail: str(result.specialistWarningDetail, ""),
    estimatedMinutes: num(result.estimatedMinutes, 60),
    estimatedRevisionMinutes: num(result.estimatedRevisionMinutes, 30),
    estimatedAiCost: num(result.estimatedAiCost, 100),
    instantDeliveryLevel: instantLevel,
    availableAgents: (Array.isArray(result.availableAgents) ? result.availableAgents : [])
      .map((entry) => {
        const raw = entry as Record<string, unknown>;
        return { agentId: typeof raw.agentId === "string" ? raw.agentId : "", role: str(raw.role, "") };
      })
      .filter((entry) => validIds.has(entry.agentId)),
    missingRoles: arr(result.missingRoles),
    humanChecks: arr(result.humanChecks),
    externalTools: arr(result.externalTools),
    selfContained: result.selfContained === true,
    workflow,
    applicationMessages: {
      polite: str(messages.polite, ""),
      beginnerFriendly: str(messages.beginnerFriendly, ""),
      short: str(messages.short, ""),
      highValue: str(messages.highValue, ""),
    },
    clientQuestions: {
      polite: str(questions.polite, ""),
      short: str(questions.short, ""),
      friendly: str(questions.friendly, ""),
    },
  };
}
