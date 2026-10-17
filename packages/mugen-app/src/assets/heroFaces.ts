import { heroFaceChain, type HeroFace } from '@mugen/content/characters/heroFaces';

/**
 * THE HERO'S FACES, AS PICTURES (2026-10-11): seven delivered and placed as
 * delivered (mugen-assets/files/characters/hero/hero-face-*.png) — NORMAL,
 * SMILE, SURPRISED, TROUBLED, POUT, ANGRY, SERIOUS. A face with no picture
 * (SAD) borrows along its chain; a new one is one line here.
 */
const FILES: Partial<Record<HeroFace, () => Promise<string>>> = {
  NORMAL: async () => (await import('@mugen/assets/files/characters/hero/hero-face-normal.png')).default,
  SMILE: async () => (await import('@mugen/assets/files/characters/hero/hero-face-smile.png')).default,
  SURPRISED: async () => (await import('@mugen/assets/files/characters/hero/hero-face-surprised.png')).default,
  TROUBLED: async () => (await import('@mugen/assets/files/characters/hero/hero-face-troubled.png')).default,
  POUT: async () => (await import('@mugen/assets/files/characters/hero/hero-face-pout.png')).default,
  ANGRY: async () => (await import('@mugen/assets/files/characters/hero/hero-face-angry.png')).default,
  SERIOUS: async () => (await import('@mugen/assets/files/characters/hero/hero-face-serious.png')).default,
};

/** The part of each bust shown beside her: head to waist, at her scale. */
export const HERO_FACE_BOX = { fileW: 1086, fileH: 1448, x: 60, y: 40, width: 966, height: 900 } as const;

/** Which face answers for `face` (itself or the nearest delivered), or null. */
export function heroFaceDrawn(face: HeroFace, files: Partial<Record<HeroFace, unknown>> = FILES): HeroFace | null {
  return heroFaceChain(face).find((f) => files[f]) ?? null;
}

const held = new Map<HeroFace, Promise<string | null>>();

export function heroFaceSrc(face: HeroFace): Promise<string | null> {
  const drawn = heroFaceDrawn(face);
  if (!drawn) return Promise.resolve(null);
  const already = held.get(drawn);
  if (already) return already;
  const loading = FILES[drawn]!().catch((e) => {
    console.warn(`Could not load the hero's face ${drawn}`, e);
    return null;
  });
  held.set(drawn, loading);
  return loading;
}
