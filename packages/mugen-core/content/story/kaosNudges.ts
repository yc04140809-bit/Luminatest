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

import type { DialogueLine } from '../dialogue/prologue';
import type { IncidentPhase } from '../../core/world/aldenIncident';
import { HERO_SPEAKER } from './sekiryugaArc';

const KAOS = 'ケイオス';
const HERO = HERO_SPEAKER;

export interface NudgeFacts {
  phase: IncidentPhase;
  /** Something in the forest has grown back since it was taken. */
  forestRegrown: boolean;
  /** One of Grave's handworks can be made from the bag. */
  canCraft: boolean;
  /** A small happening waits at the tool shop / bakery / tavern today. */
  shopWaiting: boolean;
  bakeryWaiting: boolean;
  tavernWaiting: boolean;
}

export type NudgeTopic = 'FOREST' | 'CRAFT' | 'SHOP' | 'BAKERY' | 'TAVERN' | 'QUIET';

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
];

/** How likely a word is, on a coming back where one could be said. */
export const NUDGE_CHANCE = 0.45;

/**
 * Today's word, or none: under the chance, the first topic that is true
 * today (somebody waiting first, then the forest, then Grave), a line of it
 * other than `last` (the one said before). Heavy phase: only quiet lines.
 */
export function nudgeFor(facts: NudgeFacts, roll: number, last: string | null): KaosNudge | null {
  if (roll >= NUDGE_CHANCE) return null;
  const heavy = facts.phase >= 3;
  const topics: NudgeTopic[] = [];
  if (!heavy) {
    if (facts.shopWaiting) topics.push('SHOP');
    if (facts.bakeryWaiting) topics.push('BAKERY');
    if (facts.tavernWaiting) topics.push('TAVERN');
  }
  if (facts.forestRegrown) topics.push('FOREST');
  if (facts.canCraft) topics.push('CRAFT');
  if (heavy) topics.push('QUIET');
  for (const topic of topics) {
    const options = KAOS_NUDGES.filter((n) => n.topic === topic && (heavy ? n.heavy : !n.heavy));
    const pick = options.find((n) => n.id !== last) ?? options[0];
    if (pick) return pick;
  }
  return null;
}
