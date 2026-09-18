// LINA — content data only, and only what the author actually decided.
//
// WHERE THIS CAME FROM, AND WHERE IT DID NOT. A reference sheet was
// delivered with her artwork and it is a VISUAL reference: hair, ribbon,
// flower, apron, silhouette, palette. The sentences printed on it —
// an age, a favourite thing, a dream about becoming a baker like her
// father — were written by the image generator and are NOT canon. Only
// the direction sheet is, and this file holds exactly that.
//
// The distinction matters most on the one line the sheet was loudest
// about. She is fourteen and she helps at her father's bakery. That is
// what she DOES; it is not what she is going to be. Her future is the
// WORLD LIFE ENGINE's to grow — she may stay, leave, learn magic, take
// up another trade, or come back to the ovens — and writing 'BAKER'
// anywhere near her today would settle it years early.

import type { CharacterState } from '../../core/characters/types';

export const LINA = {
  id: 'LINA',
  name: 'リナ',
} as const;

/** Where she lives, and which region's roster she belongs to. */
export const LINA_REGION = 'ALDEN';

/**
 * WHAT SHE IS DOING AT FOURTEEN, and nothing about what comes after.
 *
 * `occupation` is a CURRENT-state field — Gald's has already been
 * 'BANDIT', 'NONE' and 'ROADSIDE_HEALER' in one save — so putting
 * 'BAKERY_HELPER' here says she is helping at the bakery this morning,
 * in the same tense as his says he is on a road. It carries no claim
 * about the woman she becomes, which is the whole point of it being
 * current state rather than a class.
 */
export const BAKERY_HELPER = 'BAKERY_HELPER';

/**
 * Lina's CURRENT state at world start.
 *
 * Past facts never live here — those are WORLD MEMORY. This is only
 * what is true of her on the first morning.
 */
export const INITIAL_LINA_STATE: CharacterState = {
  id: 'LINA',
  name: 'リナ',
  age: 14,
  alive: true,
  location: 'ALDEN_VILLAGE',
  occupation: BAKERY_HELPER,
  // Fourteen. 'CHILD' is the existing phase below adulthood and she is
  // not an adult; the enum has no adolescent of its own, and inventing
  // one to describe one character would be a change to the world's
  // vocabulary rather than an entry in it.
  lifePhase: 'CHILD',
  spouseId: null,
  childrenIds: [],
};
