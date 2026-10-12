import { graveFaceChain, type GraveFace } from '@mugen/content/characters/graveFaces';

/**
 * GRAVE'S FACES, AS PICTURES (2026-10-12): seven delivered and placed as
 * delivered (mugen-assets/files/characters/grave/grave-face-*.png) —
 * NORMAL, LAUGH, GRIN, SERIOUS, ANGRY, SAD, SURPRISED: the same upper-body
 * drawing, the face alone changing. TROUBLED (not drawn yet) borrows along
 * its chain; a new one is one line here.
 */
const FILES: Partial<Record<GraveFace, () => Promise<string>>> = {
  NORMAL: async () => (await import('@mugen/assets/files/characters/grave/grave-face-normal.png')).default,
  LAUGH: async () => (await import('@mugen/assets/files/characters/grave/grave-face-laugh.png')).default,
  GRIN: async () => (await import('@mugen/assets/files/characters/grave/grave-face-grin.png')).default,
  SERIOUS: async () => (await import('@mugen/assets/files/characters/grave/grave-face-serious.png')).default,
  ANGRY: async () => (await import('@mugen/assets/files/characters/grave/grave-face-angry.png')).default,
  SAD: async () => (await import('@mugen/assets/files/characters/grave/grave-face-sad.png')).default,
  SURPRISED: async () => (await import('@mugen/assets/files/characters/grave/grave-face-surprised.png')).default,
};

/** Which face answers for `face` (itself or the nearest delivered), or null. */
export function graveFaceDrawn(face: GraveFace, files: Partial<Record<GraveFace, unknown>> = FILES): GraveFace | null {
  return graveFaceChain(face).find((f) => files[f]) ?? null;
}

const held = new Map<GraveFace, Promise<string | null>>();

export function graveFaceSrc(face: GraveFace): Promise<string | null> {
  const drawn = graveFaceDrawn(face);
  if (!drawn) return Promise.resolve(null);
  const already = held.get(drawn);
  if (already) return already;
  const loading = FILES[drawn]!().catch((e) => {
    console.warn(`Could not load Grave's face ${drawn}`, e);
    return null;
  });
  held.set(drawn, loading);
  return loading;
}
