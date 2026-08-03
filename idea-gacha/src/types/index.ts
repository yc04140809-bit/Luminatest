export type ConceptCategory =
  | 'TECHNOLOGY'
  | 'HUMAN_DESIRE'
  | 'MARKET'
  | 'MECHANISM'
  | 'WILD_CARD'

export interface Concept {
  category: ConceptCategory
  label: string
  emoji: string
}

export type GachaMode = 'STANDARD' | 'MONEY' | 'CRAZY' | 'APP' | 'IP'

export interface IdeaScores {
  surprise: number
  demand: number
  monetization: number
  feasibility: number
  differentiation: number
  future: number
}

export type Verdict = '今すぐ試作' | '面白いので保存' | '要検証' | 'ボツ'

export type MutationDirectionId = 'WEIRDER' | 'BUSINESS' | 'DESIRE' | 'BUILDABLE' | 'CHAOS'

// A minimal snapshot of a parent idea, stored on its child so a mutation
// chain can be displayed without needing the full ancestor object graph.
export interface ParentIdeaRef {
  name: string
  oneLiner: string
  generation: number
}

export interface Idea {
  name: string
  oneLiner: string
  concepts: string[]
  whatIsIt: string
  whyInteresting: string
  target: string
  problem: string
  monetization: string
  mvp: string
  difference: string
  scores: IdeaScores
  verdict: Verdict

  // v0.2 MUTATION ENGINE fields — all optional so ideas saved by v0.1
  // (which lack them entirely) keep rendering without special-casing.
  generation?: number
  originalConcepts?: string[]
  usedConcepts?: string[]
  discardedConcepts?: string[]
  invention?: string
  product?: string
  mutationScore?: number
  businessScore?: number
  chaosScore?: number
  familiarityPenalty?: number
  parentIdea?: ParentIdeaRef | null
}

export interface EvolutionRecord {
  generation: number
  name: string
  oneLiner: string
}

export interface SavedIdea {
  id: string
  idea: Idea
  mode: GachaMode
  concepts: Concept[]
  totalScore: number
  status: 'prototype' | 'saved'
  createdAt: string
}
