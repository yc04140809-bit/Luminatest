// WHAT THE ANDROID BACK BUTTON MEANS, SCREEN BY SCREEN.
//
// The table and nothing else: no Capacitor, no React, no listener.
// That is the point — the decision about which screens may be backed
// out of is a design record, and a design record should be readable and
// testable without an Android shell to run it in. The wiring that reads
// it lives next door in `androidBack.ts`.

import type { Screen } from '@mugen/core/flow/types';

/**
 * What a back press does on a given screen.
 *
 * A `Screen` is "go there, the way the screen's own もどる does".
 * `'EXIT'` asks whether to leave the game. `null` is the important
 * one: it means the press is SWALLOWED, because there is nothing
 * behind this screen that going back to would leave the world in one
 * piece.
 */
export type BackAction = Screen | 'EXIT' | null;

/**
 * WRITTEN OUT IN FULL, deliberately.
 *
 * A `Record<Screen, …>` rather than a partial one, so that adding a
 * screen to the game does not silently add a screen where the back
 * button does something nobody decided. The compiler asks the question
 * at the moment the screen is invented, which is the only moment the
 * answer is cheap.
 */
const BACK: Record<Screen, BackAction> = {
  // --- Ways INTO a world, not places in one --------------------------
  // The song is a question asked once, before the game exists. The
  // title is the one place leaving is a reasonable thing to want.
  THEME_CHOICE: null,
  TITLE: 'EXIT',
  // The opening is a scene. Backing out of it would leave a world
  // half-born, and there is no screen behind it to be at.
  PROLOGUE: null,
  // The village is where the game lives. There is nothing behind it —
  // going "back" from home would mean leaving the game, and that offer
  // belongs on the title screen where a player is expecting it.
  HOME: null,

  // --- Places: a back press is the way out, same as the button -------
  EXPLORE: 'HOME',
  GREENWOOD: 'EXPLORE',
  ITEM_SHOP: 'EXPLORE',

  // --- Things you open, read, and close ------------------------------
  WORLD_MEMORY: 'HOME',
  WORLD_NEWS: 'HOME',
  ARCHIVE: 'HOME',
  ARCANA: 'HOME',
  STATUS: 'HOME',
  BAG: 'HOME',
  SETTINGS: 'HOME',

  // --- Scenes that WRITE something ------------------------------------
  // A conversation and a reunion both record that they were had. Left
  // by the back button they would be left halfway, and the record is
  // the whole point of walking in: a discovery half-made is a chapter
  // the archive never gets. The screens' own 「もどる」 is on screen
  // throughout, so nobody is trapped — they are only asked to use it.
  TALK_SPOT: null,
  FUTURE_SITE: null,

  // --- A fight, and the answer at the end of it -----------------------
  // Nothing here may be backed out of. The four answers are the one
  // decision MUGEN ZERO does not let anybody take again, and a back
  // button that walked out of the result screen would be a way to try
  // the question twice. The fight itself is mid-turn state that exists
  // nowhere but on the screen.
  ENCOUNTER: null,
  BATTLE: null,
  BATTLE_RESULT: null,
  CREATURE_LIFE_CHOICE: null,
  LIFE_CHOICE: null,
  CHOICE_RESULT: null,

  // --- The end of the playtest ----------------------------------------
  ENDING: null,
  PLAYTEST_SURVEY: null,

  // --- The developer's rooms ------------------------------------------
  DEV_LOCK: 'HOME',
  DEV_ADMIN: 'HOME',
  CINEMATIC_PREVIEW: 'DEV_ADMIN',
  BATTLE_UI_PROTOTYPE: 'DEV_ADMIN',
  // The dev TIME SHIFT spends three years of world time when it is
  // confirmed, and the confirmation is a commit in flight. A back press
  // during it is swallowed; 「まだ残る」 is on screen and does the
  // cancelling, which is a decision rather than a reflex.
  TIME_SHIFT: null,
};

/** What the back button means on this screen. */
export function backTargetFor(screen: Screen): BackAction {
  return BACK[screen];
}
