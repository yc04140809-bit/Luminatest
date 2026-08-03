import { SCORE_LABELS, computeTotalScore } from '../utils/scoring'
import type { GachaMode, IdeaScores } from '../types'

interface Props {
  scores: IdeaScores
  mode: GachaMode
}

function barColor(value: number): string {
  if (value >= 75) return 'from-neon-cyan to-emerald-400'
  if (value >= 50) return 'from-neon-violet to-neon-cyan'
  if (value >= 25) return 'from-neon-amber to-neon-violet'
  return 'from-rose-500 to-neon-amber'
}

export function ScorePanel({ scores, mode }: Props) {
  const total = computeTotalScore(scores, mode)
  const keys = Object.keys(SCORE_LABELS) as (keyof IdeaScores)[]

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">IDEA SCORE</h3>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-white neon-text">{total}</span>
          <span className="text-xs text-slate-400"> /100</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {keys.map((key) => {
          const meta = SCORE_LABELS[key]
          const value = scores[key]
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>
                  {meta.emoji} {meta.label}
                </span>
                <span className="tabular-nums">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barColor(value)} transition-all duration-700`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
