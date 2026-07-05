import { createClient } from "@supabase/supabase-js";

/* ============================================================
   Vercel サーバレス関数:Anthropic Claude API への中継役
   - ブラウザには絶対に ANTHROPIC_API_KEY を渡さない
   - リクエストごとにログイン中の本人か確認(Supabaseのトークン検証)
   - 1ユーザー・1ヶ月あたりの呼び出し回数に上限を設けてコストを保護
   ============================================================ */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MONTHLY_LIMIT = parseInt(process.env.MONTHLY_AI_LIMIT || "200", 10);

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    // ---- 1. ログイン確認(SupabaseのアクセストークンをAuthorizationヘッダーから取得) ----
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const userId = userData.user.id;

    // ---- 2. 今月の利用回数を確認(上限を超えていたらAI呼び出し前に止める) ----
    const month = currentMonthKey();
    const { data: usageRow } = await supabaseAdmin.from("api_usage").select("count").eq("user_id", userId).eq("month", month).maybeSingle();
    const usedSoFar = usageRow?.count || 0;
    if (usedSoFar >= MONTHLY_LIMIT) {
      res.status(429).json({ error: "monthly limit reached", limit: MONTHLY_LIMIT, used: usedSoFar });
      return;
    }

    // ---- 3. Anthropic Claude API を呼び出す ----
    const { messages, system, maxTokens } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "invalid request" });
      return;
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: Math.min(Number(maxTokens) || 1000, 4000),
        system,
        messages,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("Anthropic API error:", upstream.status, errText);
      res.status(502).json({ error: "upstream error" });
      return;
    }

    const data = await upstream.json();
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).filter(Boolean).join("\n");

    // ---- 4. 呼び出しに成功した分だけカウントを加算(原子的にupsert) ----
    const { data: newCount, error: rpcErr } = await supabaseAdmin.rpc("increment_ai_usage", { p_user_id: userId, p_month: month });
    if (rpcErr) console.error("increment_ai_usage failed:", rpcErr);

    res.status(200).json({ text, remaining: Math.max(0, MONTHLY_LIMIT - (newCount ?? usedSoFar + 1)) });
  } catch (e) {
    console.error("api/claude fatal error:", e);
    res.status(500).json({ error: "internal error" });
  }
}
