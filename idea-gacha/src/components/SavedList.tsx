import type { SavedIdea } from '../types'

interface Props {
  ideas: SavedIdea[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

export function SavedList({ ideas, onSelect, onDelete }: Props) {
  if (ideas.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-sm">
        まだ保存されたアイデアはありません。
        <br />
        ガチャを回して気に入った発明を保存しよう。
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {ideas.map((entry) => (
        <li key={entry.id} className="glass-card rounded-2xl p-4">
          <button type="button" onClick={() => onSelect(entry.id)} className="w-full text-left">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-white text-base truncate">{entry.idea.name}</h3>
              <span className="shrink-0 text-lg font-extrabold text-neon-cyan neon-text">
                {entry.totalScore}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 truncate">
              {entry.concepts.map((c) => `${c.emoji}${c.label}`).join(' × ')}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="rounded-full bg-white/5 px-2 py-0.5">{entry.mode}</span>
              <span>{formatDate(entry.createdAt)}</span>
              {entry.status === 'prototype' && (
                <span className="rounded-full bg-rose-500/15 text-rose-300 px-2 py-0.5">
                  🔥 試作候補
                </span>
              )}
            </div>
          </button>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
            >
              🗑 削除
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
