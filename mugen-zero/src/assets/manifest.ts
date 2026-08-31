// Asset manifest. Official art is imported so Vite fingerprints and
// caches it; everything not yet drawn or recorded stays null, and the UI
// falls back to a placeholder rather than breaking.

import kaosNormal from './characters/kaos/kaos-normal.webp';
import kaosSmile from './characters/kaos/kaos-smile.webp';
import galdReady from './characters/gald/gald-ready.webp';
import galdDefeated from './characters/gald/gald-defeated.webp';
import galdBaker from './characters/gald/gald-baker.webp';
import galdHealer from './characters/gald/gald-healer.webp';
import galdWorker from './characters/gald/gald-worker.webp';
import galdGrave from './events/event-gald-grave.webp';
import greenwoodForest from './backgrounds/location-greenwood-forest.webp';
import aldenVillage from './backgrounds/location-alden-village.webp';
import titleKaosKeyVisual from './backgrounds/title-kaos-keyvisual.webp';

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
 * Gald, the same man at several points of one life. 'defeated' means
 * beaten, NOT dead — whether he lives is the player's choice; the last
 * three are where each surviving route leaves him three years on. Same
 * CHARACTER, same id in the DB: only the visual state differs, and the
 * DB decides which one is true.
 */
export type GaldState = 'ready' | 'defeated' | 'baker' | 'healer' | 'worker';

export const GALD_PORTRAITS: Record<GaldState, string | null> = {
  ready: galdReady,
  defeated: galdDefeated,
  baker: galdBaker,
  healer: galdHealer,
  worker: galdWorker,
};

export function galdPortrait(state: GaldState): string | null {
  return GALD_PORTRAITS[state] ?? null;
}

/**
 * EVENT CG — art for a moment rather than for a person.
 *
 * The grave is the only one so far: on the KILL route there is no Gald to
 * draw, so the picture is of what the world kept. Adding a rare or
 * hand-drawn event later means one more entry here and one field on the
 * event's own definition — no new system.
 */
export const EVENT_CG = {
  GALD_GRAVE: galdGrave,
} as const;

/**
 * Location backdrops, keyed by location id. content/locations/
 * locationVisuals.ts maps these onto places; screens go through that map
 * instead of importing an image directly.
 */
export const BACKGROUNDS = {
  ALDEN_VILLAGE: aldenVillage,
  GREENWOOD_FOREST: greenwoodForest,
} as const;

/** The Kaos key visual behind the title. Not a place: a cover image. */
export const TITLE_KEY_VISUAL: string = titleKaosKeyVisual;

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
