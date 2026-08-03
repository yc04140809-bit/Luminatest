interface Props {
  mutationScore: number
  businessScore: number
  chaosScore: number
}

function Bar({ emoji, label, value, color }: { emoji: string; label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-300 mb-1">
        <span>
          {emoji} {label}
        </span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function MutationScorePanel({ mutationScore, businessScore, chaosScore }: Props) {
  return (
    <div className="glass-card rounded-2xl p-4 border-neon-violet/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">⚡ CHAOS SCORE</h3>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-neon-magenta neon-text">{chaosScore}</span>
          <span className="text-xs text-slate-400"> /100</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">「意外なのに、なぜか成立している」度</p>
      <div className="space-y-2.5">
        <Bar emoji="🧬" label="MUTATION SCORE" value={mutationScore} color="from-neon-violet to-neon-magenta" />
        <Bar emoji="💰" label="BUSINESS SCORE" value={businessScore} color="from-neon-cyan to-emerald-400" />
      </div>
    </div>
  )
}
