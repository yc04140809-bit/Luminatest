import { useState } from "react";
import { UI } from "../data/constants";
import { Spinner, CopyBtn, SectionTitle } from "../components/ui";
import { callClaude, parseJSON } from "../lib/claude";
import { aiErrorMessage } from "../lib/utils";

const FIELDS = [
  { key: "appName", label: "作りたいアプリ名", placeholder: "例:接遇ガードAI", type: "input" },
  { key: "purpose", label: "アプリの目的", placeholder: "例:現場スタッフのカスハラ対応をAIで支援する", type: "textarea" },
  { key: "users", label: "想定ユーザー", placeholder: "例:介護施設のスタッフ", type: "input" },
  { key: "features", label: "必要な機能", placeholder: "例:AIチャット相談、記録の保存、研修モード", type: "textarea" },
  { key: "monetization", label: "収益化方法(任意)", placeholder: "例:法人向け月額課金", type: "input" },
  { key: "designMood", label: "デザイン雰囲気(任意)", placeholder: "例:高級感のある黒×金", type: "input" },
  { key: "cautions", label: "注意点(任意)", placeholder: "例:個人情報を扱うのでセキュリティ重視", type: "textarea" },
];

const LIST_SECTIONS = [
  ["screens", "画面構成"],
  ["features", "機能一覧"],
  ["implementationOrder", "実装順序"],
  ["testItems", "テスト項目"],
  ["crashPreventionRules", "クラッシュ防止ルール"],
];

const MODES = [
  { id: "free", label: "🖊️ フリーワード" },
  { id: "form", label: "📝 入力式" },
];

const RESPONSE_SPEC = `次のJSON形式のみで、日本語で開発指示書を作成してください:
{"requirements":"要件定義(200〜300字)","screens":["画面構成の項目を4〜8個"],"features":["機能一覧を4〜8個"],"dataStructure":"必要なデータ構造の説明(200字程度)","implementationOrder":["実装順序をステップごとに4〜8個"],"testItems":["テスト項目を3〜6個"],"crashPreventionRules":["クラッシュ防止ルールを3〜5個(小さい単位で実装する・変更前にバックアップする、など)"],"finalInstructions":"Manus・Claude Code・Fable5などのAI開発エージェントにそのまま渡せる、要件定義から実装順序・クラッシュ防止ルールまで含む完成指示書の全文(800〜1200字程度)"}
Markdownや前置きは不要。JSONのみで回答してください。`;

const SYSTEM_PROMPT =
  "あなたはソフトウェア開発のプロジェクトマネージャー兼テクニカルライターです。Manus・Claude Code・Fable5などのAI開発エージェントに渡す、明確で実装しやすい開発指示書を作成します。小さな単位での実装とクラッシュ防止を重視します。回答はJSONのみ。";

export default function DevSpecAI({ onBack }) {
  const [mode, setMode] = useState("free");
  const [freeText, setFreeText] = useState("");
  const [form, setForm] = useState({ appName: "", purpose: "", users: "", features: "", monetization: "", designMood: "", cautions: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const set = (key, v) => setForm((f) => ({ ...f, [key]: v }));

  const canGenerate = mode === "free" ? freeText.trim().length > 0 : form.appName.trim() && form.purpose.trim();

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError("");
    setResult(null);
    const content =
      mode === "free"
        ? `作りたいアプリについての要望(自由記述):
${freeText}

上記の要望から、アプリ名・目的・想定ユーザー・必要な機能・収益化方法・デザイン雰囲気・注意点を読み取り(書かれていない項目は内容に合わせて提案し)、${RESPONSE_SPEC}`
        : `作りたいアプリ名:${form.appName}
アプリの目的:${form.purpose}
想定ユーザー:${form.users || "未指定"}
必要な機能:${form.features || "未指定(提案してください)"}
収益化方法:${form.monetization || "未定(提案してください)"}
デザイン雰囲気:${form.designMood || "おまかせ"}
注意点:${form.cautions || "特になし"}

${RESPONSE_SPEC}`;
    const { text, error: err } = await callClaude([{ role: "user", content }], SYSTEM_PROMPT, 2200);
    const parsed = parseJSON(text);
    if (parsed && parsed.finalInstructions) setResult(parsed);
    else setError(aiErrorMessage(err));
    setLoading(false);
  };

  return (
    <div className="w-full h-screen bg-slate-200 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-50 h-full flex flex-col relative overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 flex items-center gap-2 shrink-0 shadow-md">
          <button onClick={onBack} className="text-amber-200 text-sm shrink-0 mr-0.5">←</button>
          <span className="text-lg">🛠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none tracking-wide">開発指示書AI</p>
            <p className="text-xs text-amber-200 mt-0.5">✦ レヴィちゃん・開発担当AI社員</p>
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
              <p className="text-xs font-bold text-slate-600 mb-1.5">作りたいアプリについて自由に書いてください</p>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="例:カスハラ対応をAIがサポートしてくれる、介護施設向けのアプリを作りたい。現場スタッフが困ったときにすぐ相談できるようにしたい。"
                className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-40 shadow-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">書かれていない項目(想定ユーザーやデザイン等)はレヴィちゃんが内容に合わせて提案します。</p>
            </div>
          ) : (
            <div className="space-y-4 mb-4">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <p className="text-xs font-bold text-slate-600 mb-1.5">{f.label}</p>
                  {f.type === "input" ? (
                    <input
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    />
                  ) : (
                    <textarea
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-20 shadow-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <button onClick={generate} disabled={loading || !canGenerate} className={`w-full py-3 flex items-center justify-center gap-2 mb-4 ${UI.btnPrimary}`}>
            {loading ? (
              <>
                <Spinner light /> レヴィちゃんが設計中…
              </>
            ) : (
              "✨ 開発指示書を生成する"
            )}
          </button>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</p>}

          {result && (
            <div className="space-y-4">
              <div className={`${UI.card} p-4`}>
                <p className="text-xs font-bold text-indigo-600 mb-1">要件定義</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.requirements}</p>
              </div>

              {LIST_SECTIONS.map(([key, label]) =>
                result[key] && result[key].length ? (
                  <div key={key} className={`${UI.card} p-4`}>
                    <p className="text-xs font-bold text-indigo-600 mb-2">{label}</p>
                    <div className="space-y-1">
                      {result[key].map((item, i) => (
                        <p key={i} className="text-sm text-slate-700 flex gap-2">
                          <span className="text-indigo-500 shrink-0">{i + 1}.</span>
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null
              )}

              {result.dataStructure && (
                <div className={`${UI.card} p-4`}>
                  <p className="text-xs font-bold text-indigo-600 mb-1">データ構造</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.dataStructure}</p>
                </div>
              )}

              <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-amber-300">📋 完成指示書(AIエージェントにそのまま渡せます)</p>
                </div>
                <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed mb-3">{result.finalInstructions}</p>
                <div className="flex justify-end">
                  <CopyBtn text={result.finalInstructions} label="📋 完成指示書をコピー" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
