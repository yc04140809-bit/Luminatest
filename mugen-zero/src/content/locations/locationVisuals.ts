// LOCATION VISUAL — which backdrop belongs to which place.
//
// One tiny registry, deliberately not a system: a place has a name (in
// alden.ts) and, if its art exists, a background. Screens ask this module
// for a location's backdrop instead of importing an image directly, so
// "the battle happens in the forest" is expressed as a location id rather
// than as a hard-coded picture inside BattleScreen.
//
// Adding CAVE / ROYAL_CAPITAL / SNOW_MOUNTAIN later means adding an image
// and one line below — no screen changes.

import { BACKGROUNDS } from '../../assets/manifest';

/** Every place the game can show, art or not. */
export type LocationId = 'ALDEN_VILLAGE' | 'MOONLIGHT_TAVERN' | 'GREENWOOD_FOREST' | 'ALDEN_BAKERY';

export interface LocationVisual {
  locationId: LocationId;
  /** Backdrop art, or null while the place has none drawn yet. */
  background: string | null;
}

export const LOCATION_VISUALS: Record<LocationId, LocationVisual> = {
  ALDEN_VILLAGE: {
    locationId: 'ALDEN_VILLAGE',
    background: BACKGROUNDS.ALDEN_VILLAGE,
  },
  MOONLIGHT_TAVERN: { locationId: 'MOONLIGHT_TAVERN', background: null },
  GREENWOOD_FOREST: {
    locationId: 'GREENWOOD_FOREST',
    background: BACKGROUNDS.GREENWOOD_FOREST,
  },
  // The bakery has no art yet; the reunion scene simply stays on Gald.
  ALDEN_BAKERY: { locationId: 'ALDEN_BAKERY', background: null },
};

/**
 * The backdrop for a place. Null is a normal answer, not an error: the
 * screen keeps its plain background.
 */
export function locationBackground(locationId: LocationId): string | null {
  return LOCATION_VISUALS[locationId]?.background ?? null;
}
