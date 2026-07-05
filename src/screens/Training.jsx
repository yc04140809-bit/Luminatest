import { useState, useEffect, useRef, useCallback } from "react";
import { SCENARIOS, LEVELS, CHAR, UI, indCtx } from "../data/constants";
import { Spinner } from "../components/ui";
import { callClaude, parseJSON } from "../lib/claude";
import { aiErrorMessage } from "../lib/utils";
import { insertScore } from "../lib/db";

export default function Training({ userId, orgId, scores, setScores, industry, caseDraft, clearCaseDraft }) {
  const [scenario, setScenario] = useState(null);
  const [level, setLevel] = useState(LEVELS[1]);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState("");
  const [saveState, setSaveState] = useState(""); // "ok" | "fail" | ""
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current && bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chat, feedback]);

  const scenarioList = industry && industry.scenario ? [industry.scenario, ...SCENARIOS] : SCENARIOS;

  const systemPrompt = useCallback(
    () =>
      scenario
        ? `あなたはクレーム対応研修のロールプレイでクレームを言う相手役を演じます。
シナリオ:${scenario.title}(${scenario.desc})${indCtx(industry)}${scenario.caseText ? "\n参考にする実例(この状況を再現する):\n" + scenario.caseText : ""}
難易度:${level.label}(初級=比較的穏やかで説得されやすい / 中級=感情的だが誠実な対応には応じる / 上級=しつこく理不尽で簡単には納得しない)
ルール:
- 日本語で、相手役(お客様・ご家族)として自然に発言する。1回の発言は1〜3文で短く。
- スタッフの対応が良ければ徐々に態度を軟化させ、悪ければ不満を強める。
- 十分に納得したら会話を収束させてよい。
- 相手役の発言のみを出力し、解説やナレーションは書かない。`
        : "",
    [scenario, level, industry]
  );

  const start = async (sc) => {
    setScenario(sc);
    setFeedback(null);
    setSaveState("");
    if (sc.opening) {
      setChat([{ role: "customer", text: sc.opening }]);
      return;
    }
    setChat([]);
    setLoading(true);
    const { text } = await callClaude(
      [{ role: "user", content: `次の実例クレームのロールプレイを開始します。お客様役としての最初の一言(1〜3文)だけを出力してください。\n${sc.caseText || sc.desc}` }],
      "あなたはクレーム対応研修の相手役です。相手役の発言のみを出力し、解説は書かない。",
      300
    );
    setChat([{ role: "customer", text: text || "ちょっと、この件どうなっているんですか?きちんと説明してください!" }]);
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const nextChat = [...chat, { role: "staff", text: input.trim() }];
    setChat(nextChat);
    setInput("");
    setLoading(true);
    const messages = nextChat.map((m) => ({ role: m.role === "customer" ? "assistant" : "user", content: m.text }));
    const { text } = await callClaude(messages, systemPrompt(), 400);
    setChat((c) => [...c, { role: "customer", text: text || "(通信エラー:もう一度送信してください)" }]);
    setLoading(false);
  };

  const getFeedback = async () => {
    setFbLoading(true);
    setFeedback(null);
    setFbError("");
    const transcript = chat.map((m) => `${m.role === "customer" ? "お客様" : "スタッフ"}:${m.text}`).join("\n");
    const { text, error } = await callClaude(
      [{ role: "user", content: `以下はクレーム対応ロールプレイ(シナリオ:${scenario.title}/難易度:${level.label})の記録です。スタッフの対応を評価してください。\n\n${transcript}\n\n次のJSON形式のみで回答:{"score": 0〜100の整数, "good": ["良かった点を2つ"], "improve": ["改善点を2つ"], "comment": "総評を50字以内"}` }],
      "あなたは接遇研修の講師です。回答はJSONのみ。",
      600
    );
    const fb = parseJSON(text);
    if (fb && typeof fb.score === "number") {
      setFeedback(fb);
      const entry = { date: new Date().toISOString(), scenario: scenario.title, level: level.label, score: fb.score };
      const saved = await insertScore(userId, orgId, entry);
      if (saved) {
        setScores([saved, ...scores].slice(0, 50));
        setSaveState("ok");
      } else {
        setSaveState("fail");
      }
    } else {
      setFbError(aiErrorMessage(error));
      setFeedback({ score: null, comment: "評価の取得に失敗しました。再度お試しください。", good: [], improve: [] });
    }
    setFbLoading(false);
  };

  if (!scenario)
    return (
      <div className="px-4 pt-5 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center text-base font-bold text-slate-800">
            <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-sky-400 mr-2" />
            🎓 トレーニングモード
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">AIが相手役を担当します。本番の前にロールプレイで練習しましょう。</p>

        {caseDraft && (
          <div className="mb-5 rounded-2xl p-4 bg-gradient-to-r from-amber-50 to-yellow-50 ring-2 ring-amber-300 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">🌐 共有ケースから</span>
              <button onClick={clearCaseDraft} className="text-xs text-slate-400">✕ 外す</button>
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">{caseDraft.title}</p>
            <p className="text-xs text-slate-500 mb-3">{caseDraft.desc}</p>
            <button onClick={() => start(caseDraft)} className={`${UI.btnGold} w-full py-2.5 text-sm`}>▶ このケースで練習を開始</button>
          </div>
        )}

        <p className="text-sm font-bold text-slate-700 mb-2">難易度選択</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l)}
              className={`rounded-xl border-2 p-2.5 text-center transition-all ${level.id === l.id ? l.color + " border-current shadow-md" : "bg-white border-slate-200 text-slate-400"}`}
            >
              <p className="text-sm font-bold">{l.label}</p>
              <p className="text-xs mt-0.5 leading-tight">{l.desc}</p>
            </button>
          ))}
        </div>

        <p className="text-sm font-bold text-slate-700 mb-2">シナリオ選択</p>
        <div className="space-y-3">
          {scenarioList.map((sc) => (
            <button key={sc.id} onClick={() => start(sc)} className={`w-full ${UI.card} p-4 text-left active:scale-95 transition-transform`}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-sm font-bold text-slate-800">{sc.title}</p>
                {String(sc.id).indexOf("ind-") === 0 && industry && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700">{industry.icon} {industry.label}専用</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-2">{sc.desc}</p>
              <p className="text-xs text-indigo-600 font-semibold">推定時間:{sc.time} ▶ 開始する</p>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-700">📈 スコア履歴</p>
            {scores.length > 0 && <p className={`text-sm font-black ${UI.gold}`}>🏆 ベスト {Math.max(...scores.map((s) => s.score))}点</p>}
          </div>
          {scores.length === 0 ? (
            <div className={`${UI.card} p-4 text-center`}>
              <p className="text-xs text-slate-400 leading-relaxed">
                まだ履歴がありません。
                <br />
                ロールプレイ中に「採点する」を押すと、ここに自動で記録されます。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {scores.slice(0, 5).map((s) => (
                <div key={s.id} className={`${UI.card} p-3 flex items-center justify-between`}>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{s.scenario}</p>
                    <p className="text-xs text-slate-400">{new Date(s.date).toLocaleDateString("ja-JP")}・{s.level}</p>
                  </div>
                  <p className={`text-lg font-black shrink-0 ml-2 ${UI.gold}`}>{s.score}<span className="text-xs text-slate-400 font-bold">点</span></p>
                </div>
              ))}
              {scores.length > 5 && <p className="text-xs text-slate-400 text-center pt-1">直近5件を表示(全{scores.length}件・管理タブで分析できます)</p>}
            </div>
          )}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{scenario.title}</p>
          <p className="text-xs text-blue-200">難易度:{level.label} / AIが相手役を担当</p>
        </div>
        <button onClick={() => { setScenario(null); setChat([]); setFeedback(null); }} className="text-xs bg-white bg-opacity-10 px-3 py-1.5 rounded-full shrink-0 ml-2">✕ 終了</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.role === "staff" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-xs rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "staff" ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-br-md shadow-md" : "bg-white shadow-md ring-1 ring-slate-100 text-slate-800 rounded-bl-md"}`}>
              {m.role === "customer" && <p className="text-xs text-slate-400 mb-0.5">👤 お客様(AI)</p>}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-md ring-1 ring-slate-100">
              <Spinner />
            </div>
          </div>
        )}

        {fbError && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3">{fbError}</p>}

        {feedback && (
          <div className="bg-white rounded-2xl p-4 shadow-lg ring-2 ring-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <img
                  src={feedback.score !== null && feedback.score >= 70 ? CHAR.normal : CHAR.tired}
                  alt="ケイオスちゃん"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-300 shadow"
                />
                <p className="text-sm font-bold text-indigo-700">ケイオスちゃんのフィードバック</p>
              </div>
              {feedback.score !== null && (
                <div className="text-right shrink-0 ml-2">
                  <span className={`text-3xl font-black ${UI.gold}`}>{feedback.score}</span>
                  <span className="text-xs text-slate-500">点</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-700 mb-3">{feedback.comment}</p>
            {feedback.good && feedback.good.map((g, i) => (
              <p key={i} className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-1.5">✓ {g}</p>
            ))}
            {feedback.improve && feedback.improve.map((g, i) => (
              <p key={i} className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 mb-1.5">＋ {g}</p>
            ))}
            {feedback.score !== null && saveState === "ok" && <p className="text-xs text-emerald-600 mt-1">💾 スコア履歴に保存しました</p>}
            {feedback.score !== null && saveState === "fail" && <p className="text-xs text-amber-600 mt-1">⚠️ 保存に失敗しました。通信環境をご確認のうえ再度お試しください。</p>}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 bg-white border-t border-slate-200">
        {chat.filter((m) => m.role === "staff").length >= 1 && (
          <button
            onClick={getFeedback}
            disabled={fbLoading}
            className="w-full mb-2 text-xs font-bold text-indigo-600 bg-gradient-to-r from-indigo-50 to-sky-50 py-2 rounded-lg disabled:opacity-60 ring-1 ring-indigo-100"
          >
            {fbLoading ? "評価中…" : "📊 ここまでの対応を採点する"}
          </button>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="スタッフとして返答を入力…"
            className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={send} disabled={loading || !input.trim()} className={`px-5 text-sm ${UI.btnPrimary} rounded-full`}>
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
