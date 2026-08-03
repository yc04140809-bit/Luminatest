import { getModeConfig } from '../data/modes'
import type { Concept, GachaMode } from '../types'

export function buildSystemPrompt(): string {
  return `あなたは「偶然の発明」を生み出す発明家です。

与えられた複数の概念を、単純に並べたり既存サービスへ当てはめたりしてはいけません。
通常なら関連付けない領域同士を衝突させ、「この組み合わせだからこそ成立する新しい価値」を発見してください。

奇抜なだけのアイデアは禁止です。以下を同時に満たすことを目指してください。
・意外性がある
・3秒で興味を持てる
・誰かの欲求または問題を解決する
・商品、サービス、アプリ、コンテンツのいずれかとして成立する
・既存サービスの単純コピーではない
・説明を聞いた人が「その発想はなかった」と感じる
・最低限の実現方法を説明できる

特に、「AIを付けただけ」「SNS化しただけ」「ポイントを付けただけ」「既存アプリの対象者を変えただけ」のアイデアは低評価にしてください。
概念同士が化学反応を起こしていることを重視してください。

必ず次のJSON形式のみで出力してください。説明文やMarkdownの前置き・後置きは一切不要です。
{
  "name": "アイデア名",
  "oneLiner": "一言説明",
  "concepts": ["概念1", "概念2", "概念3", "概念4"],
  "whatIsIt": "具体的に何なのか",
  "whyInteresting": "なぜこの組み合わせが面白いのか",
  "target": "誰向けなのか",
  "problem": "どんな欲求・問題を解決するのか",
  "monetization": "どう収益化するか",
  "mvp": "最小構成なら何を作れば検証できるか",
  "difference": "既存サービスとの違い",
  "scores": {
    "surprise": 0,
    "demand": 0,
    "monetization": 0,
    "feasibility": 0,
    "differentiation": 0,
    "future": 0
  },
  "verdict": "今すぐ試作 / 面白いので保存 / 要検証 / ボツ のいずれか一つ"
}
scoresは0〜100の整数で、それぞれ意外性・需要・収益性・実装可能性・差別化・将来性を表します。`
}

export function buildUserPrompt(concepts: Concept[], mode: GachaMode): string {
  const modeConfig = getModeConfig(mode)
  const conceptList = concepts.map((c) => `${c.emoji} ${c.label}（${c.category}）`).join(' × ')

  return `今回衝突させる4つの概念は以下です。

${conceptList}

評価モード: ${modeConfig.label}
モードの重視ポイント: ${modeConfig.promptFocus}

この4つの概念だからこそ成立する、偶然の発明を1つ考えてください。JSON以外は出力しないでください。`
}
