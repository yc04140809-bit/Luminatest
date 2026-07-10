import type { FastifyInstance } from "fastify";
import { NOTE_EDIT_LEVELS, NOTE_EDIT_MODES, type NoteEditLevelId, type NoteEditModeId } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";
import type { LlmClient } from "../orchestration/llmClient.js";
import { analyzeNoteArticle, editNoteArticle, editNoteSection } from "../orchestration/noteEditor.js";

const EDITOR_AGENT_ID = "agent-nemuri";
/** 記事入力の上限（約2万字）。LLMの入力上限とコスト暴走の両方を防ぐ。 */
const MAX_CONTENT_LENGTH = 20000;
/** 部分編集の選択範囲の上限。 */
const MAX_SECTION_LENGTH = 3000;

function isValidMode(value: unknown): value is NoteEditModeId {
  return NOTE_EDIT_MODES.some((mode) => mode.id === value);
}

function isValidLevel(value: unknown): value is NoteEditLevelId {
  return NOTE_EDIT_LEVELS.some((level) => level.id === value);
}

/**
 * AI Note Editor系のエンドポイント。
 * 将来機能（サムネ案生成・Threads/X/Instagram導線・他プラットフォーム向け整形）も
 * この /api/note/* 配下に追加していく。
 */
export function noteRoutes(llm: LlmClient) {
  return async function registerNoteRoutes(app: FastifyInstance): Promise<void> {
    app.post("/api/note/edit", async (request, reply) => {
      const body = (request.body ?? {}) as { content?: string; mode?: string; level?: string };
      if (!body.content?.trim()) {
        return reply.code(400).send({ error: "content is required" });
      }
      if (body.content.length > MAX_CONTENT_LENGTH) {
        return reply.code(400).send({ error: `記事が長すぎます（${MAX_CONTENT_LENGTH}字以内にしてください）` });
      }
      const editor = officeStore.getAgent(EDITOR_AGENT_ID);
      if (!editor) {
        return reply.code(500).send({ error: "編集担当のAI社員（ネムリ）が見つかりません。エージェント構成を確認してください。" });
      }
      const modeId: NoteEditModeId = isValidMode(body.mode) ? body.mode : "experience";
      const levelId: NoteEditLevelId = isValidLevel(body.level) ? body.level : "readable";

      officeStore.setAgentStatus(editor.id, { status: "writing", currentTaskSummary: "note記事を編集中..." });
      try {
        return await editNoteArticle({ editor, content: body.content.trim(), modeId, levelId, llm });
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      } finally {
        officeStore.setAgentStatus(editor.id, { status: "standby", currentTaskSummary: undefined });
      }
    });

    app.post("/api/note/edit-section", async (request, reply) => {
      const body = (request.body ?? {}) as { section?: string; instruction?: string };
      if (!body.section?.trim() || !body.instruction?.trim()) {
        return reply.code(400).send({ error: "section and instruction are required" });
      }
      if (body.section.length > MAX_SECTION_LENGTH) {
        return reply.code(400).send({ error: `選択範囲が長すぎます（${MAX_SECTION_LENGTH}字以内にしてください）` });
      }
      const editor = officeStore.getAgent(EDITOR_AGENT_ID);
      if (!editor) {
        return reply.code(500).send({ error: "編集担当のAI社員（ネムリ）が見つかりません。エージェント構成を確認してください。" });
      }

      officeStore.setAgentStatus(editor.id, { status: "writing", currentTaskSummary: "部分編集中..." });
      try {
        return await editNoteSection({
          editor,
          sectionText: body.section.trim(),
          instruction: body.instruction.trim().slice(0, 100),
          llm,
        });
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      } finally {
        officeStore.setAgentStatus(editor.id, { status: "standby", currentTaskSummary: undefined });
      }
    });

    app.post("/api/note/analyze", async (request, reply) => {
      const body = (request.body ?? {}) as { content?: string };
      if (!body.content?.trim()) {
        return reply.code(400).send({ error: "content is required" });
      }
      if (body.content.length > MAX_CONTENT_LENGTH) {
        return reply.code(400).send({ error: `記事が長すぎます（${MAX_CONTENT_LENGTH}字以内にしてください）` });
      }
      const editor = officeStore.getAgent(EDITOR_AGENT_ID);
      if (!editor) {
        return reply.code(500).send({ error: "編集担当のAI社員（ネムリ）が見つかりません。エージェント構成を確認してください。" });
      }

      officeStore.setAgentStatus(editor.id, { status: "reviewing", currentTaskSummary: "note記事を診断中..." });
      try {
        return await analyzeNoteArticle({ editor, content: body.content.trim(), llm });
      } catch (error) {
        return reply.code(502).send({ error: (error as Error).message });
      } finally {
        officeStore.setAgentStatus(editor.id, { status: "standby", currentTaskSummary: undefined });
      }
    });
  };
}
