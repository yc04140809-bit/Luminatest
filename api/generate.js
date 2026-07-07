const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY はサーバー側の環境変数から読み込まれる（クライアントには渡らない）

const SUBSIDY_NAMES = {
  jizokuka: "小規模事業者持続化補助金",
  it: "IT導入補助金",
  monodukuri: "ものづくり補助金",
  saikouchiku: "事業再構築補助金",
};

const MAX_FIELD_LENGTH = 1000;

const SECTION_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["title", "content"],
        additionalProperties: false,
      },
    },
  },
  required: ["sections"],
  additionalProperties: false,
};

function validateField(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_FIELD_LENGTH;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { subsidyKey, bizName, industry, bizContent, issue, goal, numbers, budget } = req.body || {};
  const subsidyName = SUBSIDY_NAMES[subsidyKey];

  const required = { bizName, industry, bizContent, issue, goal };
  const missing = Object.entries(required).filter(([, v]) => !validateField(v));

  if (!subsidyName || missing.length > 0) {
    res.status(400).json({ error: "必須項目が不足しているか、入力が長すぎます" });
    return;
  }
  if ((numbers && numbers.length > MAX_FIELD_LENGTH) || (budget && budget.length > MAX_FIELD_LENGTH)) {
    res.status(400).json({ error: "入力が長すぎます" });
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: SECTION_SCHEMA },
      },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      system: `あなたは日本の中小企業向け補助金申請書の作成を支援する専門コンサルタントです。
必ずWeb検索ツールを使い、対象の補助金の最新の公募要領・申請要件・締切・補助率・補助上限額を確認したうえで、
その内容に沿った申請書の下書きを日本語で作成してください。
出力は与えられたJSONスキーマに厳密に従い、各セクションの title と content のみを含めてください。
本文には事業者から提供された具体的な情報を反映し、公募要領が求める章立て・観点を満たす構成にしてください。
最後のセクションとして「最新の公募要領について」を追加し、検索で確認できた締切・補助率・情報の時点・出典URLを明記してください（分からない場合はその旨を明記）。`,
      messages: [
        {
          role: "user",
          content: `補助金名: ${subsidyName}
事業者名: ${bizName}
業種: ${industry}
事業内容: ${bizContent}
現在の課題: ${issue}
補助金で実現したいこと: ${goal}
数値目標: ${numbers || "(未入力)"}
予算: ${budget || "(未入力)"}

上記の情報をもとに、${subsidyName}の申請書の下書きをセクションごとに作成してください。`,
        },
      ],
    });

    const textBlocks = response.content.filter((b) => b.type === "text");
    const finalText = textBlocks.length ? textBlocks[textBlocks.length - 1].text : null;

    if (!finalText) {
      res.status(502).json({ error: "AIから有効な応答が得られませんでした" });
      return;
    }

    const parsed = JSON.parse(finalText);
    res.status(200).json({ sections: parsed.sections });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AIによる生成中にエラーが発生しました: " + err.message });
  }
};
