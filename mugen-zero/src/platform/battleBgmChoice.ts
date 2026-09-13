// WHICH FIGHTING PIECE THE PLAYER LAST CHOSE.
//
// A preference, so localStorage and never the world: it is a fact
// about how somebody likes to play, not about what happened in their
// game, and a save file carried to another device should not bring it.
// Same place and same shape as every other preference in platform/.

import { BATTLE_BGM_IDS, DEFAULT_BATTLE_BGM, isBattleBgm, type BattleBgmId } from '../content/audio/battleBgm';

const KEY = 'mugen-battle-bgm';

/**
 * The stored choice, or the default.
 *
 * A stored id that is no longer registered — a piece removed between
 * versions — is not an error and not silence: it is the default, which
 * is the only answer that can always be played.
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

/** Whether the control is worth showing at all. */
export function moreThanOneBattleBgm(): boolean {
  return BATTLE_BGM_IDS.length > 1;
}
