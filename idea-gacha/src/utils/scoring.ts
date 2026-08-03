import { getModeConfig } from '../data/modes'
import type { GachaMode, IdeaScores } from '../types'

// Weighted average, not a plain mean — each mode leans on the axes that
// matter for that mode (e.g. MONEY leans on monetization/demand).
export function computeTotalScore(scores: IdeaScores, mode: GachaMode): number {
  const { weights } = getModeConfig(mode)
  const keys = Object.keys(weights) as (keyof IdeaScores)[]
  const totalWeight = keys.reduce((sum, k) => sum + weights[k], 0)
  const weightedSum = keys.reduce((sum, k) => sum + scores[k] * weights[k], 0)
  return Math.round(weightedSum / totalWeight)
}

export const SCORE_LABELS: Record<keyof IdeaScores, { emoji: string; label: string }> = {
  surprise: { emoji: '🎲', label: '意外性' },
  demand: { emoji: '❤️', label: '欲しくなる度' },
  monetization: { emoji: '💰', label: '収益性' },
  feasibility: { emoji: '🛠', label: '実装可能性' },
  differentiation: { emoji: '🥊', label: '差別化' },
  future: { emoji: '🚀', label: '将来性' },
}
