// WHAT AN AREA NEEDS, FETCHED WHEN THE PLAYER GOES THERE.
//
// The Artifact imports every asset it owns from one manifest, because
// a single-file page has to contain all of them anyway. An app has the
// opposite problem: 83 MB of delivered artwork cannot all be decoded
// at launch, and most of it belongs to places the player has not
// walked to.
//
// So an area is a function that returns a promise. `import()` makes
// each one its own chunk, and nothing about ALDEN is fetched, decoded
// or held in memory until somebody opens the village. Adding an area
// is adding an entry here; nothing that draws a screen has to learn
// how loading works.
//
// It is deliberately thin in this first version — one picture per
// place — because Phase 1 is about the loop, not the gallery.

export interface AreaArt {
  background: string | null;
}

// EACH FILE BY NAME, NOT THE MANIFEST.
//
// `await import('@mugen/assets')` looks like the same thing and is
// not: the manifest names every asset the game owns, so importing it
// — even lazily — pulls all of them into one chunk. The first build
// of this file put six full-length MP3s into an app that had not
// played a note. Naming the individual file is what actually splits.
const AREAS = {
  ALDEN: async (): Promise<AreaArt> => ({
    background: (await import('@mugen/assets/files/backgrounds/location-alden-village.webp'))
      .default,
  }),
  GREENWOOD: async (): Promise<AreaArt> => ({
    background: (await import('@mugen/assets/files/backgrounds/location-greenwood-forest.webp'))
      .default,
  }),
} as const;

export type AreaId = keyof typeof AREAS;

/** The art for one place. Cached, so walking in twice fetches once. */
const held = new Map<AreaId, Promise<AreaArt>>();

export function areaArt(area: AreaId): Promise<AreaArt> {
  const already = held.get(area);
  if (already) return already;
  const loading = AREAS[area]().catch((e) => {
    // A picture that will not load is not a reason to lose a place.
    console.warn(`Could not load the art for ${area}`, e);
    return { background: null };
  });
  held.set(area, loading);
  return loading;
}
