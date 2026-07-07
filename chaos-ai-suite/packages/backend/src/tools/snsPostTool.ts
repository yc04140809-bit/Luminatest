import type { ToolExecutor, ToolExecutionResult } from "./types.js";
import { secretsStore } from "../config/secretsStore.js";
import { buildTwitterAuthHeader } from "./twitterAuth.js";

const TWITTER_TWEETS_URL = "https://api.twitter.com/2/tweets";
const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

async function postToTwitter(text: string): Promise<ToolExecutionResult> {
  const authHeader = buildTwitterAuthHeader("POST", TWITTER_TWEETS_URL);
  const response = await fetch(TWITTER_TWEETS_URL, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Xへの投稿に失敗しました (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as { data?: { id: string } };
  return { summary: `Xに投稿しました。(tweet id: ${body.data?.id ?? "不明"})`, data: body };
}

async function postToInstagram(text: string, imageUrl: string | undefined): Promise<ToolExecutionResult> {
  const accessToken = secretsStore.get("INSTAGRAM_ACCESS_TOKEN");
  const businessAccountId = secretsStore.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  if (!accessToken || !businessAccountId) {
    throw new Error(
      "Instagram連携が設定されていません。設定画面でINSTAGRAM_ACCESS_TOKEN / INSTAGRAM_BUSINESS_ACCOUNT_IDを入力してください。",
    );
  }
  if (!imageUrl) {
    throw new Error("Instagramへの投稿には画像URL（imageUrl）が必須です（Feed投稿はテキストのみ非対応）。");
  }

  // 1. メディアコンテナを作成
  const containerRes = await fetch(`${GRAPH_API_BASE}/${businessAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption: text, access_token: accessToken }),
  });
  if (!containerRes.ok) {
    throw new Error(`Instagramメディアの準備に失敗しました (${containerRes.status}): ${await containerRes.text()}`);
  }
  const container = (await containerRes.json()) as { id: string };

  // 2. コンテナを公開
  const publishRes = await fetch(`${GRAPH_API_BASE}/${businessAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
  });
  if (!publishRes.ok) {
    throw new Error(`Instagramへの投稿に失敗しました (${publishRes.status}): ${await publishRes.text()}`);
  }
  const published = (await publishRes.json()) as { id: string };
  return { summary: `Instagramに投稿しました。(media id: ${published.id})`, data: published };
}

/**
 * ミライちゃんが代表の承認を得たSNS投稿文を、実際のX(Twitter)またはInstagramアカウントへ投稿するツール。
 * X投稿はOAuth 1.0aのユーザーコンテキスト認証、Instagram投稿はGraph APIの
 * 「メディアコンテナ作成→公開」の2段階フローで実装している（いずれも実プロトコルに準拠）。
 */
export const snsPostTool: ToolExecutor = {
  definition: {
    id: "sns_post",
    name: "SNSへ投稿",
    description: "承認済みのSNS投稿文を、実際のXまたはInstagramアカウントに投稿する。",
    allowedAgentIds: ["agent-mirai"],
    inputSchema: {
      properties: {
        platform: { type: "string", enum: ["twitter", "instagram"], description: "投稿先プラットフォーム" },
        text: { type: "string", description: "投稿文（Instagramではキャプションとして使用）" },
        imageUrl: { type: "string", description: "添付画像の公開URL（Instagramは必須、Xは現状未対応でテキストのみ）" },
      },
      required: ["platform", "text"],
    },
  },
  async execute({ input }) {
    const platform = String(input.platform ?? "");
    const text = String(input.text ?? "").trim();
    if (!text) throw new Error("投稿文が空です。");

    if (platform === "twitter") return postToTwitter(text);
    if (platform === "instagram") return postToInstagram(text, input.imageUrl ? String(input.imageUrl) : undefined);
    throw new Error(`未対応のplatformです: ${platform}（"twitter" または "instagram" を指定してください）`);
  },
};
