/**
 * 統合設計書 Phase G: ケイオスちゃん実AI接続用 BFF (Vercel Serverless Function)
 *
 * このファイルは Vercel にデプロイして初めて動作する。GitHub Pages 側
 * (koufuku-ai.html) は静的ホスティングで秘密鍵を安全に保持できないため、
 * APIキーは必ずこちら(Vercelの環境変数)側だけで保持し、フロントエンドの
 * コードには一切書かない。
 *
 * フロント(Phase F の requestKaosuAiReply())から届く body は
 * buildKaosuAiPrompt() の戻り値そのもの:
 *   { system, userContext, recentConversation, currentMessage, intent }
 * この形を壊さないことが最優先。ここではその4項目をAnthropicの
 * Messages API向けに組み立て直すだけで、Phase E/Fのプロンプト構造・
 * 選定ロジックには一切手を加えない。
 *
 * 返却する JSON は { reply: "ケイオスちゃんの返答" } の1個だけ。
 * 失敗時は必ず non-2xx を返す(= フロント側のrequestKaosuAiReply()が
 * 例外として検知し、既存ルールベース応答へ自動フォールバックする)。
 *
 * 必要な環境変数 (Vercel Project Settings > Environment Variables):
 *   ANTHROPIC_API_KEY  (必須) Anthropic Consoleで発行したAPIキー
 *   ANTHROPIC_MODEL    (任意) 未設定時は既定モデル(claude-sonnet-4)を使用
 *   KAOSU_ALLOWED_ORIGIN (任意) CORSで許可するオリジンを追加/上書きしたい場合のみ
 */

// Providerに依存する部分はこの1関数だけに隔離してある。将来
// 他のAI Providerへ切り替える場合は、この関数と同じ入出力の
// 別関数を用意し、呼び出し側の1行を差し替えるだけでよい。
async function callAnthropic({ system, userMessages, timeoutMs }) {
  // 調査用の常時ログ(KAOSU_DEBUG_LOGに関係なく出す)。ANTHROPIC_API_KEYの
  // 値そのものは出さず、設定の有無(boolean)だけを出す。原因切り分けが
  // 済んだら削除して良い一時的な診断ログ。
  console.log("[kaosu-chat] entering callAnthropic");
  console.log("[kaosu-chat] API KEY =", !!process.env.ANTHROPIC_API_KEY);
  console.log("[kaosu-chat] fetch =", typeof fetch);
  // 実行環境にグローバルfetchが無い場合(古いNode.jsランタイムに固定されて
  // いる等)、fetch(...)行そのものが例外を投げて「1回も外部通信していない
  // のに502で終了する」という区別しにくい失敗を起こす。ここで明示的に
  // 検知し、ログだけですぐ原因が分かるメッセージにしておく。
  if (typeof fetch !== "function") {
    throw new Error(
      "global fetch is unavailable in this runtime (Node.js version: " +
        String(process.version) +
        "). Vercelプロジェクトの Settings > General > Node.js Version を18.x以降に設定してください。"
    );
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system,
        messages: userMessages,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic API HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data && Array.isArray(data.content) && data.content[0] && data.content[0].text;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("Anthropic API returned no text content");
    }
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

// buildKaosuRecentConversationText() (Phase F, フロント側) が作る
// "USER: ...\nケイオス: ...\n..." 形式のテキストを、Anthropic Messages API
// が期待する {role, content} の配列へ変換するだけの変換関数。
// 直近会話の生成ロジック自体はフロント側のまま変更しない。
function parseRecentConversation(text) {
  if (!text) return [];
  const lines = text.split("\n").filter(Boolean);
  const messages = [];
  for (const line of lines) {
    if (line.startsWith("USER: ")) {
      messages.push({ role: "user", content: line.slice("USER: ".length) });
    } else if (line.startsWith("ケイオス: ")) {
      messages.push({ role: "assistant", content: line.slice("ケイオス: ".length) });
    }
    // 想定外の行はプロンプト構造を壊さないよう無視する
  }
  return messages;
}

function buildAllowedOrigins() {
  const origins = [
    "https://yc04140809-bit.github.io",
    "http://localhost:8791",
    "http://localhost:3000",
  ];
  if (process.env.KAOSU_ALLOWED_ORIGIN) {
    origins.push(process.env.KAOSU_ALLOWED_ORIGIN);
  }
  return origins;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed = buildAllowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// 開発確認用ログ。KAOSU_DEBUG_LOG=1 の時だけ動く(既定では出力しない)。
// APIキー・Authorization Header・USER CONTEXTの中身は絶対に出さない。
function debugLog(...args) {
  if (process.env.KAOSU_DEBUG_LOG === "1") {
    console.log("[kaosu-chat]", ...args);
  }
}

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const system = typeof body.system === "string" ? body.system : "";
  const userContext = typeof body.userContext === "string" ? body.userContext : "";
  const recentConversation = typeof body.recentConversation === "string" ? body.recentConversation : "";
  const currentMessage = typeof body.currentMessage === "string" ? body.currentMessage.trim() : "";

  if (!currentMessage) {
    res.status(400).json({ error: "currentMessage is required" });
    return;
  }

  // USER CONTEXTはsystemプロンプトの一部として渡す(画面に出さない・
  // 「〜と記録されています」のように読み上げないというPhase E/Fの
  // ルールはsystem本文側に既に書かれているので、ここでは単純に
  // 連結するだけ)。
  const fullSystem = userContext
    ? `${system}\n\n以下はユーザーの記録から分かる範囲の参考情報です。会話に自然に活かしてください。読み上げたり、そのまま引用したりしないでください。\n${userContext}`
    : system;

  const userMessages = [
    ...parseRecentConversation(recentConversation),
    { role: "user", content: currentMessage },
  ];

  const startedAt = Date.now();
  try {
    const reply = await callAnthropic({
      system: fullSystem,
      userMessages,
      timeoutMs: 10000, // フロント側12秒より短く設定し、必ずBFF側で先に決着させる
    });
    debugLog("ok", "intent=" + (body.intent || "unknown"), "latencyMs=" + (Date.now() - startedAt));
    res.status(200).json({ reply });
  } catch (error) {
    // API失敗時は常にVercelのFunction Logsへ原因を出す(デバッグフラグに
    // 関係なく)。出すのはエラーメッセージのみ。APIキー・Authorization
    // Header・USER CONTEXTの中身は一切含めない。
    console.error(
      "[kaosu-chat] Anthropic API call failed",
      "intent=" + (body.intent || "unknown"),
      String(error && error.message)
    );
    debugLog("error", "intent=" + (body.intent || "unknown"), String(error && error.message));
    res.status(502).json({ error: "ai_upstream_failed" });
  }
};
