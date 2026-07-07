import { createSign } from "node:crypto";
import { secretsStore } from "../config/secretsStore.js";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/** スコープの組み合わせごとにアクセストークンをキャッシュし、毎回署名し直すのを避ける。 */
const tokenCache = new Map<string, CachedToken>();

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getServiceAccountCredentials(): { email: string; privateKey: string } {
  const email = secretsStore.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = secretsStore.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  if (!email || !privateKey) {
    throw new Error(
      "Googleサービスアカウントが設定されていません。設定画面でGOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEYを入力してください。",
    );
  }
  return { email, privateKey };
}

/**
 * Googleサービスアカウントの秘密鍵でJWTを自己署名し、OAuth2トークンエンドポイントで
 * アクセストークンに交換する（ユーザーの対話的な同意画面なしにサーバー間で完結するservice-account認可）。
 * 対象のカレンダー/Driveフォルダは、事前にこのサービスアカウントのメールアドレスへ共有しておく必要がある。
 * Calendar / Drive の両ツールから共通で利用する。
 */
export async function getGoogleAccessToken(scopes: string[]): Promise<string> {
  const cacheKey = scopes.join(" ");
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.accessToken;
  }

  const { email, privateKey } = getServiceAccountCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = { iss: email, scope: cacheKey, aud: TOKEN_ENDPOINT, iat: now, exp: now + 3600 };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey);
  const jwt = `${signingInput}.${base64url(signature)}`;

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google認証に失敗しました (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache.set(cacheKey, { accessToken: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 });
  return body.access_token;
}
