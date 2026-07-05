import { useRef } from "react";
import { SITUATIONS, CHAR, UI } from "../data/constants";
import { Badge, SectionTitle } from "../components/ui";
import { dateKey } from "../lib/utils";

export default function Home({ onSelect, userName, lastScore, onGoTraining, daily, onDaily, onCases }) {
  const urgent = SITUATIONS.slice(0, 4);
  const common = SITUATIONS.slice(4);
  const gridRef = useRef(null);
  const clearedToday = daily && daily.lastAnsweredDate === dateKey();
  return (
    <div className="pb-24">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 text-white px-5 pt-6 pb-7 rounded-b-3xl shadow-xl">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-sky-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-indigo-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="relative flex items-center gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-200 mb-1.5">✦ 今日もおつかれさまです{userName ? `、${userName}さん` : ""}</p>
            <h1 className="text-lg font-bold leading-relaxed">
              <span className="inline-block">現場の「困った」を、</span>
              <span className="inline-block">AIが即サポート</span>
            </h1>
          </div>
          <img src={CHAR.normal} alt="ケイオスちゃん" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-amber-300 shrink-0 shadow-lg" />
        </div>
        <button
          onClick={() => gridRef.current && gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" })}
          className={`relative w-full py-3 text-sm text-center ${UI.btnGold}`}
        >
          ⚡ いますぐサポートを受ける
        </button>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <button
          onClick={onDaily}
          className={`relative w-full overflow-hidden rounded-2xl p-4 text-left shadow-lg active:scale-95 transition-transform ${clearedToday ? "bg-white ring-1 ring-slate-100" : "bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">
                ⚡ 今日のチャレンジ {clearedToday && <span className="text-emerald-500">✓ クリア済み</span>}
              </p>
              <p className={`text-xs mt-0.5 ${clearedToday ? "text-slate-500" : "text-blue-100"}`}>1日1問・AIクイズで対応力を磨く</p>
            </div>
            <p className={`text-lg font-black shrink-0 ${clearedToday ? "" : "text-amber-300"}`}>🔥{(daily && daily.streak) || 0}</p>
          </div>
        </button>
        <button onClick={onCases} className={`${UI.card} w-full p-4 text-left flex items-center justify-between active:scale-95 transition-transform`}>
          <div>
            <p className="text-sm font-bold text-slate-800">🌐 みんなのケース共有</p>
            <p className="text-xs text-slate-500 mt-0.5">利用者の実例から学ぶ・そのまま練習</p>
          </div>
          <span className="text-indigo-600 text-sm font-bold shrink-0">見る →</span>
        </button>
      </div>

      <div className="px-4 mt-5" ref={gridRef}>
        <SectionTitle>緊急対応</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {urgent.map((s) => (
            <button key={s.id} onClick={() => onSelect(s)} className={`${UI.card} p-4 text-left active:scale-95 transition-transform`}>
              <div className={`w-11 h-11 ${s.tint} rounded-full flex items-center justify-center text-xl mb-2 shadow-inner`}>{s.emoji}</div>
              <p className="text-sm font-bold text-slate-800 leading-snug mb-2">{s.title}</p>
              <Badge text={s.badge} color={s.badgeColor} />
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6">
        <SectionTitle>よく使うサポート</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {common.map((s) => (
            <button key={s.id} onClick={() => onSelect(s)} className={`${UI.card} p-4 text-left active:scale-95 transition-transform`}>
              <div className={`w-10 h-10 ${s.tint} rounded-full flex items-center justify-center text-lg mb-2 shadow-inner`}>{s.emoji}</div>
              <p className="text-sm font-bold text-slate-800 leading-snug">{s.title}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6">
        <button
          onClick={onGoTraining}
          className="w-full relative overflow-hidden rounded-2xl p-4 text-left shadow-lg bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 active:scale-95 transition-transform"
        >
          <div className="absolute -top-10 -right-6 w-32 h-32 bg-amber-300 rounded-full blur-3xl opacity-20 pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">🎓 接遇トレーニング</p>
              <p className="text-xs text-blue-200 mt-1">
                {lastScore ? `前回スコア:${lastScore.score}点(${lastScore.level})` : "AI相手のロールプレイで練習できます"}
              </p>
            </div>
            <span className="text-amber-300 text-sm font-bold shrink-0">練習する →</span>
          </div>
        </button>
      </div>

      <div className="px-4 mt-3 mb-2">
        <div className={`${UI.card} p-4 flex items-center gap-4`}>
          <img src={CHAR.normal} alt="ケイオスちゃん" className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-300 shadow-md shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm text-slate-800 mb-0.5">AIアドバイス機能</p>
            <p className="text-xs text-slate-500 leading-relaxed">状況を選ぶと、ケイオスちゃんが対応例や言い換えをその場で提案します</p>
          </div>
        </div>
      </div>
    </div>
  );
}
