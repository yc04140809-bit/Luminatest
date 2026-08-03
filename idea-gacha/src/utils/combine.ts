import { ALL_CATEGORIES, CONCEPTS_BY_CATEGORY } from '../data/concepts'
import type { Concept } from '../types'

const HISTORY_SIZE = 12
let recentLabels: string[] = []

function pickCategories(): typeof ALL_CATEGORIES {
  // Always draw across 4 of the 5 categories so concepts come from
  // semantically distant "buckets" instead of pure global randomness.
  // Which category gets dropped rotates randomly each pull.
  const shuffled = [...ALL_CATEGORIES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 4) as typeof ALL_CATEGORIES
}

function pickFrom(category: (typeof ALL_CATEGORIES)[number]): Concept {
  const pool = CONCEPTS_BY_CATEGORY[category]
  // Prefer concepts that haven't shown up in the last few pulls,
  // so the same combo doesn't repeat back-to-back.
  const fresh = pool.filter((c) => !recentLabels.includes(c.label))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function drawConcepts(): Concept[] {
  const categories = pickCategories()
  const picked = categories.map(pickFrom)

  recentLabels = [...recentLabels, ...picked.map((c) => c.label)].slice(
    -HISTORY_SIZE,
  )

  return picked
}
