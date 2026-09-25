// WHICH FIGHTING PIECE THE PLAYER LAST CHOSE — THE APP'S COPY.
//
// The same rule as the Artifact's platform/battleBgmChoice.ts: a
// preference, so localStorage and never the world. What a player LIKES
// to fight to is theirs; what they have WON the right to fight to is
// the save's (`World.getUnlockedBattleBgm`), and the two are only ever
// combined at the moment a fight asks what to play, by `battleBgmFor`
// in core — which refuses a choice this save has not unlocked. So a
// preference left behind by one save can never play a piece in another
// that has not earned it.

import { DEFAULT_BATTLE_BGM, isBattleBgm, type BattleBgmId } from '@mugen/content/audio/battleBgm';

const KEY = 'mugen-battle-bgm';

/**
 * The stored choice, or the default.
 *
 * A stored id that is no longer registered is not an error and not
 * silence: it is the default, which can always be played.
 */
export function battleBgmChoice(): BattleBgmId {
  try {
    const stored = localStorage.getItem(KEY);
    if (isBattleBgm(stored)) return stored;
  } catch {
    /* blocked storage: the default stands */
  }
  return DEFAULT_BATTLE_BGM;
}

/** Remembered for next time. Failing to store it is not worth an error. */
export function setBattleBgmChoice(id: BattleBgmId): void {
  try {
    if (id === DEFAULT_BATTLE_BGM) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, id);
  } catch {
    /* blocked storage: the choice lasts this session */
  }
}
