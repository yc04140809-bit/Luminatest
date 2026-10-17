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
import type { NpcCore } from '../../core/life/types';

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
    type: 'ANOTHER_SIDE_HEARD',
    label: '別の話も、聞いてはいる',
    resonates: { traits: ['DUTIFUL'], values: ['ORDER'] },
    keepsPer100Days: 0.6,
  },
];
