// WHERE A FIGHT IS FOUGHT, AND ON WHAT GROUND.
//
// A place names the KIND of ground it fights on; the painting for that
// kind lives in @mugen/assets/battleBackgrounds. Only the type is
// imported here, so this table costs no build a single picture.
//
// ONE PLACE TODAY. The greenwood is the only place anybody fights. The
// other five paintings are registered and waiting — they are given to a
// place when that place exists and has a fight in it, not before, and
// not by guessing which existing place they "look like".

import type { BattleBackgroundKey } from '@mugen/assets/keys';
import type { LocationId } from './locationVisuals';

export const BATTLE_BACKGROUND_OF: Partial<Record<LocationId, BattleBackgroundKey>> = {
  GREENWOOD_FOREST: 'FOREST',
};

/** The ground a fight in this place is fought on, or null where none is set. */
export function battleBackgroundFor(locationId: LocationId): BattleBackgroundKey | null {
  return BATTLE_BACKGROUND_OF[locationId] ?? null;
}
