import { createHmac, randomBytes } from "node:crypto";
import { secretsStore } from "../config/secretsStore.js";

interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function getCredentials(): TwitterCredentials {
  const apiKey = secretsStore.get("TWITTER_API_KEY");
  const apiSecret = secretsStore.get("TWITTER_API_SECRET");
  const accessToken = secretsStore.get("TWITTER_ACCESS_TOKEN");
  const accessTokenSecret = secretsStore.get("TWITTER_ACCESS_TOKEN_SECRET");
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error(
      "X (Twitter) の認証情報が設定されていません。設定画面でTWITTER_API_KEY / TWITTER_API_SECRET / " +
        "TWITTER_ACCESS_TOKEN / TWITTER_ACCESS_TOKEN_SECRETを入力してください。" +
        "※ 投稿にはアプリ単体のBearer Token（App-onlyトークン）では不十分で、" +
        "ユーザーコンテキストのOAuth 1.0aクレデンシャル4点が必要です。",
    );
  }
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

/**
 * X API v2へのリクエスト用に、OAuth 1.0aの署名済みAuthorizationヘッダーを生成する。
 * v2のJSON body系エンドポイントでは、署名対象パラメータはoauth_*のみ
 * （リクエストボディやクエリパラメータは署名ベース文字列に含めない）。
 */
export function buildTwitterAuthHeader(method: string, url: string): string {
  const credentials = getCredentials();
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };

  const parameterString = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key]!)}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(parameterString)}`;
  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(credentials.accessTokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const header = Object.keys(headerParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key]!)}"`)
    .join(", ");

  return `OAuth ${header}`;
}
