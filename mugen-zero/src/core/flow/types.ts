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
  | 'CREATURE_LIFE_CHOICE'
  | 'CHOICE_RESULT'
  | 'WORLD_MEMORY'
  | 'TIME_SHIFT'
  | 'FUTURE_SITE'
  | 'TALK_SPOT'
  | 'ARCHIVE'
  /** ARCANA 図鑑: what the player has come to know about the world. */
  | 'ARCANA'
  | 'SETTINGS'
  | 'ENDING'
  | 'PLAYTEST_SURVEY'
  | 'DEV_LOCK'
  | 'DEV_ADMIN'
  /** Dev only: the battle UI prototype, looked at on its own. */
  | 'BATTLE_UI_PROTOTYPE';

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
