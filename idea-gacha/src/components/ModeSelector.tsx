import { MODES } from '../data/modes'
import type { GachaMode } from '../types'

interface Props {
  value: GachaMode
  onChange: (mode: GachaMode) => void
  disabled?: boolean
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1 snap-x">
        {MODES.map((m) => {
          const active = m.id === value
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(m.id)}
              className={`snap-start shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all border
                ${
                  active
                    ? 'bg-gradient-to-r from-neon-violet/30 to-neon-cyan/20 border-neon-cyan text-white shadow-[0_0_16px_rgba(94,247,255,0.35)]'
                    : 'glass-card text-slate-300 border-lab-border hover:border-neon-cyan/50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="mr-1">{m.emoji}</span>
              {m.label}
            </button>
          )
        })}
      </div>
      <p className="mt-2 px-1 text-xs text-slate-400 min-h-[2.5em]">
        {MODES.find((m) => m.id === value)?.description}
      </p>
    </div>
  )
}
