// THE BAKERY ROUTE, AS THE LIFE ENGINE READS IT (OFF-SCREEN LIFE PoC,
// 2026-10-17; the events are content/events/offScreenLife.ts).
//
// The EVENT ENGINE says what happened — he stood in front of リナ, リゼル
// bound his wounds, the bakery heard why he stole. This file says what each
// of those leaves in the people it touched, in the engine's own terms: an
// action read off canon under its own name, the seed it plants, and who it
// reaches. Relationships and changes of heart are NOT stored anywhere
// (WORLD_LIFE_LINK_DESIGN §9): they are read from these seeds each time,
// from the events and the clock.
//
// The event's actors are [actor, target, ...witnesses]: GALD_SAVES_LINA is
// done by him, to リナ, seen by リゼル — so WITNESSES reaches both girls,
// and what it plants catches on each by what is in her.
//
// NOT HERE: バルド (作者 2026-10-16/17) — none of these reaches him or is
// his. エルナ's gift for care (HIDDEN SEED) is in her core as an aptitude
// and nothing here reveals or grows it; it stays DORMANT in this PoC.

import type { SeedKindDef, WorldActionDef } from '../../core/life/defs';
import type { NpcCore, WorldBloomDef } from '../../core/life/types';

export const ELNA = 'ELNA';

/**
 * エルナ — Gald's sister, fourteen, sick (docs/GALD_FIVE_ROUTES.md 共通背景).
 * Where she lives, how ill, and what becomes of her are not decided here.
 *
 * HEALING is the HIDDEN SEED of the spec (CARE / HEALING SUPPORT, docs/
 * HIDDEN_SEED_SYSTEM.md §10): a patient's eye for other patients. Nobody in
 * the game knows it, she least of all, and no screen shows it.
 */
export const ELNA_CORE: NpcCore = {
  npcId: ELNA,
  traits: ['GENTLE', 'OBSERVANT'],
  values: ['FAMILY'],
  aptitudes: { HEALING: 0.75 },
  desires: ['TO_NOT_BE_A_BURDEN'],
};

export const BAKERY_ROUTE_CORES: readonly NpcCore[] = [ELNA_CORE];

export const BAKERY_ROUTE_ACTIONS: readonly WorldActionDef[] = [
  {
    // Done by him, to リナ, seen by リゼル: what it plants in the two of
    // them is the same doubt about what they thought he was.
    id: 'GALD_SAVES_LINA',
    plants: 'SEEN_DIFFERENTLY',
    impact: 0.8,
    reaches: 'WITNESSES',
  },
  {
    // What being bound up by somebody who despised him does to a proud man:
    // the debt he cannot stand, owed again.
    id: 'RIZEL_TENDS_GALD',
    plants: 'GALD_GRATITUDE',
    impact: 0.6,
    reaches: 'TARGET',
  },
  {
    // The reason, said at a table: the baker, リナ and リゼル hear it.
    id: 'GALD_TELLS_OF_ELNA',
    plants: 'UNDERSTANDING_BEFORE_JUDGMENT',
    impact: 0.7,
    reaches: 'WITNESSES',
  },
  {
    // TIGS2027 STEP ①. At the same table: in him, that somebody will look
    // at his sister; in the baker, that even リゼル is willing.
    id: 'RIZEL_OFFERS_TO_SEE_ELNA',
    plants: 'SOMEONE_WILL_LOOK',
    impact: 0.8,
    reaches: 'WITNESSES',
  },
  {
    // The village, from the bakery counter: the talk about him turns.
    id: 'VILLAGE_HEARS_OF_GALD',
    plants: 'TALK_OF_GALD_TURNS',
    impact: 0.7,
    reaches: 'TARGET',
  },
  {
    // A place, offered by somebody — what a proud man who pays his own way
    // can say yes to.
    id: 'BAKER_OFFERS_WORK',
    plants: 'A_PLACE_OFFERED',
    impact: 0.7,
    reaches: 'TARGET',
  },
  {
    // His own decision, and the first place that did not turn him away.
    id: 'GALD_TAKES_BAKERY_WORK',
    plants: 'GALD_ROOTS_IN_ALDEN',
    impact: 0.7,
    reaches: 'ACTOR',
  },
  {
    // A letter from a girl her age, to a girl in bed.
    id: 'LINA_WRITES_TO_ELNA',
    plants: 'A_FRIEND_BY_LETTER',
    impact: 0.6,
    reaches: 'TARGET',
  },
  {
    // The guard hears another side. Small, and it fades: his wariness of
    // the greenwood's bandit (GUARD_WARINESS) is not cleared by one talk.
    id: 'RIZEL_SPEAKS_FOR_GALD',
    plants: 'ANOTHER_SIDE_HEARD',
    impact: 0.35,
    reaches: 'TARGET',
  },
];

export const BAKERY_ROUTE_SEED_KINDS: readonly SeedKindDef[] = [
  {
    type: 'SEEN_DIFFERENTLY',
    label: 'あの人は、ただの盗賊じゃないのかもしれない',
    // A gentle or curious heart, one that puts family first — or a pair of
    // hands that tend people, which see the person before the deed.
    resonates: { traits: ['GENTLE', 'CURIOUS'], values: ['FAMILY'], aptitude: 'HEALING' },
    keepsPer100Days: 0.85,
  },
  {
    type: 'UNDERSTANDING_BEFORE_JUDGMENT',
    label: '知る前に、決めつけていた',
    resonates: { traits: ['GENTLE'], values: ['FAMILY'], aptitude: 'HEALING' },
    keepsPer100Days: 0.9,
  },
  {
    type: 'A_FRIEND_BY_LETTER',
    label: 'まだ会ったことのない友だち',
    resonates: { traits: ['GENTLE', 'OBSERVANT'], values: ['FAMILY'] },
    keepsPer100Days: 0.75,
  },
  {
    // In Gald: hope for his sister he did not have to steal. In the baker:
    // that a girl who did not forgive thieves will help — he is not alone in it.
    type: 'SOMEONE_WILL_LOOK',
    label: 'あの子を診てくれる人がいる',
    resonates: { traits: ['GENTLE'], values: ['FAMILY', 'DEBTS_PAID'] },
    keepsPer100Days: 0.8,
  },
  {
    // A village of families: what it hears of a man who stole for his sister.
    type: 'TALK_OF_GALD_TURNS',
    label: 'あの盗賊の話が、少し違って聞こえる',
    resonates: { values: ['FAMILY'] },
    keepsPer100Days: 0.8,
  },
  {
    type: 'A_PLACE_OFFERED',
    label: 'ここで働けと言われた',
    resonates: { values: ['OWN_TWO_HANDS', 'DEBTS_PAID'] },
    keepsPer100Days: 0.7,
  },
  {
    type: 'ANOTHER_SIDE_HEARD',
    label: '別の話も、聞いてはいる',
    resonates: { traits: ['DUTIFUL'], values: ['ORDER'] },
    keepsPer100Days: 0.6,
  },
];

/**
 * WHEN EACH STEP OF THE ROUTE CAN HAPPEN (TIGS2027 STEP ①, 2026-10-19).
 *
 * Each is what an off-screen event asks of the people before it can happen
 * (LifeEventDef.bloom, content/events/offScreenLife.ts) — written about what
 * the step before LEFT IN SOMEBODY, never about a step being done. 'DORMANT'
 * means it landed and has not worn away; 'GROWING', that it has taken.
 *
 * GALD_BAKERY_HAND is the HIDDEN SEED of the route: the work at the bakery is
 * not a future anybody stored — it is a possibility that has to be reached,
 * SEED (he owes) → GROWTH (somebody will look; a place offered takes) → VINE
 * (because of the baker) → BLOOM. He takes the work only once it is.
 * The rest are smaller: the conditions for one person's next move.
 */
export const BAKERY_ROUTE_BLOOMS: readonly WorldBloomDef[] = [
  {
    // He still owes the stranger who bandaged him (PLAYER_HELPED_GALD).
    id: 'GALD_WOULD_STAND_FOR_SOMEONE',
    npcId: 'GALD',
    requirements: { seeds: [{ type: 'GALD_REDEMPTION', atLeast: 'GROWING' }] },
    result: '男は、借りを返す機会があれば体が動く。',
  },
  {
    // What she saw at the forest edge (GALD_SAVES_LINA) has not left her.
    id: 'RIZEL_SEES_GALD_DIFFERENTLY',
    npcId: 'RIZEL',
    requirements: { seeds: [{ type: 'SEEN_DIFFERENTLY', atLeast: 'DORMANT' }] },
    result: 'リゼルは、あの男をただの盗賊とは言い切れなくなっている。',
  },
  {
    // リナ wants her father to meet him; he owes リゼル again (RIZEL_TENDS_GALD).
    id: 'LINA_BRINGS_GALD_HOME',
    npcId: 'LINA',
    requirements: {
      seeds: [
        { type: 'SEEN_DIFFERENTLY', atLeast: 'GROWING' },
        { npcId: 'GALD', type: 'GALD_GRATITUDE', atLeast: 'DORMANT' },
      ],
    },
    result: 'リナは、助けてくれた人を父に会わせたいと思っている。',
  },
  {
    // Knowing the reason took in her (GALD_TELLS_OF_ELNA), and her hands can tend.
    id: 'RIZEL_COULD_SEE_ELNA',
    npcId: 'RIZEL',
    requirements: {
      seeds: [{ type: 'UNDERSTANDING_BEFORE_JUDGMENT', atLeast: 'DORMANT' }],
      aptitudes: [{ name: 'HEALING', atLeast: 0.5 }],
    },
    result: 'リゼルは、エルナを診ることを申し出られる。',
  },
  {
    // The one at the counter heard the reason, and that リゼル will help.
    id: 'ALDEN_HEARS_IT_ANOTHER_WAY',
    npcId: 'ALDEN_VILLAGE',
    requirements: {
      seeds: [
        { npcId: 'BAKERY_OWNER', type: 'UNDERSTANDING_BEFORE_JUDGMENT', atLeast: 'DORMANT' },
        { npcId: 'BAKERY_OWNER', type: 'SOMEONE_WILL_LOOK', atLeast: 'DORMANT' },
      ],
    },
    result: 'アルデンは、あの盗賊の話を別の形で聞きはじめている。',
  },
  {
    // She is not alone in it now (VILLAGE_HEARS_OF_GALD), and she still knows.
    id: 'RIZEL_COULD_SPEAK_FOR_HIM',
    npcId: 'RIZEL',
    requirements: {
      seeds: [
        { type: 'UNDERSTANDING_BEFORE_JUDGMENT', atLeast: 'DORMANT' },
        { npcId: 'ALDEN_VILLAGE', type: 'TALK_OF_GALD_TURNS', atLeast: 'DORMANT' },
      ],
    },
    result: 'リゼルは、見張り番の前であの男のことを話せる。',
  },
  {
    // A careful man offers once the guard has at least heard another side
    // (RIZEL_SPEAKS_FOR_GALD) — the guard's wariness itself is not asked
    // about, and it does not have to be gone.
    id: 'BAKER_COULD_OFFER_WORK',
    npcId: 'BAKERY_OWNER',
    requirements: {
      seeds: [
        { type: 'UNDERSTANDING_BEFORE_JUDGMENT', atLeast: 'DORMANT' },
        { npcId: 'ALDEN_GUARD', type: 'ANOTHER_SIDE_HEARD', atLeast: 'DORMANT' },
        { npcId: 'ALDEN_VILLAGE', type: 'TALK_OF_GALD_TURNS', atLeast: 'DORMANT' },
      ],
    },
    result: 'リナの父は、あの男に働き口を申し出られる。',
  },
  {
    // THE HIDDEN SEED, reached: SEED → GROWTH → VINE → BLOOM.
    id: 'GALD_BAKERY_HAND',
    npcId: 'GALD',
    requirements: {
      seeds: [
        { type: 'GALD_REDEMPTION', atLeast: 'GROWING' },
        { type: 'A_PLACE_OFFERED', atLeast: 'GROWING' },
        { type: 'SOMEONE_WILL_LOOK', atLeast: 'DORMANT' },
      ],
      vine: { target: 'BAKERY_OWNER', relationType: 'BECAUSE_OF' },
    },
    result: '男は、パン屋で働くという道に手が届くところにいる。',
  },
  {
    // She knows the girl exists, and there is a man in the back to carry it.
    id: 'LINA_COULD_WRITE_TO_ELNA',
    npcId: 'LINA',
    requirements: {
      seeds: [
        { type: 'UNDERSTANDING_BEFORE_JUDGMENT', atLeast: 'DORMANT' },
        { npcId: 'GALD', type: 'GALD_ROOTS_IN_ALDEN', atLeast: 'GROWING' },
      ],
    },
    result: 'リナは、会ったことのないエルナに手紙を書ける。',
  },
];
