import type { FastifyInstance } from "fastify";
import {
  EIGHT_LAYER_FIELDS,
  MARKETING_COPY_MODES,
  MARKETING_COPY_TYPES,
  type EightLayerValues,
  type MarketingCopyDiagnoseRequest,
  type MarketingCopyModeId,
  type MarketingCopyRequest,
  type MarketingCopyRevisionRequest,
  type MarketingCopyTypeId,
} from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";
import type { LlmClient } from "../orchestration/llmClient.js";
import { diagnoseMarketingCopy, generateMarketingCopy, reviseMarketingCopy } from "../orchestration/marketingCopy.js";
import { brandContextForMarketingCopy } from "../orchestration/brandContext.js";

const MARKETER_AGENT_ID = "agent-mirai";
/** 各入力欄の上限（暴走コスト・不正な巨大入力を防ぐ）。8層の1項目や任意項目もこの範囲で十分。 */
const MAX_FIELD_LENGTH = 4000;
/** 完成文章（再生成・診断の対象）の上限。セールスページ等の長文タイプも考慮した余裕あるサイズ。 */
const MAX_COPY_LENGTH = 20000;

function isValidCopyType(value: unknown): value is MarketingCopyTypeId {
  return MARKETING_COPY_TYPES.some((entry) => entry.id === value);
}

function isValidMode(value: unknown): value is MarketingCopyModeId {
  return MARKETING_COPY_MODES.some((entry) => entry.id === value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function tooLong(value: string | undefined): boolean {
  return typeof value === "string" && value.length > MAX_FIELD_LENGTH;
}

/** 8層入力の値を検証しつつ抽出する。長すぎる項目は他の入力欄と同じく400エラーにする（黙って切り詰めない）。 */
function extractEightLayers(value: unknown): { layers?: EightLayerValues; error?: string } {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const layers: EightLayerValues = {};
  for (const field of EIGHT_LAYER_FIELDS) {
    const raw = source[field.key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    if (raw.length > MAX_FIELD_LENGTH) {
      return { error: `各入力欄は${MAX_FIELD_LENGTH}字以内にしてください` };
    }
    layers[field.key] = raw;
  }
  return { layers };
}

export function marketingCopyRoutes(llm: LlmClient) {
  return async function registerMarketingCopyRoutes(app: FastifyInstance): Promise<void> {
    app.post("/api/marketing-copy/generate", async (request, reply) => {
      const body = (request.body ?? {}) as Partial<MarketingCopyRequest>;

      if (!isValidCopyType(body.copyType)) {
        return reply.code(400).send({ error: "文章タイプを選択してください" });
      }
      if (!isValidMode(body.mode)) {
        return reply.code(400).send({ error: "生成モードを選択してください" });
      }
      if (!body.theme?.trim() || !body.audience?.trim() || !body.audienceProblem?.trim() || !body.offer?.trim()) {
        return reply.code(400).send({ error: "テーマ・読者・読者の悩み・紹介したい商品または行動は必須です" });
      }

      const stringFields = [
        body.theme,
        body.audience,
        body.audienceProblem,
        body.offer,
        body.experience,
        body.charLength,
        body.tone,
        body.salesIntensity,
        body.snsPlatform,
        body.productUrl,
        body.noteUrl,
        body.coconalaUrl,
        body.pastPost,
        body.keywords,
        body.avoidPhrases,
      ];
      if (stringFields.some(tooLong)) {
        return reply.code(400).send({ error: `各入力欄は${MAX_FIELD_LENGTH}字以内にしてください` });
      }

      const eightLayersResult = extractEightLayers(body.eightLayers);
      if (eightLayersResult.error) {
        return reply.code(400).send({ error: eightLayersResult.error });
      }

      const marketer = officeStore.getAgent(MARKETER_AGENT_ID);
      if (!marketer) {
        return reply.code(500).send({ error: "マーケティング担当のAI社員（ミライ）が見つかりません。エージェント構成を確認してください。" });
      }

      const brandProfile = officeStore.getBrandProfile();
      const brandContext =
        body.useBrandProfile && brandProfile.enabled ? brandContextForMarketingCopy(brandProfile) : undefined;

      const marketingRequest: MarketingCopyRequest = {
        copyType: body.copyType,
        mode: body.mode,
        theme: body.theme.trim(),
        audience: body.audience.trim(),
        audienceProblem: body.audienceProblem.trim(),
        offer: body.offer.trim(),
        eightLayers: eightLayersResult.layers,
        experience: body.experience?.trim() || undefined,
        charLength: body.charLength?.trim() || undefined,
        tone: body.tone?.trim() || undefined,
        salesIntensity: body.salesIntensity?.trim() || undefined,
        snsPlatform: body.snsPlatform?.trim() || undefined,
        productUrl: body.productUrl?.trim() || undefined,
        noteUrl: body.noteUrl?.trim() || undefined,
        coconalaUrl: body.coconalaUrl?.trim() || undefined,
        pastPost: body.pastPost?.trim() || undefined,
        keywords: body.keywords?.trim() || undefined,
        avoidPhrases: body.avoidPhrases?.trim() || undefined,
      };

      officeStore.setAgentStatus(marketer.id, { status: "writing", currentTaskSummary: "刺さるマーケティング文章を作成中..." });
      try {
        return await generateMarketingCopy({ marketer, request: marketingRequest, brandContext, llm });
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      } finally {
        officeStore.setAgentStatus(marketer.id, { status: "standby", currentTaskSummary: undefined });
      }
    });

    app.post("/api/marketing-copy/revise", async (request, reply) => {
      const body = (request.body ?? {}) as Partial<MarketingCopyRevisionRequest> & { useBrandProfile?: boolean };

      if (!isValidCopyType(body.copyType)) {
        return reply.code(400).send({ error: "文章タイプを選択してください" });
      }
      if (!isValidMode(body.mode)) {
        return reply.code(400).send({ error: "生成モードを選択してください" });
      }
      if (!body.previousCopy?.trim() || !body.instruction?.trim()) {
        return reply.code(400).send({ error: "直前の完成文章と修正指示は必須です" });
      }
      if (body.previousCopy.length > MAX_COPY_LENGTH) {
        return reply.code(400).send({ error: `文章が長すぎます（${MAX_COPY_LENGTH}字以内にしてください）` });
      }
      if (tooLong(body.instruction) || tooLong(body.theme) || tooLong(body.audience) || tooLong(body.audienceProblem) || tooLong(body.offer)) {
        return reply.code(400).send({ error: `各入力欄は${MAX_FIELD_LENGTH}字以内にしてください` });
      }

      const eightLayers = Object.fromEntries(
        EIGHT_LAYER_FIELDS.map((field) => [field.key, str((body.eightLayers as Record<string, string> | undefined)?.[field.key])]),
      ) as Record<(typeof EIGHT_LAYER_FIELDS)[number]["key"], string>;

      const marketer = officeStore.getAgent(MARKETER_AGENT_ID);
      if (!marketer) {
        return reply.code(500).send({ error: "マーケティング担当のAI社員（ミライ）が見つかりません。エージェント構成を確認してください。" });
      }

      const brandProfile = officeStore.getBrandProfile();
      const brandContext =
        body.useBrandProfile && brandProfile.enabled ? brandContextForMarketingCopy(brandProfile) : undefined;

      const revisionRequest: MarketingCopyRevisionRequest = {
        copyType: body.copyType,
        mode: body.mode,
        theme: body.theme?.trim() ?? "",
        audience: body.audience?.trim() ?? "",
        audienceProblem: body.audienceProblem?.trim() ?? "",
        offer: body.offer?.trim() ?? "",
        previousCopy: body.previousCopy.trim(),
        eightLayers,
        instruction: body.instruction.trim(),
      };

      officeStore.setAgentStatus(marketer.id, { status: "writing", currentTaskSummary: "マーケティング文章を修正中..." });
      try {
        return await reviseMarketingCopy({ marketer, request: revisionRequest, brandContext, llm });
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      } finally {
        officeStore.setAgentStatus(marketer.id, { status: "standby", currentTaskSummary: undefined });
      }
    });

    app.post("/api/marketing-copy/diagnose", async (request, reply) => {
      const body = (request.body ?? {}) as Partial<MarketingCopyDiagnoseRequest>;

      if (!isValidCopyType(body.copyType)) {
        return reply.code(400).send({ error: "文章タイプを選択してください" });
      }
      if (!body.finalCopy?.trim()) {
        return reply.code(400).send({ error: "診断対象の文章が必要です" });
      }
      if (body.finalCopy.length > MAX_COPY_LENGTH) {
        return reply.code(400).send({ error: `文章が長すぎます（${MAX_COPY_LENGTH}字以内にしてください）` });
      }
      if (tooLong(body.audience) || tooLong(body.audienceProblem)) {
        return reply.code(400).send({ error: `各入力欄は${MAX_FIELD_LENGTH}字以内にしてください` });
      }

      const reviewer = officeStore.getAgent(MARKETER_AGENT_ID);
      if (!reviewer) {
        return reply.code(500).send({ error: "マーケティング担当のAI社員（ミライ）が見つかりません。エージェント構成を確認してください。" });
      }

      const diagnoseRequest: MarketingCopyDiagnoseRequest = {
        copyType: body.copyType,
        audience: body.audience?.trim() ?? "",
        audienceProblem: body.audienceProblem?.trim() ?? "",
        finalCopy: body.finalCopy.trim(),
      };

      officeStore.setAgentStatus(reviewer.id, { status: "writing", currentTaskSummary: "刺さり診断を作成中..." });
      try {
        return await diagnoseMarketingCopy({ reviewer, request: diagnoseRequest, llm });
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      } finally {
        officeStore.setAgentStatus(reviewer.id, { status: "standby", currentTaskSummary: undefined });
      }
    });
  };
}
