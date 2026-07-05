import { useState, useEffect } from "react";
import { CHAR, UI, indCtx } from "../data/constants";
import { Spinner, ChaosBubble } from "../components/ui";
import { callClaude, parseJSON } from "../lib/claude";
import { dateKey } from "../lib/utils";
import { updateSettings } from "../lib/db";

export default function DailyChallenge({ userId, daily, setDaily, industry, onBack }) {
  const today = dateKey();
  const answeredToday = daily.lastAnsweredDate === today && daily.answered;
  const [quiz, setQuiz] = useState(daily.quizDate === today ? daily.quiz : null);
  const [phase, setPhase] = useState(answeredToday ? "result" : daily.quizDate === today && daily.quiz ? "quiz" : "loading");
  const [sel, setSel] = useState(answeredToday ? daily.answered.choice : null);

  /* 今日の問題を取得(1日1問:生成済みなら再利用してAPIコスト節約) */
  useEffect(() => {
    if (quiz || phase !== "loading") return;
    (async () => {
      const { text } = await callClaude(
        [{ role: "user", content: `接遇・クレーム対応の実践クイズを1問作成してください。${indCtx(industry)}
形式:{"question":"具体的な場面+設問(90字以内)","choices":["選択肢A","選択肢B","選択肢C"],"answer":正解のindex(0〜2の整数),"explanation":"なぜそれが正解かの解説(110字以内)"}
JSONのみで回答。明確に正解が1つになる実務的な問題にすること。` }],
        "あなたは接遇研修の出題者です。回答はJSONのみ。",
        700
      );
      const q = parseJSON(text);
      if (q && q.question && Array.isArray(q.choices) && q.choices.length === 3 && typeof q.answer === "number") {
        setQuiz(q);
        setPhase("quiz");
        const next = { ...daily, quizDate: today, quiz: q, answered: daily.quizDate === today ? daily.answered : null };
        setDaily(next);
        await updateSettings(userId, { daily: next });
      } else setPhase("error");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = async (i) => {
    if (phase !== "quiz") return;
    setSel(i);
    setPhase("result");
    const correct = i === quiz.answer;
    const yesterday = dateKey(new Date(Date.now() - 86400000));
    const streak = daily.lastAnsweredDate === yesterday ? (daily.streak || 0) + 1 : 1;
    const next = { ...daily, quizDate: today, quiz, streak, lastAnsweredDate: today, answered: { choice: i, correct } };
    setDaily(next);
    await updateSettings(userId, { daily: next });
  };

  const correct = sel !== null && quiz && sel === quiz.answer;
  return (
    <div className="pb-24">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-4 pt-4 pb-5 shadow-md">
        <button onClick={onBack} className="text-amber-200 text-sm mb-2">← ホームに戻る</button>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">⚡ 今日のチャレンジ</h1>
          <p className="text-sm font-bold text-amber-300">🔥 連続 {daily.streak || 0} 日</p>
        </div>
        <p className="text-xs text-blue-200 mt-1">毎日1問。続けるほど、現場で迷わなくなる。</p>
      </div>

      <div className="px-4 mt-4">
        {phase === "loading" && (
          <div className={`${UI.card} p-6 flex flex-col items-center gap-3`}>
            <img src={CHAR.point} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-amber-300" />
            <Spinner />
            <p className="text-xs text-slate-500">ケイオスちゃんが今日の問題を作成中…</p>
          </div>
        )}
        {phase === "error" && (
          <div className={`${UI.card} p-5 text-center`}>
            <p className="text-sm text-slate-600 mb-3">問題の取得に失敗しました。</p>
            <button onClick={() => { setQuiz(null); setPhase("loading"); }} className={`${UI.btnPrimary} px-6 py-2 text-sm`}>
              再読み込み
            </button>
          </div>
        )}
        {(phase === "quiz" || phase === "result") && quiz && (
          <div className={`${UI.card} p-4`}>
            <p className="text-xs font-bold text-indigo-600 mb-2">Q. {today}</p>
            <p className="text-sm text-slate-800 font-semibold leading-relaxed mb-4">{quiz.question}</p>
            <div className="space-y-2">
              {quiz.choices.map((c, i) => {
                let cls = "bg-slate-50 ring-1 ring-slate-200 text-slate-700";
                if (phase === "result") {
                  if (i === quiz.answer) cls = "bg-emerald-50 ring-2 ring-emerald-400 text-emerald-800 font-bold";
                  else if (i === sel) cls = "bg-red-50 ring-2 ring-red-300 text-red-600";
                  else cls = "bg-slate-50 ring-1 ring-slate-100 text-slate-400";
                }
                return (
                  <button key={i} onClick={() => answer(i)} disabled={phase === "result"} className={`w-full text-left rounded-xl p-3 text-sm transition-all active:scale-95 ${cls}`}>
                    <span className="font-bold mr-2">{["A", "B", "C"][i]}</span>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {phase === "result" && quiz && (
          <>
            <ChaosBubble expr={correct ? "normal" : "sad"} title={correct ? "ケイオスちゃん(正解!)" : "ケイオスちゃん(おしい!)"}>
              <p className={`text-sm font-bold mb-2 ${correct ? "text-emerald-600" : "text-red-500"}`}>
                {correct ? "🎉 正解です!さすがですね" : `残念…正解は「${["A", "B", "C"][quiz.answer]}」でした`}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{quiz.explanation}</p>
            </ChaosBubble>
            <div className={`${UI.card} p-4 mt-4 text-center`}>
              <p className={`text-2xl font-black ${UI.gold}`}>🔥 {daily.streak || 0} 日連続</p>
              <p className="text-xs text-slate-500 mt-1">明日も新しい問題をご用意してお待ちしています</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
