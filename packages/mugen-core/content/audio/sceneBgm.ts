// WHAT IS PLAYING, AND WHY.
//
// One function, no React, no Audio, no side effects: given where the
// player is, which of the six pieces belongs there. It is a decision
// about the GAME — that the tavern sounds different from the street
// outside it, that a fight is a fight whoever it is against — and
// decisions about the game live in content, where they can be read and
// argued with, rather than scattered through the screens as
// `playBgm(...)` calls nobody can enumerate.
//
// A screen never says what to play. It says where the player is, and
// this says what that sounds like.

import type { Screen } from '../../core/flow/types';
import type { LocationId } from '../locations/locationVisuals';
import type { BgmId } from '@mugen/assets';
import { DEFAULT_BATTLE_BGM, isBattleBgm } from './battleBgm';

/**
 * Where the player is, in the only three terms the music cares about.
 */
export interface SceneCue {
  /** Which screen is up. */
  screen: Screen;
  /**
   * The place the screen is about, where it is about a place.
   *
   * The tavern and the street outside it are the same SCREEN — a talk
   * spot — and they are not the same room, so the screen alone cannot
   * answer this.
   */
  locationId: LocationId | null;
  /**
   * Whether Kaos is the one talking.
   *
   * The prologue is two scenes wearing one screen: a man alone with his
   * thoughts, and then her. Only the second is her event.
   */
  kaosSpeaking?: boolean;
  /**
   * Which fighting piece the player has chosen.
   *
   * Passed in rather than read, because this function must stay a
   * function: the choice lives in localStorage and is the caller's to
   * fetch. Absent means the default, which is what a save with no
   * choice in it and a first-ever fight both amount to.
   */
  battleBgmId?: BgmId | null;
}

/** The places that are the greenwood rather than Alden. */
const IN_THE_FOREST = new Set<LocationId>([
  'GREENWOOD_FOREST',
  'GREENWOOD_WAYSTATION',
  'GREENWOOD_GRAVE',
]);

/**
 * The piece of music this moment belongs to, or null for silence.
 *
 * Null is a real answer and not a gap: the developer screens are not
 * part of the game and scoring them would mean the music changed
 * because somebody opened a debug panel.
 */
export function bgmForScene(cue: SceneCue): BgmId | null {
  const { screen, locationId } = cue;
  switch (screen) {
    /**
     * BEFORE THE TITLE, and silent until the player says otherwise.
     *
     * The whole point of the screen is that nothing has sounded yet:
     * it is the first thing anybody touches, and what they touch is a
     * choice about whether to hear the song at all. Answering 「聴く」
     * is what starts it.
     */
    case 'THEME_CHOICE':
      return null;

    /**
     * THE TITLE IS THE VILLAGE'S PIECE, PLAYED EARLY.
     *
     * It was silent, and the reasoning was sound as far as it went:
     * the theme used to be the title's room tone, there is now a
     * screen before the title whose whole subject is that song, and
     * by the time anybody arrives here they have either just heard it
     * or said they would rather not. Starting the theme again
     * underneath them ignores both answers, and 「スキップ」 most of
     * all — which is why it is still not the theme that plays here.
     *
     * What the reasoning missed is that a player who has just sat
     * through three and a half minutes of song, or skipped past it,
     * does not arrive wanting SILENCE. They arrive wanting the game.
     * Reported from a phone: the title was the only screen in the
     * whole build with nothing playing, and it read as the sound
     * having broken.
     *
     * So the village's own piece starts here, one screen early. It is
     * quiet, it is not the theme, and it is what HOME is about to play
     * anyway — so pressing はじめる changes the music no more than
     * opening the bag does.
     */
    case 'TITLE':
      return 'ALDEN_HOME';
    case 'PROLOGUE':
      return cue.kaosSpeaking ? 'KAOS_EVENT' : 'OPENING';

    // HER. The four answers are the same kind of moment as the scene
    // she arrives in: somebody's life being talked about rather than a
    // fight or a village going about its day.
    case 'LIFE_CHOICE':
    case 'CREATURE_LIFE_CHOICE':
    case 'CHOICE_RESULT':
      return 'KAOS_EVENT';

    // A FIGHT IS A FIGHT. The story's own and the forest's alike — one
    // screen, one piece, and the prototype door into it as well so that
    // what a developer hears is what a player hears.
    case 'BATTLE':
    case 'BATTLE_UI_PROTOTYPE':
    // AND THE SCREEN THAT COUNTS UP WHAT IT WAS WORTH. The same piece,
    // still playing: the fight's music carries over its own winnings
    // rather than cutting to silence for a moment and then to the
    // forest. A fanfare of its own would be a new recording, and there
    // is not one — so the honest answer is "the fight is not over
    // yet", which is also how it feels.
    case 'BATTLE_RESULT':
      // Whichever piece the ♪ control is on. One is registered today,
      // so this is 'NORMAL_BATTLE' every time; the day a second joins
      // the list, this line already does the right thing.
      return isBattleBgm(cue.battleBgmId) ? cue.battleBgmId : DEFAULT_BATTLE_BGM;

    // THE FOREST, walked — and the man standing in the road is still
    // the forest until the first blow.
    case 'GREENWOOD':
    case 'ENCOUNTER':
      return 'GREENWOOD_FOREST';

    // A PLACE. Which place decides, because 月光亭 is not the street.
    case 'TALK_SPOT':
    case 'FUTURE_SITE':
      if (locationId === 'MOONLIGHT_TAVERN') return 'TAVERN';
      return locationId && IN_THE_FOREST.has(locationId) ? 'GREENWOOD_FOREST' : 'ALDEN_VILLAGE';

    /**
     * STANDING IN ALDEN, and every page read from there.
     *
     * The village screen has a piece of its own now. What made that
     * worth a second recording is that HOME is not somewhere the
     * player passes through: it is where they are between one thing
     * and the next, reading the clock, the party, the bag, the book.
     *
     * AND EVERY ONE OF THOSE PAGES IS THE SAME PIECE, which is the
     * point rather than an economy. Opening the bag is not going
     * anywhere, so the music must not notice: one id across the whole
     * group means `playBgm` is handed what is already playing and
     * refuses it, and nothing stops, restarts or crossfades because a
     * thumb opened a menu.
     */
    case 'HOME':
    case 'WORLD_NEWS':
    case 'WORLD_MEMORY':
    case 'ARCHIVE':
    case 'ARCANA':
    case 'STATUS':
    // The bag is a pocket of the village, the same as the book is.
    case 'BAG':
    case 'SETTINGS':
      return 'ALDEN_HOME';

    /**
     * ALDEN AS A PLACE TO WALK, which is a different thing.
     *
     * 探索する is going somewhere — the map of the region, and the shop
     * that opens off its square — so it keeps the village's walking
     * music and the change of piece is the change of activity.
     *
     * TIME_SHIFT stays here deliberately. In the Artifact it is the
     * developer's year-skipper, which is not a room in the village and
     * should not sound like one; in the App it is Kaos's one look
     * ahead. Neither wants the home piece starting under it.
     */
    case 'EXPLORE':
    case 'ITEM_SHOP':
    case 'TIME_SHIFT':
      return 'ALDEN_VILLAGE';

    // NOT THE GAME. The ending has no piece of its own yet and the
    // developer screens must never have one: music that changed
    // because somebody opened a debug panel would be telling the
    // player something about a place they are not in.
    case 'ENDING':
    case 'PLAYTEST_SURVEY':
    case 'DEV_LOCK':
    case 'DEV_ADMIN':
    case 'CINEMATIC_PREVIEW':
      return null;
  }
}
