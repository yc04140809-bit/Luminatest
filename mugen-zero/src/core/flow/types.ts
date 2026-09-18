// MUGEN CORE — game flow types.
// This module must stay free of React / Phaser imports.

export type Screen =
  /**
   * Before the title: the song, or straight on.
   *
   * The first screen anybody sees, and the first thing anybody TOUCHES
   * — which is the other half of what it is for. A phone makes no
   * sound until the player has done something, and this is a screen
   * whose whole content is a thing to do.
   */
  | 'THEME_CHOICE'
  | 'TITLE'
  | 'PROLOGUE'
  | 'HOME'
  | 'EXPLORE'
  | 'GREENWOOD'
  | 'ENCOUNTER'
  | 'BATTLE'
  /**
   * What the fight was worth — experience, LUMI, what was picked up.
   *
   * A SCREEN OF ITS OWN rather than a panel over the battlefield, and
   * that is what makes the reward safe: the fight is over, the forest
   * is not back yet, and nothing the player taps can reach either of
   * them until they close it.
   */
  | 'BATTLE_RESULT'
  | 'LIFE_CHOICE'
  | 'CREATURE_LIFE_CHOICE'
  | 'CHOICE_RESULT'
  | 'WORLD_MEMORY'
  /** 村のうわさ: what the village is saying today. */
  | 'WORLD_NEWS'
  | 'TIME_SHIFT'
  | 'FUTURE_SITE'
  | 'TALK_SPOT'
  /** アルデン道具屋: the one door in the village that takes LUMI. */
  | 'ITEM_SHOP'
  | 'ARCHIVE'
  /** ARCANA 図鑑: what the player has come to know about the world. */
  | 'ARCANA'
  | 'SETTINGS'
  | 'ENDING'
  | 'PLAYTEST_SURVEY'
  | 'DEV_LOCK'
  | 'DEV_ADMIN'
  | 'CINEMATIC_PREVIEW'
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
