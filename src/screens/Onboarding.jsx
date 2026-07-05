import { useState } from "react";
import { CHAR, UI } from "../data/constants";

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    { img: CHAR.normal, title: "ようこそ、接遇ガードAIへ", text: "私はAIサポーターのケイオスちゃん。クレーム・カスハラ対応の「困った」に、いつでも寄り添います。" },
    { img: CHAR.point, title: "困ったら、状況をタップ", text: "「怒鳴られている」など8つの状況から選ぶだけ。使えるフレーズと行動手順を、その場で提案します。" },
    { img: CHAR.guard, title: "練習と記録で、強くなる", text: "AI相手のロールプレイで練習、対応記録から報告書も自動生成。あなたの成長を、データで見守ります。" },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;
  return (
    <div className="absolute inset-0 z-50 bg-slate-900 bg-opacity-95 flex items-center justify-center p-6">
      <div className="w-full bg-gradient-to-b from-white to-slate-50 rounded-3xl p-6 text-center shadow-2xl">
        <img src={s.img} alt="ケイオスちゃん" className="w-24 h-24 rounded-full object-cover ring-4 ring-amber-300 mx-auto mb-4 shadow-lg" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">{s.text}</p>
        <div className="flex justify-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === step ? "bg-amber-400" : "bg-slate-300"}`} />
          ))}
        </div>
        <button onClick={() => (last ? onDone() : setStep(step + 1))} className={`w-full py-3 text-sm ${last ? UI.btnGold : UI.btnPrimary}`}>
          {last ? "✨ はじめる" : "次へ →"}
        </button>
        {!last && (
          <button onClick={onDone} className="mt-3 text-xs text-slate-400">
            スキップ
          </button>
        )}
      </div>
    </div>
  );
}
