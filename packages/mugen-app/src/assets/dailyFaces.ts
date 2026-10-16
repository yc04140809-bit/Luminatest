import type { NpcExpression } from '@mugen/core/npc/touchReaction';
import type { FaceBox } from './kaosFaces';
import { RIZEL_HEAD, rizelFaceDrawn, rizelFaceSrc } from './rizelFaces';
import { BALDO_HEAD, baldoFaceDrawn, baldoFaceSrc } from './baldoFaces';

/**
 * 襲撃前の日常 — A FACE BESIDE A SMALL SCENE'S LINE, by who is speaking
 * (ui/daily.tsx). リゼル's arrived 2026-10-12 (assets/rizelFaces.ts): her line's
 * face (NORMAL where it names none); バルド's 2026-10-16 (assets/baldoFaces.ts),
 * the same way. Someone with no picture yet: words only.
 */
export interface DailyFace {
  /** Who and which face, e.g. "rizel:NORMAL". */
  key: string;
  load: () => Promise<{ src: string; box: FaceBox } | null>;
}

export const RIZEL_SPEAKER = 'リゼル';
export const BALDO_SPEAKER = 'バルド';

export function dailyFaceFor(line: { speaker: string | null; face?: NpcExpression }): DailyFace | null {
  if (line.speaker === RIZEL_SPEAKER) {
    const face = rizelFaceDrawn(line.face ?? 'NORMAL');
    return { key: `rizel:${face}`, load: () => rizelFaceSrc(face).then((src) => (src ? { src, box: RIZEL_HEAD } : null)) };
  }
  if (line.speaker === BALDO_SPEAKER) {
    const face = baldoFaceDrawn(line.face ?? 'NORMAL');
    return { key: `baldo:${face}`, load: () => baldoFaceSrc(face).then((src) => (src ? { src, box: BALDO_HEAD } : null)) };
  }
  return null;
}
