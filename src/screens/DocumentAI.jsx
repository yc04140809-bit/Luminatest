import { useState } from "react";
import { UI } from "../data/constants";
import { Spinner, CopyBtn, SectionTitle } from "../components/ui";
import { callClaude, parseJSON } from "../lib/claude";
import { aiErrorMessage } from "../lib/utils";

const DOC_TYPES = ["業務マニュアル", "報告書", "研修資料", "チェックリスト", "提案書", "議事録"];

/* 生成結果をそのままコピーできる1本のテキストに整形 */
function toPlainText(doc) {
  const lines = [doc.title, ""];
  lines.push(doc.body || "");
  if (doc.bullets && doc.bullets.length) {
    lines.push("");
    doc.bullets.forEach((b) => lines.push(`・${b}`));
  }
  if (doc.cautions && doc.cautions.length) {
    lines.push("");
    lines.push("【注意点】");
    doc.cautions.forEach((c) => lines.push(`・${c}`));
  }
  return lines.join("\n");
}

export default function DocumentAI({ onBack }) {
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    const { text, error: err } = await callClaude(
      [
        {
          role: "user",
          content: `以下の条件で業務文書を作成してください。
書類の種類:${docType}
内容・要望:${input}

次のJSON形式のみで、日本語で実務的に作成してください:
{"title":"書類のタイトル","body":"本文(200〜400字程度の分かりやすい文章)","bullets":["要点・項目1","要点・項目2","要点・項目3"],"cautions":["注意点があれば1〜2個"]}
Markdownや前置きは不要。JSONのみで回答。`,
        },
      ],
      "あなたは日本企業の文書作成を専門とするビジネスライターです。読みやすく実務的な文書を作成します。回答はJSONのみ。",
      1000
    );
    const doc = parseJSON(text);
    if (doc && doc.title && doc.body) setResult(doc);
    else setError(aiErrorMessage(err));
    setLoading(false);
  };

  return (
    <div className="w-full h-screen bg-slate-200 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-50 h-full flex flex-col relative overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 flex items-center gap-2 shrink-0 shadow-md">
          <button onClick={onBack} className="text-amber-200 text-sm shrink-0 mr-0.5">←</button>
          <span className="text-lg">📄</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none tracking-wide">書類作成AI</p>
            <p className="text-xs text-amber-200 mt-0.5">✦ ネムリちゃん・事務担当AI社員</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-10">
          <SectionTitle>書類の種類</SectionTitle>
          <div className="flex flex-wrap gap-2 mb-5">
            {DOC_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setDocType(t)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  docType === t ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <SectionTitle>内容・要望</SectionTitle>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例:入浴介助の手順をまとめた新人向けマニュアルを作りたい"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-28 mb-4 shadow-sm"
          />

          <button onClick={generate} disabled={loading || !input.trim()} className={`w-full py-3 flex items-center justify-center gap-2 mb-4 ${UI.btnPrimary}`}>
            {loading ? (
              <>
                <Spinner light /> ネムリちゃんが作成中…
              </>
            ) : (
              "✨ 書類を生成する"
            )}
          </button>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</p>}

          {result && (
            <div className={`${UI.card} p-4`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-base font-bold text-slate-800">{result.title}</p>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-3">{result.body}</p>

              {result.bullets && result.bullets.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {result.bullets.map((b, i) => (
                    <p key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-indigo-500">・</span>
                      {b}
                    </p>
                  ))}
                </div>
              )}

              {result.cautions && result.cautions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">⚠️ 注意点</p>
                  {result.cautions.map((c, i) => (
                    <p key={i} className="text-xs text-amber-800 leading-relaxed">
                      ・{c}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <CopyBtn text={toPlainText(result)} label="📋 完成文をコピー" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
