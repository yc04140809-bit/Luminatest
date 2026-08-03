import type { Verdict } from '../types'

const VERDICT_STYLE: Record<Verdict, { emoji: string; className: string }> = {
  今すぐ試作: { emoji: '🔥', className: 'bg-rose-500/20 text-rose-300 border-rose-400/50' },
  面白いので保存: {
    emoji: '⭐',
    className: 'bg-amber-400/15 text-amber-300 border-amber-300/50',
  },
  要検証: { emoji: '🔬', className: 'bg-sky-500/15 text-sky-300 border-sky-400/50' },
  ボツ: { emoji: '🗑', className: 'bg-slate-500/15 text-slate-400 border-slate-500/50' },
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const style = VERDICT_STYLE[verdict] ?? VERDICT_STYLE['要検証']
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold ${style.className}`}
    >
      <span>{style.emoji}</span>
      <span>{verdict}</span>
    </div>
  )
}
