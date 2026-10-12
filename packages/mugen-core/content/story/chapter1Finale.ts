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
  'VILLAGE_RIZEL',
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
  RUINS_SEAL: scene('RUINS_SEAL', 'RUINS_DEPTHS', [
    { speaker: null, text: '同じ夜。古代遺跡の、さらに奥。' },
    { speaker: null, text: '誰も入ったことのないはずの部屋に、灯りがひとつ。' },
    { speaker: null, text: '黒いフードの人影が、古い装置に手を置いている。' },
    { speaker: null, text: '装置の光が、ひとつ、またひとつと灯っていく。' },
    { speaker: HOODED, text: '……第一段階。' },
    { speaker: null, text: '低い音。部屋の奥で、巨大な何かが身じろぎした。' },
    { speaker: HOODED, text: '……次だ。' },
    { speaker: null, text: '装置が、赤く光った。' },
    { speaker: null, text: '耳の奥を刺すような音。光が乱れ、明滅する。' },
    { speaker: HOODED, text: '……違う。' },
    { speaker: HOODED, text: '第二段階が、拒絶された……？' },
    { speaker: null, text: `闇の奥で、${V}の目が灯った。` },
    { speaker: null, text: 'それは、フードの人影を見なかった。' },
    { speaker: null, text: '壁の向こう――遠く、村のある方角を見ていた。' },
    { speaker: HOODED, text: '……これは、予定にないな。' },
    { speaker: null, text: '人影は、それ以上何も言わず、闇に溶けるように消えた。' },
  ]),

  // ---- F4 異変の朝（村）------------------------------------------------------
  MORNING: scene('MORNING', 'VILLAGE', [
    { speaker: null, text: '翌朝。' },
    { speaker: null, text: '地面が、揺れた。' },
    { speaker: null, text: 'もう一度。今度は、もっと大きく。' },
    { speaker: WATCH, text: 'おい……森の方だ！ 木が、倒れてく！' },
    { speaker: VILLAGER, text: '何だ、あれ……！' },
    { speaker: KAOS, text: '……来た。', kaosFace: 'SERIOUS', tense: true },
    { speaker: HERO, text: '何が！？' },
    { speaker: GRAVE, text: '話は後だ。', graveFace: 'SERIOUS' },
    { speaker: null, text: 'グレイヴが、酒場の壁から古い両手剣を下ろした。' },
  ]),

  // ---- F5 アルデン襲撃（村）---------------------------------------------------
  RAID: scene('RAID', 'VILLAGE', [
    { speaker: null, text: `村の柵を踏み砕いて、${V}が現れた。` },
    { speaker: null, text: '石と金属でできた、巨大な獣。' },
    { speaker: null, text: '尾のひと振りで、納屋の屋根が吹き飛んだ。' },
    { speaker: VILLAGER, text: '逃げろ！ 家から出ろ！' },
    { speaker: null, text: 'どこかで、火の手が上がる。' },
    { speaker: HERO, text: 'あいつ……何がしたいんだ！？' },
    { speaker: KAOS, text: '……怒ってない。', kaosFace: 'SERIOUS', tense: true },
    { speaker: KAOS, text: '探してる。何かを、ここにあると思ってる。' },
    { speaker: GRAVE, text: 'どっちでも同じだ。このままじゃ村が持たねぇ！', graveFace: 'ANGRY', tense: true },
    { speaker: HERO, text: '……ここで戦っちゃだめだ。', heroFace: 'SERIOUS', tense: true },
    { speaker: HERO, text: '村から引き離す。草原まで。' },
    { speaker: GRAVE, text: '……へっ。悪くねぇ。', graveFace: 'GRIN' },
    { speaker: KAOS, text: '了解。こっちを見させればいいんだね。', kaosFace: 'SERIOUS' },
  ]),

  // ---- F6 草原へ誘導（街道）---------------------------------------------------
  LURE: scene('LURE', 'ROAD', [
    { speaker: KAOS, text: 'こっちだよ！', tense: true },
    { speaker: null, text: `ケイオスの光が、${V}の顔をかすめた。` },
    { speaker: null, text: '巨大な頭が、ゆっくりとこちらを向く。' },
    { speaker: GRAVE, text: '来やがった。走れ！', graveFace: 'SERIOUS' },
    { speaker: null, text: '三人は村の外へ。街道を抜け、開けた草原へ。' },
    { speaker: null, text: '地響きが、すぐ後ろを追ってくる。' },
  ]),

  // ---- F7a 村側：ミレイ（戦闘の前に差し込む）----------------------------------
  VILLAGE_MIREI: scene('VILLAGE_MIREI', 'VILLAGE', [
    { speaker: null, text: 'そのころ、村では――' },
    { speaker: MIREI, text: '広場はだめ！ 井戸の裏、石の倉庫に！', face: 'ANGRY' },
    { speaker: VILLAGER, text: 'ミレイさん、足をやられた人が……！' },
    { speaker: MIREI, text: '店の棚の包帯、全部出して。旅支度の包みも開けていいから。' },
    { speaker: MIREI, text: '……作っておいて、よかった。', face: 'SAD' },
  ]),

  // ---- F8 草原決戦の前 ---------------------------------------------------------
  FORM1_START: scene('FORM1_START', 'GRASSLAND', [
    { speaker: null, text: '草原。村は、もう見えない。' },
    { speaker: null, text: `${V}が、三人の前で足を止めた。` },
    { speaker: GRAVE, text: 'ここなら、誰も巻き込まねぇ。', graveFace: 'SERIOUS' },
    { speaker: HERO, text: 'ああ。――行くぞ！', heroFace: 'SERIOUS', tense: true },
  ]),

  // ---- F7b 村側：リゼル（第1形態の後に差し込む）--------------------------------
  VILLAGE_RIZEL: scene('VILLAGE_RIZEL', 'VILLAGE', [
    { speaker: null, text: '石の倉庫の中。' },
    { speaker: CHILD, text: '……こわい。' },
    { speaker: RIZEL, text: '大丈夫。ここは、ちゃんと守られてる。' },
    { speaker: RIZEL, text: 'おばあちゃん、腕、見せて。……うん、きつく巻くね。' },
    { speaker: VILLAGER, text: 'リゼルちゃん、あんた、手が震えて……' },
    { speaker: RIZEL, text: '震えてても、巻ける。' },
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

  // ---- F10 必殺技の解放（第2形態戦の途中）--------------------------------------
  KAOS_FINISHER: scene('KAOS_FINISHER', 'GRASSLAND', [
    { speaker: KAOS, text: '……このままじゃ、押し切れない。', kaosFace: 'SERIOUS', tense: true },
    { speaker: KAOS, text: 'かなり魔力を使うけど――仕方ないよね。' },
    { speaker: KAOS, text: '下がってて。本気、出すから。', tense: true },
  ]),
  HERO_FINISHER: scene('HERO_FINISHER', 'GRASSLAND', [
    { speaker: null, text: '剣が、熱を帯びた。' },
    { speaker: HERO, text: '……まだだ。', heroFace: 'SERIOUS', tense: true },
    { speaker: HERO, text: 'ここで、終わらせる！', tense: true },
  ]),

  // ---- F7c 村側：パン屋親子と村人（第2形態の後に差し込む）------------------------
  VILLAGE_BAKERY: scene('VILLAGE_BAKERY', 'VILLAGE', [
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

/** The chapter's last words, on the end screen. */
export const CHAPTER1_END = {
  title: 'CHAPTER 1 END',
  lines: ['人は、生き残った。', 'けれど、村は壊れた。', '失ったものは、元には戻らない。', 'それでも――人はまた、作り直していく。'],
} as const;

/** Every speaker the finale uses (for the screen's pictures and the tests). */
export const FINALE_SPEAKERS = { HERO, KAOS, GRAVE, MIREI, RIZEL, LINA, OWNER, HOODED, WATCH, VILLAGER, CHILD, ARIA, LEVI } as const;
