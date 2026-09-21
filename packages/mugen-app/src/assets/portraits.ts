// A STANDING PICTURE, FETCHED WHEN SOMEBODY LOOKS AT IT.
//
// THE SAME RULE AS `areas.ts`, AND FOR THE SAME REASON. Naming a file
// splits it into its own chunk; naming the MANIFEST pulls every asset
// the game owns into one. The first build of the area loader put six
// full-length MP3s into an app that had not played a note, and that is
// what this comment exists to stop happening again on a status screen.
//
// So: `import('@mugen/assets/files/characters/...')`, one file at a
// time, and nothing about anybody's picture is fetched until the
// player opens the screen that draws it.
//
// KEYED BY A SKIN'S `assetRefs.statusPortrait`, not by a character id
// and not by a name. That is the seam the skins arrive through: the
// caller asks `statusPortraitKeyOf(id)` and this file answers with a
// picture, so a second outfit is a new entry here plus a new
// `SkinDefinition` — and not one screen has to change.
//
// WHAT THESE FILES MUST BE is `docs/PORTRAIT_MASTER.md`: one canvas,
// one baseline, for every character. Neither of today's two meets it
// yet; `npm run check:portraits` says exactly how far off each one is.

export type PortraitKey = 'hero' | 'kaos';

/**
 * TWO REGISTRIES, because they are two different kinds of file.
 *
 * VISUALS are finished rectangles with their own painted background,
 * made for the status screen. MASTERS are transparent cut-outs on the
 * shared canvas, made to be reused anywhere. A character can gain one
 * without the other, and replacing either never touches the screen.
 */
const VISUALS: Partial<Record<PortraitKey, () => Promise<string>>> = {
  hero: async () =>
    (await import('@mugen/assets/files/characters/hero/hero-status-visual.png')).default,
  kaos: async () =>
    (await import('@mugen/assets/files/characters/kaos/kaos-status-visual.png')).default,
};

const PORTRAITS: Record<PortraitKey, () => Promise<string>> = {
  hero: async () =>
    (await import('@mugen/assets/files/characters/hero/hero-battle-idle.png')).default,
  kaos: async () =>
    (await import('@mugen/assets/files/characters/kaos/kaos-battle-default.png')).default,
};

export function isPortraitKey(key: string): key is PortraitKey {
  return key in PORTRAITS;
}

/** Cached, so looking at somebody twice fetches once. */
const held = new Map<string, Promise<string | null>>();

function fetchOnce(
  cacheKey: string,
  load: (() => Promise<string>) | undefined,
): Promise<string | null> {
  if (!load) return Promise.resolve(null);
  const already = held.get(cacheKey);
  if (already) return already;
  const loading = load().catch((e) => {
    // A picture that will not load is not a reason to lose a screen.
    console.warn(`Could not load ${cacheKey}`, e);
    return null;
  });
  held.set(cacheKey, loading);
  return loading;
}

/** The transparent standing master. */
export function portraitArt(key: PortraitKey): Promise<string | null> {
  return fetchOnce(`portrait:${key}`, PORTRAITS[key]);
}

/** The finished status-screen rectangle, or null where there is none. */
export function statusVisualArt(key: PortraitKey): Promise<string | null> {
  return fetchOnce(`visual:${key}`, VISUALS[key]);
}
