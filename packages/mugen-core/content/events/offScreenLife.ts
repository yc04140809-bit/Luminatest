// OFF-SCREEN LIFE — what people do with one another while the player is
// somewhere else (docs/OFF_SCREEN_LIFE_SYSTEM.md, 2026-10-17).
//
// THE FIRST CHAIN: HELP — the bakery route, as a PoC (docs/GALD_FIVE_ROUTES.md
// ROUTE A, 作者 2026-10-16 / 2026-10-17). The player bandaged the bandit in
// the greenwood; what follows happens to other people, among themselves,
// while the player is asleep at the inn or away on the road:
//
//   PLAYER_HELPED_GALD                       (the player's answer)
//     +1 night  GALD_SAVES_LINA               he stays near the forest edge; リナ is set on
//                                             there, and he stands in front of her —
//                                             リゼル, gathering herbs, sees it
//     same day  RIZEL_TENDS_GALD              his reopened wounds, bound by リゼル
//     +1 night  GALD_TELLS_OF_ELNA            リナ brings him to her father; why he stole
//                                             (his sister エルナ, sick) is said aloud
//     +1 night  GALD_TAKES_BAKERY_WORK        the work offered — HIS decision, not the player's
//     +1 night  LINA_WRITES_TO_ELNA           リナ, fourteen, writes to a girl of fourteen
//                                             she has never met; he carries it
//     +2 nights RIZEL_SPEAKS_FOR_GALD         the guard doubts him at the bakery door, and
//                                             リゼル — who did not forgive thieves — speaks
//
// THE PLAYER IS NEVER AN ACTOR ON THESE. None is seen as it happens; each is
// a fact of the world the player may come to know afterwards — from リナ, the
// baker, リゼル, a rumour — and only then does WORLD MEMORY list it
// (core/world/playerKnowledge.ts). Some of it the player may never hear.
//
// HOW TIME MOVES IT: the LIFE TICK, which is the night (World.advanceDay)
// and nothing else — no tick, no free TIME SHIFT, no real-world clock. The
// same resolver as every life in this world (core/events/eventEngine.ts).
//
// NOT HERE, ON PURPOSE:
//   - バルド (作者 2026-10-16/17): no step, actor, seed or rule of this chain
//     involves him — the merchant house and エルナ's treatment are a later
//     chain. A test holds this.
//   - エルナ's treatment, her coming to Alden, her friendship with リナ: only
//     the seed of it (a letter). Nothing here decides her future, or リナ's.
//   - Gald made good: his past, the village's doubt and the guard stay. That
//     is what the last step is about.
//   - The other routes and the final condition between the bakery and the
//     clinic (5ルート本実装時に決める). In this PoC, HELP leads here; the road
//     (GALD_WALKS_THE_ROAD) gives way once he has saved her (`unless` on it).
//   - TIME SHIFT: the look ahead is unchanged — it shows the old picture of
//     HELP (World.previewLifeEvents reads LIFE_EVENT_DEFS only).

import type { LifeEventDef } from '../../core/events/types';
import type { MemoryEventType, OffScreenLifeEventType } from '../../core/memory/types';
import type { KnowableFact } from '../../core/world/playerKnowledge';
import { LIFE_EVENT_DEFS } from './lifeEvents';

/**
 * The night after he was bandaged. He has not gone far — a man with his
 * wounds does not — and リナ is at the forest edge for the bilberries her
 * father wanted. Something comes out of the trees. He stands in front of
 * her; the wounds the player closed open again. リゼル, who was there for
 * herbs, sees all of it — and it is HER memory of it that matters next.
 *
 * Actors: he did it (actor), to her (target), seen by リゼル (witness).
 */
export const GALD_SAVES_LINA_DEF: LifeEventDef = {
  type: 'GALD_SAVES_LINA',
  eventId: 'evt_gald_saves_lina',
  requiredMemory: 'PLAYER_HELPED_GALD',
  minElapsedDays: 1,
  // A world where he had already taken the road (a save from before this
  // route existed) does not also have him at the forest edge.
  unless: ['GALD_WALKS_THE_ROAD'],
  once: true,
  location: 'GREENWOOD_FOREST',
  actors: ['GALD', 'LINA', 'RIZEL'],
  importance: 'MAJOR',
  characterEffects: [
    // Carried into the village to be seen to. Current state only.
    { characterId: 'GALD', changes: { location: 'ALDEN_VILLAGE' } },
  ],
};

/** The same evening. Not forgiveness — a wound in front of her that needs binding. */
export const RIZEL_TENDS_GALD_DEF: LifeEventDef = {
  type: 'RIZEL_TENDS_GALD',
  eventId: 'evt_rizel_tends_gald',
  requiredMemory: 'GALD_SAVES_LINA',
  minElapsedDays: 0,
  once: true,
  location: 'ALDEN_VILLAGE',
  actors: ['RIZEL', 'GALD', 'LINA'],
  importance: 'NORMAL',
  characterEffects: [],
};

/**
 * リナ wants her father to meet the man who saved her. At the bakery's
 * table, asked what he was doing in the forest, he says it: his sister,
 * エルナ, sick, and the money her treatment needs. リナ, her father and
 * リゼル now know the reason — the reason, not an excuse; he says so himself.
 */
export const GALD_TELLS_OF_ELNA_DEF: LifeEventDef = {
  type: 'GALD_TELLS_OF_ELNA',
  eventId: 'evt_gald_tells_of_elna',
  requiredMemory: 'RIZEL_TENDS_GALD',
  minElapsedDays: 1,
  once: true,
  location: 'ALDEN_BAKERY',
  actors: ['GALD', 'BAKERY_OWNER', 'LINA', 'RIZEL'],
  importance: 'MAJOR',
  characterEffects: [],
};

/**
 * The baker cannot pay for a cure; he can pay more than the work is worth,
 * if the work is done here. It is Gald who decides — the player is not
 * asked and is not there — and he says yes because エルナ needs the money.
 */
export const GALD_TAKES_BAKERY_WORK_DEF: LifeEventDef = {
  type: 'GALD_TAKES_BAKERY_WORK',
  eventId: 'evt_gald_takes_bakery_work',
  requiredMemory: 'GALD_TELLS_OF_ELNA',
  minElapsedDays: 1,
  once: true,
  location: 'ALDEN_BAKERY',
  actors: ['GALD', 'BAKERY_OWNER'],
  importance: 'MAJOR',
  characterEffects: [
    { characterId: 'GALD', changes: { occupation: 'BAKERY_HAND', location: 'ALDEN_VILLAGE' } },
  ],
};

/**
 * リナ's own doing: a letter to a girl her age she has never met, carried
 * by the man who works in the back. The first thread between two lives
 * the player never introduced — and only that; nothing says what it becomes.
 */
export const LINA_WRITES_TO_ELNA_DEF: LifeEventDef = {
  type: 'LINA_WRITES_TO_ELNA',
  eventId: 'evt_lina_writes_to_elna',
  requiredMemory: 'GALD_TAKES_BAKERY_WORK',
  minElapsedDays: 1,
  once: true,
  location: 'ALDEN_BAKERY',
  actors: ['LINA', 'ELNA', 'GALD'],
  importance: 'NORMAL',
  characterEffects: [],
};

/**
 * What changed in リゼル, reaching somebody who was never in the forest.
 * The guard finds the greenwood's bandit carrying flour sacks and does not
 * like it; リゼル, who said she would never forgive a thief, tells him what
 * she saw. The guard is not persuaded — his doubt stays — but he has heard it.
 */
export const RIZEL_SPEAKS_FOR_GALD_DEF: LifeEventDef = {
  type: 'RIZEL_SPEAKS_FOR_GALD',
  eventId: 'evt_rizel_speaks_for_gald',
  requiredMemory: 'GALD_TAKES_BAKERY_WORK',
  minElapsedDays: 2,
  once: true,
  location: 'ALDEN_VILLAGE',
  actors: ['RIZEL', 'ALDEN_GUARD', 'GALD'],
  importance: 'NORMAL',
  characterEffects: [],
};

/** The bakery route, in the order it can happen. */
export const GALD_BAKERY_ROUTE_DEFS: readonly LifeEventDef[] = [
  GALD_SAVES_LINA_DEF,
  RIZEL_TENDS_GALD_DEF,
  GALD_TELLS_OF_ELNA_DEF,
  GALD_TAKES_BAKERY_WORK_DEF,
  LINA_WRITES_TO_ELNA_DEF,
  RIZEL_SPEAKS_FOR_GALD_DEF,
];

/** Every off-screen life in the world (one chain, for now). */
export const OFF_SCREEN_LIFE_DEFS: readonly LifeEventDef[] = [...GALD_BAKERY_ROUTE_DEFS];

/**
 * WHAT THE LIFE TICK RESOLVES: every life in the world, each night — the
 * four answers' chains and the off-screen ones, by one resolver. (The look
 * ahead, which is a picture and not time passing, reads LIFE_EVENT_DEFS only.)
 */
export const LIFE_TICK_DEFS: readonly LifeEventDef[] = [...LIFE_EVENT_DEFS, ...OFF_SCREEN_LIFE_DEFS];

/** OFF-SCREEN EVENT levels (docs/OFF_SCREEN_LIFE_SYSTEM.md §4). DAILY and CRITICAL have none here. */
export type OffScreenLevel = 'RELATIONSHIP' | 'GROWTH' | 'BRANCH';

/**
 * What each one is, in the spec's terms. Data for people reading the world
 * (tests, docs, a developer's screen) — the engine runs on the defs above.
 *
 *   playerObserved  always false: these happen where the player is not
 *   decidedBy       whose own choice it was, when it was one (NPC DECISION)
 *   newSeeds        the possibilities it opens (names from the route spec);
 *                   the life engine reads the same events (content/world/bakeryRouteLife.ts)
 */
export interface OffScreenEventInfo {
  type: OffScreenLifeEventType;
  level: OffScreenLevel;
  playerObserved: false;
  decidedBy?: string;
  newSeeds: readonly string[];
}

export const OFF_SCREEN_EVENT_INFO: Readonly<Record<OffScreenLifeEventType, OffScreenEventInfo>> = {
  GALD_SAVES_LINA: {
    type: 'GALD_SAVES_LINA',
    level: 'BRANCH',
    playerObserved: false,
    decidedBy: 'GALD',
    newSeeds: ['RIZEL_QUESTIONS_GALD', 'LINA_WANTS_TO_REPAY_GALD'],
  },
  RIZEL_TENDS_GALD: {
    type: 'RIZEL_TENDS_GALD',
    level: 'RELATIONSHIP',
    playerObserved: false,
    decidedBy: 'RIZEL',
    newSeeds: ['GALD_MEETS_BAKER'],
  },
  GALD_TELLS_OF_ELNA: {
    type: 'GALD_TELLS_OF_ELNA',
    level: 'BRANCH',
    playerObserved: false,
    decidedBy: 'GALD',
    newSeeds: ['UNDERSTANDING_BEFORE_JUDGMENT'],
  },
  GALD_TAKES_BAKERY_WORK: {
    type: 'GALD_TAKES_BAKERY_WORK',
    level: 'BRANCH',
    playerObserved: false,
    decidedBy: 'GALD',
    newSeeds: ['GALD_WORKS_BAKERY', 'VILLAGE_SEES_GALD_WORK', 'GALD_REDEMPTION_PROCESS'],
  },
  LINA_WRITES_TO_ELNA: {
    type: 'LINA_WRITES_TO_ELNA',
    level: 'RELATIONSHIP',
    playerObserved: false,
    decidedBy: 'LINA',
    newSeeds: ['ELNA_MEETS_LINA'],
  },
  RIZEL_SPEAKS_FOR_GALD: {
    type: 'RIZEL_SPEAKS_FOR_GALD',
    level: 'GROWTH',
    playerObserved: false,
    decidedBy: 'RIZEL',
    newSeeds: ['GUARD_HEARS_ANOTHER_SIDE'],
  },
};

/**
 * WHAT THE PLAYER CAN COME TO KNOW OF IT (core/world/playerKnowledge.ts).
 * Each is learned only when something the player reads or sees tells them
 * (content/story/dailyScenes.ts, villageRumors.ts, the bakery), and only once
 * the world has done it. Some of the route the player may never hear about.
 */
export const OFF_SCREEN_FACTS: readonly KnowableFact[] = [
  { id: 'GALD_SAVED_LINA', truth: 'GALD_SAVES_LINA', listsEvent: true },
  { id: 'RIZEL_TENDED_GALD', truth: 'RIZEL_TENDS_GALD', listsEvent: true },
  { id: 'GALD_STOLE_FOR_ELNA', truth: 'GALD_TELLS_OF_ELNA', listsEvent: true },
  { id: 'GALD_WORKS_AT_BAKERY', truth: 'GALD_TAKES_BAKERY_WORK', listsEvent: true },
  // Seen, not told: a big man carrying flour at the back of the bakery.
  // Who he is, the player does not know from this.
  { id: 'NEW_HAND_AT_BAKERY', truth: 'GALD_TAKES_BAKERY_WORK', listsEvent: false },
  { id: 'LINA_WROTE_TO_ELNA', truth: 'LINA_WRITES_TO_ELNA', listsEvent: true },
  { id: 'RIZEL_SPOKE_FOR_GALD', truth: 'RIZEL_SPEAKS_FOR_GALD', listsEvent: true },
];

/**
 * WHAT CAN BE SEEN OF IT WITHOUT BEING TOLD (OFF-SCREEN LIFE §11 「環境」): once
 * he works there, the bakery has a big man carrying flour at the back. Going
 * in, the player sees him — and knows that much (NEW_HAND_AT_BAKERY), not who.
 */
export const BAKERY_NEW_HAND_SIGHT = {
  truth: 'GALD_TAKES_BAKERY_WORK',
  fact: 'NEW_HAND_AT_BAKERY',
  via: 'seen:ALDEN_BAKERY',
  line: '店の奥で、見慣れない大柄な男が黙々と粉袋を運んでいる。',
} as const satisfies { truth: MemoryEventType; fact: string; via: string; line: string };
