import { useState } from "react";
import { CHAR, UI, indCtx } from "../data/constants";
import { Badge, SectionTitle, CopyBtn, Spinner, ChaosBubble } from "../components/ui";
import { callClaude, parseJSON } from "../lib/claude";
import { aiErrorMessage } from "../lib/utils";

export default function SituationDetail({ situation: s, industry, onBack, onSaveRecordDraft }) {
  const [tab, setTab] = useState("navi");
  const [genPhrases, setGenPhrases] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  const generatePhrases = async () => {
    setGenLoading(true);
    setError("");
    const { text, error: err } = await callClaude(
      [{ role: "user", content: `シーン:「${s.title}」(${s.desc})。${indCtx(industry)}\nこの状況で現場スタッフがそのまま使える、丁寧で自然な日本語の接遇フレーズを5種類生成してください。敬語として正確で、30〜60文字程度。JSON配列(文字列5つ)のみで回答。前置きやMarkdownは不要。` }],
      "あなたは日本の接遇・クレーム対応の専門家です。回答はJSON配列のみ。",
      800
    );
    const arr = parseJSON(text);
    if (Array.isArray(arr) && arr.length) setGenPhrases(arr.map(String));
    else setError(err ? aiErrorMessage(err) : "生成に失敗しました。通信環境を確認して再度お試しください。");
    setGenLoading(false);
  };

  const askAI = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setError("");
    setAiAnswer("");
    const { text, error: err } = await callClaude(
      [{ role: "user", content: `状況:「${s.title}」(${s.desc})${indCtx(industry)}\nスタッフからの相談:${aiInput}\n\n現場スタッフが今すぐ実行できる具体的なアドバイスを、①まず言うべき一言 ②対応のポイント(2〜3点) ③注意点 の形式で、300字以内の日本語で簡潔に回答してください。` }],
      "あなたは日本のクレーム・カスハラ対応の専門家です。現場スタッフを守る立場で、実用的かつ簡潔に助言します。",
      800
    );
    if (text) setAiAnswer(text);
    else setError(aiErrorMessage(err));
    setAiLoading(false);
  };

  return (
    <div className="pb-24">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 text-white px-4 pt-4 pb-5">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <button onClick={onBack} className="relative text-amber-200 text-sm mb-3">← 戻る</button>
        <div className="relative flex items-center gap-3">
          <img src={CHAR[s.expr] || CHAR.normal} alt="ケイオスちゃん" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-300 shadow-lg shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-lg font-bold">{s.title}</h1>
              <Badge text={s.badge} color={s.badgeColor} />
            </div>
            <p className="text-xs text-blue-200">{s.desc}</p>
          </div>
        </div>
      </div>

      <div className="flex bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        {[["navi", "AI対応ナビ"], ["phrases", "フレーズ生成"], ["ai", "AIに相談"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mx-4 mt-3 text-xs text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

      {tab === "navi" && (
        <div className="px-4 mt-4 space-y-5">
          <div>
            <SectionTitle>おすすめの対応フレーズ</SectionTitle>
            <div className="space-y-2">
              {s.phrases.map((p, i) => (
                <div key={i} className="bg-gradient-to-r from-indigo-50 to-sky-50 rounded-xl p-3 flex items-start gap-2 ring-1 ring-indigo-100">
                  <p className="text-sm text-slate-800 flex-1 leading-relaxed">{p}</p>
                  <CopyBtn text={p} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle>行動手順</SectionTitle>
            <div className={`${UI.card} divide-y divide-slate-100`}>
              {s.steps.map((st, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow">{i + 1}</div>
                  <p className="text-sm text-slate-700">{st}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-amber-700 mb-1">⚠️ 注意点</p>
            <p className="text-sm text-amber-800 leading-relaxed">{s.caution}</p>
          </div>
          <button onClick={() => onSaveRecordDraft(s)} className={`w-full py-3 ${UI.btnPrimary}`}>
            📝 この件を記録する
          </button>
        </div>
      )}

      {tab === "phrases" && (
        <div className="px-4 mt-4">
          <p className="text-xs text-slate-500 mb-3">シーン「{s.title}」に合わせた文章をAIが5種類自動生成します。ワンタップでコピーできます。</p>
          <button onClick={generatePhrases} disabled={genLoading} className={`w-full py-3 flex items-center justify-center gap-2 mb-4 ${UI.btnPrimary}`}>
            {genLoading ? (
              <>
                <Spinner light /> 生成中…
              </>
            ) : genPhrases ? (
              "🔄 別のフレーズを生成"
            ) : (
              "✨ フレーズを生成する"
            )}
          </button>
          {genPhrases && (
            <div className="space-y-2">
              {genPhrases.map((p, i) => (
                <div key={i} className={`${UI.card} p-3 flex items-start gap-2`}>
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <p className="text-sm text-slate-800 flex-1 leading-relaxed">{p}</p>
                  <CopyBtn text={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "ai" && (
        <div className="px-4 mt-4">
          <p className="text-xs text-slate-500 mb-3">今の状況を具体的に入力すると、ケイオスちゃんが最適な対応をその場で提案します。</p>
          <textarea
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="例:入浴時間の延長を強く要求され、規定を説明しても納得してもらえません…"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24 mb-3 shadow-sm"
          />
          <button onClick={askAI} disabled={aiLoading || !aiInput.trim()} className={`w-full py-3 flex items-center justify-center gap-2 ${UI.btnPrimary}`}>
            {aiLoading ? (
              <>
                <Spinner light /> ケイオスちゃんが考え中…
              </>
            ) : (
              "💬 アドバイスを受ける"
            )}
          </button>
          {aiAnswer && (
            <ChaosBubble expr={s.expr}>
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{aiAnswer}</p>
              <div className="mt-3 flex justify-end">
                <CopyBtn text={aiAnswer} />
              </div>
            </ChaosBubble>
          )}
        </div>
      )}
    </div>
  );
}
