import { DEMO_IDEAS, pickDemoMutation } from '../data/demoIdeas'
import { finalizeIdea } from '../utils/finalizeIdea'
import type { Concept, GachaMode, Idea, MutationDirectionId } from '../types'
import { claudeProvider } from './providers/claudeProvider'
import type { AIProvider } from './providers/types'
import { buildMutationUserPrompt, buildSystemPrompt, buildUserPrompt } from './prompt'

// Swap this line to change AI provider (e.g. openaiProvider, geminiProvider)
// once those are implemented behind the same AIProvider interface.
const provider: AIProvider = claudeProvider

export const isDemoMode = !provider.isConfigured

const TIMEOUT_MS = 25000
const MAX_RETRIES = 2

export class IdeaGenerationError extends Error {}

export interface GenerateResult {
  idea: Idea
  concepts: Concept[]
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : trimmed
  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1) {
    throw new IdeaGenerationError('AIの応答にJSONが見つかりませんでした')
  }
  const jsonSlice = candidate.slice(firstBrace, lastBrace + 1)
  try {
    return JSON.parse(jsonSlice)
  } catch {
    throw new IdeaGenerationError('AIの応答をJSONとして解析できませんでした')
  }
}

const REQUIRED_STRING_FIELDS = [
  'name',
  'oneLiner',
  'invention',
  'product',
  'whatIsIt',
  'whyInteresting',
  'target',
  'problem',
  'monetization',
  'mvp',
  'difference',
  'verdict',
] as const

const REQUIRED_SCORE_FIELDS = [
  'surprise',
  'demand',
  'monetization',
  'feasibility',
  'differentiation',
  'future',
] as const

const REQUIRED_MUTATION_NUMBER_FIELDS = ['mutationScore', 'businessScore', 'familiarityPenalty'] as const

function isValidIdea(value: unknown): value is Idea {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>

  if (!REQUIRED_STRING_FIELDS.every((k) => typeof v[k] === 'string')) return false
  if (!Array.isArray(v.usedConcepts) || v.usedConcepts.some((c) => typeof c !== 'string')) {
    return false
  }
  if (
    v.discardedConcepts !== undefined &&
    (!Array.isArray(v.discardedConcepts) || v.discardedConcepts.some((c) => typeof c !== 'string'))
  ) {
    return false
  }
  if (v.usedConcepts.length < 2) return false

  if (
    !REQUIRED_MUTATION_NUMBER_FIELDS.every(
      (k) => typeof v[k] === 'number' && Number.isFinite(v[k] as number),
    )
  ) {
    return false
  }

  if (!v.scores || typeof v.scores !== 'object') return false
  const scores = v.scores as Record<string, unknown>
  if (
    !REQUIRED_SCORE_FIELDS.every(
      (k) => typeof scores[k] === 'number' && Number.isFinite(scores[k] as number),
    )
  ) {
    return false
  }

  return true
}

async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fn(controller.signal)
  } catch (err) {
    if (controller.signal.aborted) {
      throw new IdeaGenerationError('AIの応答がタイムアウトしました')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callAndValidate(systemPrompt: string, userPrompt: string): Promise<Idea> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await withTimeout(
        (signal) => provider.generate(systemPrompt, userPrompt, signal),
        TIMEOUT_MS,
      )
      const parsed = extractJson(raw)
      if (!isValidIdea(parsed)) {
        throw new IdeaGenerationError('AIの応答形式が不正でした')
      }
      return parsed
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        await sleep(500 * (attempt + 1))
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new IdeaGenerationError('突然変異に失敗しました。もう一度回してください。')
}

function pickDemoIdea(): GenerateResult {
  const entry = DEMO_IDEAS[Math.floor(Math.random() * DEMO_IDEAS.length)]
  return { idea: entry.idea, concepts: entry.concepts }
}

export async function generateIdea(concepts: Concept[], mode: GachaMode): Promise<GenerateResult> {
  if (isDemoMode) {
    await sleep(900)
    return pickDemoIdea()
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(concepts, mode)
  const parsed = await callAndValidate(systemPrompt, userPrompt)
  const idea = finalizeIdea(parsed, concepts, 1, null)
  return { idea, concepts }
}

export async function generateMutation(
  parentIdea: Idea,
  catalystConcepts: Concept[],
  direction: MutationDirectionId,
  mode: GachaMode,
): Promise<GenerateResult> {
  if (isDemoMode) {
    await sleep(900)
    return pickDemoMutation(parentIdea, catalystConcepts, direction)
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildMutationUserPrompt(parentIdea, catalystConcepts, direction, mode)
  const parsed = await callAndValidate(systemPrompt, userPrompt)
  const nextGeneration = (parentIdea.generation ?? 1) + 1
  const idea = finalizeIdea(parsed, catalystConcepts, nextGeneration, parentIdea)
  return { idea, concepts: catalystConcepts }
}
