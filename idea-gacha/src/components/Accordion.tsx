import { useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  emoji: string
  children: ReactNode
  defaultOpen?: boolean
}

export function Accordion({ title, emoji, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-200">
          {emoji} {title}
        </span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  )
}
