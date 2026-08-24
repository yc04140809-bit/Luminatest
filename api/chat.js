// Vercelサーバーレス関数: /api/chat
// index.html の sendToAI() から呼び出され、Claude APIにリクエストを中継する。
// APIキーはここ(サーバー側)でのみ扱い、ブラウザには渡さない。
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

  const { systemPrompt, history, message } = req.body || {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const messages = (Array.isArray(history) ? history : [])
    .filter(m => m && typeof m.text === "string")
    .slice(-20)
    .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }))
    .concat([{ role: "user", content: message }]);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 512,
        system: typeof systemPrompt === "string" ? systemPrompt : "",
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(502).json({ error: "Anthropic API error", detail });
      return;
    }

    const data = await response.json();
    const reply = (data.content || []).map(block => block.text || "").join("").trim();
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: "Request failed", detail: String(err) });
  }
};
