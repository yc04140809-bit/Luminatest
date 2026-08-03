import type { MutationDirectionId } from '../types'

export interface MutationDirectionConfig {
  id: MutationDirectionId
  emoji: string
  label: string
  description: string
  promptFocus: string
}

export const MUTATION_DIRECTIONS: MutationDirectionConfig[] = [
  {
    id: 'WEIRDER',
    emoji: '🌀',
    label: 'もっと奇妙に',
    description: 'MUTATION SCORE重視',
    promptFocus:
      '意味変換度と予測困難性を最優先してください。今より一段と奇妙な仕組みへ振り切って構いません。ただし意味不明にはしないこと。',
  },
  {
    id: 'BUSINESS',
    emoji: '💰',
    label: 'もっと売れそうに',
    description: 'BUSINESS SCORE重視',
    promptFocus:
      '需要・収益性・実装可能性・継続利用可能性を重視してください。ただしPHASE Aで発見した発明の奇妙さや核心は壊さないこと。',
  },
  {
    id: 'DESIRE',
    emoji: '❤️',
    label: 'もっと欲しくなるように',
    description: '人間の欲求重視',
    promptFocus:
      '人間の根源的な欲求（楽したい・認められたい・つながりたい等）への刺さり方を最優先してください。',
  },
  {
    id: 'BUILDABLE',
    emoji: '🛠',
    label: 'もっと作れそうに',
    description: '個人開発・MVP重視',
    promptFocus:
      '個人開発または少人数で検証できる最小構成を重視してください。実装可能性を具体的に上げてください。',
  },
  {
    id: 'CHAOS',
    emoji: '🎲',
    label: '完全突然変異',
    description: '予測不能な方向へ',
    promptFocus:
      '方向性を一切指定しません。予測不能な方向へ自由に進化させてください。親アイデアの核心1つだけは残してください。',
  },
]

export function getMutationDirection(id: MutationDirectionId): MutationDirectionConfig {
  return MUTATION_DIRECTIONS.find((d) => d.id === id) ?? MUTATION_DIRECTIONS[0]
}
