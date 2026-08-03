import type { EvolutionRecord } from '../types'

interface Props {
  history: EvolutionRecord[]
}

export function EvolutionHistory({ history }: Props) {
  if (history.length < 2) return null

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">🧬 EVOLUTION HISTORY</h3>
      <ol className="space-y-2.5">
        {history.map((h, i) => {
          const isCurrent = i === history.length - 1
          return (
            <li
              key={`${h.generation}-${h.name}`}
              className={`flex items-start gap-2 text-xs ${isCurrent ? 'text-white' : 'text-slate-400'}`}
            >
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${
                  isCurrent ? 'bg-neon-violet/30 text-neon-cyan' : 'bg-white/10'
                }`}
              >
                GEN {h.generation}
              </span>
              <span className="flex-1 leading-relaxed">
                <span className="font-semibold">{h.name}</span> — {h.oneLiner}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
