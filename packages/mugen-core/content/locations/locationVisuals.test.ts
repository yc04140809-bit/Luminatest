import { describe, it, expect } from 'vitest';
import {
  LOCATION_VISUALS,
  locationBackground,
  locationBackgroundFocus,
  type LocationId,
} from './locationVisuals';
import { LOCATIONS } from './alden';

describe('LOCATION VISUAL', () => {
  it("answers with the location's own backdrop", () => {
    expect(locationBackground('GREENWOOD_FOREST')).toBe(
      LOCATION_VISUALS.GREENWOOD_FOREST.background,
    );
    expect(locationBackground('ALDEN_VILLAGE')).toBe(LOCATION_VISUALS.ALDEN_VILLAGE.background);
  });

  it('gives the village and the forest real art', () => {
    expect(locationBackground('ALDEN_VILLAGE')).toBeTruthy();
    expect(locationBackground('GREENWOOD_FOREST')).toBeTruthy();
  });

  it('returns null — not an error — where no art exists yet', () => {
    expect(locationBackground('ALDEN_BAKERY')).toBeNull();
    expect(locationBackground('GREENWOOD_WAYSTATION')).toBeNull();
  });

  it('a wide interior says where to aim the crop; a phone-shaped scene does not', () => {
    expect(locationBackground('MOONLIGHT_TAVERN')).toBeTruthy();
    expect(locationBackgroundFocus('MOONLIGHT_TAVERN')).toBeTruthy();
    expect(locationBackgroundFocus('GREENWOOD_FOREST')).toBeUndefined();
    expect(locationBackgroundFocus('ALDEN_BAKERY')).toBeUndefined();
  });

  it('every entry is keyed by its own id', () => {
    for (const [id, visual] of Object.entries(LOCATION_VISUALS)) {
      expect(visual.locationId).toBe(id);
    }
  });

  it('covers every playable location defined in the region', () => {
    for (const loc of LOCATIONS) {
      expect(LOCATION_VISUALS[loc.id as LocationId]).toBeDefined();
    }
  });
});
