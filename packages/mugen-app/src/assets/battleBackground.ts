// THE GROUND A FIGHT IS FOUGHT ON, FETCHED WHEN THE FIGHT STARTS.
//
// The painting for a kind of place (content/locations/battleBackgrounds
// says which kind), loaded one file at a time and held once loaded, so
// a second fight in the same wood does not fetch it again. A picture
// that will not load is not a reason to lose a fight: it is null, and
// the fight is fought on the plain ground behind it.

import { BATTLE_BACKGROUND_FILES } from '@mugen/assets/battleBackgrounds';
import type { BattleBackgroundKey } from '@mugen/assets/keys';

const held = new Map<BattleBackgroundKey, Promise<string | null>>();

export function battleBackgroundArt(key: BattleBackgroundKey): Promise<string | null> {
  const already = held.get(key);
  if (already) return already;
  const loading = BATTLE_BACKGROUND_FILES[key]().catch((e) => {
    console.warn(`Could not load the battle background ${key}`, e);
    return null;
  });
  held.set(key, loading);
  return loading;
}
