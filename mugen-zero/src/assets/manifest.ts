// Asset manifest. Official art is imported so Vite fingerprints and
// caches it; everything not yet drawn or recorded stays null, and the UI
// falls back to a placeholder rather than breaking.

import kaosNormal from './characters/kaos/kaos-normal.webp';
import kaosSmile from './characters/kaos/kaos-smile.webp';
import galdReady from './characters/gald/gald-ready.webp';
import galdDefeated from './characters/gald/gald-defeated.webp';
import galdBaker from './characters/gald/gald-baker.webp';
import greenwoodForest from './backgrounds/greenwood-forest.webp';

export type KaosExpression = 'normal' | 'smile';

/** Official Kaos portraits (from the project's own art). */
export const KAOS_PORTRAITS: Record<KaosExpression, string | null> = {
  normal: kaosNormal,
  smile: kaosSmile,
};

export function kaosPortrait(expression: KaosExpression = 'normal'): string | null {
  return KAOS_PORTRAITS[expression] ?? null;
}

/**
 * Gald, the same man at three points of one life. 'defeated' means
 * beaten, NOT dead — whether he lives is the player's choice; 'baker' is
 * where the spared route leads him three years on. Same CHARACTER, same
 * id in the DB: only the visual state differs.
 */
export type GaldState = 'ready' | 'defeated' | 'baker';

export const GALD_PORTRAITS: Record<GaldState, string | null> = {
  ready: galdReady,
  defeated: galdDefeated,
  baker: galdBaker,
};

export function galdPortrait(state: GaldState): string | null {
  return GALD_PORTRAITS[state] ?? null;
}

/** Location backdrops. */
export const BACKGROUNDS = {
  GREENWOOD_FOREST: greenwoodForest,
} as const;

/**
 * Audio slots. All null for now — no third-party audio is bundled.
 * AudioManager treats a null slot as silence, never as an error, so
 * dropping real files in later needs no code change beyond this map.
 */
export type BgmId = 'title' | 'forest' | 'battle' | 'bakery';
export type SeId = 'select' | 'memory' | 'timeshift' | 'reunion';

export const BGM_ASSETS: Record<BgmId, string | null> = {
  title: null,
  forest: null,
  battle: null,
  bakery: null,
};

export const SE_ASSETS: Record<SeId, string | null> = {
  select: null,
  memory: null,
  timeshift: null,
  reunion: null,
};
