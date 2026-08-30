// Content data: life event definitions for the EVENT ENGINE.
// Phase C ships exactly one — the SPARE route's first consequence.

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

export const LIFE_EVENT_DEFS: readonly LifeEventDef[] = [
  GALD_LEAVES_BANDITS_DEF,
  GALD_ARRIVES_IN_ALDEN_DEF,
  GALD_BECOMES_BAKER_DEF,
];
