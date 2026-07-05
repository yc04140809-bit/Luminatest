import { supabase } from "./supabaseClient";

/* ---------- Claude API 呼び出し(Vercelのサーバレス関数を経由・APIキーはブラウザに渡さない) ---------- */
export async function callClaude(messages, system, maxTokens = 1000) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      console.error("callClaude: not logged in");
      return { text: null, error: "auth" };
    }

    const res = await fetch("/api/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, system, maxTokens }),
    });

    if (res.status === 429) {
      return { text: null, error: "limit" };
    }
    if (!res.ok) throw new Error("API " + res.status);

    const data = await res.json();
    return { text: data.text || null, error: null, remaining: data.remaining };
  } catch (e) {
    console.error("Claude API error:", e);
    return { text: null, error: "network" };
  }
}

/* JSON指定の応答を安全にパース(コードフェンス除去+抽出リトライ) */
export function parseJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    const m = text.match(/[[{][\s\S]*[\]}]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
