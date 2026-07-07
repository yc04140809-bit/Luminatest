import { useState, useRef, useEffect } from "react";
import { UI } from "../data/constants";
import { Spinner, SectionTitle } from "../components/ui";
import { callClaude, parseJSON } from "../lib/claude";
import { aiErrorMessage } from "../lib/utils";

const PANEL = [
  { key: "opponent", label: "反対派", color: "bg-red-50 ring-red-200 text-red-700", badge: "bg-red-500" },
  { key: "firstPrinciples", label: "第一原理思考者", color: "bg-blue-50 ring-blue-200 text-blue-700", badge: "bg-blue-500" },
  { key: "expansionist", label: "拡張主義者", color: "bg-emerald-50 ring-emerald-200 text-emerald-700", badge: "bg-emerald-500" },
  { key: "outsider", label: "部外者", color: "bg-slate-100 ring-slate-300 text-slate-700", badge: "bg-slate-500" },
  { key: "executor", label: "実行者", color: "bg-amber-50 ring-amber-200 text-amber-700", badge: "bg-amber-500" },
];

const SYSTEM_PROMPT = `あなたは経営判断を支援するAI会議のファシリテーターです。ユーザーの案に対して、性格の異なる5人の評議員として、互いに忖度せずユーザーにも同調せず率直に批評してください。
役割:
- 反対派:致命的な欠陥・失敗する条件・見落としリスクだけを挙げる
- 第一原理思考者:前提を疑い「そもそも解くべき問題はこれか」を問い直す
- 拡張主義者:みんなが見落とす上振れ・伸びしろを挙げる
- 部外者:前提知識ゼロの素朴な疑問・違和感をぶつける
- 実行者:理屈抜きで「月曜の朝、実際に何をやるか」だけ書く
各評は120〜250字。最後に議長(セイラ)として、一致点・対立点・誰も気づかなかった盲点・推奨・最初の一歩をまとめる。`;

function initialPrompt(idea) {
  return `私の案・状況・迷っている選択肢:「${idea}」

次のJSON形式のみで、日本語で回答してください:
{"opponent":"...","firstPrinciples":"...","expansionist":"...","outsider":"...","executor":"...","chair":{"agreements":"一致点","disagreements":"対立点","blindSpots":"誰も気づかなかった盲点","recommendation":"推奨","firstStep":"最初の一歩"}}
Markdownや前置きは不要。JSONのみで回答してください。`;
}

export default function BoardroomAI({ onBack }) {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [messages, setMessages] = useState(null); // 会議開始後の会話履歴(質問継続用)
  const [followUp, setFollowUp] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [chat, setChat] = useState([]); // 追加の質問応答ログ
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current && bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const startMeeting = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setChat([]);
    const userMsg = { role: "user", content: initialPrompt(idea) };
    const { text, error: err } = await callClaude([userMsg], SYSTEM_PROMPT, 2000);
    const parsed = parseJSON(text);
    if (parsed && parsed.chair) {
      setResult(parsed);
      setMessages([userMsg, { role: "assistant", content: text }]);
    } else {
      setError(aiErrorMessage(err));
    }
    setLoading(false);
  };

  const askQuestion = async () => {
    if (!followUp.trim() || !messages) return;
    const question = followUp.trim();
    setFollowUp("");
    setChat((c) => [...c, { role: "user", text: question }]);
    setFollowUpLoading(true);
    const nextMessages = [...messages, { role: "user", content: question }];
    const { text, error: err } = await callClaude(
      nextMessages,
      SYSTEM_PROMPT + "\n続きの質問には、議長(セイラ)として、必要なら評議員の意見も踏まえつつ、自然な日本語の文章で簡潔に答えてください。JSON形式は不要です。",
      800
    );
    if (text) {
      setChat((c) => [...c, { role: "assistant", text }]);
      setMessages([...nextMessages, { role: "assistant", content: text }]);
    } else {
      setChat((c) => [...c, { role: "assistant", text: aiErrorMessage(err) }]);
    }
    setFollowUpLoading(false);
  };

  return (
    <div className="w-full h-screen bg-slate-200 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-50 h-full flex flex-col relative overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 flex items-center gap-2 shrink-0 shadow-md">
          <button onClick={onBack} className="text-amber-200 text-sm shrink-0 mr-0.5">←</button>
          <span className="text-lg">📣</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none tracking-wide">経営サポートAI ・ AI会議室</p>
            <p className="text-xs text-amber-200 mt-0.5">✦ セイラちゃん・経営参謀AI社員</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-10">
          {!result ? (
            <>
              <SectionTitle>案・状況・迷っている選択肢</SectionTitle>
              <p className="text-xs text-slate-500 mb-3">悩んでいることを具体的に書くほど、評議員の批評が的確になります。</p>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="例:新メニューを月額サブスク制にして値上げしようか迷っている"
                className="w-full bg-white rounded-xl p-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-28 mb-4 shadow-sm"
              />
              <button onClick={startMeeting} disabled={loading || !idea.trim()} className={`w-full py-3 flex items-center justify-center gap-2 ${UI.btnPrimary}`}>
                {loading ? (
                  <>
                    <Spinner light /> 5人の評議員が検討中…
                  </>
                ) : (
                  "🗣️ 会議を開始する"
                )}
              </button>
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mt-4">{error}</p>}
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl p-3 mb-4 ring-1 ring-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-1">今回の案</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{idea}</p>
              </div>

              <SectionTitle>評議員の批評</SectionTitle>
              <div className="space-y-2 mb-5">
                {PANEL.map((p) => (
                  <div key={p.key} className={`rounded-xl p-3 ring-1 ${p.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${p.badge}`} />
                      <p className="text-xs font-bold">{p.label}</p>
                    </div>
                    <p className="text-sm leading-relaxed">{result[p.key]}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-4 mb-5 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white shadow-lg">
                <p className="text-xs font-bold text-amber-300 mb-2">👑 議長のまとめ(セイラ)</p>
                {[
                  ["① 一致点", result.chair.agreements],
                  ["② 対立点", result.chair.disagreements],
                  ["③ 誰も気づかなかった盲点", result.chair.blindSpots],
                  ["④ 推奨", result.chair.recommendation],
                  ["⑤ 最初の一歩", result.chair.firstStep],
                ].map(([label, v]) => (
                  <div key={label} className="mb-2 last:mb-0">
                    <p className="text-xs font-bold text-blue-200">{label}</p>
                    <p className="text-sm text-slate-100 leading-relaxed">{v}</p>
                  </div>
                ))}
              </div>

              <SectionTitle>途中で質問する</SectionTitle>
              <p className="text-xs text-slate-500 mb-3">議論を止めて、セイラちゃんに直接質問できます。</p>

              <div className="space-y-3 mb-3">
                {chat.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user" ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-br-md shadow-md" : "bg-white shadow-md ring-1 ring-slate-100 text-slate-800 rounded-bl-md"
                      }`}
                    >
                      {m.role === "assistant" && <p className="text-xs text-slate-400 mb-0.5">👑 セイラ(議長)</p>}
                      {m.text}
                    </div>
                  </div>
                ))}
                {followUpLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-md ring-1 ring-slate-100">
                      <Spinner />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                  placeholder="議長に質問する…"
                  className="flex-1 bg-white rounded-full px-4 py-2.5 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={askQuestion} disabled={followUpLoading || !followUp.trim()} className={`px-5 text-sm ${UI.btnPrimary} rounded-full`}>
                  送信
                </button>
              </div>

              <button
                onClick={() => {
                  setResult(null);
                  setMessages(null);
                  setChat([]);
                  setIdea("");
                }}
                className="w-full text-slate-500 text-sm font-semibold py-2"
              >
                新しい案でもう一度会議する
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
