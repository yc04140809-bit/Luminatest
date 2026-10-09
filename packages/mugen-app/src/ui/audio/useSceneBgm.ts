// THE ONE PLACE A SCREEN CHANGE BECOMES A MUSIC CHANGE — IN THE APP.
//
// No screen calls `playBgm`. Screens say where the player is; the map
// in content/audio/sceneBgm (shared with the Artifact) says what that
// sounds like; and this hook is the single wire between the two. One
// caller means "what is playing" has one answer and "why did it
// change" has one place to look.
//
// The effect depends on the ANSWER, not on the cue: a screen that
// re-renders while the player walks the forest asks for
// 'GREENWOOD_FOREST' every time and the effect does not run again.
// `playBgm` refuses a repeat as well — two independent reasons the
// music never restarts under a player's feet, and never doubles up.

import { useEffect } from 'react';
import { audioManager } from '../../platform/audio';
import { bgmForScene, type SceneCue } from '@mugen/content/audio/sceneBgm';
import type { BgmId } from '@mugen/assets';

/**
 * Plays what the scene asks for, and says what that is (for the MUSIC
 * ARCHIVE, which keeps what has been heard). `chosen` is a piece picked
 * from the bard's archive in the tavern: it plays in place of the room's
 * own until it is cleared (酒場ハブ化 Phase 1).
 */
export function useSceneBgm(cue: SceneCue, hush = false, chosen: BgmId | null = null): BgmId | null {
  // HUSHED: the music let down for a moment the scene holds its breath in
  // (the way in to セキリュウガ), whatever the place would play.
  const want = hush ? null : (chosen ?? bgmForScene(cue));

  // A phone makes no sound until the person has touched it, and the
  // touch that counts is ANY touch. Whatever the game has asked for by
  // then begins on that touch.
  useEffect(() => {
    audioManager.listenForFirstGesture();
  }, []);

  useEffect(() => {
    if (want === null) {
      if (hush) audioManager.fadeOutBgm();
      else audioManager.stopBgm();
      return;
    }
    audioManager.playBgm(want);
  }, [want, hush]);

  return want;
}
