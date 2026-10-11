// ケイオスの軽い誘い — "WHAT SHALL WE DO TODAY?" (作者指示 2026-10-11).
//
// Not a quest marker: a partner's word, now and then, as they come back
// into the village — at most once a day, never every time, never the same
// line twice running. It looks at what is true today (something has grown
// back in the forest, the materials for one of Grave's handworks are in the
// bag, somebody in the village has something on their mind) and says one
// thing about it, lightly. In the signs' heavy phase (3) only quiet words.
//
// It writes nothing: no point, no memory, no NEW (it is not something new
// to read; it is a word in passing).
//
// 状況別の会話 (作者指示 2026-10-11, 襲撃前の体験改善④): the same kind of
// word for how they are — hurt, low on magic, a light purse, a long day, a
// lucky one, a close call, nothing at all — so she is a partner on the road,
// not a guide to the menu. Short (one to three exchanges each way), the
// faces named per line, never the same line again soon. As they set out
// (the region map): hurt, low on magic, or now and then which way. As they
// come back in: the rest.
//
// THE HERO DOES NOT AGE; HE CAN DIE (作者 2026-10-11: 不老だが不死ではない).
// Nothing here calls him undying. And she calls him あなた, キミ or his
// name — never 師匠 (a word kept for those who come after).

import type { DialogueLine } from '../dialogue/prologue';
import type { IncidentPhase } from '../../core/world/aldenIncident';
import { HERO_SPEAKER } from './sekiryugaArc';

const KAOS = 'ケイオス';
const HERO = HERO_SPEAKER;

export interface NudgeFacts {
  phase: IncidentPhase;
  /** HP at or under 40% of its most (set out hurt). */
  hurt?: boolean;
  /** MP at or under 30% of its most. */
  lowMp?: boolean;
  /** Under 30 LUMI. */
  poor?: boolean;
  /** Back in the village a third time or more today (no hour is kept: a long day is the nearest thing to dark). */
  late?: boolean;
  /** A golden find on the way out just come back from. */
  lucky?: boolean;
  /** A fight just won with HP at 20% or under, or one lost. */
  reckless?: boolean;
  /** They were at the tavern yesterday. */
  tavernYesterday?: boolean;
  /** Something in the forest has grown back since it was taken. */
  forestRegrown: boolean;
  /** One of Grave's handworks can be made from the bag. */
  canCraft: boolean;
  /** A small happening waits at the tool shop / bakery / tavern today. */
  shopWaiting: boolean;
  bakeryWaiting: boolean;
  tavernWaiting: boolean;
}

export type NudgeTopic =
  | 'FOREST'
  | 'CRAFT'
  | 'SHOP'
  | 'BAKERY'
  | 'TAVERN'
  | 'QUIET'
  // 状況別 (2026-10-11)
  | 'HURT'
  | 'LOW_MP'
  | 'WHICH_WAY'
  | 'POOR'
  | 'LATE'
  | 'IDLE'
  | 'LUCKY'
  | 'RECKLESS'
  | 'PUKU';

export interface KaosNudge {
  id: string;
  topic: NudgeTopic;
  lines: readonly DialogueLine[];
  /** Said in the signs' heavy phase too (the quiet ones). */
  heavy?: boolean;
}

export const KAOS_NUDGES: readonly KaosNudge[] = [
  { id: 'FOREST_1', topic: 'FOREST', lines: [{ speaker: KAOS, text: '森、少し様子が変わってるかも。行ってみる？', kaosFace: 'SMILE' }] },
  {
    id: 'FOREST_2',
    topic: 'FOREST',
    lines: [
      { speaker: KAOS, text: 'この前の草むら、また何か生えてそう。', kaosFace: 'NORMAL' },
      { speaker: HERO, text: '見てくるか。', heroFace: 'NORMAL' },
    ],
  },
  { id: 'FOREST_HEAVY', topic: 'FOREST', heavy: true, lines: [{ speaker: KAOS, text: '今のうちに、森で薬草を揃えておこう。', kaosFace: 'SERIOUS' }] },
  { id: 'CRAFT_1', topic: 'CRAFT', lines: [{ speaker: KAOS, text: 'グレイヴ、鉄鉱石の話してたよ。何か作ってくれるかも。', kaosFace: 'SMILE' }] },
  {
    id: 'CRAFT_2',
    topic: 'CRAFT',
    lines: [
      { speaker: KAOS, text: '素材、けっこう溜まってるね。グレイヴに見せてみたら？', kaosFace: 'DOYA' },
      { speaker: HERO, text: '酒場で加工、か。', heroFace: 'NORMAL' },
    ],
  },
  { id: 'CRAFT_HEAVY', topic: 'CRAFT', heavy: true, lines: [{ speaker: KAOS, text: '備えは、あるだけあった方がいい。グレイヴに頼んでみよう。', kaosFace: 'SERIOUS' }] },
  { id: 'SHOP_1', topic: 'SHOP', lines: [{ speaker: KAOS, text: 'ミレイ、何か探してたみたいだよ。', kaosFace: 'NORMAL' }] },
  { id: 'BAKERY_1', topic: 'BAKERY', lines: [{ speaker: KAOS, text: 'パン屋、なんだか朝から慌ただしかったね。', kaosFace: 'SMILE' }] },
  { id: 'TAVERN_1', topic: 'TAVERN', lines: [{ speaker: KAOS, text: '酒場、今日はちょっと賑やかみたい。', kaosFace: 'SMILE' }] },
  { id: 'QUIET_HEAVY', topic: 'QUIET', heavy: true, lines: [{ speaker: KAOS, text: '……今日は、静かだね。', kaosFace: 'TROUBLED' }] },

  // ── 状況別の会話 (作者指示 2026-10-11) ──
  // E: something new in the bag — Grave might make something of it.
  {
    id: 'CRAFT_3',
    topic: 'CRAFT',
    lines: [
      { speaker: KAOS, text: 'それ、グレイヴに見せてみない？', kaosFace: 'SMILE' },
      { speaker: HERO, text: '作れるものがあるかもな。', heroFace: 'NORMAL' },
    ],
  },
  // B: setting out hurt. (Not undying: hurt is hurt.)
  {
    id: 'HURT_1',
    topic: 'HURT',
    heavy: true,
    lines: [
      { speaker: KAOS, text: 'ちょっと待って。', kaosFace: 'SERIOUS' },
      { speaker: HERO, text: '？', heroFace: 'SURPRISED' },
      { speaker: KAOS, text: 'その傷で行くつもり？', kaosFace: 'TROUBLED' },
      { speaker: HERO, text: 'まだ動ける。', heroFace: 'NORMAL' },
      { speaker: KAOS, text: 'そういう問題じゃないの。', kaosFace: 'ANGRY' },
    ],
  },
  // C: her magic running low.
  {
    id: 'LOW_MP_1',
    topic: 'LOW_MP',
    heavy: true,
    lines: [
      { speaker: HERO, text: '今日は魔法、控えめにな。', heroFace: 'NORMAL' },
      { speaker: KAOS, text: '……分かってるよ。', kaosFace: 'PUKU' },
      { speaker: HERO, text: 'その顔は分かってないな。', heroFace: 'SMILE' },
      { speaker: KAOS, text: '分かってるってば！', kaosFace: 'ANGRY' },
    ],
  },
  // A: which way today (the first time is the once-only exchange in kaosBanter; after that, now and then this).
  {
    id: 'WHICH_WAY_2',
    topic: 'WHICH_WAY',
    lines: [
      { speaker: KAOS, text: 'ねぇ、今日はどっち行く？', kaosFace: 'SMILE' },
      { speaker: HERO, text: '森かな。', heroFace: 'NORMAL' },
      { speaker: KAOS, text: 'よし。じゃあ行こっ！', kaosFace: 'LAUGH' },
    ],
  },
  // D: a light purse.
  {
    id: 'POOR_1',
    topic: 'POOR',
    lines: [
      { speaker: KAOS, text: 'ねぇ。', kaosFace: 'NORMAL' },
      { speaker: HERO, text: 'なんだ。', heroFace: 'NORMAL' },
      { speaker: KAOS, text: '……財布、軽くない？', kaosFace: 'TROUBLED' },
      { speaker: HERO, text: '気のせいだ。', heroFace: 'TROUBLED' },
      { speaker: KAOS, text: '絶対気のせいじゃない。', kaosFace: 'PUKU' },
    ],
  },
  // F: a long day (no hour is kept — the third time back is the nearest to dark).
  {
    id: 'LATE_1',
    topic: 'LATE',
    lines: [
      { speaker: KAOS, text: 'もう暗いよ。', kaosFace: 'TROUBLED' },
      { speaker: HERO, text: 'もう少しだけ。', heroFace: 'NORMAL' },
      { speaker: KAOS, text: 'キミ、そう言って長いんだから。', kaosFace: 'PUKU' },
    ],
  },
  // G: a day with nothing in it.
  {
    id: 'IDLE_1',
    topic: 'IDLE',
    lines: [
      { speaker: KAOS, text: 'ねぇ。', kaosFace: 'NORMAL' },
      { speaker: HERO, text: 'ん？', heroFace: 'NORMAL' },
      { speaker: KAOS, text: '今日は何もしない冒険にしない？', kaosFace: 'SMILE' },
      { speaker: HERO, text: 'それは冒険なのか？', heroFace: 'TROUBLED' },
      { speaker: KAOS, text: 'たぶん。', kaosFace: 'DOYA' },
    ],
  },
  // H: a golden find today.
  {
    id: 'LUCKY_1',
    topic: 'LUCKY',
    lines: [
      { speaker: KAOS, text: 'へへっ。', kaosFace: 'LAUGH' },
      { speaker: HERO, text: 'どうした。', heroFace: 'NORMAL' },
      { speaker: KAOS, text: '今日は当たりの日だね。', kaosFace: 'SMILE' },
    ],
  },
  // I: a close call. He does not age; he can die.
  {
    id: 'RECKLESS_1',
    topic: 'RECKLESS',
    heavy: true,
    lines: [
      { speaker: KAOS, text: '歳を取らないからって、命まで雑に扱わないでよ。', kaosFace: 'SERIOUS' },
      { speaker: HERO, text: '心配したのか？', heroFace: 'SMILE' },
      { speaker: KAOS, text: '……知らない。', kaosFace: 'BLUSH' },
    ],
  },
  // J: the tavern again — her PUKU face.
  {
    id: 'PUKU_1',
    topic: 'PUKU',
    lines: [
      { speaker: HERO, text: '今日は酒場に寄るか。', heroFace: 'NORMAL' },
      { speaker: KAOS, text: '昨日も行った。', kaosFace: 'PUKU' },
      { speaker: HERO, text: '嫌か？', heroFace: 'NORMAL' },
      { speaker: KAOS, text: '別に。', kaosFace: 'PUKU' },
      { speaker: HERO, text: 'その顔で言われてもな。', heroFace: 'SMILE' },
    ],
  },
];

/** How likely a word is, on a coming back where one could be said. */
export const NUDGE_CHANCE = 0.45;

/** The lines said lately, most recent last (or one id, or none). */
type Recent = string | null | readonly string[];
const recentOf = (r: Recent): readonly string[] => (r === null ? [] : typeof r === 'string' ? [r] : r);

/** The first topic with a line not said lately (else its first line). */
function pick(topics: readonly NudgeTopic[], heavy: boolean, recent: Recent): KaosNudge | null {
  const said = recentOf(recent);
  for (const topic of topics) {
    const options = KAOS_NUDGES.filter((n) => n.topic === topic && (heavy ? n.heavy : !n.heavy || topic === 'HURT' || topic === 'LOW_MP' || topic === 'RECKLESS'));
    const fresh = options.find((n) => !said.includes(n.id)) ?? null;
    // A topic whose every line was said lately gives way to the next.
    if (fresh) return fresh;
  }
  return null;
}

/**
 * Today's word as they come back in, or none: under the chance, the first
 * topic that is true today, a line of it not said lately (`recent`).
 * In order: a close call, a lucky day, somebody waiting, the forest grown
 * back, Grave's handwork, a light purse, a long day, the tavern again, and
 * on a day with nothing, nothing-in-particular. Heavy phase: only the quiet
 * and serious lines.
 */
export function nudgeFor(facts: NudgeFacts, roll: number, last: Recent): KaosNudge | null {
  if (roll >= NUDGE_CHANCE) return null;
  const heavy = facts.phase >= 3;
  const topics: NudgeTopic[] = [];
  if (facts.reckless) topics.push('RECKLESS');
  if (!heavy) {
    if (facts.lucky) topics.push('LUCKY');
    if (facts.shopWaiting) topics.push('SHOP');
    if (facts.bakeryWaiting) topics.push('BAKERY');
    if (facts.tavernWaiting) topics.push('TAVERN');
  }
  if (facts.forestRegrown) topics.push('FOREST');
  if (facts.canCraft) topics.push('CRAFT');
  if (!heavy) {
    if (facts.poor) topics.push('POOR');
    if (facts.late) topics.push('LATE');
    if (facts.tavernYesterday) topics.push('PUKU');
  }
  // Nothing else true: in the heavy phase a quiet line; otherwise only on a day with nothing at all.
  if (heavy) topics.push('QUIET');
  else if (topics.length === 0) topics.push('IDLE');
  return pick(topics, heavy, last);
}

/** How likely a word is as they set out, where one could be said (hurt: more likely). */
export const SETTING_OUT_CHANCE = 0.45;
export const HURT_CHANCE = 0.7;

/**
 * A word as they set out (the region map), or none: hurt first, then her
 * magic low, then now and then which way today — the last only once the
 * first 「どっち行く？」 has been had (`firstWhichWayHeard`). Not in the heavy
 * phase except the serious two.
 */
export function settingOutTalkFor(
  facts: Pick<NudgeFacts, 'phase' | 'hurt' | 'lowMp'>,
  roll: number,
  last: Recent,
  firstWhichWayHeard: boolean,
): KaosNudge | null {
  const heavy = facts.phase >= 3;
  if (facts.hurt && roll < HURT_CHANCE) return pick(['HURT'], heavy, last);
  if (roll >= SETTING_OUT_CHANCE) return null;
  if (facts.lowMp) return pick(['LOW_MP'], heavy, last);
  if (!heavy && firstWhichWayHeard) return pick(['WHICH_WAY'], false, last);
  return null;
}
