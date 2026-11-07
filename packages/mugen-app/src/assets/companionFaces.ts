import type { AriaFace, LeviFace } from '@mugen/content/characters/companionFaces';

/**
 * ARIA'S AND LEVI'S FACES, AS PICTURES (2026-10-12): three each, delivered
 * and placed as delivered (mugen-assets/files/characters/{aria,levi}/
 * *-face-*.png) — the same upper-body drawing, the face alone changing.
 * Every face named is drawn, so there is no chain to fall back along.
 */
const ARIA: Record<AriaFace, () => Promise<string>> = {
  NORMAL: async () => (await import('@mugen/assets/files/characters/aria/aria-face-normal.png')).default,
  SMILE: async () => (await import('@mugen/assets/files/characters/aria/aria-face-smile.png')).default,
  TROUBLED: async () => (await import('@mugen/assets/files/characters/aria/aria-face-troubled.png')).default,
};

const LEVI: Record<LeviFace, () => Promise<string>> = {
  NORMAL: async () => (await import('@mugen/assets/files/characters/levi/levi-face-normal.png')).default,
  ANGRY: async () => (await import('@mugen/assets/files/characters/levi/levi-face-angry.png')).default,
  SURPRISED: async () => (await import('@mugen/assets/files/characters/levi/levi-face-surprised.png')).default,
};

const held = new Map<string, Promise<string | null>>();

function fetchOnce(key: string, load: () => Promise<string>): Promise<string | null> {
  const already = held.get(key);
  if (already) return already;
  const loading = load().catch((e) => {
    console.warn(`Could not load ${key}`, e);
    return null;
  });
  held.set(key, loading);
  return loading;
}

export function ariaFaceSrc(face: AriaFace): Promise<string | null> {
  return fetchOnce(`aria:${face}`, ARIA[face]);
}

export function leviFaceSrc(face: LeviFace): Promise<string | null> {
  return fetchOnce(`levi:${face}`, LEVI[face]);
}
