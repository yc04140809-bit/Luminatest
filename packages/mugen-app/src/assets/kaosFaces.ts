import { kaosFaceChain, type KaosFace } from '@mugen/content/characters/kaosFaces';

/**
 * KAOS'S FACES, AS PICTURES (表情差分, 2026-10-11).
 *
 * Delivered 2026-10-11 and placed as delivered (mugen-assets/files/
 * characters/kaos/kaos-face-*.png): SMILE, DOYA, SURPRISED, SAD, PUKU and
 * ANGRY. Each is a bust drawn with a sample dialogue box across its lower
 * part; the file is kept as it is and only the part above the box is shown
 * (`KAOS_FACE_BOX`).
 *
 * To add one: place it as delivered and add one line to FILES. A face with
 * no picture borrows the nearest along its chain (content/characters/
 * kaosFaces.ts); until NORMAL and SERIOUS themselves arrive, they are stood
 * in for (`STAND_IN`) so she is never missing from a conversation.
 */
const FILES: Partial<Record<KaosFace, () => Promise<string>>> = {
  SMILE: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-smile.png')).default,
  DOYA: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-doya.png')).default,
  SURPRISED: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-surprised.png')).default,
  SAD: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-sad.png')).default,
  PUKU: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-puku.png')).default,
  ANGRY: async () => (await import('@mugen/assets/files/characters/kaos/kaos-face-angry.png')).default,
};

/**
 * Until their own pictures come: a calm line shows her smiling, a tight one
 * her startled (alert) face. Removed, line by line, as NORMAL / SERIOUS arrive.
 */
const STAND_IN: Partial<Record<KaosFace, KaosFace>> = {
  NORMAL: 'SMILE',
  SERIOUS: 'SURPRISED',
};

/** The part of each delivered bust that is her (above the sample dialogue box drawn on it). */
export const KAOS_FACE_BOX = { fileW: 1122, fileH: 1402, x: 0, y: 0, width: 1122, height: 1050 } as const;

/** Which face actually answers for `face`: itself or the nearest delivered, else a stand-in; null when none. */
export function kaosFaceDrawn(
  face: KaosFace,
  files: Partial<Record<KaosFace, unknown>> = FILES,
  standIn: Partial<Record<KaosFace, KaosFace>> = STAND_IN,
): KaosFace | null {
  const chain = kaosFaceChain(face);
  const own = chain.find((f) => files[f]);
  if (own) return own;
  for (const f of chain) {
    const s = standIn[f];
    if (s && files[s]) return s;
  }
  return null;
}

const held = new Map<KaosFace, Promise<string | null>>();

/** The picture for `face` (or what answers for it), fetched once; null when there is none. */
export function kaosFaceSrc(face: KaosFace): Promise<string | null> {
  const drawn = kaosFaceDrawn(face);
  if (!drawn) return Promise.resolve(null);
  const already = held.get(drawn);
  if (already) return already;
  const loading = FILES[drawn]!().catch((e) => {
    console.warn(`Could not load Kaos's face ${drawn}`, e);
    return null;
  });
  held.set(drawn, loading);
  return loading;
}
