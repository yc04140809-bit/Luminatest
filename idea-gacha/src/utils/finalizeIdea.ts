import { computeChaosScore } from './chaos'
import type { Concept, Idea } from '../types'

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

// Stitches in everything the app itself is responsible for (generation
// counter, which materials fed this step, parent lineage, the derived
// chaos score) on top of a candidate idea — whether that candidate came
// from a live AI response or a hand-written demo template. Also clamps
// every score to 0-100 defensively.
export function finalizeIdea(
  parsed: Idea,
  originalConcepts: Concept[],
  generation: number,
  parentIdea: Idea | null,
): Idea {
  const mutationScore = clamp100(parsed.mutationScore ?? 0)
  const businessScore = clamp100(parsed.businessScore ?? 0)

  return {
    ...parsed,
    concepts: (parsed.usedConcepts as string[] | undefined) ?? parsed.concepts,
    scores: {
      surprise: clamp100(parsed.scores.surprise),
      demand: clamp100(parsed.scores.demand),
      monetization: clamp100(parsed.scores.monetization),
      feasibility: clamp100(parsed.scores.feasibility),
      differentiation: clamp100(parsed.scores.differentiation),
      future: clamp100(parsed.scores.future),
    },
    generation,
    originalConcepts: originalConcepts.map((c) => c.label),
    discardedConcepts: parsed.discardedConcepts ?? [],
    mutationScore,
    businessScore,
    familiarityPenalty: clamp100(parsed.familiarityPenalty ?? 0),
    chaosScore: computeChaosScore(mutationScore, businessScore),
    parentIdea: parentIdea
      ? { name: parentIdea.name, oneLiner: parentIdea.oneLiner, generation: parentIdea.generation ?? 1 }
      : null,
  }
}
