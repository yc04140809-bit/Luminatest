import type {
  Agent,
  CaseQualityResult,
  CaseRequirements,
  ClientQuestions,
  DeliveryPack,
} from "@chaos-ai-suite/shared";
import type { LlmClient } from "./llmClient.js";

/**
 * 案件工房のAI処理。すべて「1回のツール強制呼び出しで構造化結果を返す」既存パターン。
 * 各処理は担当領域に合うAI社員の人格（systemPrompt）で実行する:
 * 要件整理=セイラ / 工程生成=レヴィ / 成果物=工程の担当AI / 品質チェック=ケイオス / 確認文・納品パック=ネムリ。
 * 担当が削除されている場合は呼び出し側でフォールバックしたAgentが渡される。
 */

const REQUIREMENTS_MAX_TOKENS = 2500;
const QUESTIONS_MAX_TOKENS = 1800;
const TASKS_MAX_TOKENS = 2500;
const DELIVERABLE_MAX_TOKENS = 6000;
const QUALITY_MAX_TOKENS = 2000;
const DELIVERY_PACK_MAX_TOKENS = 4000;

const NO_INVENTION_RULE = `絶対ルール:
- 依頼文に書かれている内容だけを根拠として整理すること
- 書かれていない情報は推測で補完せず、文字列項目は「未確認」、配列項目は空にすること
- 依頼文にない事実・数字・条件を勝手に追加しないこと`;

function str(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "未確認";
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

/** 依頼文 → 要件整理（1回の呼び出し）。 */
export async function organizeCaseRequirements(params: {
  agent: Agent;
  requestText: string;
  llm: LlmClient;
}): Promise<CaseRequirements> {
  const { agent, requestText, llm } = params;

  const userPrompt = `# クライアントからの依頼文
${requestText}

# 指示
あなたは案件要件を整理する業務アシスタントです。上記の依頼文を以下の項目に整理してください。

${NO_INVENTION_RULE}

- questionsForClient: クライアントへ確認が必要な内容を、相手が答えやすい質問形式で作成する。
  不要に質問数を増やさず、案件の品質や納期に影響する重要な確認事項を優先する（最大5個程度）。
- workSteps: 依頼文から読み取れる範囲での想定作業工程（不明なら一般的な工程ではなく空にする）。`;

  const result = await llm.callTool<Record<string, unknown>>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: REQUIREMENTS_MAX_TOKENS,
    toolName: "submit_case_requirements",
    toolDescription: "依頼文から整理した案件要件を記録する",
    toolSchema: {
      properties: {
        purpose: { type: "string", description: "依頼の目的（不明なら「未確認」）" },
        audience: { type: "string", description: "対象読者・対象者（不明なら「未確認」）" },
        deliverables: { type: "array", items: { type: "string" }, description: "必要な成果物" },
        desiredDeadline: { type: "string", description: "希望納期（不明なら「未確認」）" },
        tone: { type: "string", description: "希望する雰囲気・口調（不明なら「未確認」）" },
        mustConditions: { type: "array", items: { type: "string" }, description: "必須条件" },
        prohibitions: { type: "array", items: { type: "string" }, description: "禁止事項" },
        references: { type: "array", items: { type: "string" }, description: "参考情報" },
        missingInfo: { type: "array", items: { type: "string" }, description: "不足している情報" },
        questionsForClient: { type: "array", items: { type: "string" }, description: "クライアントへ確認すべき質問" },
        workSteps: { type: "array", items: { type: "string" }, description: "想定作業工程" },
        risks: { type: "array", items: { type: "string" }, description: "想定されるリスク" },
        completionCriteria: { type: "string", description: "完了条件（不明なら「未確認」）" },
      },
      required: [
        "purpose", "audience", "deliverables", "desiredDeadline", "tone", "mustConditions",
        "prohibitions", "references", "missingInfo", "questionsForClient", "workSteps", "risks", "completionCriteria",
      ],
    },
  });

  return {
    purpose: str(result.purpose),
    audience: str(result.audience),
    deliverables: arr(result.deliverables),
    desiredDeadline: str(result.desiredDeadline),
    tone: str(result.tone),
    mustConditions: arr(result.mustConditions),
    prohibitions: arr(result.prohibitions),
    references: arr(result.references),
    missingInfo: arr(result.missingInfo),
    questionsForClient: arr(result.questionsForClient),
    workSteps: arr(result.workSteps),
    risks: arr(result.risks),
    completionCriteria: str(result.completionCriteria),
  };
}

/** 不足情報・質問 → クライアント確認文3種（1回の呼び出し）。 */
export async function generateClientQuestions(params: {
  agent: Agent;
  missingInfo: string[];
  questions: string[];
  llm: LlmClient;
}): Promise<ClientQuestions> {
  const { agent, missingInfo, questions, llm } = params;

  const userPrompt = `# 不足している情報
${missingInfo.length > 0 ? missingInfo.map((item) => `- ${item}`).join("\n") : "（なし）"}

# クライアントへ確認すべき質問
${questions.length > 0 ? questions.map((item) => `- ${item}`).join("\n") : "（なし）"}

# 指示
上記をもとに、クライアントへ送る確認メッセージを3種類作成してください。
- polite: 丁寧なビジネス文（ですます調、感謝の一言つき）
- friendly: 親しみやすい文（柔らかい口調、絵文字は使わない）
- short: 短い文（要点のみ、3行以内）
質問は相手が答えやすい形に整え、番号付きで列挙すること。押し付けがましくしないこと。`;

  const result = await llm.callTool<{ polite: string; friendly: string; short: string }>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: QUESTIONS_MAX_TOKENS,
    toolName: "submit_client_questions",
    toolDescription: "クライアントへの確認文3種を記録する",
    toolSchema: {
      properties: {
        polite: { type: "string", description: "丁寧な確認文" },
        friendly: { type: "string", description: "親しみやすい確認文" },
        short: { type: "string", description: "短い確認文" },
      },
      required: ["polite", "friendly", "short"],
    },
  });

  return { polite: result.polite ?? "", friendly: result.friendly ?? "", short: result.short ?? "" };
}

function rosterText(roster: Agent[]): string {
  return roster
    .filter((agent) => agent.enabled)
    .map((agent) => `- id: ${agent.id} / 名前: ${agent.name} / 担当: ${agent.title} / 得意: ${agent.responsibilities.slice(0, 2).join("、")}`)
    .join("\n");
}

export interface GeneratedCaseTask {
  title: string;
  assignedAgentId: string;
  description: string;
  completionCriteria: string;
}

/** 要件 → 作業工程一覧（1回の呼び出し）。担当は現在のAI社員名簿から選ばせる。 */
export async function generateCaseTasks(params: {
  agent: Agent;
  requirementsText: string;
  roster: Agent[];
  llm: LlmClient;
}): Promise<GeneratedCaseTask[]> {
  const { agent, requirementsText, roster, llm } = params;
  const validIds = new Set(roster.map((entry) => entry.id));

  const userPrompt = `# 案件の要件
${requirementsText}

# 現在のAI社員名簿（担当割り当てに使う）
${rosterText(roster)}

# 指示
この案件を完了させるための作業工程を、必ず3個以上7個以内に分解して出力してください（空のtasksは不可）。
- 各工程は1回の作業で完了できる単位にする
- assignedAgentIdは名簿のidから、その工程の内容に最も合う社員を選ぶ。判断できない場合は空文字にする
- completionCriteriaは「何ができていれば完了か」を具体的に書く
- 要件に「未確認」の項目が多い場合も、確認作業を工程に含めるなどして必ず工程を作ること`;

  const result = await llm.callTool<{ tasks: GeneratedCaseTask[] }>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: TASKS_MAX_TOKENS,
    toolName: "submit_case_tasks",
    toolDescription: "案件の作業工程一覧を記録する",
    toolSchema: {
      properties: {
        tasks: {
          type: "array",
          description: "作業工程3〜7個（空配列は不可）",
          minItems: 3,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "工程名" },
              assignedAgentId: { type: "string", description: "担当AI社員のid（判断できなければ空文字）" },
              description: { type: "string", description: "作業内容" },
              completionCriteria: { type: "string", description: "完了条件" },
            },
            required: ["title", "assignedAgentId", "description", "completionCriteria"],
          },
        },
      },
      required: ["tasks"],
    },
  });

  const tasks = (Array.isArray(result.tasks) ? result.tasks : []).map((task) => ({
    title: task.title ?? "",
    assignedAgentId: validIds.has(task.assignedAgentId) ? task.assignedAgentId : "",
    description: task.description ?? "",
    completionCriteria: task.completionCriteria ?? "",
  }));
  if (tasks.length === 0) {
    throw new Error("工程を生成できませんでした。もう一度「作業工程を作成する」を押してください。");
  }
  return tasks;
}

/** 工程1件分の成果物作成（または修正指示による再作成）。 */
export async function generateCaseDeliverable(params: {
  agent: Agent;
  caseTitle: string;
  requirementsText: string;
  taskTitle: string;
  taskDescription: string;
  completionCriteria: string;
  currentDraft?: string;
  instruction?: string;
  /** ケイオス師匠ブランド設定の反映が有効な場合のみ渡す（brandContextForProduct() の出力） */
  brandContext?: string;
  llm: LlmClient;
}): Promise<{ title: string; content: string }> {
  const { agent, llm } = params;

  const revisionBlock = params.currentDraft
    ? `# 現在の成果物（これを「${params.instruction ?? "改善"}」の方針で修正する）
${params.currentDraft}
`
    : "";

  const userPrompt = `# 案件
${params.caseTitle}

# 案件の要件（この範囲を守ること。要件にない事実を創作しない）
${params.requirementsText}

# 担当する工程
工程名: ${params.taskTitle}
作業内容: ${params.taskDescription}
完了条件: ${params.completionCriteria}

${revisionBlock}
${params.brandContext ? `${params.brandContext}\n\n` : ""}# 指示
${
  params.currentDraft
    ? `現在の成果物を「${params.instruction ?? "改善"}」の方針で修正した完成版を出力してください。修正方針に関係ない部分は変えないこと。`
    : "この工程の成果物を、クライアントへそのまま見せられる完成度で作成してください。"
}
成果物はテキストとして完結させ、前置きや説明は含めないこと。`;

  const result = await llm.callTool<{ title: string; content: string }>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: DELIVERABLE_MAX_TOKENS,
    toolName: "submit_case_deliverable",
    toolDescription: "工程の成果物を記録する",
    toolSchema: {
      properties: {
        title: { type: "string", description: "成果物のタイトル（20字以内）" },
        content: { type: "string", description: "成果物の本文" },
      },
      required: ["title", "content"],
    },
  });

  return { title: result.title ?? params.taskTitle, content: result.content ?? "" };
}

/** 案件全体の品質チェック（1回の呼び出し）。 */
export async function checkCaseQuality(params: {
  agent: Agent;
  requirementsText: string;
  deliverablesText: string;
  llm: LlmClient;
}): Promise<CaseQualityResult> {
  const { agent, requirementsText, deliverablesText, llm } = params;

  const userPrompt = `# 案件の要件
${requirementsText}

# 成果物（全件）
${deliverablesText}

# 指示
納品前の品質チェックを行ってください。確認観点:
依頼目的を満たしているか / 必須条件を満たしているか / 禁止事項に違反していないか /
誤解を招く表現がないか / 根拠のない断定がないか / 読みやすいか / 納品可能な状態か

- verdict: "ok"（納品可能）/ "minor"（軽微な修正が必要）/ "fix"（要修正）
- issues: 修正が必要な箇所（どの成果物のどこか分かるように。なければ空）
- questionsForClient: クライアントへ確認が必要な箇所（なければ空）
採点は甘くせず、実際に納品して問題ないかの基準で判断すること。`;

  const result = await llm.callTool<{
    verdict: string;
    summary: string;
    issues: string[];
    questionsForClient: string[];
  }>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: QUALITY_MAX_TOKENS,
    toolName: "submit_quality_check",
    toolDescription: "案件の品質チェック結果を記録する",
    toolSchema: {
      properties: {
        verdict: { type: "string", enum: ["ok", "minor", "fix"], description: "3段階判定" },
        summary: { type: "string", description: "総評（1〜3文）" },
        issues: { type: "array", items: { type: "string" }, description: "修正が必要な箇所" },
        questionsForClient: { type: "array", items: { type: "string" }, description: "クライアントへ確認が必要な箇所" },
      },
      required: ["verdict", "summary", "issues", "questionsForClient"],
    },
  });

  const verdict = result.verdict === "ok" || result.verdict === "minor" || result.verdict === "fix" ? result.verdict : "minor";
  return {
    verdict,
    summary: result.summary ?? "",
    issues: arr(result.issues),
    questionsForClient: arr(result.questionsForClient),
  };
}

/** 納品パック3種（1回の呼び出し）。 */
export async function generateDeliveryPack(params: {
  agent: Agent;
  caseTitle: string;
  clientName: string;
  deliverablesSummary: string;
  llm: LlmClient;
}): Promise<DeliveryPack> {
  const { agent, llm } = params;

  const userPrompt = `# 案件
${params.caseTitle}
クライアント: ${params.clientName || "（名前未設定。宛名は「この度はご依頼いただき」等で自然に）"}

# 納品する成果物
${params.deliverablesSummary}

# 指示
納品時にクライアントへ送るメッセージを3種類作成してください。
各メッセージには以下をすべて自然な流れで含めること:
納品の挨拶 / 成果物の説明 / 使用方法 / 注意事項 / 修正対応について / お礼 /
次回依頼への自然な案内 / 実績として掲載してよいかの丁寧なお願い

- coconala: ココナラの取引メッセージ向け（丁寧だが堅すぎない。正式な回答・評価への言及は控えめに）
- business: 丁寧なビジネス向け（ですます調、フォーマル）
- casual: 親しみやすい個人向け（柔らかい口調）
誇大な約束・過度な営業はしないこと。`;

  const result = await llm.callTool<{ coconala: string; business: string; casual: string }>({
    systemPrompt: agent.systemPrompt,
    userPrompt,
    model: agent.model.model,
    temperature: agent.model.temperature,
    maxTokens: DELIVERY_PACK_MAX_TOKENS,
    toolName: "submit_delivery_pack",
    toolDescription: "納品メッセージ3種を記録する",
    toolSchema: {
      properties: {
        coconala: { type: "string", description: "ココナラ向け納品メッセージ" },
        business: { type: "string", description: "丁寧なビジネス向け納品メッセージ" },
        casual: { type: "string", description: "親しみやすい個人向け納品メッセージ" },
      },
      required: ["coconala", "business", "casual"],
    },
  });

  return { coconala: result.coconala ?? "", business: result.business ?? "", casual: result.casual ?? "" };
}
