// Content data: life event definitions for the EVENT ENGINE.
//
// One causal chain per life choice. The four chains can never mix: each
// is rooted in one of the four mutually exclusive first-encounter
// outcomes, and the store allows only one of those per world.
//
//   SPARE   let go        -> leaves the bandits -> Alden -> bakery
//   HELP    treated       -> takes to the road  -> roadside healer
//   CAPTURE handed over   -> trial -> sentence served -> works for Alden
//   KILL    ended         -> buried at the forest edge -> the grave is tended
//
// KILL is a route like any other. A man whose life stopped leaves no new
// CHARACTER_STATE — but the world he was in keeps going, and that is what
// its two events record.

import type { LifeEventDef } from '../../core/events/types';

/**
 * PLAYER_SPARED_GALD + at least 3 days elapsed since the sparing
 * → Gald walks away from the bandits.
 * Never fires on the KILL / HELP / CAPTURE routes.
 */
export const GALD_LEAVES_BANDITS_DEF: LifeEventDef = {
  type: 'GALD_LEAVES_BANDITS',
  eventId: 'evt_gald_leaves_bandits',
  requiredMemory: 'PLAYER_SPARED_GALD',
  minElapsedDays: 3,
  once: true,
  location: 'GREENWOOD_FOREST',
  actors: ['GALD'],
  importance: 'MAJOR',
  characterEffects: [
    {
      characterId: 'GALD',
      // Current state only — the past (that he WAS a bandit, and why he
      // left) stays in WORLD MEMORY as events.
      changes: { occupation: 'NONE', location: 'UNKNOWN' },
    },
  ],
};

/**
 * A month of wandering after leaving the bandits, then Gald drifts into
 * Alden. His current location becomes the village; his occupation is
 * still nothing.
 */
export const GALD_ARRIVES_IN_ALDEN_DEF: LifeEventDef = {
  type: 'GALD_ARRIVES_IN_ALDEN',
  eventId: 'evt_gald_arrives_in_alden',
  requiredMemory: 'GALD_LEAVES_BANDITS',
  minElapsedDays: 30,
  once: true,
  location: 'ALDEN_VILLAGE',
  actors: ['GALD'],
  importance: 'MAJOR',
  characterEffects: [
    { characterId: 'GALD', changes: { location: 'ALDEN_VILLAGE' } },
  ],
};

/**
 * Two months of odd jobs later, the old empty shop smells of bread.
 * Chained strictly off past facts — never off `worldYear >= N`.
 */
export const GALD_BECOMES_BAKER_DEF: LifeEventDef = {
  type: 'GALD_BECOMES_BAKER',
  eventId: 'evt_gald_becomes_baker',
  requiredMemory: 'GALD_ARRIVES_IN_ALDEN',
  minElapsedDays: 60,
  once: true,
  location: 'ALDEN_VILLAGE',
  actors: ['GALD'],
  importance: 'MAJOR',
  characterEffects: [
    { characterId: 'GALD', changes: { occupation: 'BAKER', location: 'ALDEN_VILLAGE' } },
  ],
};

// ---- HELP ---------------------------------------------------------------

/**
 * Treated by the person he tried to rob, Gald leaves the forest — not as
 * a man let go, but as a man who owes something he cannot name.
 */
export const GALD_WALKS_THE_ROAD_DEF: LifeEventDef = {
  type: 'GALD_WALKS_THE_ROAD',
  eventId: 'evt_gald_walks_the_road',
  requiredMemory: 'PLAYER_HELPED_GALD',
  minElapsedDays: 3,
  once: true,
  location: 'GREENWOOD_FOREST',
  actors: ['GALD'],
  importance: 'MAJOR',
  characterEffects: [
    { characterId: 'GALD', changes: { occupation: 'NONE', location: 'UNKNOWN' } },
  ],
};

/** Four months on the road later, he is the one doing the binding up. */
export const GALD_BECOMES_HEALER_DEF: LifeEventDef = {
  type: 'GALD_BECOMES_HEALER',
  eventId: 'evt_gald_becomes_healer',
  requiredMemory: 'GALD_WALKS_THE_ROAD',
  minElapsedDays: 120,
  once: true,
  location: 'GREENWOOD_WAYSTATION',
  actors: ['GALD'],
  importance: 'MAJOR',
  characterEffects: [
    {
      characterId: 'GALD',
      changes: { occupation: 'ROADSIDE_HEALER', location: 'GREENWOOD_WAYSTATION' },
    },
  ],
};

// ---- CAPTURE ------------------------------------------------------------

/** Handed to the guards, he is tried in Alden two weeks later. */
export const GALD_STANDS_TRIAL_DEF: LifeEventDef = {
  type: 'GALD_STANDS_TRIAL',
  eventId: 'evt_gald_stands_trial',
  requiredMemory: 'PLAYER_CAPTURED_GALD',
  minElapsedDays: 14,
  once: true,
  location: 'ALDEN_VILLAGE',
  actors: ['GALD'],
  importance: 'MAJOR',
  characterEffects: [
    { characterId: 'GALD', changes: { occupation: 'PRISONER', location: 'ALDEN_VILLAGE' } },
  ],
};

/** Nearly two years of labour later, the sentence is finished. */
export const GALD_COMPLETES_SENTENCE_DEF: LifeEventDef = {
  type: 'GALD_COMPLETES_SENTENCE',
  eventId: 'evt_gald_completes_sentence',
  requiredMemory: 'GALD_STANDS_TRIAL',
  minElapsedDays: 700,
  once: true,
  location: 'ALDEN_VILLAGE',
  actors: ['GALD'],
  importance: 'MAJOR',
  characterEffects: [{ characterId: 'GALD', changes: { occupation: 'NONE' } }],
};

/** A free man, and still in Alden: the roads need rebuilding. */
export const GALD_WORKS_FOR_ALDEN_DEF: LifeEventDef = {
  type: 'GALD_WORKS_FOR_ALDEN',
  eventId: 'evt_gald_works_for_alden',
  requiredMemory: 'GALD_COMPLETES_SENTENCE',
  minElapsedDays: 30,
  once: true,
  location: 'ALDEN_WORKYARD',
  actors: ['GALD'],
  importance: 'MAJOR',
  characterEffects: [
    { characterId: 'GALD', changes: { occupation: 'WORKER', location: 'ALDEN_WORKYARD' } },
  ],
};

// ---- KILL ---------------------------------------------------------------

/**
 * His life ended in the forest. A month later someone passing through
 * builds a cairn over him.
 *
 * No characterEffects, deliberately: PLAYER_KILLED_GALD already made him
 * not alive, and nothing that happens afterwards is HIS state any more.
 * These are facts about the world he left behind.
 */
export const GALD_IS_BURIED_DEF: LifeEventDef = {
  type: 'GALD_IS_BURIED',
  eventId: 'evt_gald_is_buried',
  requiredMemory: 'PLAYER_KILLED_GALD',
  minElapsedDays: 30,
  once: true,
  location: 'GREENWOOD_FOREST',
  actors: ['GALD'],
  importance: 'MAJOR',
  characterEffects: [],
};

/** Ten months later the stones are still there — and so are the flowers. */
export const GALD_GRAVE_TENDED_DEF: LifeEventDef = {
  type: 'GALD_GRAVE_TENDED',
  eventId: 'evt_gald_grave_tended',
  requiredMemory: 'GALD_IS_BURIED',
  minElapsedDays: 300,
  once: true,
  location: 'GREENWOOD_GRAVE',
  actors: ['GALD'],
  importance: 'NORMAL',
  characterEffects: [],
};

export const LIFE_EVENT_DEFS: readonly LifeEventDef[] = [
  GALD_LEAVES_BANDITS_DEF,
  GALD_ARRIVES_IN_ALDEN_DEF,
  GALD_BECOMES_BAKER_DEF,
  GALD_WALKS_THE_ROAD_DEF,
  GALD_BECOMES_HEALER_DEF,
  GALD_STANDS_TRIAL_DEF,
  GALD_COMPLETES_SENTENCE_DEF,
  GALD_WORKS_FOR_ALDEN_DEF,
  GALD_IS_BURIED_DEF,
  GALD_GRAVE_TENDED_DEF,
];
