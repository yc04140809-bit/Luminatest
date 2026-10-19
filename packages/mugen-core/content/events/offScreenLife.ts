// OFF-SCREEN LIFE — what people do with one another while the player is
// somewhere else (docs/OFF_SCREEN_LIFE_SYSTEM.md, 2026-10-17).
//
// THE FIRST CHAIN: HELP — the bakery route (docs/GALD_FIVE_ROUTES.md ROUTE A,
// 作者 2026-10-16 / 2026-10-17; made whole by TIGS2027 STEP ①, 2026-10-19).
// The player bandaged the bandit in the greenwood; what follows happens to
// other people, among themselves, while the player is asleep at the inn or
// away on the road:
//
//   PLAYER_HELPED_GALD                         (the player's answer)
//     +1 night  GALD_SAVES_LINA                 he stays near the forest edge; リナ is set on
//                                               there, and he stands in front of her —
//                                               リゼル, gathering herbs, sees it
//     same day  RIZEL_TENDS_GALD                his reopened wounds, bound by リゼル
//     +1 night  GALD_TELLS_OF_ELNA              リナ brings him to her father; why he stole
//                                               (his sister エルナ, sick) is said aloud
//     same day  RIZEL_OFFERS_TO_SEE_ELNA        リゼル, who knows something of wounds, says
//                                               she would look at the girl          (仮)
//     +1 night  VILLAGE_HEARS_OF_GALD           what the bakery now knows reaches the
//                                               village, from its own counter       (仮)
//     same day  RIZEL_SPEAKS_FOR_GALD           the guard doubts him at the bakery door, and
//                                               リゼル — who did not forgive thieves — speaks
//     same day  BAKER_OFFERS_WORK               リナの父 offers the work            (仮)
//     +1 night  GALD_TAKES_BAKERY_WORK          HIS decision, not the player's
//     +1 night  LINA_WRITES_TO_ELNA             リナ, fourteen, writes to a girl of fourteen
//                                               she has never met; he carries it
//
// WHY EACH ONE CAN HAPPEN (`bloom`, content/world/bakeryRouteLife.ts): not a
// flag that the one before is done, but something the one before LEFT IN
// SOMEBODY. リゼル binds his wounds because what she saw at the forest edge
// took in her; リナ brings him home because it took in her too; the village
// hears because the baker, who heard why he stole, is the one who talks;
// the baker offers because the guard has at least heard another side; and
// Gald says yes because he still owes, somebody will look at his sister, and
// a place was offered him by somebody — a bloom, not a step that was written
// to come next. A world where one of those did not take does not go on.
// The DEV chain (`chainCode` below):
//
//   GARDO_SAVED_LINA → RIZEL_VIEW_CHANGED → ELNA_CONTEXT_DISCOVERED
//   → RIZEL_HELP_OPPORTUNITY → VILLAGE_VIEW_CHANGED → GUARD_RELATION_CHANGED
//   → BAKERY_OPPORTUNITY → GARDO_BAKERY_BLOOM
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
//   - A free TIME SHIFT: there is none. Kaos shows the three years once,
//     after the four answers (World.previewLifeEvents reads this chain the
//     same way the nights do, and commits nothing).

import type { LifeEventDef } from '../../core/events/types';
import type { MemoryEvent, MemoryEventType, OffScreenLifeEventType } from '../../core/memory/types';
import type { KnowableFact } from '../../core/world/playerKnowledge';
import type { EventCgKey } from '@mugen/assets/keys';
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
  // He still owes, and a debt is something he would stand up for.
  bloom: 'GALD_WOULD_STAND_FOR_SOMEONE',
  once: true,
  location: 'GREENWOOD_FOREST',
  actors: ['GALD', 'LINA', 'RIZEL'],
  importance: 'MAJOR',
  characterEffects: [
    // Carried into the village to be seen to. Current state only.
    { characterId: 'GALD', changes: { location: 'ALDEN_VILLAGE' } },
  ],
};

/**
 * The same evening. Not forgiveness — a wound in front of her that needs
 * binding, and a girl who is no longer sure what she thought he was.
 */
export const RIZEL_TENDS_GALD_DEF: LifeEventDef = {
  type: 'RIZEL_TENDS_GALD',
  eventId: 'evt_rizel_tends_gald',
  requiredMemory: 'GALD_SAVES_LINA',
  minElapsedDays: 0,
  // What she saw at the forest edge has taken in her.
  bloom: 'RIZEL_SEES_GALD_DIFFERENTLY',
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
  // リナ wants her father to meet him (it took in her too), and a proud man
  // who was just bound up again does not refuse the girl he owes.
  bloom: 'LINA_BRINGS_GALD_HOME',
  once: true,
  location: 'ALDEN_BAKERY',
  actors: ['GALD', 'BAKERY_OWNER', 'LINA', 'RIZEL'],
  importance: 'MAJOR',
  characterEffects: [],
};

/**
 * THE CHANCE TO HELP エルナ, and it is リゼルの (TIGS2027 STEP ①: 「RIZELに
 * ELNAを診る／助ける機会」). At the same table, having heard why: she knows
 * something of wounds, and she says she would look at the girl. An offer —
 * whether she ever does, and what comes of it, is not decided here (仮:
 * the scene, the words and where エルナ is are the author's).
 *
 * Done by her, to him, with the baker there: what it leaves in Gald is that
 * somebody will look at his sister; in the baker, that even リゼル is willing.
 */
export const RIZEL_OFFERS_TO_SEE_ELNA_DEF: LifeEventDef = {
  type: 'RIZEL_OFFERS_TO_SEE_ELNA',
  eventId: 'evt_rizel_offers_to_see_elna',
  requiredMemory: 'GALD_TELLS_OF_ELNA',
  minElapsedDays: 0,
  // Knowing before judging took in her, and her hands can tend people.
  bloom: 'RIZEL_COULD_SEE_ELNA',
  once: true,
  location: 'ALDEN_BAKERY',
  actors: ['RIZEL', 'GALD', 'BAKERY_OWNER'],
  importance: 'NORMAL',
  characterEffects: [],
};

/**
 * THE VILLAGE HEARS IT ANOTHER WAY (「村側の評価変化」). The bakery is where
 * Alden talks, and the baker now knows why the greenwood's bandit stole, and
 * that リゼル of all people would look at the sister. It reaches the village
 * from his own counter. Not forgiveness — the talk turns, that is all (仮: who
 * says what to whom is the author's).
 */
export const VILLAGE_HEARS_OF_GALD_DEF: LifeEventDef = {
  type: 'VILLAGE_HEARS_OF_GALD',
  eventId: 'evt_village_hears_of_gald',
  requiredMemory: 'RIZEL_OFFERS_TO_SEE_ELNA',
  minElapsedDays: 1,
  // The one who talks has heard the reason, and that somebody will help.
  bloom: 'ALDEN_HEARS_IT_ANOTHER_WAY',
  once: true,
  location: 'ALDEN_BAKERY',
  actors: ['BAKERY_OWNER', 'ALDEN_VILLAGE'],
  importance: 'NORMAL',
  characterEffects: [],
};

/**
 * THE BAKERY'S OFFER (「パン屋との接点」). The baker cannot pay for a cure; he
 * can pay more than the work is worth, if the work is done here. A careful
 * man, he says it once the talk has turned and the guard has at least heard
 * another side — not before. (The offer itself is in the baker's own words in
 * OWNER_ON_THE_NEW_HAND, which the player hears after the fact.)
 */
export const BAKER_OFFERS_WORK_DEF: LifeEventDef = {
  type: 'BAKER_OFFERS_WORK',
  eventId: 'evt_baker_offers_work',
  requiredMemory: 'RIZEL_SPEAKS_FOR_GALD',
  minElapsedDays: 0,
  // A save from the PoC (2026-10-17), where he took the work before this
  // step existed: nobody offers a man work he already has.
  unless: ['GALD_TAKES_BAKERY_WORK'],
  bloom: 'BAKER_COULD_OFFER_WORK',
  once: true,
  location: 'ALDEN_BAKERY',
  actors: ['BAKERY_OWNER', 'GALD'],
  importance: 'NORMAL',
  characterEffects: [],
};

/**
 * It is Gald who decides — the player is not asked and is not there — and
 * he says yes because エルナ needs the money. The possibility (HIDDEN SEED
 * GALD_BAKERY_HAND, SEED → GROWTH → VINE → BLOOM) has to be there first: he
 * still owes, somebody will look at his sister, and the place offered took.
 */
export const GALD_TAKES_BAKERY_WORK_DEF: LifeEventDef = {
  type: 'GALD_TAKES_BAKERY_WORK',
  eventId: 'evt_gald_takes_bakery_work',
  requiredMemory: 'BAKER_OFFERS_WORK',
  minElapsedDays: 1,
  bloom: 'GALD_BAKERY_HAND',
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
  // She knows the girl exists, and there is now a man in the back to carry it.
  bloom: 'LINA_COULD_WRITE_TO_ELNA',
  once: true,
  location: 'ALDEN_BAKERY',
  actors: ['LINA', 'ELNA', 'GALD'],
  importance: 'NORMAL',
  characterEffects: [],
};

/**
 * What changed in リゼル, reaching somebody who was never in the forest
 * (「衛兵との関係変化」). The guard finds the greenwood's bandit at the bakery
 * door and does not like it; リゼル, who said she would never forgive a thief,
 * tells him what she saw — now that the village talk has turned, she is not
 * alone in it. The guard is not persuaded — his doubt stays — but he has heard it.
 */
export const RIZEL_SPEAKS_FOR_GALD_DEF: LifeEventDef = {
  type: 'RIZEL_SPEAKS_FOR_GALD',
  eventId: 'evt_rizel_speaks_for_gald',
  requiredMemory: 'VILLAGE_HEARS_OF_GALD',
  minElapsedDays: 0,
  bloom: 'RIZEL_COULD_SPEAK_FOR_HIM',
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
  RIZEL_OFFERS_TO_SEE_ELNA_DEF,
  VILLAGE_HEARS_OF_GALD_DEF,
  RIZEL_SPEAKS_FOR_GALD_DEF,
  BAKER_OFFERS_WORK_DEF,
  GALD_TAKES_BAKERY_WORK_DEF,
  LINA_WRITES_TO_ELNA_DEF,
];

/** Every off-screen life in the world (one chain, for now). */
export const OFF_SCREEN_LIFE_DEFS: readonly LifeEventDef[] = [...GALD_BAKERY_ROUTE_DEFS];

/**
 * WHAT THE LIFE TICK RESOLVES: every life in the world, each night — the
 * four answers' chains and the off-screen ones, by one resolver. The look
 * ahead (World.previewLifeEvents) reads the same list, so what Kaos shows is
 * what the nights would do.
 */
export const LIFE_TICK_DEFS: readonly LifeEventDef[] = [...LIFE_EVENT_DEFS, ...OFF_SCREEN_LIFE_DEFS];

/** OFF-SCREEN EVENT levels (docs/OFF_SCREEN_LIFE_SYSTEM.md §4). DAILY and CRITICAL have none here. */
export type OffScreenLevel = 'RELATIONSHIP' | 'GROWTH' | 'BRANCH';

/**
 * WHAT IT DID BETWEEN PEOPLE, so WORLD MEMORY can be asked later (TIGS2027
 * STEP ①): who helped whom, whose view of whom changed, who learned of
 * whose circumstances, who gave whom a chance, and how the village, the
 * guard and the bakery came to stand with him. Read off the event that
 * happened — never a number, never shown to a player as one.
 */
export type CausalLinkKind =
  | 'HELPED'
  | 'VIEW_CHANGED'
  | 'LEARNED_CIRCUMSTANCES'
  | 'GAVE_OPPORTUNITY'
  | 'RELATION_CHANGED'
  | 'BLOOMED';

export interface CausalLink {
  kind: CausalLinkKind;
  /** Whose doing, or whose view. */
  from: readonly string[];
  /** Who it was about. */
  to: string;
}

/**
 * What each one is, in the spec's terms. Data for people reading the world
 * (tests, docs, a developer's screen) — the engine runs on the defs above.
 *
 *   playerObserved  always false: these happen where the player is not
 *   decidedBy       whose own choice it was, when it was one (NPC DECISION)
 *   newSeeds        the possibilities it opens (names from the route spec);
 *                   the life engine reads the same events (content/world/bakeryRouteLife.ts)
 *   chainCode       its name on the DEV causal chain (STEP ① 指示書の表記)
 *   links           what it did between people (CausalLink)
 */
export interface OffScreenEventInfo {
  type: OffScreenLifeEventType;
  level: OffScreenLevel;
  playerObserved: false;
  decidedBy?: string;
  newSeeds: readonly string[];
  chainCode: string;
  links: readonly CausalLink[];
}

export const OFF_SCREEN_EVENT_INFO: Readonly<Record<OffScreenLifeEventType, OffScreenEventInfo>> = {
  GALD_SAVES_LINA: {
    type: 'GALD_SAVES_LINA',
    level: 'BRANCH',
    playerObserved: false,
    decidedBy: 'GALD',
    newSeeds: ['RIZEL_QUESTIONS_GALD', 'LINA_WANTS_TO_REPAY_GALD'],
    chainCode: 'GARDO_SAVED_LINA',
    links: [
      { kind: 'HELPED', from: ['GALD'], to: 'LINA' },
      { kind: 'VIEW_CHANGED', from: ['LINA', 'RIZEL'], to: 'GALD' },
    ],
  },
  RIZEL_TENDS_GALD: {
    type: 'RIZEL_TENDS_GALD',
    level: 'RELATIONSHIP',
    playerObserved: false,
    decidedBy: 'RIZEL',
    newSeeds: ['GALD_MEETS_BAKER'],
    chainCode: 'RIZEL_VIEW_CHANGED',
    links: [{ kind: 'HELPED', from: ['RIZEL'], to: 'GALD' }],
  },
  GALD_TELLS_OF_ELNA: {
    type: 'GALD_TELLS_OF_ELNA',
    level: 'BRANCH',
    playerObserved: false,
    decidedBy: 'GALD',
    newSeeds: ['UNDERSTANDING_BEFORE_JUDGMENT'],
    chainCode: 'ELNA_CONTEXT_DISCOVERED',
    links: [{ kind: 'LEARNED_CIRCUMSTANCES', from: ['BAKERY_OWNER', 'LINA', 'RIZEL'], to: 'ELNA' }],
  },
  RIZEL_OFFERS_TO_SEE_ELNA: {
    type: 'RIZEL_OFFERS_TO_SEE_ELNA',
    level: 'RELATIONSHIP',
    playerObserved: false,
    decidedBy: 'RIZEL',
    newSeeds: ['SOMEONE_WILL_LOOK'],
    chainCode: 'RIZEL_HELP_OPPORTUNITY',
    links: [{ kind: 'GAVE_OPPORTUNITY', from: ['RIZEL'], to: 'ELNA' }],
  },
  VILLAGE_HEARS_OF_GALD: {
    type: 'VILLAGE_HEARS_OF_GALD',
    level: 'GROWTH',
    playerObserved: false,
    newSeeds: ['TALK_OF_GALD_TURNS'],
    chainCode: 'VILLAGE_VIEW_CHANGED',
    links: [{ kind: 'RELATION_CHANGED', from: ['ALDEN_VILLAGE'], to: 'GALD' }],
  },
  RIZEL_SPEAKS_FOR_GALD: {
    type: 'RIZEL_SPEAKS_FOR_GALD',
    level: 'GROWTH',
    playerObserved: false,
    decidedBy: 'RIZEL',
    newSeeds: ['GUARD_HEARS_ANOTHER_SIDE'],
    chainCode: 'GUARD_RELATION_CHANGED',
    links: [{ kind: 'RELATION_CHANGED', from: ['ALDEN_GUARD'], to: 'GALD' }],
  },
  BAKER_OFFERS_WORK: {
    type: 'BAKER_OFFERS_WORK',
    level: 'RELATIONSHIP',
    playerObserved: false,
    decidedBy: 'BAKERY_OWNER',
    newSeeds: ['A_PLACE_OFFERED'],
    chainCode: 'BAKERY_OPPORTUNITY',
    links: [
      { kind: 'GAVE_OPPORTUNITY', from: ['BAKERY_OWNER'], to: 'GALD' },
      { kind: 'RELATION_CHANGED', from: ['BAKERY_OWNER'], to: 'GALD' },
    ],
  },
  GALD_TAKES_BAKERY_WORK: {
    type: 'GALD_TAKES_BAKERY_WORK',
    level: 'BRANCH',
    playerObserved: false,
    decidedBy: 'GALD',
    newSeeds: ['GALD_WORKS_BAKERY', 'VILLAGE_SEES_GALD_WORK', 'GALD_REDEMPTION_PROCESS'],
    chainCode: 'GARDO_BAKERY_BLOOM',
    links: [{ kind: 'BLOOMED', from: ['GALD'], to: 'BAKERY_OWNER' }],
  },
  LINA_WRITES_TO_ELNA: {
    type: 'LINA_WRITES_TO_ELNA',
    level: 'RELATIONSHIP',
    playerObserved: false,
    decidedBy: 'LINA',
    newSeeds: ['ELNA_MEETS_LINA'],
    chainCode: 'LINA_WROTE_TO_ELNA',
    links: [{ kind: 'HELPED', from: ['LINA'], to: 'ELNA' }],
  },
};

/** One step of the chain as it happened in this world, for whoever asks later. */
export interface CausalStep {
  type: OffScreenLifeEventType;
  chainCode: string;
  worldYear: number;
  worldDay: number;
  /** The fact it followed from (the event's own causedBy). */
  causedBy: readonly string[];
  links: readonly CausalLink[];
}

/**
 * THE CHAIN AS THIS WORLD LIVED IT — or, given a preview, as it would.
 * In the order it happened (the day, then the order the route is written
 * in); events that are not off-screen lives are skipped.
 */
export function causalChainOf(events: readonly MemoryEvent[]): CausalStep[] {
  const order = new Map(OFF_SCREEN_LIFE_DEFS.map((def, i) => [def.type as string, i]));
  return events
    .filter((e) => order.has(e.type))
    .sort(
      (a, b) =>
        a.worldYear - b.worldYear ||
        a.worldDay - b.worldDay ||
        order.get(a.type)! - order.get(b.type)!,
    )
    .map((e) => {
      const info = OFF_SCREEN_EVENT_INFO[e.type as OffScreenLifeEventType];
      return {
        type: info.type,
        chainCode: info.chainCode,
        worldYear: e.worldYear,
        worldDay: e.worldDay,
        causedBy: e.causedBy ?? [],
        links: info.links,
      };
    });
}

/** Every link this world holds, e.g. `linksOf(events, 'GAVE_OPPORTUNITY')`. */
export function linksOf(events: readonly MemoryEvent[], kind?: CausalLinkKind): CausalLink[] {
  return causalChainOf(events)
    .flatMap((step) => step.links)
    .filter((link) => !kind || link.kind === kind);
}

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

/**
 * WHAT KAOS SHOWS OF IT — the TIME SHIFT, once, after the four answers
 * (TIGS2027 STEP ①; there is no other way to see it, and no button).
 *
 * The three years of this route are one picture and the words 「3年後」 —
 * no list of what happened, no timeline, no reasons: the player saw a
 * wounded bandit in the forest a minute ago, and sees him here. What
 * happened in between is for them to feel, and to hear of later, in the
 * present, from リナ, the baker, リゼル and the village (OFF_SCREEN_FACTS).
 *
 * The picture is the existing bakery CG (the same one the SPARE answer's
 * bakery shows) — 仮, until the author says this route has its own (要判断).
 * Shown when the look ahead contains `shows`; `log: false` keeps the
 * screen to the picture and her one line.
 */
export interface OffScreenVision {
  shows: OffScreenLifeEventType;
  eventCg: EventCgKey;
  eventCgAlt: string;
  log: false;
}

export const OFF_SCREEN_VISIONS: readonly OffScreenVision[] = [
  {
    shows: 'GALD_TAKES_BAKERY_WORK',
    eventCg: 'GALD_BAKER',
    eventCgAlt: '粉まみれの前掛けで生地をこねる男',
    log: false,
  },
];
