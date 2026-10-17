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

const paintings = new Map<WalkPlaceId, Promise<string | null>>();

/** The painting a place is walked across. Cached; null if it will not load. */
export function walkPainting(place: WalkPlaceId): Promise<string | null> {
  const already = paintings.get(place);
  if (already) return already;
  const loading = PAINTINGS[place]()
    .then((m) => m.default)
    .catch((e) => {
      console.warn(`Could not load the painting for ${place}`, e);
      return null;
    });
  paintings.set(place, loading);
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
      return set;
    })
    .catch((e) => {
      console.warn('Could not load the walking frames', e);
      return null;
    });
  return walkers;
}
