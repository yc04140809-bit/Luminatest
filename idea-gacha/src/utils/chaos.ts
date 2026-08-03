// CHAOS SCORE is a weighted geometric mean of mutation/business, not a
// plain average — that's what makes an extreme skew in either direction
// (Mutation 95 / Business 10, or Mutation 20 / Business 95) score low,
// while a case like Mutation 85 / Business 70 scores very high. Mutation
// carries more weight since "surprising but unusable" beats "usable but
// boring" for this app's purpose.
const MUTATION_WEIGHT = 0.65
const BUSINESS_WEIGHT = 0.35

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n))
}

export function computeChaosScore(mutationScore: number, businessScore: number): number {
  const m = clamp(mutationScore)
  const b = clamp(businessScore)
  const raw = Math.pow(m, MUTATION_WEIGHT) * Math.pow(b, BUSINESS_WEIGHT)
  return Math.round(clamp(raw))
}
