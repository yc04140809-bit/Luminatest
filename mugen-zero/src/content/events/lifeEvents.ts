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

export const LIFE_EVENT_DEFS: readonly LifeEventDef[] = [GALD_LEAVES_BANDITS_DEF];
