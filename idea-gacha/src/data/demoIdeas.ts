import { computeChaosScore } from '../utils/chaos'
import { finalizeIdea } from '../utils/finalizeIdea'
import type { Concept, GachaMode, Idea, MutationDirectionId } from '../types'
import type { GenerateResult } from '../services/ideaGenerator'

export interface DemoEntry {
  mode: GachaMode
  concepts: Concept[]
  idea: Idea
}

const c = (category: Concept['category'], label: string, emoji: string): Concept => ({
  category,
  label,
  emoji,
})

function gen1(template: Idea, materials: Concept[]): Idea {
  return finalizeIdea(template, materials, 1, null)
}

// ── GEN 1 base ideas ────────────────────────────────────────────────
// Pre-written so the whole app (gacha → reveal → invention/product →
// scores → mutate → save) can be exercised end-to-end with zero API
// key configured. Each intentionally uses only 3 of its 4 drawn
// materials (one is dropped), demonstrating that concepts are a
// catalyst, not a mandatory checklist.

const NEMUUTA_MATERIALS = [
  c('MARKET', 'カラオケ', '🎤'),
  c('WILD_CARD', '睡眠', '😴'),
  c('TECHNOLOGY', '位置情報', '📍'),
  c('MECHANISM', '育成', '🌱'),
]

const nemuutaIkusei = gen1(
  {
    name: 'ねむうた育成',
    oneLiner: '寝言といびきを声質データにして、カラオケアバターを育てるアプリ',
    concepts: ['カラオケ', '睡眠', '育成'],
    usedConcepts: ['カラオケ', '睡眠', '育成'],
    discardedConcepts: ['位置情報'],
    invention:
      '睡眠中の無意識の声（寝言・いびき）が、翌朝そのままカラオケアバターの声質パラメータへ変換される——無意識の発声が「育成資源」という新しい役割を持つようになる。',
    product:
      '就寝中の寝言・いびきを録音して声の高さ・張り・抑揚を分析し、そのデータを「声のステータス」としてカラオケアバターに反映、毎朝アバターが育っていくアプリ。',
    whatIsIt:
      '就寝中の寝言・いびきをマイクで録音し、声の高さ・張り・抑揚を分析。そのデータを「声のステータス」としてカラオケアバターに反映し、毎朝アバターが育っていく。',
    whyInteresting:
      'カラオケ（表現）と睡眠（無意識）は普段まったく交わらない領域。無意識に出る声を資産化するという発想が、聞いた瞬間「自分の寝言、育成に使われるのか」という意外性を生む。',
    target: '一人暮らしで睡眠の質が気になる20〜30代、カラオケ・ボイス系コンテンツ好き',
    problem:
      '睡眠の質を可視化したいが数値だけでは続かない。育成ゲームの文脈に載せることで継続的に眠りと向き合える。',
    monetization:
      'アバターの衣装・声エフェクトの課金、良質な睡眠スポット（宿泊施設）とのアフィリエイト連携、法人向け睡眠データ分析API',
    mvp: 'スマホのマイクで就寝中の音声を録音→簡易音量・周波数解析→翌朝に3パラメータ（声量/高さ/安定感）としてアバター画像を1枚生成して表示するだけの単機能アプリ',
    difference:
      '既存の睡眠計測アプリはグラフ表示止まりで継続率が低い。本アプリは「昨日の自分の声」がキャラクターとして毎朝育つため、感情的な報酬が発生し続ける。',
    scores: { surprise: 78, demand: 62, monetization: 48, feasibility: 66, differentiation: 74, future: 58 },
    mutationScore: 80,
    businessScore: 58,
    familiarityPenalty: 15,
    verdict: '面白いので保存',
  },
  NEMUUTA_MATERIALS,
)

const NIOI_MATERIALS = [
  c('MARKET', '美容', '💄'),
  c('TECHNOLOGY', 'ウェアラブル', '⌚'),
  c('WILD_CARD', '匂い', '👃'),
  c('MECHANISM', 'サブスク', '🔁'),
]

const nioiTeikibin = gen1(
  {
    name: 'におい定期便',
    oneLiner: '体臭センサー付きウェアラブルが、その日の自分に合う香りを毎月届ける',
    concepts: ['ウェアラブル', '匂い', 'サブスク'],
    usedConcepts: ['ウェアラブル', '匂い', 'サブスク'],
    discardedConcepts: ['美容'],
    invention:
      '体臭センサーの役割が「不調の記録」から「購買のトリガー」へと反転する——身体データが香水という商品を自動的に呼び寄せる引き金になる。',
    product:
      '体臭センサー付きウェアラブルが日々のにおい変化を検知し、変化パターンに合う香水・デオドラントを毎月レコメンドして定期便で届けるサブスク。',
    whatIsIt:
      '小型ウェアラブルが体臭・汗の成分変化を継続センシングし、季節や体調による「におい変化」を検知。専用アプリが変化パターンに合う香水・デオドラントを毎月レコメンドし、そのまま定期便で届ける。',
    whyInteresting:
      '美容業界の「香り」は感覚頼りで語られがちだが、匂いをセンサーで定量化しサブスクの選定ロジックに使うという組み合わせは今までにない。',
    target: '香水・デオドラントに月々お金を使う美容感度の高い20〜40代',
    problem: '香水選びは属人的で失敗しやすく、体調やシーズンで最適な香りが変わることに気づけない',
    monetization:
      '月額サブスク（センサー端末レンタル＋香り定期便）、香水ブランドとの提携販売手数料、匂いデータの匿名統計を美容メーカーへ販売',
    mvp: '既存の安価な汗センサーモジュール＋質問票アプリで「におい変化の簡易スコア」を出し、既存香水をルールベースでレコメンドするだけの手動フルフィルメントMVP',
    difference:
      '既存の香水サブスクは好み申告ベースだが、本サービスは身体データ起点でレコメンドが自動更新され続ける点が違う',
    scores: { surprise: 64, demand: 58, monetization: 82, feasibility: 55, differentiation: 70, future: 60 },
    mutationScore: 70,
    businessScore: 80,
    familiarityPenalty: 30,
    verdict: '今すぐ試作',
  },
  NIOI_MATERIALS,
)

const DOJIROBO_MATERIALS = [
  c('TECHNOLOGY', 'ロボット', '🦾'),
  c('WILD_CARD', '失敗', '💥'),
  c('MARKET', '介護', '🧓'),
  c('MECHANISM', 'オークション', '🔨'),
]

const dojirobo = gen1(
  {
    name: 'ドジロボ介護',
    oneLiner: 'わざと失敗する介護ロボットの「やらかし瞬間」を家族がオークションで見守る',
    concepts: ['ロボット', '失敗', 'オークション'],
    usedConcepts: ['ロボット', '失敗', 'オークション'],
    discardedConcepts: ['介護'],
    invention:
      '失敗は隠すべき欠陥ではなく、家族が投資したくなる「見守りの通貨」になる——ロボットの失敗が価値の交換対象という新しい役割を持つ。',
    product:
      '介護施設の見守りロボットが小さな失敗（配膳をこぼす、変な踊りで転ぶ）を演出し、その瞬間の映像に家族間で投げ銭・入札できる見守りエンタメサービス。',
    whatIsIt:
      '介護施設に置かれた見守りロボットが、あえて小さな失敗を演出。その瞬間の映像がクリップ化され、家族間で「今日のドジ映像」に投げ銭・入札できる仕組み。',
    whyInteresting:
      '介護ロボットは「完璧に失敗しないこと」が常識とされる領域。そこに失敗×オークションという娯楽装置をぶつけることで、見守りが「義務」から「毎日覗きたくなる体験」に変わる。',
    target: '離れて暮らす親を持つ40〜60代、笑いを介した見守りをしたい家族',
    problem: '介護施設の様子を知りたいが、堅い報告書や無機質な見守りカメラは見る気になれない',
    monetization: '家族間の投げ銭・入札課金、施設向け入居者エンゲージメント向上パッケージの月額提供',
    mvp: '既存の見守りカメラ映像から「面白い瞬間」を人手で切り出し、家族グループチャットに通知して簡易的な絵文字リアクション課金を試す運用ベースのMVP',
    difference:
      '既存の見守りサービスは異常検知が目的で無機質。本サービスはポジティブな笑いの共有を目的にしており、家族の継続利用動機が根本的に異なる',
    scores: { surprise: 91, demand: 47, monetization: 40, feasibility: 42, differentiation: 88, future: 53 },
    mutationScore: 88,
    businessScore: 42,
    familiarityPenalty: 12,
    verdict: '要検証',
  },
  DOJIROBO_MATERIALS,
)

const HITORIGOTO_MATERIALS = [
  c('TECHNOLOGY', '音声AI', '🗣️'),
  c('MECHANISM', '日記', '📔'),
  c('HUMAN_DESIRE', '成長したい', '📈'),
  c('MARKET', '仕事', '💼'),
]

const hitorigoto = gen1(
  {
    name: 'ひとりごと添削',
    oneLiner: '仕事中のひとりごとをAIが日記化し、口癖から成長のクセを教えてくれるアプリ',
    concepts: ['音声AI', '日記', '成長したい'],
    usedConcepts: ['音声AI', '日記', '成長したい'],
    discardedConcepts: ['仕事'],
    invention:
      '独り言は消えていく空気ではなく、翌週の自分を映す鏡になる——無意識の発話が、内省という行為の代わりを務めるようになる。',
    product: '作業中の独り言を自動録音・日記化し、口癖から思考のクセを週次でフィードバックするアプリ。',
    whatIsIt:
      'ワンタップで作業中の独り言を数十秒録音→音声AIが文字起こしして自動で1行日記に整形。ネガティブな口癖や思考の癖を週次でフィードバックしてくれる。',
    whyInteresting:
      '日記アプリは「書く」が前提だが、無意識に漏れる独り言を材料にすることで継続コストがほぼゼロになる。',
    target: '振り返りの習慣化が苦手なビジネスパーソン、フリーランス',
    problem: '内省したいが日記を書く時間も気力もない。自分の思考のクセに気づく機会がない',
    monetization: '月額サブスク（週次フィードバック＋長期トレンド分析）、チーム向けの匿名集計版を法人販売',
    mvp: 'スマホの録音ボタン＋既存の音声認識APIで文字起こしし、ネガティブワードを単純カウントして週次サマリーを表示するだけの個人開発規模MVP',
    difference:
      '既存の日記アプリは能動的な入力が前提。本アプリは受動的に集めたつぶやきを資産化する点で継続率の構造が異なる',
    scores: { surprise: 55, demand: 60, monetization: 50, feasibility: 84, differentiation: 58, future: 56 },
    mutationScore: 58,
    businessScore: 64,
    familiarityPenalty: 35,
    verdict: '今すぐ試作',
  },
  HITORIGOTO_MATERIALS,
)

const HIMITSU_MATERIALS = [
  c('TECHNOLOGY', 'エージェント', '🕵️'),
  c('WILD_CARD', '秘密', '🤫'),
  c('MARKET', '恋愛', '❤️'),
  c('MECHANISM', 'ストーリー', '📖'),
]

const himitsuAgent = gen1(
  {
    name: '秘密預りエージェント',
    oneLiner: '誰にも言えない秘密をAIエージェントに預けると、それを元にした恋物語が生まれる',
    concepts: ['エージェント', '秘密', 'ストーリー'],
    usedConcepts: ['エージェント', '秘密', 'ストーリー'],
    discardedConcepts: ['恋愛'],
    invention:
      '秘密は誰にも言えないまま消えるのではなく、物語という形に姿を変えて生き続ける——告白という個人的な行為が、創作という公共の行為に反転する。',
    product:
      '誰にも言えない秘密をAIエージェント「キーパー」に打ち明けると、匿名化された連載恋愛ショートストーリーの1話として紡がれるアプリ。',
    whatIsIt:
      'ユーザーが誰にも言えない小さな秘密をAIエージェント「キーパー」に打ち明けると、匿名化・脚色された上で連載型の恋愛ショートストーリーの1話としてAIが紡いでいく。',
    whyInteresting:
      '「秘密を預ける」という個人的でクローズドな行為と、「物語として公開される」というオープンな行為は本来相反する。その緊張関係自体がコンテンツの引力になっている。',
    target: '恋愛系ノベルアプリ・ボイスドラマ好きの10〜20代女性層を中心に',
    problem: '誰かに聞いてほしいが言えない気持ちを、安全に吐き出しつつ物語として昇華したい欲求',
    monetization: '続きを読むためのアプリ内課金、キャラクター「キーパー」のボイス・グッズ展開、音声ドラマ化権販売',
    mvp: 'テキスト投稿フォーム＋既存の物語生成AIで、匿名化された秘密を1話完結のショートストーリーに変換して表示するだけの単一機能アプリ',
    difference:
      '既存の恋愛小説アプリは完成された物語を消費するだけ。本サービスはユーザー自身の秘密が原作になる点でIPの生まれ方が根本的に異なる',
    scores: { surprise: 72, demand: 65, monetization: 52, feasibility: 60, differentiation: 80, future: 75 },
    mutationScore: 76,
    businessScore: 54,
    familiarityPenalty: 22,
    verdict: '面白いので保存',
  },
  HIMITSU_MATERIALS,
)

const QUEST_MATERIALS = [
  c('TECHNOLOGY', '位置情報', '📍'),
  c('HUMAN_DESIRE', '達成感が欲しい', '🏆'),
  c('MARKET', '地域サービス', '🏘️'),
  c('MECHANISM', 'クエスト', '🗺️'),
]

// This one is deliberately the spec's own "too on-the-nose" example: it's
// useful, but it lands squarely on an existing format (location + gamified
// tasks), so mutationScore/familiarityPenalty reflect that honestly even
// though businessScore is solid. See its GEN2 mutation below for the fix.
const gonjoQuest = gen1(
  {
    name: 'ご近所クエスト',
    oneLiner: '町内の困りごとを「クエスト」化して、達成感付きで解決する地域アプリ',
    concepts: ['位置情報', '達成感が欲しい', 'クエスト'],
    usedConcepts: ['位置情報', '達成感が欲しい', 'クエスト'],
    discardedConcepts: ['地域サービス'],
    invention:
      '地域の困りごとは義務や善意の対象ではなく、達成感を得るための挑戦対象になる——町の課題が、経験値を持つクエストという役割を持つ。',
    product:
      '地域の困りごとを位置情報付きクエストとして掲示し、達成すると経験値と地域ポイントが貯まる地域アプリ。',
    whatIsIt:
      '「側溝の落ち葉掃除」「一人暮らし高齢者の電球交換」など地域の小さな困りごとを位置情報付きクエストとして掲示。近隣住民が受注してクリアすると経験値と地域ポイントが貯まる。',
    whyInteresting:
      '地域サービスは義務感・善意ベースになりがちだが、そこにゲームの「達成感」を正面から持ち込むことで参加ハードルが下がる。',
    target: '町内会・自治会の担い手不足に悩む地域、達成感を求める子育て世代やシニア',
    problem: '地域の困りごとの担い手が高齢化・減少している。かつ手伝う側にも分かりやすい達成感がない',
    monetization: '自治体・地域包括支援センターへのSaaS提供、地元店舗のクエスト報酬提供による広告連携',
    mvp: '既存の掲示板＋地図アプリの組み合わせで、投稿→受注→完了報告の3ステップだけを回すノーコードMVP',
    difference:
      '既存の地域掲示板は投稿止まりで完了体験がない。クエスト化により「やった感」が可視化され継続参加につながる',
    scores: { surprise: 50, demand: 68, monetization: 45, feasibility: 80, differentiation: 55, future: 62 },
    mutationScore: 35,
    businessScore: 78,
    familiarityPenalty: 68,
    verdict: '要検証',
  },
  QUEST_MATERIALS,
)

export const DEMO_IDEAS: DemoEntry[] = [
  { mode: 'STANDARD', concepts: NEMUUTA_MATERIALS, idea: nemuutaIkusei },
  { mode: 'MONEY', concepts: NIOI_MATERIALS, idea: nioiTeikibin },
  { mode: 'CRAZY', concepts: DOJIROBO_MATERIALS, idea: dojirobo },
  { mode: 'APP', concepts: HITORIGOTO_MATERIALS, idea: hitorigoto },
  { mode: 'IP', concepts: HIMITSU_MATERIALS, idea: himitsuAgent },
  { mode: 'STANDARD', concepts: QUEST_MATERIALS, idea: gonjoQuest },
]

// ── Canned mutation chains ─────────────────────────────────────────
// One hand-written GEN2 per base idea, so "さらに変異" always shows a
// curated example first. The ねむうた育成 lineage additionally carries
// a GEN3 — the exact worked example from the v0.2 spec
// (ねむうた育成 → 夢声生命体 → Dream Ecosystem).

interface MutationTemplate {
  template: Idea
  materials: Concept[]
}

const CANNED_MUTATIONS: Record<string, MutationTemplate> = {
  ねむうた育成: {
    materials: [c('WILD_CARD', '記憶', '🧠')],
    template: {
      name: '夢声生命体',
      oneLiner: '毎晩の寝声から、未知の生物が1体誕生し育っていくアプリ',
      concepts: ['声', '記憶', '育成'],
      usedConcepts: ['声', '記憶', '育成'],
      discardedConcepts: [],
      invention:
        '毎晩の無意識の声に、眠っている間に処理された記憶の断片が混ざり合うことで、声そのものが生命体の遺伝情報になる——声はもう記録するものではなく、生き物を生み出す種になる。',
      product:
        '毎朝、前夜の寝言データから未知の生物（ドリームクリーチャー）が1体誕生し、育成・交配していくアプリ。声の質と睡眠の記憶によって異なる姿・性格の生物が育つ。',
      whatIsIt:
        '就寝中の声を録音するだけでなく、その夜の睡眠段階（記憶が整理される深い眠りかどうか）と掛け合わせ、翌朝1体の生命体として孵化させる。',
      whyInteresting:
        '「声を記録する」から「声から生命が生まれる」への転換により、育成対象がアバターという記号から、固有の生態を持つ生物へと格上げされる。',
      target: 'ねむうた育成のユーザー層に加え、たまごっち・モンスター育成ゲームのファン層',
      problem: '声の記録だけでは飽きが来る。「何が生まれるか分からない」余白が継続動機になる',
      monetization: '生物の見た目・鳴き声パックの課金、レア生物の図鑑コンプ課金、交配イベントの季節課金',
      mvp: '寝声の音量・周波数データを乱数シードにして、既存の生成AIで1枚のクリーチャー画像を毎朝生成するだけの最小構成',
      difference:
        '前世代『ねむうた育成』はアバターの見た目が育つだけだったが、本作は「何が生まれるか」自体が毎晩のサプライズになる',
      scores: { surprise: 92, demand: 58, monetization: 40, feasibility: 45, differentiation: 90, future: 70 },
      mutationScore: 90,
      businessScore: 45,
      familiarityPenalty: 8,
      verdict: '要検証',
    },
  },
  夢声生命体: {
    materials: [c('MECHANISM', 'マーケットプレイス', '🏪')],
    template: {
      name: 'Dream Ecosystem',
      oneLiner: '全ユーザーの夢の生物が一つの世界に生息し、交配・売買できるサービス',
      concepts: ['声', '育成', 'マーケットプレイス'],
      usedConcepts: ['声', '育成', 'マーケットプレイス'],
      discardedConcepts: [],
      invention:
        '個々の夢から生まれた生命体たちが、ユーザーの垣根を越えて出会い、交配し、進化する共有された生態系が生まれる——一人の夢が、みんなの世界の一部になる。',
      product:
        '全ユーザーのドリームクリーチャーが一つの仮想生態系（Dream Ecosystem）に生息し、睡眠データを元に交配・進化・売買できるサービス。レアな「声の系譜」を持つ生物はマーケットプレイスで取引される。',
      whatIsIt:
        '個人の育成だった生物たちを共有ワールドに解放し、他ユーザーの生物と出会わせる。血統・声質の組み合わせによって新種が生まれ、希少種は取引対象になる。',
      whyInteresting:
        '「1人の寝声→1体の生物」という個人的な体験が、「みんなの寝声が混ざり合う経済圏」へとスケールする点が、前世代からのさらなる飛躍になっている。',
      target: '夢声生命体のユーザー、コレクション・トレーディング要素が好きな層',
      problem: '育成が個人内で閉じていると飽きが早い。他者との関わりが継続と経済圏の両方を生む',
      monetization:
        '生物の売買手数料、レア血統証明NFT的な所有権バッジ、交配権のオークション、企業とのコラボ限定種',
      mvp: '既存ユーザーの生物データをリスト表示し、簡易な「気に入ったらDM交換」を手動で仲介するだけのマーケットプレイスMVP',
      difference:
        '前世代『夢声生命体』は個人育成止まりだったが、本作はユーザー間の経済圏そのものが商品になっている',
      scores: { surprise: 88, demand: 70, monetization: 68, feasibility: 40, differentiation: 85, future: 82 },
      mutationScore: 85,
      businessScore: 70,
      familiarityPenalty: 20,
      verdict: '今すぐ試作',
    },
  },
  におい定期便: {
    materials: [c('WILD_CARD', '記憶', '🧠')],
    template: {
      name: '香り記憶バンク',
      oneLiner: '「幸せだった日の匂い」を記録し、落ち込んだ時にワンタップで再現するサブスク',
      concepts: ['匂い', 'サブスク', '記憶'],
      usedConcepts: ['匂い', 'サブスク', '記憶'],
      discardedConcepts: [],
      invention:
        '香りは「今日似合うものを買う」対象から「特定の記憶と結びついた瞬間を呼び戻す鍵」へと役割が変わる——匂いのサブスクが、過去の自分を再生する装置になる。',
      product:
        '体臭データと紐づけて「幸せだった日の匂い」を自動記録し、落ち込んだ時にワンタップでその香りが再現・配送される「記憶の香り」サブスク。',
      whatIsIt: '日々のにおいデータに気分ログを紐づけ、ポジティブな瞬間の香りプロファイルを保存・再現する。',
      whyInteresting:
        '前世代は「未来のにおいを予測して届ける」サービスだったが、本作は「過去の幸せな瞬間を香りで再生する」という時間軸の逆転が新しい。',
      target: 'におい定期便のユーザー、香りで気分を整えたいメンタルケア志向の層',
      problem: '落ち込んだ時に自分を励ます手段が少ない。過去の良い状態を「再現」する手段がない',
      monetization: '記憶の香りボトルの単品課金、感情ログ機能のプレミアムプラン',
      mvp: '気分を5段階で記録する日記アプリ＋良い気分の日の香水名を手動保存するだけの最小機能',
      difference: '前世代は未来予測型のレコメンドだったが、本作は過去の記憶を呼び戻す再現型サービス',
      scores: { surprise: 80, demand: 62, monetization: 58, feasibility: 58, differentiation: 82, future: 66 },
      mutationScore: 83,
      businessScore: 60,
      familiarityPenalty: 18,
      verdict: '面白いので保存',
    },
  },
  ドジロボ介護: {
    materials: [c('MECHANISM', 'マッチング', '🔗')],
    template: {
      name: 'ドジロボ留学',
      oneLiner: '「愛されドジ度」でランキングされた介護ロボットが、他施設に期間限定で留学する',
      concepts: ['ロボット', '失敗', 'マッチング'],
      usedConcepts: ['ロボット', '失敗', 'マッチング'],
      discardedConcepts: [],
      invention:
        '失敗は一施設で消費されるコンテンツではなく、他施設との「マッチング資源」になる——最も愛された失敗の個性そのものが、施設を横断する価値になる。',
      product:
        '各施設のロボットの「愛されドジ度」をランキングし、人気ロボットを期間限定で他施設に「留学」させるレンタル・マッチングサービス。',
      whatIsIt: '施設ごとのロボットの人気失敗パターンを集計し、他施設からのリクエストに応じて短期貸与する。',
      whyInteresting:
        '前世代は1施設内で完結する見守りエンタメだったが、本作はロボットの「個性」が施設を横断して価値交換される点が新しい。',
      target: '複数の介護施設を運営する法人、施設間の入居者エンゲージメント向上を狙う運営者',
      problem: '施設ごとの魅力に差があり、入居率や評判に格差が生まれやすい',
      monetization: 'ロボット留学の施設間レンタル手数料、人気ロボットのグッズ化・法人スポンサー',
      mvp: '複数施設の失敗クリップを1つのランキングボードに集約し、手動で貸し出し調整するだけの運用MVP',
      difference: '前世代は1施設内の見守りエンタメだったが、本作は施設をまたぐマッチング経済に発展している',
      scores: { surprise: 88, demand: 50, monetization: 48, feasibility: 50, differentiation: 86, future: 60 },
      mutationScore: 85,
      businessScore: 55,
      familiarityPenalty: 15,
      verdict: '要検証',
    },
  },
  ひとりごと添削: {
    materials: [c('WILD_CARD', '習慣', '🔄')],
    template: {
      name: '口癖リライト',
      oneLiner: '検出したネガティブな口癖から、翌朝「今日だけ言い換える一言」を提案するアプリ',
      concepts: ['音声AI', '成長したい', '習慣'],
      usedConcepts: ['音声AI', '成長したい', '習慣'],
      discardedConcepts: [],
      invention:
        '独り言の記録という受け身の行為が、翌日の習慣そのものを書き換える先回りの介入に変わる——気づきは振り返りではなく、明日への命令になる。',
      product:
        '検出したネガティブな口癖をもとに、翌朝「今日だけ言い換えてみる一言」を通知し、行動習慣を少しずつ書き換えていくアプリ。',
      whatIsIt: '口癖の統計だけでなく、翌日に試す「言い換え候補」を1つだけ提示し、実行できたか簡単に記録する。',
      whyInteresting:
        '前世代は「気づかせる」だけの日記アプリだったが、本作は「翌日の行動を変える」介入まで踏み込んでいる。',
      target: 'ひとりごと添削のユーザー、行動習慣を変えたいビジネスパーソン',
      problem: '自分の口癖に気づいても、実際に直すきっかけがないまま忘れてしまう',
      monetization: '習慣化コーチングプランへのアップセル、法人向けチームの口癖傾向レポート',
      mvp: '検出したネガティブワード上位1つに対して、固定の言い換え例を通知するだけの最小機能',
      difference: '前世代は気づきの提供のみだったが、本作は具体的な行動提案まで踏み込む点が違う',
      scores: { surprise: 60, demand: 66, monetization: 60, feasibility: 78, differentiation: 62, future: 60 },
      mutationScore: 68,
      businessScore: 68,
      familiarityPenalty: 30,
      verdict: '今すぐ試作',
    },
  },
  秘密預りエージェント: {
    materials: [c('WILD_CARD', '時間', '⏰')],
    template: {
      name: '時限秘密設計図',
      oneLiner: '預けた秘密が指定した未来の日付に自動で物語として解放される、時限式サービス',
      concepts: ['秘密', 'ストーリー', '時間'],
      usedConcepts: ['秘密', 'ストーリー', '時間'],
      discardedConcepts: [],
      invention:
        '秘密は預けたら物語に変わるだけでなく、「特定の未来の時間」に初めて解放されるという新しい時間性を持つ——告白は今の行為ではなく、未来に仕掛ける行為になる。',
      product:
        '預けた秘密が指定した未来の日付・条件（結婚式当日、10年後など）に自動で物語として解放される、時限式ストーリー生成サービス。',
      whatIsIt: '秘密の入力時に解放条件（日付・イベント）を設定し、条件成立まではAIが物語を非公開のまま育てる。',
      whyInteresting:
        '前世代は「今すぐ物語になる」即時型だったが、本作は「未来に仕掛ける」時限型に変わり、待つこと自体が体験になる。',
      target: '秘密預りエージェントのユーザー、記念日・タイムカプセル文化が好きな層',
      problem: '今は言えないが、いつか伝えたい・形にしたい気持ちの置き場所がない',
      monetization: '時限解放の予約課金、記念日連携（結婚式・同窓会）の法人プラン',
      mvp: '入力した秘密と解放日をスプレッドシートで管理し、日付が来たら手動で物語生成して通知するだけのMVP',
      difference: '前世代は即時生成だったが、本作は「未来の自分・相手への時限贈り物」という体験に進化している',
      scores: { surprise: 78, demand: 60, monetization: 52, feasibility: 55, differentiation: 82, future: 78 },
      mutationScore: 80,
      businessScore: 50,
      familiarityPenalty: 20,
      verdict: '面白いので保存',
    },
  },
  ご近所クエスト: {
    materials: [c('WILD_CARD', '匂い', '👃')],
    template: {
      name: '街のにおいセンサー化',
      oneLiner: '街の匂いの変化そのものが地域課題を通報する、先回り型地域サービス',
      concepts: ['位置情報', 'クエスト', '匂い'],
      usedConcepts: ['位置情報', 'クエスト', '匂い'],
      discardedConcepts: [],
      invention:
        '地域課題は住民が申告して初めて発見されるのではなく、街に漂う匂いの変化そのものが課題の存在を語り出す——匂いが、困りごとの通報者になる。',
      product:
        'ゴミ集積所や側溝など地域の匂いセンサーが異常を検知すると自動でクエスト化され、近隣住民に通知される先回り型地域サービス。',
      whatIsIt: '簡易な匂いセンサーを地域の要所に設置し、異常値を検知すると自動でクエスト掲示板に投稿する。',
      whyInteresting:
        '前世代は「人が困りごとを見つけてクエスト化する」人力起点だったが、本作は「街自体が異常を語り出す」センサー起点に変わっている。',
      target: 'ご近所クエストのユーザー、環境モニタリングに関心のある自治体',
      problem: '住民の申告頼みだと発見が遅れる。特に匂いの異常（ゴミ、詰まり）は言語化・報告されにくい',
      monetization: '自治体向けセンサーレンタル＋SaaS利用料、地域清掃業者への案件紹介手数料',
      mvp: '既存の安価なガスセンサーを1箇所に設置し、閾値超えでLINE通知するだけの最小構成',
      difference: '前世代は住民の申告が起点だったが、本作はセンサーが起点になり発見の速度と質が変わっている',
      scores: { surprise: 74, demand: 64, monetization: 55, feasibility: 62, differentiation: 76, future: 68 },
      mutationScore: 72,
      businessScore: 55,
      familiarityPenalty: 25,
      verdict: '要検証',
    },
  },
}

// ── Generic fallback for arbitrary mutation depth ──────────────────
// Once a chain goes past the curated GEN2/GEN3 content above, demo
// mode still needs to produce *something* coherent for any further
// "さらに変異" click, using whatever fresh catalyst concepts were drawn.

const TRANSFORM_PHRASES = [
  '誰も予想しない次の段階',
  '全く別の経済圏',
  'もう一つの生態系',
  '真逆の役割',
  '未知の交換価値',
  '新しい時間感覚',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function genericMutate(parentIdea: Idea, catalystConcepts: Concept[], _direction: MutationDirectionId): Idea {
  const catalyst = catalystConcepts[0] ?? c('WILD_CARD', '偶然', '🎲')
  const coreFragment = (parentIdea.invention ?? parentIdea.whyInteresting).slice(0, 28)
  const phrase = pickRandom(TRANSFORM_PHRASES)
  const inheritedConcept = parentIdea.usedConcepts?.[0]
  const usedConcepts = inheritedConcept ? [catalyst.label, inheritedConcept] : [catalyst.label, '偶然']

  return {
    name: `${parentIdea.name}｜${catalyst.emoji}${catalyst.label}変異`,
    oneLiner: `『${parentIdea.name}』の核心に${catalyst.label}が入り込み、${phrase}が生まれる`,
    concepts: usedConcepts,
    usedConcepts,
    discardedConcepts: [],
    invention: `${coreFragment}……という発明の核心に${catalyst.emoji}${catalyst.label}が衝突し、${phrase}という新しいルールが生まれた。`,
    product: `${catalyst.label}を組み込んだ次世代版の『${parentIdea.name}』。${phrase}として再構築されている。`,
    whatIsIt: `${parentIdea.product ?? parentIdea.whatIsIt} これに${catalyst.emoji}${catalyst.label}が加わり、${phrase}として再構築されたもの。`,
    whyInteresting: `前世代の核心はそのままに、${catalyst.label}が加わることで${phrase}という新しい意味が生まれた。`,
    target: parentIdea.target,
    problem: parentIdea.problem,
    monetization: parentIdea.monetization,
    mvp: `${parentIdea.mvp} まずは${catalyst.label}要素だけを最小追加して検証する。`,
    difference: `前世代『${parentIdea.name}』からさらに${phrase}へ進化した点が最大の違い。`,
    scores: { ...parentIdea.scores },
    mutationScore: parentIdea.mutationScore ?? 60,
    businessScore: parentIdea.businessScore ?? 60,
    familiarityPenalty: parentIdea.familiarityPenalty ?? 20,
    verdict: parentIdea.verdict,
  }
}

function applyDirectionNudge(idea: Idea, direction: MutationDirectionId): Idea {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
  const jitter = () => Math.floor(Math.random() * 7) - 3

  const next: Idea = { ...idea, scores: { ...idea.scores } }
  const mutation = idea.mutationScore ?? 60
  const business = idea.businessScore ?? 60

  switch (direction) {
    case 'WEIRDER':
      next.mutationScore = clamp(mutation + 10 + jitter())
      next.businessScore = clamp(business - 8 + jitter())
      next.scores.surprise = clamp(idea.scores.surprise + 8)
      break
    case 'BUSINESS':
      next.businessScore = clamp(business + 12 + jitter())
      next.mutationScore = clamp(mutation - 5 + jitter())
      next.scores.monetization = clamp(idea.scores.monetization + 10)
      next.scores.feasibility = clamp(idea.scores.feasibility + 5)
      break
    case 'DESIRE':
      next.scores.demand = clamp(idea.scores.demand + 12 + jitter())
      next.mutationScore = clamp(mutation + jitter())
      break
    case 'BUILDABLE':
      next.scores.feasibility = clamp(idea.scores.feasibility + 14 + jitter())
      next.businessScore = clamp(business + 6 + jitter())
      break
    case 'CHAOS':
      next.mutationScore = clamp(mutation + Math.floor(Math.random() * 30) - 10)
      next.businessScore = clamp(business + Math.floor(Math.random() * 30) - 15)
      break
  }

  next.chaosScore = computeChaosScore(next.mutationScore ?? 0, next.businessScore ?? 0)
  return next
}

export function pickDemoMutation(
  parentIdea: Idea,
  catalystConcepts: Concept[],
  direction: MutationDirectionId,
): GenerateResult {
  const nextGeneration = (parentIdea.generation ?? 1) + 1
  const canned = CANNED_MUTATIONS[parentIdea.name]

  if (canned) {
    const finalized = finalizeIdea(canned.template, canned.materials, nextGeneration, parentIdea)
    return { idea: applyDirectionNudge(finalized, direction), concepts: canned.materials }
  }

  const draft = genericMutate(parentIdea, catalystConcepts, direction)
  const finalized = finalizeIdea(draft, catalystConcepts, nextGeneration, parentIdea)
  return { idea: applyDirectionNudge(finalized, direction), concepts: catalystConcepts }
}
