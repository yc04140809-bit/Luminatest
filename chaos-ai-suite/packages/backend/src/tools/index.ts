import { ToolRegistry } from "./toolRegistry.js";
import { notionExportTool } from "./notionExportTool.js";
import { googleDriveExportTool } from "./googleDriveExportTool.js";
import { slackNotifyTool } from "./slackNotifyTool.js";
import { googleCalendarTool } from "./googleCalendarTool.js";
import { snsPostTool } from "./snsPostTool.js";

export type { ToolExecutor, ToolExecutionContext, ToolExecutionResult } from "./types.js";
export { ToolRegistry } from "./toolRegistry.js";

/**
 * アプリ標準の外部ツール一式を登録したレジストリを構築する。
 * - ネムリちゃん（書類作成）: Notion / Google Drive への保存
 * - ミライちゃん（SNS投稿）: X / Instagram への投稿
 * - セイラちゃん（経営サポート）: Googleカレンダー登録 / Slack通知
 */
export function buildToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(notionExportTool);
  registry.register(googleDriveExportTool);
  registry.register(slackNotifyTool);
  registry.register(googleCalendarTool);
  registry.register(snsPostTool);
  return registry;
}
