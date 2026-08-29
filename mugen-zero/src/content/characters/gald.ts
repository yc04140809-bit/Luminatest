// Gald — content data only. STORY DNA wiring lands in Phase C+.

import type { CharacterState } from '../../core/characters/types';

export const GALD = {
  id: 'GALD',
  /** The player has not learned his name yet at first encounter. */
  unknownName: '盗賊',
  name: 'ガルド',
} as const;

/**
 * Gald's CURRENT state at world start. Past facts never live here —
 * they belong to WORLD MEMORY. Mutation begins with the Phase C
 * event engine; until then this is static initial data.
 */
export const INITIAL_GALD_STATE: CharacterState = {
  id: 'GALD',
  name: 'ガルド',
  age: 27,
  alive: true,
  location: 'GREENWOOD_FOREST',
  occupation: 'BANDIT',
  lifePhase: 'YOUNG_ADULT',
  spouseId: null,
  childrenIds: [],
};
