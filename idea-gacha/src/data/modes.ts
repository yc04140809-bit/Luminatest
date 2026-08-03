import type { GachaMode, IdeaScores } from '../types'

export interface ModeConfig {
  id: GachaMode
  emoji: string
  label: string
  description: string
  promptFocus: string
  weights: IdeaScores
}

export const MODES: ModeConfig[] = [
  {
    id: 'STANDARD',
    emoji: '🎰',
    label: 'STANDARD',
    description: '意外性・需要・実装性をバランスよく評価',
    promptFocus: '意外性・需要・実装性をバランスよく評価してください。',
    weights: {
      surprise: 1,
      demand: 1,
      monetization: 1,
      feasibility: 1,
      differentiation: 1,
      future: 1,
    },
  },
  {
    id: 'MONEY',
    emoji: '💰',
    label: 'MONEY',
    description: '30日以内に収益化できる可能性を重視',
    promptFocus:
      '30日以内に収益化できる可能性を最も重視してください。マネタイズ手段が具体的であるほど高評価です。',
    weights: {
      surprise: 0.5,
      demand: 2,
      monetization: 3,
      feasibility: 1.5,
      differentiation: 1,
      future: 1,
    },
  },
  {
    id: 'CRAZY',
    emoji: '🧬',
    label: 'CRAZY',
    description: '通常なら絶対に組み合わせない概念を優先（意味不明はNG）',
    promptFocus:
      '「普通に便利」より「そんな発想ある？」を最優先してください。理想の反応は、最初は「なんじゃそれ」、3秒後に「待って、それ面白くない？」、10秒後に「実際どうやって作る？」となることです。' +
      'MUTATION SCORE（概念距離・意味変換度・予測困難性・既視感の少なさ）を最重要視し、verdictやCHAOS SCOREもMUTATION SCOREを軸に判断してください。' +
      '実用的だが既視感の強い案（例: 地域課題をクエスト化する、既存サービス＋AI／ポイント／位置情報／SNS／ゲーム化だけで成立する案）は、たとえ実装しやすくても強く減点してください。' +
      'ただし「意味不明なだけ」の案は禁止です。奇抜さの裏に必ず筋の通った価値を用意してください。',
    weights: {
      surprise: 3,
      demand: 0.5,
      monetization: 0.5,
      feasibility: 0.5,
      differentiation: 2,
      future: 1,
    },
  },
  {
    id: 'APP',
    emoji: '📱',
    label: 'APP',
    description: '個人開発・少人数で作れるアプリ案を重視',
    promptFocus:
      '個人開発または少人数チームで実装できるアプリ案を重視してください。技術的な実現性を具体的に説明してください。',
    weights: {
      surprise: 1,
      demand: 1.5,
      monetization: 1,
      feasibility: 3,
      differentiation: 1,
      future: 1,
    },
  },
  {
    id: 'IP',
    emoji: '🎨',
    label: 'IP',
    description: 'キャラクター・物語・グッズ等IP化可能性を重視',
    promptFocus:
      'キャラクター、ゲーム、物語、グッズ、SNS展開などIP化できる可能性を重視してください。',
    weights: {
      surprise: 1.5,
      demand: 1,
      monetization: 0.5,
      feasibility: 0.5,
      differentiation: 2.5,
      future: 2,
    },
  },
]

export function getModeConfig(mode: GachaMode): ModeConfig {
  return MODES.find((m) => m.id === mode) ?? MODES[0]
}
