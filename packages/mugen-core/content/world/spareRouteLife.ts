// THE LET-GO WORLD, AS THE LIFE ENGINE READS IT (ROUTE D 見逃し, the TIGS2027
// second proving route, 作者 2026-10-20; the events are
// content/events/spareRouteLife.ts).
//
// The same engine as the bakery route (content/world/bakeryRouteLife.ts),
// fed a different first fact. Being let go is not being bandaged: nothing
// here plants 「借りを返さねばならない」 in him — so the bakery route's first
// condition (GALD_WOULD_STAND_FOR_SOMEONE) is never met in this world, for
// that reason and not because a flag says so. What being let go leaves is
// the route's own theme, 「誰も見ていなくても、人は選ぶ」, and it is that
// which lets him choose, far from anybody, to stand between a merchant's
// cart and the side he used to be on.
//
// NOT HERE, ON PURPOSE (作者 2026-10-20):
//   - バルド. The merchants are anonymous people of a trading house and
//     their guards (MERCHANT_CARAVAN); no named person gets new canon.
//   - What he does for a living three years on, where exactly, with whom.
//     He is outside the village; that is all that is decided.
//   - エルナ's treatment through the merchants (the spec's CAUSAL LINK D):
//     only that they now know she exists.

import type { SeedKindDef, WorldActionDef } from '../../core/life/defs';
import type { NpcCore, WorldBloomDef } from '../../core/life/types';
import { GALD } from './galdLife';

/**
 * The people of a trading house and their guards, on a road outside the
 * village. Nobody named: an anonymous group (content/people/anonymousGroups.ts),
 * never an entry in the registry of named people.
 */
export const MERCHANT_CARAVAN = 'MERCHANT_CARAVAN';

/**
 * Anonymous, and as small as a core can be: people who trade for a living
 * keep their accounts square, and are practical about who helped them.
 */
export const MERCHANT_CARAVAN_CORE: NpcCore = {
  npcId: MERCHANT_CARAVAN,
  traits: ['PRACTICAL'],
  values: ['DEBTS_PAID'],
  aptitudes: {},
  desires: [],
};

export const SPARE_ROUTE_CORES: readonly NpcCore[] = [MERCHANT_CARAVAN_CORE];

export const SPARE_ROUTE_ACTIONS: readonly WorldActionDef[] = [
  {
    // The player's answer, read off canon under its own name. Lighter than
    // being bandaged (galdLife.ts: being beaten and then tended lands harder
    // on a proud man than being let go) — and a different thing: not a debt,
    // but that nobody is watching any more what he does next.
    id: 'PLAYER_SPARED_GALD',
    plants: 'NOBODY_WATCHING',
    impact: 0.5,
    reaches: 'TARGET',
  },
  {
    // His first move with nobody watching: he walks away from the bandits.
    id: 'GALD_LEAVES_BANDITS',
    plants: 'NOBODY_WATCHING',
    impact: 0.5,
    reaches: 'ACTOR',
  },
  {
    // Done by him, to the merchants: they were helped by a man they had no
    // reason to expect anything of.
    id: 'GALD_SAVES_MERCHANTS',
    plants: 'MERCHANTS_OWE_GALD',
    impact: 0.9,
    reaches: 'TARGET',
  },
  {
    // 「なぜそこまで金が必要なんだ？」 — and the answer is a sister.
    id: 'MERCHANTS_LEARN_OF_ELNA',
    plants: 'KNOWS_OF_ELNA',
    impact: 0.8,
    reaches: 'TARGET',
  },
];

export const SPARE_ROUTE_SEED_KINDS: readonly SeedKindDef[] = [
  {
    // ROUTE D's theme, as something in him (仮の言葉).
    type: 'NOBODY_WATCHING',
    label: '誰も見ていない。どうするかは、自分で決める',
    resonates: { traits: ['PROUD', 'STUBBORN'], values: ['OWN_TWO_HANDS'] },
    keepsPer100Days: 0.85,
  },
  {
    type: 'MERCHANTS_OWE_GALD',
    label: 'あの男に助けられた',
    resonates: { traits: ['PRACTICAL'], values: ['DEBTS_PAID'] },
    keepsPer100Days: 0.8,
  },
  {
    // Only that she exists and is ill (共通背景) — nothing about what they do with it.
    type: 'KNOWS_OF_ELNA',
    label: 'あの男には、病気の妹がいる',
    resonates: { traits: ['PRACTICAL'], values: ['DEBTS_PAID'] },
    keepsPer100Days: 0.8,
  },
];

/**
 * THE CONDITIONS FOR THE TWO STEPS — each about a person, none about the
 * player's answer.
 */
export const SPARE_ROUTE_BLOOMS: readonly WorldBloomDef[] = [
  {
    // With nobody watching, he decides for himself — and helps (ROUTE D D4:
    // 無視・奪う側へ戻る・助ける。正式主要パターンは助ける).
    id: 'GALD_CHOOSES_WITH_NOBODY_WATCHING',
    npcId: GALD,
    requirements: { seeds: [{ type: 'NOBODY_WATCHING', atLeast: 'GROWING' }] },
    result: '男は、誰も見ていない場所で、自分で選ぶ。',
  },
  {
    // They owe him, and people who keep their accounts square ask what he
    // needs the money for.
    id: 'MERCHANTS_ASK_WHY',
    npcId: MERCHANT_CARAVAN,
    requirements: { seeds: [{ type: 'MERCHANTS_OWE_GALD', atLeast: 'GROWING' }] },
    result: '商会の人々は、あの男がなぜ金を要るのかを訊く。',
  },
];
