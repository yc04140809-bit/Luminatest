import { useState } from "react";
import { UI, INDUSTRIES } from "../data/constants";
import { Spinner, CopyBtn, SectionTitle } from "../components/ui";
import { callClaude, parseJSON } from "../lib/claude";
import { aiErrorMessage } from "../lib/utils";

/* 生成結果をそのままコピーできる1本のテキストに整形 */
function toPlainText(m) {
  const lines = [`【研修資料】${m.title}`, "", `■ 研修の目的\n${m.purpose}`, "", `■ 研修内容\n${m.content}`, "", `■ ロールプレイ例\n${m.rolePlay}`];
  if (m.quiz && m.quiz.length) {
    lines.push("", "■ 確認テスト");
    m.quiz.forEach((q, i) => {
      lines.push(`Q${i + 1}. ${q.question}`);
      (q.choices || []).forEach((c, j) => lines.push(`  ${["A", "B", "C"][j]}. ${c}${j === q.answer ? "(正解)" : ""}`));
    });
  }
  if (m.checklist && m.checklist.length) {
    lines.push("", "■ 管理者向けチェック項目");
    m.checklist.forEach((c) => lines.push(`・${c}`));
  }
  return lines.join("\n");
}

const MODES = [
  { id: "free", label: "🖊️ フリーワード" },
  { id: "form", label: "📝 入力式" },
];

const SYSTEM_PROMPT =
  "あなたは接遇・クレーム対応・新人教育に強い研修設計の専門家です。介護・医療・小売・飲食など現場に即した実務的な研修を設計します。回答はJSONのみ。";

const RESPONSE_SPEC = `次のJSON形式のみで、日本語で実務的な研修構成を作成してください:
{"title":"研修タイトル","purpose":"研修の目的(100字程度)","content":"研修内容(構成が分かるように300〜500字程度)","rolePlay":"ロールプレイ例(具体的な場面設定とセリフ例)","quiz":[{"question":"確認テストの問題文","choices":["選択肢A","選択肢B","選択肢C"],"answer":正解のindex(0〜2)}],"checklist":["管理者が研修後に確認すべき項目を3〜4個"]}
quizは2問作成してください。Markdownや前置きは不要。JSONのみで回答してください。`;

export default function TrainingMaterialAI({ onBack }) {
  const [mode, setMode] = useState("free");
  const [freeText, setFreeText] = useState("");
  const [theme, setTheme] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0].id);
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const canGenerate = mode === "free" ? freeText.trim().length > 0 : theme.trim().length > 0;

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError("");
    setResult(null);
    const industryLabel = INDUSTRIES.find((i) => i.id === industry)?.label || "共通";
    const content =
      mode === "free"
        ? `研修についての要望(自由記述):
${freeText}

上記の要望から、研修テーマ・対象業種・研修の目的を読み取り(書かれていない項目は内容に合わせて提案し)、${RESPONSE_SPEC}`
        : `研修テーマ:${theme}
対象業種:${industryLabel}
研修の目的:${purpose || "特になし(テーマに合わせて設定してください)"}

${RESPONSE_SPEC}`;
    const { text, error: err } = await callClaude([{ role: "user", content }], SYSTEM_PROMPT, 1600);
    const parsed = parseJSON(text);
    if (parsed && parsed.title && parsed.content) setResult(parsed);
    else setError(aiErrorMessage(err));
    setLoading(false);
  };

  return (
    <div className="w-full h-screen bg-slate-200 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-50 h-full flex flex-col relative overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 flex items-center gap-2 shrink-0 shadow-md">
          <button onClick={onBack} className="text-amber-200 text-sm shrink-0 mr-0.5">←</button>
          <span className="text-lg">🎓</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none tracking-wide">研修資料AI</p>
            <p className="text-xs text-amber-200 mt-0.5">✦ アリアちゃん・教育担当AI社員</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-10">
          <div className="flex gap-2 mb-4">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 text-xs font-bold px-3 py-2 rounded-full transition-colors ${
                  mode === m.id ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "free" ? (
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-600 mb-1.5">作りたい研修について自由に書いてください</p>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="例:介護施設の新人向けに、クレーム対応の基本を学べる研修を作りたい。1人でも初期対応できるようになってほしい。"
                className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-32 shadow-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">対象業種や研修の目的など書かれていない項目は、アリアちゃんが内容に合わせて提案します。</p>
            </div>
          ) : (
            <>
              <SectionTitle>研修テーマ</SectionTitle>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="例:クレーム対応の基本"
                className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none mb-4 shadow-sm"
              />

              <SectionTitle>対象業種</SectionTitle>
              <div className="flex flex-wrap gap-2 mb-4">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => setIndustry(ind.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                      industry === ind.id ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200"
                    }`}
                  >
                    {ind.icon} {ind.label}
                  </button>
                ))}
              </div>

              <SectionTitle>研修の目的(任意)</SectionTitle>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="例:新人スタッフが1人でも初期対応できるようにしたい"
                className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-20 mb-4 shadow-sm"
              />
            </>
          )}

          <button onClick={generate} disabled={loading || !canGenerate} className={`w-full py-3 flex items-center justify-center gap-2 mb-4 ${UI.btnPrimary}`}>
            {loading ? (
              <>
                <Spinner light /> アリアちゃんが構成中…
              </>
            ) : (
              "✨ 研修資料を生成する"
            )}
          </button>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</p>}

          {result && (
            <div className={`${UI.card} p-4 space-y-4`}>
              <div>
                <p className="text-base font-bold text-slate-800 mb-1">{result.title}</p>
                <p className="text-xs font-bold text-indigo-600 mb-1">研修の目的</p>
                <p className="text-sm text-slate-700 leading-relaxed">{result.purpose}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-indigo-600 mb-1">研修内容</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.content}</p>
              </div>

              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs font-bold text-indigo-700 mb-1">🎭 ロールプレイ例</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.rolePlay}</p>
              </div>

              {result.quiz && result.quiz.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-indigo-600 mb-2">📝 確認テスト</p>
                  <div className="space-y-3">
                    {result.quiz.map((q, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 ring-1 ring-slate-100">
                        <p className="text-sm font-semibold text-slate-800 mb-2">
                          Q{i + 1}. {q.question}
                        </p>
                        <div className="space-y-1">
                          {(q.choices || []).map((c, j) => (
                            <p key={j} className={`text-xs rounded-lg px-2.5 py-1.5 ${j === q.answer ? "bg-emerald-50 text-emerald-700 font-bold ring-1 ring-emerald-200" : "text-slate-600"}`}>
                              {["A", "B", "C"][j]}. {c}
                              {j === q.answer && " ✓正解"}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.checklist && result.checklist.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">✅ 管理者向けチェック項目</p>
                  {result.checklist.map((c, i) => (
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
