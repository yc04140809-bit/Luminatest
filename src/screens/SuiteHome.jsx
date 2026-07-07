import { useState } from "react";
import { AGENTS } from "../data/agents";

/* AI社員1名分のカード(部署アイコン+名前+説明文) */
function AgentCard({ agent, onOpen, onSoon }) {
  const available = agent.status === "available";
  return (
    <button
      onClick={() => (available ? onOpen() : onSoon(agent))}
      className={`w-full text-left rounded-2xl p-4 flex items-center gap-3 ring-1 transition-transform ${
        available
          ? "bg-gradient-to-r from-slate-800 to-slate-900 ring-amber-400/40 active:scale-95 shadow-lg"
          : "bg-slate-900/40 ring-slate-700 opacity-70"
      }`}
    >
      <div
        className={`w-14 h-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden ring-2 ${
          available ? "ring-amber-300" : "ring-slate-600"
        }`}
      >
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
          {!available && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">準備中</span>}
        </div>
        <p className="text-xs text-slate-300 mt-0.5">{agent.character} ・ {agent.tagline}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{agent.desc}</p>
      </div>
      {available && <span className="text-amber-300 text-xl shrink-0">›</span>}
    </button>
  );
}

/* Chaos AI Suite ホーム画面(複数のAI社員が並ぶ入口) */
export default function SuiteHome({ onOpenSesshoku }) {
  const [soonMsg, setSoonMsg] = useState("");

  const handleOpen = (agent) => {
    if (agent.id === "sesshoku") onOpenSesshoku();
  };
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

          <div className="rounded-2xl p-4 mb-6 bg-gradient-to-r from-purple-900/40 to-slate-900/40 ring-1 ring-purple-500/30">
            <p className="text-sm text-slate-200 leading-relaxed">
              接遇・書類・研修・開発・SNS・経営を、ひとつのアプリでサポート。
              <br />
              スマホの中にAI社員を雇うような感覚で、業務をおまかせできます。
            </p>
          </div>

          <p className="text-xs font-bold text-amber-300 mb-2">✨ まずは接遇ガードAIから開始</p>

          <div className="space-y-3">
            {AGENTS.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onOpen={() => handleOpen(agent)} onSoon={handleSoon} />
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
