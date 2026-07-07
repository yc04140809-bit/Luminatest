import { useState } from "react";
import { UI } from "../data/constants";
import { Spinner, CopyBtn, SectionTitle } from "../components/ui";
import { callClaude, parseJSON } from "../lib/claude";
import { aiErrorMessage } from "../lib/utils";

const SNS_LIST = ["Threads", "X", "Instagram", "note"];
const MOOD_PRESETS = ["明るく元気", "丁寧・上品", "落ち着いた", "ユーモラス"];

export default function SNSPostAI({ onBack }) {
  const [theme, setTheme] = useState("");
  const [sns, setSns] = useState(SNS_LIST[0]);
  const [mood, setMood] = useState("");
  const [message, setMessage] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const generate = async () => {
    if (!theme.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    const { text, error: err } = await callClaude(
      [
        {
          role: "user",
          content: `投稿テーマ:${theme}
投稿するSNS:${sns}
雰囲気:${mood || "おまかせ"}
伝えたい内容:${message || "テーマに沿っておまかせ"}
画像の有無:${hasImage ? "画像あり(画像を前提とした文章にする)" : "画像なし(文章だけで伝わるようにする)"}

次のJSON形式のみで、日本語で回答してください:
{"title":"投稿の見出し・タイトル案","hashtags":["#タグ1","#タグ2","#タグ3","#タグ4","#タグ5"],"short":"短文版(${sns}向け・簡潔で読みやすい)","long":"長文版(背景や詳細を含む)","commentPrompt":"コメントやリアクションを誘う一言"}
Markdownや前置きは不要。JSONのみで回答してください。`,
        },
      ],
      "あなたはSNSマーケティングに強いプロの編集者です。Threads・X・Instagram・noteそれぞれの特性に合わせた、自然で魅力的な投稿文を作成します。回答はJSONのみ。",
      1200
    );
    const parsed = parseJSON(text);
    if (parsed && parsed.short && parsed.long) setResult(parsed);
    else setError(aiErrorMessage(err));
    setLoading(false);
  };

  return (
    <div className="w-full h-screen bg-slate-200 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-50 h-full flex flex-col relative overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 flex items-center gap-2 shrink-0 shadow-md">
          <button onClick={onBack} className="text-amber-200 text-sm shrink-0 mr-0.5">←</button>
          <span className="text-lg">📢</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none tracking-wide">SNS投稿AI</p>
            <p className="text-xs text-amber-200 mt-0.5">✦ ミライちゃん・広報担当AI社員</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-10">
          <SectionTitle>投稿するSNS</SectionTitle>
          <div className="flex flex-wrap gap-2 mb-4">
            {SNS_LIST.map((s) => (
              <button
                key={s}
                onClick={() => setSns(s)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  sns === s ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <SectionTitle>投稿テーマ</SectionTitle>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="例:新商品の発売告知"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none mb-4 shadow-sm"
          />

          <SectionTitle>雰囲気(任意)</SectionTitle>
          <div className="flex flex-wrap gap-2 mb-2">
            {MOOD_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  mood === m ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="自由に入力もできます"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none mb-4 shadow-sm"
          />

          <SectionTitle>伝えたい内容</SectionTitle>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="例:期間限定で20%オフ。今週末まで。"
            className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-20 mb-4 shadow-sm"
          />

          <button onClick={() => setHasImage(!hasImage)} className={`w-full py-3 rounded-xl text-sm font-bold mb-4 ring-1 transition-colors ${hasImage ? "bg-indigo-50 ring-indigo-300 text-indigo-700" : "bg-white ring-slate-200 text-slate-500"}`}>
            {hasImage ? "🖼️ 画像あり" : "画像なし(タップで切り替え)"}
          </button>

          <button onClick={generate} disabled={loading || !theme.trim()} className={`w-full py-3 flex items-center justify-center gap-2 mb-4 ${UI.btnPrimary}`}>
            {loading ? (
              <>
                <Spinner light /> ミライちゃんが作成中…
              </>
            ) : (
              "✨ 投稿文を生成する"
            )}
          </button>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</p>}

          {result && (
            <div className={`${UI.card} p-4 space-y-4`}>
              <div>
                <p className="text-xs font-bold text-indigo-600 mb-1">タイトル案</p>
                <p className="text-sm font-bold text-slate-800">{result.title}</p>
              </div>

              {result.hashtags && result.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.hashtags.map((h, i) => (
                    <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">
                      {h}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-indigo-600">短文版</p>
                  <CopyBtn text={result.short} />
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3 leading-relaxed">{result.short}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-indigo-600">長文版</p>
                  <CopyBtn text={result.long} />
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3 leading-relaxed">{result.long}</p>
              </div>

              {result.commentPrompt && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">💬 コメント誘導文</p>
                  <p className="text-sm text-amber-800 leading-relaxed">{result.commentPrompt}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
