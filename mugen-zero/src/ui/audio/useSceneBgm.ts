// THE ONE PLACE A SCREEN CHANGE BECOMES A MUSIC CHANGE.
//
// No screen calls `playBgm`. Screens say where the player is; the map
// in content/audio/sceneBgm says what that sounds like; and this hook
// is the single wire between the two. That is deliberate and it is the
// whole reason the music can be reasoned about: there is exactly one
// caller, so "what is playing right now" has one answer and "why did
// it change" has one place to look.
//
// The effect depends on the ANSWER, not on the cue — so a screen that
// re-renders while the player walks through the forest asks for
// 'GREENWOOD_FOREST' every time and the effect does not run again.
// `playBgm` refuses a repeat as well, so there are two independent
// reasons the forest never restarts under a player's feet.

import { useEffect } from 'react';
import { audioManager } from '../../platform/audio';
import { bgmForScene, type SceneCue } from '../../content/audio/sceneBgm';

export function useSceneBgm(cue: SceneCue): void {
  const want = bgmForScene(cue);

  // Once, at the top of the app: a phone makes no sound until the
  // person has touched it, and the touch that counts is any touch
  // rather than the particular button whose handler remembered to say
  // so. Whatever the game has asked for by then begins on that touch.
  useEffect(() => {
    audioManager.listenForFirstGesture();
  }, []);

  useEffect(() => {
    if (want === null) {
      // A screen the music has nothing to say about — the developer
      // panels. Silence, and the last room does not follow the player
      // into it.
      audioManager.stopBgm();
      return;
    }
    audioManager.playBgm(want);
  }, [want]);
}
