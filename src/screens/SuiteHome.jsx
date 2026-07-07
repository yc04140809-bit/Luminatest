import { useState } from "react";
import { AGENTS } from "../data/agents";

/* 看板機能(接遇ガードAI)専用の大きめヒーローカード */
function FlagshipCard({ agent, onOpen }) {
  return (
    <div className="rounded-3xl p-5 mb-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-black ring-2 ring-amber-400/60 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-300 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="relative flex items-center gap-2 mb-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">★ 看板AI社員</span>
        <span className="text-xs text-amber-200">{agent.room}</span>
      </div>
      <div className="relative flex items-center gap-4 mb-3">
        <div className="w-20 h-20 rounded-2xl shrink-0 overflow-hidden ring-2 ring-amber-300 shadow-lg">
          {agent.avatarUrl ? (
            <img src={agent.avatarUrl} alt={agent.character} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-2xl font-bold text-slate-300">{agent.character.slice(0, 1)}</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-black text-white leading-tight">{agent.name}</p>
          <p className="text-xs text-slate-300 mt-0.5">{agent.character}</p>
          <p className="text-sm font-bold text-amber-300 mt-1">{agent.tagline}</p>
        </div>
      </div>
      <p className="relative text-sm text-slate-200 leading-relaxed mb-3">{agent.desc}</p>

      {agent.industries && (
        <div className="relative flex flex-wrap gap-1.5 mb-4">
          {agent.industries.map((ind) => (
            <span key={ind} className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-slate-200 ring-1 ring-white/20">
              {ind}
            </span>
          ))}
          <span className="text-xs px-2.5 py-1 text-slate-400">でも使える</span>
        </div>
      )}

      <button
        onClick={onOpen}
        className="relative w-full py-3 rounded-full text-sm font-bold text-slate-900 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-300 shadow-lg active:scale-95 transition-transform"
      >
        ✨ まずは接遇ガードAIから開始
      </button>
    </div>
  );
}

/* 利用可能なAI社員1名分のカード(看板以外・通常サイズ) */
function AvailableCard({ agent, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl p-4 flex items-center gap-3 ring-1 bg-gradient-to-r from-slate-800 to-slate-900 ring-amber-400/40 shadow-lg transition-transform active:scale-95"
    >
      <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden ring-2 ring-amber-300">
        {agent.avatarUrl ? (
          <img src={agent.avatarUrl} alt={agent.character} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-slate-300">{agent.character.slice(0, 1)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-white">{agent.name}</p>
          <span className="text-xs text-amber-300">{agent.room}</span>
        </div>
        <p className="text-xs text-slate-300 mt-0.5">
          {agent.character} ・ {agent.tagline}
        </p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{agent.desc}</p>
      </div>
      <span className="text-amber-300 text-xl shrink-0">›</span>
    </button>
  );
}

/* 準備中のAI社員1名分のカード(部署アイコン+名前+説明文) */
function SoonCard({ agent, onSoon }) {
  return (
    <button
      onClick={() => onSoon(agent)}
      className="w-full text-left rounded-2xl p-4 flex items-center gap-3 ring-1 bg-slate-900/40 ring-slate-700 opacity-70 transition-transform active:scale-95"
    >
      <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden ring-2 ring-slate-600">
        {agent.avatarUrl ? (
          <img src={agent.avatarUrl} alt={agent.character} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-slate-300">{agent.character.slice(0, 1)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-white">{agent.name}</p>
          <span className="text-xs text-amber-300">{agent.room}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">準備中</span>
        </div>
        <p className="text-xs text-slate-300 mt-0.5">
          {agent.character} ・ {agent.tagline}
        </p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{agent.desc}</p>
      </div>
    </button>
  );
}

/* Chaos AI Suite ホーム画面(接遇ガードAIを看板機能として強調し、複数のAI社員が並ぶ入口) */
export default function SuiteHome({ onOpenAgent }) {
  const [soonMsg, setSoonMsg] = useState("");

  const flagship = AGENTS.find((a) => a.flagship);
  const others = AGENTS.filter((a) => !a.flagship);
  const availableOthers = others.filter((a) => a.status === "available");
  const soonOthers = others.filter((a) => a.status !== "available");

  const handleSoon = (agent) => {
    setSoonMsg(`${agent.character}(${agent.name})は準備中です。今後追加予定です。`);
    setTimeout(() => setSoonMsg(""), 2200);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex justify-center font-sans">
      <div className="w-full max-w-md h-full flex flex-col relative overflow-hidden">
        <div className="overflow-y-auto flex-1 px-5 pt-8 pb-8">
          <p className="text-xs tracking-widest text-purple-300 mb-1">CHAOS AI SUITE</p>
          <h1 className="text-2xl font-black text-white mb-1">
            Chaos <span className="text-amber-300">AI Suite</span>
          </h1>
          <p className="text-xs text-slate-400 mb-4">仕事を自動化するAIエージェント集</p>

          <div className="rounded-2xl overflow-hidden mb-4 ring-1 ring-purple-500/30 shadow-lg">
            <img src="/images/suite-team.jpg" alt="Chaos AI Suite 6人のAI社員" className="w-full h-40 object-cover object-top" />
          </div>

          <div className="rounded-2xl p-4 mb-6 bg-gradient-to-r from-purple-900/40 to-slate-900/40 ring-1 ring-purple-500/30">
            <p className="text-sm text-slate-200 leading-relaxed">
              接遇・書類・研修・開発・SNS・経営を、ひとつのアプリでサポート。
              <br />
              スマホの中にAI社員を雇うような感覚で、業務をおまかせできます。
            </p>
          </div>

          {flagship && <FlagshipCard agent={flagship} onOpen={() => onOpenAgent(flagship.id)} />}

          {availableOthers.length > 0 && (
            <>
              <p className="text-xs font-bold text-amber-300 mb-2">利用可能なAI社員</p>
              <div className="space-y-3 mb-6">
                {availableOthers.map((agent) => (
                  <AvailableCard key={agent.id} agent={agent} onOpen={() => onOpenAgent(agent.id)} />
                ))}
              </div>
            </>
          )}

          <p className="text-xs font-bold text-slate-400 mb-2">その他のAI社員(準備中)</p>
          <div className="space-y-3">
            {soonOthers.map((agent) => (
              <SoonCard key={agent.id} agent={agent} onSoon={handleSoon} />
            ))}
          </div>

          {soonMsg && (
            <div className="fixed left-1/2 bottom-8 -translate-x-1/2 bg-slate-800 text-slate-100 text-xs px-4 py-2.5 rounded-full shadow-lg ring-1 ring-slate-600 max-w-[90%] text-center">
              {soonMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
