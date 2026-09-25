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

export function useSceneBgm(cue: SceneCue): void {
  const want = bgmForScene(cue);

  // A phone makes no sound until the person has touched it, and the
  // touch that counts is ANY touch. Whatever the game has asked for by
  // then begins on that touch.
  useEffect(() => {
    audioManager.listenForFirstGesture();
  }, []);

  useEffect(() => {
    if (want === null) {
      audioManager.stopBgm();
      return;
    }
    audioManager.playBgm(want);
  }, [want]);
}
