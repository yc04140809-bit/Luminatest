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
import type { BgmId } from '../../assets/manifest';

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
    // THE WAY IN. The title and the monologue under it are one
    // continuous opening; her arrival at the end of it is not.
    case 'TITLE':
      return 'OPENING';
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
      return 'NORMAL_BATTLE';

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

    // ALDEN, and every room the player reads in. These are all doors
    // off the same village square — the memory book, the archive, the
    // settings — and a player who opens one has not gone anywhere.
    case 'HOME':
    case 'EXPLORE':
    case 'WORLD_NEWS':
    case 'WORLD_MEMORY':
    case 'TIME_SHIFT':
    case 'ARCHIVE':
    case 'ARCANA':
    case 'SETTINGS':
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
