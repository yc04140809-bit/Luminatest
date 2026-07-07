import type { ToolExecutor } from "./types.js";
import { secretsStore } from "../config/secretsStore.js";

const NOTION_VERSION = "2022-06-28";
/** Notionの1リクエストあたりのchildrenブロック数上限。 */
const MAX_BLOCKS = 100;

type NotionBlock = Record<string, unknown>;

function richTextBlock(type: "heading_1" | "heading_2" | "bulleted_list_item" | "paragraph", text: string): NotionBlock {
  return {
    object: "block",
    type,
    [type]: { rich_text: [{ type: "text", text: { content: text.slice(0, 2000) } }] },
  };
}

/** 簡易Markdown（#見出し・##見出し・- 箇条書き・それ以外は段落）をNotionブロックへ変換する。 */
function markdownToBlocks(markdown: string): NotionBlock[] {
  return markdown
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      if (line.startsWith("## ")) return richTextBlock("heading_2", line.slice(3));
      if (line.startsWith("# ")) return richTextBlock("heading_1", line.slice(2));
      if (line.startsWith("- ") || line.startsWith("* ")) return richTextBlock("bulleted_list_item", line.slice(2));
      return richTextBlock("paragraph", line);
    })
    .slice(0, MAX_BLOCKS);
}

/** ネムリちゃんが報告書・議事録・契約書のMarkdownをNotionデータベースへページとして保存するツール。 */
export const notionExportTool: ToolExecutor = {
  definition: {
    id: "notion_export",
    name: "Notionへ保存",
    description: "報告書・議事録・契約書などのMarkdown本文を、指定したNotionデータベースに新規ページとして保存する。",
    allowedAgentIds: ["agent-nemuri"],
    inputSchema: {
      properties: {
        title: { type: "string", description: "Notionページのタイトル" },
        markdown: { type: "string", description: "保存する本文（簡易Markdown: #見出し1 / ##見出し2 / -箇条書きに対応）" },
      },
      required: ["title", "markdown"],
    },
  },
  async execute({ input }) {
    const apiKey = secretsStore.get("NOTION_API_KEY");
    const databaseId = secretsStore.get("NOTION_DATABASE_ID");
    if (!apiKey || !databaseId) {
      throw new Error("Notion連携が設定されていません。設定画面でNOTION_API_KEY / NOTION_DATABASE_IDを入力してください。");
    }

    const title = String(input.title ?? "無題のドキュメント");
    const markdown = String(input.markdown ?? "");

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: { title: { title: [{ text: { content: title } }] } },
        children: markdownToBlocks(markdown),
      }),
    });

    if (!response.ok) {
      throw new Error(`Notionへの保存に失敗しました (${response.status}): ${await response.text()}`);
    }

    const body = (await response.json()) as { url?: string };
    return {
      summary: `Notionにページ「${title}」を作成しました。${body.url ?? ""}`.trim(),
      data: body,
    };
  },
};
