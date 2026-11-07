// WHAT A PIECE OF ART IS CALLED, with no picture attached.
//
// THE POINT OF THIS FILE IS WHAT IT DOES NOT IMPORT.
//
// `manifest.ts` imports every delivered file so that Vite fingerprints
// and caches them. That is correct for the manifest and ruinous as a
// dependency: a module that imports it for one portrait gets all 75
// images and all six MP3s, because a static import of a bundle entry
// pulls the whole entry in. The App proved it — `world.ts` reached the
// manifest through four hops for a list of discovery types, and the
// App's dist came to 68 MB of art it never draws.
//
// So the CONTENT layer names art instead of holding it. A key is a
// string: it costs nothing to import, it can be stored, compared and
// tested without a bundler, and it cannot drag a picture behind it.
// Turning a key into something you can put in a `src` is a job for
// whoever is actually drawing — `manifest.ts` does it eagerly for the
// Artifact, and the App does it lazily, one area at a time.
//
// THIS FILE MUST NEVER IMPORT ANYTHING. Not the manifest, not a file,
// not a type from either. The moment it does, every content module
// that names a picture starts carrying one again.

/**
 * Art for a MOMENT rather than for a person — the four futures.
 *
 * Three of these resolve to a portrait of Gald at a stage of his life
 * and the fourth to the grave, but content does not know or care: it
 * knows the bakery scene shows GALD_BAKER.
 */
export type EventCgKey = 'GALD_BAKER' | 'GALD_HEALER' | 'GALD_WORKER' | 'GALD_GRAVE';

/** The backdrop a place is seen against. */
export type BackgroundKey = 'ALDEN_VILLAGE' | 'ALDEN_TAVERN' | 'GREENWOOD_FOREST';

/**
 * The painting a place is WALKED ACROSS, as opposed to seen against.
 * A separate picture from the backdrop of the same place, which is why
 * it is a separate key rather than the same one used twice.
 */
export type FieldArtKey = 'GREENWOOD_FOREST';

/**
 * THE GROUND A FIGHT IS FOUGHT ON — one painting per kind of place.
 *
 * Named after the KIND of place, not a particular one: FOREST is every
 * wood the party fights in, not the greenwood alone, and which place
 * uses which is content's decision (content/locations/battleBackgrounds).
 * Each is a landscape painting with a ground that runs back at an angle,
 * made for the party on the right and the enemy on the left.
 */
export type BattleBackgroundKey = 'FOREST' | 'RUINS' | 'SWAMP' | 'CITY' | 'BEACH' | 'GRASSLAND';

/** Every one there is, in the order they were delivered. */
export const BATTLE_BACKGROUND_KEYS: readonly BattleBackgroundKey[] = [
  'FOREST',
  'RUINS',
  'SWAMP',
  'CITY',
  'BEACH',
  'GRASSLAND',
];

/**
 * Every event CG key there is, for tests that want to check the set is
 * covered rather than check one entry.
 */
export const EVENT_CG_KEYS: readonly EventCgKey[] = [
  'GALD_BAKER',
  'GALD_HEALER',
  'GALD_WORKER',
  'GALD_GRAVE',
];

export const BACKGROUND_KEYS: readonly BackgroundKey[] = [
  'ALDEN_VILLAGE',
  'ALDEN_TAVERN',
  'GREENWOOD_FOREST',
];
