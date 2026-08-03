import { MUTATION_DIRECTIONS } from '../data/mutationDirections'
import type { MutationDirectionId } from '../types'

interface Props {
  open: boolean
  onSelect: (direction: MutationDirectionId) => void
  onClose: () => void
}

export function MutationDirectionSheet({ open, onSelect, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-card w-full max-w-md rounded-t-3xl p-5 pb-8 space-y-3 animate-card-flip-in bg-lab-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <h3 className="text-center text-sm font-bold text-slate-100">🧬 どの方向に変異させる？</h3>

        <div className="flex flex-col gap-2">
          {MUTATION_DIRECTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              className="glass-card rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors hover:border-neon-cyan/50"
            >
              <span className="font-semibold text-slate-100 text-sm">
                {d.emoji} {d.label}
              </span>
              <span className="text-[11px] text-slate-400">{d.description}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl py-2 text-xs text-slate-400"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
