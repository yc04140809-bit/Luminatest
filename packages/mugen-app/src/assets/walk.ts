// WHAT A WALKED PLACE NEEDS, FETCHED WHEN THE PLAYER GOES THERE.
//
// The same rule as `areas.ts`: each file by name, so each is its own
// chunk and nothing is fetched until the walk is on screen. The painting
// walked across is the field art the Artifact's forest walks (and the
// Artifact's battle preview) already use; the two walkers' frames come
// from the shared registry, which names its own files.

import type { ExplorationSpriteSet } from '@mugen/content/characters/explorationSprites';
import type { WalkPlaceId } from '@mugen/content/exploration/walkPlaces';

export type { WalkPlaceId };

/**
 * The painting each place is walked across, as delivered. The five
 * besides the forest are the battle backgrounds of the same places —
 * the very same files, referenced rather than copied, so a place looks
 * the same whether it is walked or fought in.
 */
const PAINTINGS: Record<WalkPlaceId, () => Promise<{ default: string }>> = {
  GREENWOOD_FOREST: () => import('@mugen/assets/files/backgrounds/field-greenwood.png'),
  ANCIENT_RUINS: () => import('@mugen/assets/files/backgrounds/battle/ruins.png'),
  CASTLE_TOWN: () => import('@mugen/assets/files/backgrounds/battle/city.png'),
  GRASSLAND: () => import('@mugen/assets/files/backgrounds/battle/grassland.png'),
  SWAMP: () => import('@mugen/assets/files/backgrounds/battle/swamp.png'),
  SEASHORE: () => import('@mugen/assets/files/backgrounds/battle/beach.png'),
};

/** A walk's own painting, when it is not its place's usual one (WalkSceneDef `painting`). */
const OWN_PAINTINGS: Record<OwnPainting, () => Promise<{ default: string }>> = {
  // 作者 2026-10-17: the ruins' road and side steps — the painting its grid image was drawn over.
  RUINS_PATH: () => import('@mugen/assets/files/backgrounds/walk-ruins-path.webp'),
  // 作者 2026-10-18: the open grassland with the stream, the old signpost and the great tree (1462 × 1076).
  GRASSLAND_RIVER: () => import('@mugen/assets/files/backgrounds/walk-grassland-river.webp'),
};
type OwnPainting = 'RUINS_PATH' | 'GRASSLAND_RIVER';

const paintings = new Map<string, Promise<string | null>>();

/** The painting a place is walked across (or a walk's own). Cached; null if it will not load. */
export function walkPainting(place: WalkPlaceId, own?: OwnPainting): Promise<string | null> {
  const key = own ?? place;
  const already = paintings.get(key);
  if (already) return already;
  const loading = (own ? OWN_PAINTINGS[own] : PAINTINGS[place])()
    .then((m) => m.default)
    .catch((e) => {
      console.warn(`Could not load the painting for ${place}`, e);
      return null;
    });
  paintings.set(key, loading);
  return loading;
}

export interface Walkers {
  hero: ExplorationSpriteSet;
  kaos: ExplorationSpriteSet;
}

let walkers: Promise<Walkers | null> | null = null;

/** Fetch and decode a picture before it is needed; never fails. */
function preload(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * The hero's and Kaos's walking frames, from the shared registry —
 * resolved only once their left-facing frames (the way the walk goes)
 * have arrived, so nobody walks in as a blank and pops into view.
 */
export function walkerSprites(): Promise<Walkers | null> {
  walkers ??= import('@mugen/content/characters/explorationSprites')
    .then(async (m) => {
      const set = { hero: m.EXPLORATION_SPRITES.HERO, kaos: m.EXPLORATION_SPRITES.KAOS };
      const urls = new Set(
        [set.hero, set.kaos].flatMap((c) => [c.frames.left.idle, ...c.frames.left.walk].map((f) => f.url)),
      );
      await Promise.all([...urls].map(preload));
      // The other ways they face (front, back, right — 4方向) come after, without holding anyone up.
      for (const c of [set.hero, set.kaos])
        for (const d of ['front', 'back', 'right'] as const) for (const f of [c.frames[d].idle, ...c.frames[d].walk]) void preload(f.url);
      return set;
    })
    .catch((e) => {
      console.warn('Could not load the walking frames', e);
      return null;
    });
  return walkers;
}
