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
  | 'CHOICE_RESULT'
  | 'WORLD_MEMORY'
  | 'TIME_SHIFT'
  | 'BAKERY'
  | 'ARCHIVE'
  | 'SETTINGS'
  | 'ENDING'
  | 'PLAYTEST_SURVEY'
  | 'DEV_LOCK'
  | 'DEV_ADMIN';

export type LifeChoiceId = 'KILL' | 'SPARE' | 'HELP' | 'CAPTURE';

export interface FlowState {
  screen: Screen;
  /**
   * The choice made this session, for the aftermath screen.
   * The persisted world truth lives in WORLD MEMORY (IndexedDB),
   * which is the single source of history — not this field.
   */
  galdLifeChoice: LifeChoiceId | null;
}
