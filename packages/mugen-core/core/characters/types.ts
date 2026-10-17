// MUGEN CORE — CHARACTER STATE types.
//
// CHARACTER_STATE holds only the CURRENT state of a character.
// Past facts (what happened, and why) live in WORLD MEMORY as
// MEMORY_EVENTs and are never folded back into this structure.
// State mutation driven by events (e.g. GALD_LEAVES_BANDITS) begins
// in Phase C with the EVENT ENGINE.

export type LifePhase = 'CHILD' | 'YOUNG_ADULT' | 'ADULT' | 'ELDER';

export interface CharacterState {
  id: string;
  name: string;
  /**
   * Years old, or null where the world has not decided yet.
   *
   * Null is a STATEMENT, not a gap to be filled in by whoever touches
   * this next: it means the author has deliberately not set an age, and
   * anything that reads it has to cope rather than guess. It exists
   * because the alternative — putting a plausible-looking number in so
   * the type is satisfied — writes canon by accident, and a number
   * nobody decided is indistinguishable from one somebody did a week
   * later.
   *
   * Everything that ages a character must leave null alone; a null that
   * quietly becomes `null + 3` is exactly the invented canon this is
   * here to prevent.
   */
  age: number | null;
  alive: boolean;
  location: string;
  occupation: string;
  lifePhase: LifePhase;
  spouseId: string | null;
  /**
   * Their children, by id. The one direction family is stored in.
   *
   * A parent lists their children; nobody lists their parents. Reading
   * it the other way round is a scan of this record, which is cheap at
   * the size a village is and keeps one fact in one place.
   */
  childrenIds: string[];
}
