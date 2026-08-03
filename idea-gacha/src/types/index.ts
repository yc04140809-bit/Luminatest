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
