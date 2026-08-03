import { useEffect, useState } from 'react'
import { ALL_CATEGORIES, CONCEPTS_BY_CATEGORY } from '../data/concepts'
import type { Concept } from '../types'

const ALL_CONCEPTS: Concept[] = ALL_CATEGORIES.flatMap((cat) => CONCEPTS_BY_CATEGORY[cat])

function randomConcept(): Concept {
  return ALL_CONCEPTS[Math.floor(Math.random() * ALL_CONCEPTS.length)]
}

interface Props {
  spinning: boolean
  concepts: Concept[] | null
}

export function ConceptReveal({ spinning, concepts }: Props) {
  const [slots, setSlots] = useState<Concept[]>(() => [
    randomConcept(),
    randomConcept(),
    randomConcept(),
    randomConcept(),
  ])

  useEffect(() => {
    if (!spinning) return
    const id = setInterval(() => {
      setSlots([randomConcept(), randomConcept(), randomConcept(), randomConcept()])
    }, 120)
    return () => clearInterval(id)
  }, [spinning])

  const display = spinning ? slots : concepts ?? slots

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
      {display.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`glass-card rounded-2xl px-3 py-2 min-w-[5.5rem] text-center
              ${spinning ? 'animate-gacha-spin' : 'animate-card-flip-in'}`}
            style={!spinning ? { animationDelay: `${i * 90}ms` } : undefined}
          >
            <div className="text-2xl leading-none">{c.emoji}</div>
            <div className="mt-1 text-xs font-medium text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[6rem]">
              {c.label}
            </div>
          </div>
          {i < display.length - 1 && (
            <span className="text-neon-magenta text-lg font-bold neon-text">×</span>
          )}
        </div>
      ))}
    </div>
  )
}
