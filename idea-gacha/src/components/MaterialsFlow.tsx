import type { Concept } from '../types'

interface Props {
  materials: Concept[]
  usedConcepts: string[]
  discardedConcepts: string[]
  invention: string
  product: string
}

export function MaterialsFlow({ materials, usedConcepts, discardedConcepts, invention, product }: Props) {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-2">🎲 ORIGINAL MATERIALS</p>
        <div className="flex flex-wrap gap-1.5">
          {materials.map((m) => {
            const discarded = discardedConcepts.includes(m.label)
            return (
              <span
                key={m.label}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  discarded
                    ? 'border-lab-border text-slate-500 line-through opacity-50'
                    : 'border-neon-cyan/40 bg-white/5 text-slate-100'
                }`}
              >
                {m.emoji} {m.label}
              </span>
            )
          })}
          {usedConcepts
            .filter((label) => !materials.some((m) => m.label === label))
            .map((label) => (
              <span
                key={label}
                className="rounded-lg border border-neon-cyan/40 bg-white/5 px-2 py-1 text-xs text-slate-100"
              >
                {label}
              </span>
            ))}
        </div>
      </div>

      <div className="flex justify-center text-slate-600">↓</div>

      <div>
        <p className="text-[11px] uppercase tracking-widest text-neon-violet mb-1">🧬 INVENTION</p>
        <p className="text-sm italic leading-relaxed text-slate-200">{invention}</p>
      </div>

      <div className="flex justify-center text-slate-600">↓</div>

      <div>
        <p className="text-[11px] uppercase tracking-widest text-neon-amber mb-1">📦 PRODUCT</p>
        <p className="text-sm leading-relaxed text-slate-200">{product}</p>
      </div>
    </div>
  )
}
