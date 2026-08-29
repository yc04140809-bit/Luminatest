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
  age: number;
  alive: boolean;
  location: string;
  occupation: string;
  lifePhase: LifePhase;
  spouseId: string | null;
  childrenIds: string[];
}
