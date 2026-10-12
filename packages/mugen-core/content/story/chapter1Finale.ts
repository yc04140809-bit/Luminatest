// 第1章終盤 — THE SCRIPT (作者指示 2026-10-12「第1章終盤ストーリー統合」).
//
//   襲撃前夜 → 遺跡の最奥（封印解除・覚醒・フードの男の撤退）→ 異変の朝
//   → アルデン襲撃 → 草原へ誘導 → 草原決戦（第1形態 → 外殻破壊 → 第2形態・
//   必殺技）→ 機能停止 → 帰還 → ケイオス／グレイヴは残る → アリア・レヴィ
//   → 復興の始まり → 旅立ち → CHAPTER 1 END
//
// FIXED BY THE AUTHOR, and held by chapter1Finale.test.ts:
//   - NO ONE DIES. Not one villager, not a child, not Lina or her father,
//     not Mirei, not Rizel, not Grave. People are hurt; houses burn; the
//     village is half broken. No line says or shows a death — and none says
//     that because no one died it was not so bad.
//   - ヴァルシール is not destroyed. It is brought to a stop. It is an
//     ancient guardian whose order to defend the seal woke wrong; it has no
//     grudge against the village.
//   - The hooded man is not explained: who he is, what he wanted. He is not
//     killed; he leaves. He is not said to be the tavern's hooded guest.
//   - The village is not made whole. The chapter ends with rebuilding
//     begun.
//   - Kaos stays (her power goes to mending the village and to keeping
//     ヴァルシール stopped, so she cannot travel or fight), and so does
//     Grave — because he has something to protect, not because he cannot
//     fight. Kaos is a little hurt by it, quietly; no tears.
//   - アリア and レヴィ come for Kaos, for the truth of this, and because
//     the hero should not be left alone — and they still do not trust
//     people.
//   - Kaos never calls the hero 「師匠」 (キミ / あなた / his name).
//
// WORDS ONLY. Which screen shows a scene, its background and music, and when
// it is played are the stage's (core/world/chapterFinale.ts) and the App's.
// The script is provisional: lines are the author's to change.

import type { DialogueLine } from '../dialogue/prologue';
import type { NpcExpression } from '../../core/npc/touchReaction';
import { HERO_SPEAKER } from './sekiryugaArc';
import { BAKERY_OWNER } from '../characters/bakeryOwner';
import { VALSHEEL_NAME } from '../enemies/valsheelBattle';
import { ARIA_SPEAKER, LEVI_SPEAKER, type AriaFace, type LeviFace } from '../characters/companionFaces';

const HERO = HERO_SPEAKER;
const KAOS = 'ケイオス';
const GRAVE = 'グレイヴ';
const MIREI = 'ミレイ';
const RIZEL = 'リゼル';
const LINA = 'リナ';
const OWNER = BAKERY_OWNER.name;
const HOODED = 'フードの男';
const WATCH = '見張り';
const VILLAGER = '村人';
const CHILD = '子ども';
const ARIA = ARIA_SPEAKER;
const LEVI = LEVI_SPEAKER;
const V = VALSHEEL_NAME;

/** A line of the finale: a dialogue line, and Mirei's face when she speaks it. */
export interface FinaleLine extends DialogueLine {
  face?: NpcExpression;
  /** アリア's face on her line (companionFaces.ts). */
  ariaFace?: AriaFace;
  /** レヴィ's face on her line (companionFaces.ts). */
  leviFace?: LeviFace;
  /** From this line on, the picture behind the words (until the next line that names one). */
  cg?: FinaleBackdrop;
  /** From this line on, how much of the picture is shown (until the picture changes or another is named). */
  frame?: FinaleFrame;
}

/** Every scene of the finale, by id, in the order they are played. */
export const FINALE_SCENE_IDS = [
  'EVE',
  'RUINS_SEAL',
  'MORNING',
  'RAID',
  'LURE',
  'VILLAGE_MIREI',
  'FORM1_START',
  'SHELL_BREAK',
  'KAOS_FINISHER',
  'HERO_FINISHER',
  'VILLAGE_BAKERY',
  'STOPPED',
  'RETURN',
  'KAOS_STAYS',
  'GRAVE_STAYS',
  'ARIA_LEVI',
  'REBUILD',
  'DEPARTURE',
] as const;
export type FinaleSceneId = (typeof FINALE_SCENE_IDS)[number];

/** Where a scene is played (its background and music are the App's to choose from this). */
export type FinalePlace = 'HOME' | 'RUINS_DEPTHS' | 'VILLAGE' | 'VILLAGE_BROKEN' | 'ROAD' | 'GRASSLAND';

/**
 * THE PICTURES OF THE RUINS' DEPTHS (作者 2026-10-12, as delivered): the
 * hooded figure at the device (blue), the second stage refused (red), the
 * creature waking with him before it, and the empty room (the place's own).
 */
export type FinaleCg = 'DARK' | 'RUINS_UNSEALING' | 'RUINS_REFUSED' | 'VALSHEEL_AWAKENING';

/**
 * HOW MUCH OF A PICTURE IS SHOWN (作者指示: いきなり完成状態で出さない) — the
 * waking creature, closer first: its eye, its head, a foreleg breaking the
 * floor, its upper body (the figure gone from the frame by then). Held until
 * the picture changes or another frame is named; absent, the whole picture.
 */
export type FinaleFrame = 'EYE' | 'HEAD' | 'PAW' | 'UPPER';

/** What is behind the words: a place's own picture, or one of the scene pictures. */
export type FinaleBackdrop = FinalePlace | FinaleCg;

export interface FinaleScene {
  id: FinaleSceneId;
  place: FinalePlace;
  lines: readonly FinaleLine[];
}

const scene = (id: FinaleSceneId, place: FinalePlace, lines: readonly FinaleLine[]): FinaleScene => ({ id, place, lines });

export const FINALE_SCENES: Readonly<Record<FinaleSceneId, FinaleScene>> = {
  // ---- F2 襲撃前夜（家）-----------------------------------------------------
  EVE: scene('EVE', 'HOME', [
    { speaker: null, text: 'その夜は、風がなかった。' },
    { speaker: KAOS, text: '……ねえ。', kaosFace: 'SERIOUS' },
    { speaker: HERO, text: 'ん？' },
    { speaker: KAOS, text: '明日、もし何かあったら。' },
    { speaker: KAOS, text: 'キミは、自分が一番いいと思うことをして。' },
    { speaker: HERO, text: '何かって、何だよ。' },
    { speaker: KAOS, text: 'わかんない。わかんないから言ってるの。', kaosFace: 'TROUBLED' },
    { speaker: null, text: '少しの間。' },
    { speaker: KAOS, text: '……なんてね。おやすみ♪', kaosFace: 'SMILE' },
  ]),

  // ---- F3 遺跡の最奥（主人公は不在）------------------------------------------
  // 作者指示 2026-10-12「遺跡最奥→襲撃→草原誘導→ヴァルシール戦 接続」: 暗転 → 最奥 →
  // 第一封鎖は成功に見える → 第二封鎖で装置が赤く異常 → 封印床の亀裂 → 目が灯る →
  // フードの男は完全起動の前に退く → 頭・前脚・上半身と段階的にせり上がり完全起動 →
  // 侵入者を探し、村の人々の気配を「侵入者」と誤認して村の方角へ。
  // フードの男は冷静なまま、明らかに想定外。説明はしない。
  RUINS_SEAL: scene('RUINS_SEAL', 'RUINS_DEPTHS', [
    { speaker: null, text: '同じ夜。古代遺跡の、さらに奥。', cg: 'DARK' },
    { speaker: null, text: '誰も入ったことのないはずの部屋に、灯りがひとつ。', cg: 'RUINS_DEPTHS' },
    { speaker: null, text: '黒いフードの人影が、古い封印装置の前に立っている。', cg: 'RUINS_UNSEALING' },
    { speaker: null, text: '青白い光が、ひとつ、またひとつと灯っていく。' },
    { speaker: HOODED, text: '……第一封鎖、解除。' },
    { speaker: null, text: '光が、静かに落ち着いた。うまくいったように見えた。' },
    { speaker: HOODED, text: '次だ。' },
    { speaker: null, text: '装置が、赤く光った。', cg: 'RUINS_REFUSED' },
    { speaker: null, text: '低い機械音。石の割れる音。耳の奥を刺すような、古い警告の響き。' },
    { speaker: HOODED, text: '……違う。' },
    { speaker: null, text: '床の封印紋に、赤金の亀裂が走る。' },
    { speaker: HOODED, text: '第二封鎖が……逆流している？' },
    { speaker: null, text: '地の底から、振動が突き上げてくる。' },
    { speaker: HOODED, text: '……まずい。' },
    { speaker: null, text: '亀裂の奥で、巨大な目が灯った。', cg: 'VALSHEEL_AWAKENING', frame: 'EYE' },
    { speaker: null, text: '人影が、一歩、後ろへ下がる。' },
    { speaker: HOODED, text: 'まだ起きるはずじゃなかった。' },
    { speaker: null, text: '人影は、それ以上何も言わず、舞い上がる砂煙の中へ消えた。' },
    { speaker: null, text: '封印床が割れ、巨大な頭部がせり上がる。', frame: 'HEAD' },
    { speaker: null, text: '石と金の前脚が、封印床を踏み破った。', frame: 'PAW' },
    { speaker: null, text: '外殻をまとった上半身が、ゆっくりと起き上がる。', frame: 'UPPER' },
    { speaker: null, text: `封殻機兵 ${V}――完全起動。` },
    { speaker: null, text: 'それは、侵入者の姿を探した。そこにはもう、誰もいない。' },
    { speaker: null, text: '壁の向こう、遠く――村のある方角に、たくさんの人の気配がある。' },
    { speaker: null, text: '乱れた目が、それを「侵入者」と見なした。' },
    { speaker: null, text: '巨体が、ゆっくりと村の方角へ向きを変えた。', cg: 'RUINS_DEPTHS' },
  ]),

  // ---- F4 異変の朝・接近（村）--------------------------------------------------
  MORNING: scene('MORNING', 'VILLAGE', [
    { speaker: null, text: '翌朝。' },
    { speaker: null, text: '遠くから、低い振動が伝わってくる。' },
    { speaker: null, text: '森の鳥が、一斉に飛び立った。' },
    { speaker: VILLAGER, text: 'な、何だ……？' },
    { speaker: null, text: '地面が揺れ、軒先から埃がぱらぱらと落ちる。' },
    { speaker: KAOS, text: '……来る。', kaosFace: 'SERIOUS', tense: true },
    { speaker: HERO, text: '……遺跡の方だ。', heroFace: 'SERIOUS' },
    { speaker: null, text: '森の向こうに、巨大な影が立ち上がった。' },
    { speaker: WATCH, text: 'おい……森の木が、倒れてく！' },
    { speaker: GRAVE, text: '下がってろ。……でけぇのが来るぞ。', graveFace: 'SERIOUS', tense: true },
    { speaker: null, text: 'グレイヴが、酒場の壁から古い両手剣を下ろした。' },
  ]),

  // ---- F5 アルデン襲撃（村・半壊）------------------------------------------------
  // 全壊させない。屋根・柵・看板・窓・小さな火・瓦礫まで。死者・死体・死を示す台詞は無い。
  // 村の人々も自分たちの村を守る（ミレイ・リゼル・パン屋親子）。
  RAID: scene('RAID', 'VILLAGE_BROKEN', [
    { speaker: null, text: `柵を踏み砕いて、${V}が村へ踏み込んだ。` },
    { speaker: null, text: '尾のひと振りで、納屋の屋根が崩れ落ちる。' },
    { speaker: null, text: '看板が折れ、窓が割れる。どこかで、小さく火の手が上がった。' },
    { speaker: VILLAGER, text: '逃げろ！ 家から出ろ！' },
    { speaker: MIREI, text: 'こっち！ 道を空けて！', face: 'ANGRY' },
    { speaker: RIZEL, text: '歩ける人は、動けない人を手伝って！' },
    { speaker: OWNER, text: 'リナ、離れるな！' },
    { speaker: LINA, text: 'うん！' },
    { speaker: HERO, text: 'あいつ……何がしたいんだ！？' },
    { speaker: KAOS, text: '……怒ってない。探してる。', kaosFace: 'SERIOUS', tense: true },
    { speaker: KAOS, text: 'たぶん、ここにいるみんなを「侵入者」だと思ってる。' },
    { speaker: GRAVE, text: 'ここでやり合ったら村がもたねぇ！', graveFace: 'ANGRY', tense: true },
    { speaker: HERO, text: '外へ引きつける。', heroFace: 'SERIOUS', tense: true },
    { speaker: KAOS, text: '草原なら被害を抑えられる。', kaosFace: 'SERIOUS' },
    { speaker: GRAVE, text: '決まりだ。引っ張るぞ！', graveFace: 'GRIN', tense: true },
  ]),

  // ---- F6 草原へ誘導（街道）---------------------------------------------------
  // ケイオスの光は小さく（MP は使わない）。村へ戻りかけたのを、主人公とグレイヴが引き戻す。
  LURE: scene('LURE', 'ROAD', [
    { speaker: KAOS, text: 'こっちだよ！', tense: true },
    { speaker: null, text: `ケイオスの小さな光が、${V}の目の前ではじけた。` },
    { speaker: null, text: '巨大な頭が、ゆっくりとこちらを向く。' },
    { speaker: GRAVE, text: '来やがった。走れ！', graveFace: 'SERIOUS' },
    { speaker: null, text: '三人は村の外へ。地響きが、すぐ後ろを追ってくる。' },
    { speaker: null, text: `街道の途中で、${V}の足が止まった。頭が、村の方へ戻りかける。` },
    { speaker: HERO, text: 'そっちじゃない！', heroFace: 'ANGRY', tense: true },
    { speaker: null, text: '投げた石が、外殻に当たって乾いた音を立てた。' },
    { speaker: GRAVE, text: 'おら、こっちだデカブツ！', graveFace: 'GRIN', tense: true },
    { speaker: null, text: '赤い目が、再び三人を捉えた。' },
    { speaker: null, text: '街道を抜け、開けた草原へ。' },
  ]),

  // ---- F7 村側：その間の村（石の倉庫）---------------------------------------------
  VILLAGE_MIREI: scene('VILLAGE_MIREI', 'VILLAGE_BROKEN', [
    { speaker: null, text: 'そのころ、村では――' },
    { speaker: MIREI, text: '広場はだめ！ 井戸の裏、石の倉庫に！', face: 'ANGRY' },
    { speaker: VILLAGER, text: 'ミレイさん、足をやられた人が……！' },
    { speaker: MIREI, text: '店の棚の包帯、全部出して。旅支度の包みも開けていいから。' },
    { speaker: MIREI, text: '……作っておいて、よかった。', face: 'SAD' },
    { speaker: CHILD, text: '……こわい。' },
    { speaker: RIZEL, text: '大丈夫。ここは、ちゃんと守られてる。' },
    { speaker: RIZEL, text: 'おばあちゃん、腕、見せて。……うん、きつく巻くね。' },
    { speaker: VILLAGER, text: 'リゼルちゃん、あんた、手が震えて……' },
    { speaker: RIZEL, text: '震えてても、巻ける。' },
  ]),

  // ---- F8 草原決戦の前（ここで敗北からの再開地点）--------------------------------
  FORM1_START: scene('FORM1_START', 'GRASSLAND', [
    { speaker: null, text: '草原。村は、もう見えない。' },
    { speaker: null, text: `${V}が、三人の前で足を止めた。` },
    { speaker: GRAVE, text: 'ここなら好きに暴れられる。', graveFace: 'GRIN' },
    { speaker: KAOS, text: '好きに暴れさせる気はないけどね。', kaosFace: 'SERIOUS' },
    { speaker: HERO, text: '止める。', heroFace: 'SERIOUS', tense: true },
    { speaker: GRAVE, text: 'おう。', graveFace: 'SERIOUS' },
  ]),

  // ---- F9 外殻破壊 → 第2形態（第1形態の HP が 0）--------------------------------
  SHELL_BREAK: scene('SHELL_BREAK', 'GRASSLAND', [
    { speaker: null, text: `${V}の動きが、止まった。` },
    { speaker: HERO, text: '……やったか？' },
    { speaker: null, text: '外殻に、ひびが走る。' },
    { speaker: null, text: 'ひびの奥から、金色の光が漏れ出した。' },
    { speaker: GRAVE, text: '下がれ！', graveFace: 'SURPRISED', tense: true },
    { speaker: null, text: '外殻が砕け散る。' },
    { speaker: null, text: '中から現れたのは――翼を広げた、白と金の機械の天使。' },
    { speaker: KAOS, text: '……これが、本当の姿。', kaosFace: 'SURPRISED', tense: true },
  ]),

  // ---- F10 必殺技の解放（第2形態の HP が 0 になった後のとどめ）--------------------------------------
  KAOS_FINISHER: scene('KAOS_FINISHER', 'GRASSLAND', [
    { speaker: null, text: `砕けかけた${V}が、それでも立ち上がる。` },
    { speaker: KAOS, text: '……このままじゃ、止まらない。', kaosFace: 'SERIOUS', tense: true },
    { speaker: KAOS, text: 'かなり魔力を使うけど――仕方ないよね。' },
    { speaker: KAOS, text: '下がってて。本気、出すから。', tense: true },
  ]),
  HERO_FINISHER: scene('HERO_FINISHER', 'GRASSLAND', [
    { speaker: null, text: '剣が、熱を帯びた。' },
    { speaker: HERO, text: '……まだだ。', heroFace: 'SERIOUS', tense: true },
    { speaker: HERO, text: 'ここで、終わらせる！', tense: true },
  ]),

  // ---- F7c 村側：パン屋親子と村人（第2形態の後に差し込む）------------------------
  VILLAGE_BAKERY: scene('VILLAGE_BAKERY', 'VILLAGE_BROKEN', [
    { speaker: null, text: '村の通り。' },
    { speaker: VILLAGER, text: '水だ！ 桶を回せ！' },
    { speaker: LINA, text: 'お父さん、こっちの火、消えたよ！' },
    { speaker: OWNER, text: 'よし。リナ、次は瓦礫だ。下に誰もいないか、声をかけろ。' },
    { speaker: LINA, text: '誰かいますかー！ ……いないね。よかった。' },
    { speaker: OWNER, text: '店のことは後だ。人が先だ。' },
  ]),

  // ---- F11 機能停止（破壊しない）----------------------------------------------
  STOPPED: scene('STOPPED', 'GRASSLAND', [
    { speaker: null, text: '金色の光が、ゆっくりと弱まっていく。' },
    { speaker: null, text: `${V}は膝をつき、翼をたたんだ。` },
    { speaker: null, text: '胸の光が、静かに消えた。' },
    { speaker: HERO, text: '……止まった、のか。' },
    { speaker: KAOS, text: 'うん。壊れてはいない。眠っただけ。', kaosFace: 'SERIOUS' },
    { speaker: GRAVE, text: 'こいつ……最後まで、村の方を見てやがった。', graveFace: 'TROUBLED' },
    { speaker: KAOS, text: '……守るために作られた子なんだと思う。たぶん、ずっと昔に。' },
  ]),

  // ---- F12 帰還（半壊した村）--------------------------------------------------
  RETURN: scene('RETURN', 'VILLAGE_BROKEN', [
    { speaker: null, text: '村へ戻ると、煙がまだ細く上がっていた。' },
    { speaker: null, text: '柵は倒れ、屋根の落ちた家がいくつもある。' },
    { speaker: MIREI, text: 'あ……！ 戻ってきた！', face: 'AMAZED' },
    { speaker: HERO, text: 'みんなは！？' },
    { speaker: MIREI, text: '……全員、いる。怪我した人はいるけど。みんな、生きてる。', face: 'SAD' },
    { speaker: RIZEL, text: '手当ては済んだ。……ちゃんと、数えた。' },
    { speaker: LINA, text: 'よかった……ほんとに、よかった……！' },
    { speaker: null, text: '誰かが、声を上げて泣き出した。つられて、何人も。' },
    { speaker: null, text: 'それから、みんな黙って、壊れた村を見た。' },
    { speaker: OWNER, text: '……窯が、割れちまった。' },
    { speaker: LINA, text: 'お父さん……。' },
    { speaker: OWNER, text: 'いい。窯はまた積める。……積めるさ。' },
  ]),

  // ---- F13 ケイオスの判断 -------------------------------------------------------
  KAOS_STAYS: scene('KAOS_STAYS', 'VILLAGE_BROKEN', [
    { speaker: KAOS, text: '……ねえ。私の力なら、ある程度は直せると思う。', kaosFace: 'SERIOUS' },
    { speaker: HERO, text: '本当か！？' },
    { speaker: KAOS, text: '全部じゃないよ。元通りにはできない。' },
    { speaker: KAOS, text: 'それに、あの子――止まってるけど、ずっと見ててあげないといけない。' },
    { speaker: KAOS, text: 'だから、しばらく村から離れられない。', kaosFace: 'SAD' },
    { speaker: KAOS, text: '魔力も、全部こっちに回すことになるから……戦うのも、無理。' },
    { speaker: HERO, text: '……そうか。' },
    { speaker: KAOS, text: '……せっかく、一緒に旅できると思ったのにな。', kaosFace: 'SAD' },
    { speaker: null, text: 'ケイオスは笑おうとして、うまく笑えなかった。' },
  ]),

  // ---- F13 グレイヴの判断 -------------------------------------------------------
  GRAVE_STAYS: scene('GRAVE_STAYS', 'VILLAGE_BROKEN', [
    { speaker: GRAVE, text: '俺も残る。', graveFace: 'SERIOUS' },
    { speaker: GRAVE, text: '家を建て直す。森の連中も、ろくでもねぇ奴らも、こういう時に限って来やがる。' },
    { speaker: GRAVE, text: '誰かが、ここに立ってなきゃならねぇ。' },
    { speaker: HERO, text: 'グレイヴ……。' },
    { speaker: GRAVE, text: '勘違いすんなよ。戦えねぇから残るんじゃねぇ。', graveFace: 'GRIN' },
    { speaker: GRAVE, text: '守るもんがあるから、残るんだ。' },
  ]),

  // ---- F14 アリア・レヴィ ------------------------------------------------------
  ARIA_LEVI: scene('ARIA_LEVI', 'VILLAGE_BROKEN', [
    { speaker: null, text: '村の外れに、見慣れない二人が立っていた。' },
    { speaker: KAOS, text: '……え。', kaosFace: 'SURPRISED' },
    { speaker: ARIA, text: '久しぶりね、ケイオス。', ariaFace: 'SMILE' },
    { speaker: LEVI, text: '派手にやられたな。' },
    { speaker: KAOS, text: 'アリア……レヴィ……！ なんで、ここに。', kaosFace: 'SURPRISED' },
    { speaker: ARIA, text: 'しばらく前から、このあたりの異変を調べていたの。' },
    { speaker: LEVI, text: 'で、来てみたらこれだ。', leviFace: 'ANGRY' },
    { speaker: null, text: '二人の目が、主人公に向いた。値踏みするような目だった。' },
    { speaker: ARIA, text: '……この人間が、あなたの言っていた人？', ariaFace: 'TROUBLED' },
    { speaker: KAOS, text: 'うん。' },
    { speaker: ARIA, text: 'そう。' },
    { speaker: ARIA, text: 'ケイオスが動けないなら、代わりに私たちが行く。この件の真相も、追わなきゃいけないし。' },
    { speaker: LEVI, text: 'それに――こいつを一人で放っておくと、ろくなことにならなそうだ。' },
    { speaker: HERO, text: '……一緒に来てくれるのか？' },
    { speaker: ARIA, text: '勘違いしないで。人間を信用したわけじゃない。', ariaFace: 'TROUBLED' },
    { speaker: ARIA, text: 'ケイオスが信じたものを、自分の目で確かめたいだけ。' },
    { speaker: LEVI, text: 'そういうこった。よろしくな、人間。' },
  ]),

  // ---- F15 復興の始まり ---------------------------------------------------------
  REBUILD: scene('REBUILD', 'VILLAGE_BROKEN', [
    { speaker: null, text: '数日後。' },
    { speaker: null, text: '村に、槌の音が響いている。' },
    { speaker: GRAVE, text: 'そこの梁はまだ使える。燃えたとこだけ削れ！', graveFace: 'SERIOUS' },
    { speaker: MIREI, text: '釘、追加で持ってきたわよ。……代金はあとで、まとめて。', face: 'JITO' },
    { speaker: LINA, text: 'パン、焼けないけど、硬いのならあるよ！ みんな食べて！' },
    { speaker: null, text: 'ケイオスが手をかざすと、崩れかけた壁が、ゆっくりと形を取り戻していく。' },
    { speaker: null, text: '全部ではない。焼けた跡は、そのまま残る。' },
    { speaker: RIZEL, text: '……元通りには、ならないね。' },
    { speaker: OWNER, text: 'ならなくていい。新しく作るんだ。' },
  ]),

  // ---- F16 旅立ち ------------------------------------------------------------
  DEPARTURE: scene('DEPARTURE', 'VILLAGE_BROKEN', [
    { speaker: null, text: '村の出口。' },
    { speaker: GRAVE, text: '行ってこい。帰る場所は、ちゃんと残しといてやる。', graveFace: 'GRIN' },
    { speaker: KAOS, text: '……ちゃんと、帰ってきてね。', kaosFace: 'SAD' },
    { speaker: HERO, text: 'ああ。必ず。' },
    { speaker: KAOS, text: 'アリア、レヴィ。この人のこと、お願い。', kaosFace: 'SERIOUS' },
    { speaker: ARIA, text: '……見張っておくだけよ。' },
    { speaker: LEVI, text: 'へいへい。' },
    { speaker: KAOS, text: '……いってらっしゃい♪', kaosFace: 'SMILE' },
    { speaker: null, text: '槌の音を背に、三人は歩き出した。' },
  ]),
};

/** How much of the picture behind line `at` is shown: the last frame named since the picture last changed, or null (all of it). */
export function finaleFrame(scene: FinaleScene, at: number): FinaleFrame | null {
  for (let i = Math.min(at, scene.lines.length - 1); i >= 0; i--) {
    const l = scene.lines[i];
    if (l.frame) return l.frame;
    if (l.cg) return null;
  }
  return null;
}

/** The picture behind line `at` of a scene: the last one named at or before it, else the place's own. */
export function finaleBackdrop(scene: FinaleScene, at: number): FinaleBackdrop {
  for (let i = Math.min(at, scene.lines.length - 1); i >= 0; i--) {
    const cg = scene.lines[i].cg;
    if (cg) return cg;
  }
  return scene.place;
}

/**
 * THE MUSIC OF EACH SCENE (作者決定 2026-10-12): the ruins' depths and the
 * hooded figure — 厳かな協会の歌 (church-hymn); from the morning's first
 * quake to the grassland and its fight — 立ち向かう背中 (chapter1-final-boss).
 * Null: the place plays its own (the night before, at home; what follows the
 * stop — the village's piece, for now). HUSH: no music (the stop itself).
 */
export const FINALE_SCENE_BGM: Readonly<Partial<Record<FinaleSceneId, 'CHURCH_HYMN' | 'CHAPTER1_FINAL_BOSS' | 'HUSH'>>> = {
  RUINS_SEAL: 'CHURCH_HYMN',
  MORNING: 'CHAPTER1_FINAL_BOSS',
  RAID: 'CHAPTER1_FINAL_BOSS',
  LURE: 'CHAPTER1_FINAL_BOSS',
  VILLAGE_MIREI: 'CHAPTER1_FINAL_BOSS',
  FORM1_START: 'CHAPTER1_FINAL_BOSS',
  SHELL_BREAK: 'CHAPTER1_FINAL_BOSS',
  KAOS_FINISHER: 'CHAPTER1_FINAL_BOSS',
  HERO_FINISHER: 'CHAPTER1_FINAL_BOSS',
  // It stops: the music lets go. Then the village's own, quietly (暫定 — 作者 2026-10-12「静かな既存曲（暫定可）」).
  STOPPED: 'HUSH',
};

/** The finale's fights are fought to 立ち向かう背中. */
export const FINALE_FIGHT_BGM = 'CHAPTER1_FINAL_BOSS' as const;

/** The chapter's last words, on the end screen. */
export const CHAPTER1_END = {
  title: 'CHAPTER 1 END',
  lines: ['人は、生き残った。', 'けれど、村は壊れた。', '失ったものは、元には戻らない。', 'それでも――人はまた、作り直していく。'],
} as const;

/** Every speaker the finale uses (for the screen's pictures and the tests). */
export const FINALE_SPEAKERS = { HERO, KAOS, GRAVE, MIREI, RIZEL, LINA, OWNER, HOODED, WATCH, VILLAGER, CHILD, ARIA, LEVI } as const;
