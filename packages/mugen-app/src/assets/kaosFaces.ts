import { kaosFaceChain, type KaosFace } from '@mugen/content/characters/kaosFaces';

/**
 * KAOS'S FACES, AS PICTURES (表情差分, 2026-10-11).
 *
 * Nine delivered 2026-10-11 and placed as delivered (mugen-assets/files/
 * characters/kaos/kaos-face-*.png). Two shapes of file:
 *   - SMILE, DOYA, SURPRISED, SAD, PUKU, ANGRY: 1122×1402, a bust with a
 *     sample dialogue box drawn across its lower part — only the part above
 *     the box is shown (`WITH_SAMPLE_BOX`);
 *   - NORMAL, SERIOUS, TROUBLED: 1086×1448, no box (`PLAIN`).
 * Both boxes take her from the top of her head to the same height, so she is
 * the same size whichever face she makes.
 *
 * To add one: place it as delivered and add one line to FILES. A face with
 * no picture (LAUGH, BLUSH) borrows the nearest along its chain
 * (content/characters/kaosFaces.ts).
 */
export type FaceBox = { fileW: number; fileH: number; x: number; y: number; width: number; height: number };

const WITH_SAMPLE_BOX: FaceBox = { fileW: 1122, fileH: 1402, x: 0, y: 0, width: 1122, height: 1040 };
const PLAIN: FaceBox = { fileW: 1086, fileH: 1448, x: -80, y: -30, width: 1246, height: 1156 };

const FILES: Partial<Record<KaosFace, { load: () => Promise<string>; box: FaceBox }>> = {
  NORMAL: { load: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-normal.png')).default, box: PLAIN },
  SERIOUS: { load: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-serious.png')).default, box: PLAIN },
  TROUBLED: { load: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-troubled.png')).default, box: PLAIN },
  SMILE: { load: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-smile.png')).default, box: WITH_SAMPLE_BOX },
  DOYA: { load: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-doya.png')).default, box: WITH_SAMPLE_BOX },
  SURPRISED: { load: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-surprised.png')).default, box: WITH_SAMPLE_BOX },
  SAD: { load: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-sad.png')).default, box: WITH_SAMPLE_BOX },
  PUKU: { load: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-puku.png')).default, box: WITH_SAMPLE_BOX },
  ANGRY: { load: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-angry.png')).default, box: WITH_SAMPLE_BOX },
};

/** Which face actually answers for `face` (itself or the nearest delivered along its chain), or null. */
export function kaosFaceDrawn(face: KaosFace, files: Partial<Record<KaosFace, unknown>> = FILES): KaosFace | null {
  return kaosFaceChain(face).find((f) => files[f]) ?? null;
}

const held = new Map<KaosFace, Promise<{ src: string; box: FaceBox } | null>>();

/** The picture for `face` (or what answers for it) and the part of it to show, fetched once; null when none. */
export function kaosFacePicture(face: KaosFace): Promise<{ src: string; box: FaceBox } | null> {
  const drawn = kaosFaceDrawn(face);
  if (!drawn) return Promise.resolve(null);
  const already = held.get(drawn);
  if (already) return already;
  const file = FILES[drawn]!;
  const loading = file
    .load()
    .then((src) => ({ src, box: file.box }))
    .catch((e) => {
      console.warn(`Could not load Kaos's face ${drawn}`, e);
      return null;
    });
  held.set(drawn, loading);
  return loading;
}
