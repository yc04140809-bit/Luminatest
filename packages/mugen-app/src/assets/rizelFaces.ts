import type { NpcExpression } from '@mugen/core/npc/touchReaction';
import type { FaceBox } from './kaosFaces';

/**
 * リゼルの表情 (2026-10-12): four delivered, transparent, placed as delivered
 * (mugen-assets/files/characters/rizel/rizel-face-*.png) — the same upper-body
 * drawing, the face alone changing. By the faces a line can name
 * (NpcExpression, as ミレイ's):
 *
 *   NORMAL   普段（穏やか）
 *   HAPPY    笑顔（口を開けて）
 *   AMAZED   驚き
 *   SAD      必死・不安（眉を寄せて）
 *
 * Any other face shows NORMAL.
 */
const FILES: Partial<Record<NpcExpression, () => Promise<string>>> = {
  NORMAL: async () => (await import('@mugen/assets/files/characters/rizel/rizel-face-normal.png')).default,
  HAPPY: async () => (await import('@mugen/assets/files/characters/rizel/rizel-face-smile.png')).default,
  AMAZED: async () => (await import('@mugen/assets/files/characters/rizel/rizel-face-surprised.png')).default,
  SAD: async () => (await import('@mugen/assets/files/characters/rizel/rizel-face-troubled.png')).default,
};

/** Her head and shoulders in the 1086×1448 drawing (measured on the delivered files). */
export const RIZEL_HEAD: FaceBox = { fileW: 1086, fileH: 1448, x: 250, y: 40, width: 580, height: 580 };

/** Which face answers for `face`: its own, or NORMAL. */
export function rizelFaceDrawn(face: NpcExpression): NpcExpression {
  return FILES[face] ? face : 'NORMAL';
}

const held = new Map<NpcExpression, Promise<string | null>>();

export function rizelFaceSrc(face: NpcExpression): Promise<string | null> {
  const drawn = rizelFaceDrawn(face);
  const already = held.get(drawn);
  if (already) return already;
  const loading = FILES[drawn]!().catch((e) => {
    console.warn(`Could not load Rizel's face ${drawn}`, e);
    return null;
  });
  held.set(drawn, loading);
  return loading;
}
