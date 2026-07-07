import type { ToolExecutor } from "./types.js";
import { secretsStore } from "../config/secretsStore.js";

/** セイラちゃんがタスクのリマインド・重要な意思決定をSlackへ通知するツール（Incoming Webhook）。 */
export const slackNotifyTool: ToolExecutor = {
  definition: {
    id: "slack_notify",
    name: "Slackへ通知",
    description: "リマインドや重要な意思決定を、設定済みのSlackチャンネル（Incoming Webhook）へ通知する。",
    allowedAgentIds: ["agent-sayla"],
    inputSchema: {
      properties: {
        message: { type: "string", description: "Slackに投稿する通知本文" },
      },
      required: ["message"],
    },
  },
  async execute({ input }) {
    const webhookUrl = secretsStore.get("SLACK_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("Slack連携が設定されていません。設定画面でSLACK_WEBHOOK_URLを入力してください。");
    }

    const message = String(input.message ?? "").trim();
    if (!message) throw new Error("通知メッセージが空です。");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      throw new Error(`Slackへの通知に失敗しました (${response.status}): ${await response.text()}`);
    }

    return { summary: `Slackへ通知しました:「${message.slice(0, 60)}${message.length > 60 ? "…" : ""}」` };
  },
};
