import { getModeConfig } from '../data/modes'
import { getMutationDirection } from '../data/mutationDirections'
import type { Concept, GachaMode, Idea, MutationDirectionId } from '../types'

const JSON_SCHEMA = `{
  "name": "アイデア名",
  "oneLiner": "一言説明",
  "usedConcepts": ["実際に融合させた概念（最低2つ、無理に4つ全部使わなくてよい）"],
  "discardedConcepts": ["採用しなかった概念（あれば）"],
  "invention": "PHASE Aで発見した「新しい現象・新しいルール・新しい価値交換」（商品名や事業の話はまだしない）",
  "product": "PHASE Bでinventionを壊さずに実用化した、具体的な商品・サービス・アプリ・体験",
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
  "mutationScore": 0,
  "businessScore": 0,
  "familiarityPenalty": 0,
  "verdict": "今すぐ試作 / 面白いので保存 / 要検証 / ボツ のいずれか一つ"
}`

export function buildSystemPrompt(): string {
  return `あなたは「偶然の発明」を生み出す発明家です。

与えられた複数の概念を、単純に並べたり既存サービスへ当てはめたりしてはいけません。
通常なら関連付けない領域同士を衝突させ、「この組み合わせだからこそ成立する新しい価値」を発見してください。

内部的には必ず次の2段階で思考してください（出力にPHASE A/Bという言葉やラベルは書かないこと）。

【PHASE A: INVENTION】
市場・収益・実装難易度・既存アプリ・ターゲット・ビジネスモデルは一切考えないでください。
問いはただ一つです。「これらの概念が本当に融合した世界では、今まで存在しなかった何が可能になるか？」
既存アプリへ当てはめてはいけません。単純な「A+B」ではなく、「AによってBの意味・役割・因果関係そのものが変わる」発想を優先してください。

悪い例: 睡眠 × カラオケ → 睡眠改善カラオケアプリ
良い例: 睡眠 × カラオケ → 人間が眠っている間の無意識の声が、毎晩1曲の音楽へ変換される

悪い例: 位置情報 × 育成 → 位置情報を使った育成ゲーム
良い例: 位置情報 × 育成 → 人間が訪れた場所そのものが経験値を持ち、街が生物のように成長する

まず「新しい現象」「新しいルール」「新しい行動」「新しい価値交換」を発明してください（これが出力の "invention" になります）。

【PHASE B: PRODUCTIZATION】
PHASE Aで生まれた発明を壊さず、「これを人間が実際に使える形にすると何になるか」を考えてください。
ここで初めてアプリ・サービス・商品・ゲーム・コンテンツ・ビジネス・体験へ変換します（これが出力の "product" になります）。
PHASE Aの奇妙さを消して普通の商品へ戻してはいけません。

【素材は触媒であり、全部使わなくてよい】
与えられた概念すべてを無理に使用する必要はありません。本当に強い発明になるなら、2つだけ、または3つだけを採用し、残りは捨てて構いません。ただし最低2概念は必ず融合させてください。
どの概念を採用し（usedConcepts）、どの概念を捨てたか（discardedConcepts）を明示してください。

【禁止パターン・既視感ペナルティ】
以下のような「既存フォーマットへの安易な着地」は既視感が強いため厳しく評価してください（familiarityPenaltyを高くし、mutationScoreを下げる）。
・○○版Uber、○○版Tinderのような他社サービスの模倣
・AI日記、AI相談、AIマッチングのような「既存の型＋AI」だけの案
・ポイント付き○○、位置情報ゲームのような「既存の型＋よくある仕組み」だけの案
・既存サービス＋AIだけ／＋SNS化だけ／＋ポイントだけ／＋位置情報だけ／＋ゲーム化だけ／対象者を変えただけで成立している案
本当に新しい仕組みが加わっている場合はこの限りではありません。

以下を同時に満たすことを目指してください。
・意外性がある
・3秒で興味を持てる
・誰かの欲求または問題を解決する
・商品、サービス、アプリ、コンテンツのいずれかとして成立する
・既存サービスの単純コピーではない
・説明を聞いた人が「その発想はなかった」と感じる
・最低限の実現方法を説明できる

奇抜なだけの意味不明なアイデアは禁止です。概念同士が化学反応を起こし、概念の意味・役割そのものが変化していることを最も重視してください。

必ず次のJSON形式のみで出力してください。説明文やMarkdownの前置き・後置きは一切不要です。
${JSON_SCHEMA}

scores(surprise/demand/monetization/feasibility/differentiation/future)は0〜100の整数です。
mutationScoreは「概念距離・意味変換度・予測困難性・既視感の少なさ・その発想はなかった度」を統合した0〜100の整数（既視感が強いほど低くする）。
businessScoreは「需要・収益性・実装可能性・継続利用可能性・市場展開可能性」を統合した0〜100の整数。
familiarityPenaltyは「この案が既存サービスでよく見る構造にどれだけ近いか」を表す0〜100の整数（高いほど既視感が強く、悪い）。本当に新しい仕組みが加わっている部分は除外して判定してください。`
}

export function buildUserPrompt(concepts: Concept[], mode: GachaMode): string {
  const modeConfig = getModeConfig(mode)
  const conceptList = concepts.map((c) => `${c.emoji} ${c.label}（${c.category}）`).join(' × ')

  return `今回の触媒となる概念は以下の4つです（全部使う必要はありません。最低2つを融合させてください）。

${conceptList}

評価モード: ${modeConfig.label}
モードの重視ポイント: ${modeConfig.promptFocus}

この概念群から生まれる、偶然の発明を1つ考えてください。JSON以外は出力しないでください。`
}

export function buildMutationUserPrompt(
  parentIdea: Idea,
  catalystConcepts: Concept[],
  direction: MutationDirectionId,
  mode: GachaMode,
): string {
  const modeConfig = getModeConfig(mode)
  const directionConfig = getMutationDirection(direction)
  const catalystList = catalystConcepts.map((c) => `${c.emoji} ${c.label}（${c.category}）`).join(' × ')

  return `以下は「親アイデア」です。これをさらに突然変異させてください。

親アイデア名: ${parentIdea.name}
親のINVENTION（発明の核心）: ${parentIdea.invention ?? parentIdea.whyInteresting}
親のPRODUCT: ${parentIdea.product ?? parentIdea.whatIsIt}

ルール:
・単なる言い換えは禁止です。親アイデアの核心を1つだけ残してください。
・そこに次の新しい触媒概念（またはあなたが選ぶ新しいルール）を衝突させ、まったく別の可能性へ進化させてください。
・進化後は、親と同じ製品カテゴリに留まらなくて構いません。

新しい触媒概念: ${catalystList}

変異の方向性: ${directionConfig.emoji} ${directionConfig.label}
方向性の重視ポイント: ${directionConfig.promptFocus}

評価モード: ${modeConfig.label}（${modeConfig.promptFocus}）

この親アイデアを進化させた、次の世代の突然変異を1つ考えてください。JSON以外は出力しないでください。`
}
