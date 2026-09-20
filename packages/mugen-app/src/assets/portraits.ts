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
// KEYED BY THE PROFILE'S `portraitKey`, not by a character id and not
// by a name — which is the seam the skins will arrive through. Today
// every profile's key is their id and this map is two lines; the day
// there is a second outfit, the key it resolves is chosen from the
// appearance rather than from who the character is, and nothing here
// has to change shape to allow it.

export type PortraitKey = 'hero' | 'kaos';

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
const held = new Map<PortraitKey, Promise<string | null>>();

export function portraitArt(key: PortraitKey): Promise<string | null> {
  const already = held.get(key);
  if (already) return already;
  const loading = PORTRAITS[key]().catch((e) => {
    // A picture that will not load is not a reason to lose a screen.
    console.warn(`Could not load the portrait for ${key}`, e);
    return null;
  });
  held.set(key, loading);
  return loading;
}
