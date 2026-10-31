import type { NpcExpression } from '@mugen/core/npc/touchReaction';
import type { FaceBox } from './kaosFaces';

/**
 * バルドの表情 (2026-10-16): four delivered, transparent, placed as delivered
 * (mugen-assets/files/characters/baldo/baldo-face-*.png) — the same upper-body
 * drawing, the face alone changing. By the faces a line can name
 * (NpcExpression, as リゼル's):
 *
 *   NORMAL             通常（少し余裕のある顔）
 *   ANGRY              苛立ち（歯を見せて眉を寄せる）
 *   SMILE_EYES_CLOSED  微笑み（目を細めて口元だけ）
 *   HAPPY              笑顔（歯を見せて）
 *
 * Any other face shows NORMAL.
 */
const FILES: Partial<Record<NpcExpression, () => Promise<string>>> = {
  NORMAL: async () => (await import('@mugen/assets/files/characters/baldo/baldo-face-normal.png')).default,
  ANGRY: async () => (await import('@mugen/assets/files/characters/baldo/baldo-face-irritated.png')).default,
  SMILE_EYES_CLOSED: async () => (await import('@mugen/assets/files/characters/baldo/baldo-face-smile.png')).default,
  HAPPY: async () => (await import('@mugen/assets/files/characters/baldo/baldo-face-grin.png')).default,
};

/** His head and shoulders in the 1086×1448 drawing (measured on the delivered files). */
export const BALDO_HEAD: FaceBox = { fileW: 1086, fileH: 1448, x: 200, y: 40, width: 600, height: 600 };

/** Which face answers for `face`: its own, or NORMAL. */
export function baldoFaceDrawn(face: NpcExpression): NpcExpression {
  return FILES[face] ? face : 'NORMAL';
}

const held = new Map<NpcExpression, Promise<string | null>>();

export function baldoFaceSrc(face: NpcExpression): Promise<string | null> {
  const drawn = baldoFaceDrawn(face);
  const already = held.get(drawn);
  if (already) return already;
  const loading = FILES[drawn]!().catch((e) => {
    console.warn(`Could not load Baldo's face ${drawn}`, e);
    return null;
  });
  held.set(drawn, loading);
  return loading;
}
