// パン屋の主人 — Lina's father. Content data only.
//
// As with Lina, the reference sheet delivered with his artwork is a
// VISUAL reference — face, beard, build, white shirt, brown waistcoat,
// red scarf, apron, boots — and the sentences printed on it are the
// image generator's, not canon.
//
// HIS AGE IS NOT DECIDED, and this file does not decide it. He is drawn
// as a man somewhere in middle age, which is exactly the kind of guess
// that becomes permanent the moment it is written down: a number read
// off a drawing is indistinguishable, a month later, from a number an
// author chose. `age: null` is the honest record of that, and
// `CharacterState.age` was widened to allow it rather than the number
// being made up to satisfy a type.

import type { CharacterState } from '../../core/characters/types';

export const BAKERY_OWNER = {
  id: 'BAKERY_OWNER',
  name: 'パン屋の主人',
} as const;

export const BAKERY_OWNER_REGION = 'ALDEN';

/** He runs the bakery. Unlike his daughter's, this is his trade. */
export const BAKERY_OWNER_OCCUPATION = 'BAKERY_OWNER';

/**
 * His CURRENT state at world start.
 *
 * `childrenIds: ['LINA']` is the whole of the family record, and it is
 * stored on him rather than on her because that is the direction
 * `CharacterState` already had. Nothing new was invented to hold it.
 */
export const INITIAL_BAKERY_OWNER_STATE: CharacterState = {
  id: 'BAKERY_OWNER',
  name: 'パン屋の主人',
  // REQUIRED_CANON_DECISION — see the note at the top of this file.
  age: null,
  alive: true,
  location: 'ALDEN_VILLAGE',
  occupation: BAKERY_OWNER_OCCUPATION,
  // Undecided along with his age: the existing phases are CHILD,
  // YOUNG_ADULT, ADULT and ELDER, and which of the last two he is in is
  // the same guess from the same drawing. 'ADULT' is the one that is
  // true of every one of them that is not a child or elderly, so it is
  // the weakest claim available rather than a reading of his face.
  lifePhase: 'ADULT',
  spouseId: null,
  childrenIds: ['LINA'],
};
