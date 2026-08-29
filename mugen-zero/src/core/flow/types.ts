// MUGEN CORE — game flow types.
// This module must stay free of React / Phaser imports.

export type Screen =
  | 'TITLE'
  | 'PROLOGUE'
  | 'HOME'
  | 'EXPLORE'
  | 'GREENWOOD'
  | 'ENCOUNTER'
  | 'BATTLE'
  | 'LIFE_CHOICE'
  | 'CHOICE_RESULT';

export type LifeChoiceId = 'KILL' | 'SPARE' | 'HELP' | 'CAPTURE';

export interface FlowState {
  screen: Screen;
  /**
   * Phase A: the Gald life choice is held in memory only.
   * Phase B will persist it into WORLD MEMORY (IndexedDB).
   */
  galdLifeChoice: LifeChoiceId | null;
}
