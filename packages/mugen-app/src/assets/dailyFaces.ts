import type { NpcExpression } from '@mugen/core/npc/touchReaction';
import type { FaceBox } from './kaosFaces';
import { RIZEL_HEAD, rizelFaceDrawn, rizelFaceSrc } from './rizelFaces';

/**
 * 襲撃前の日常 — A FACE BESIDE A SMALL SCENE'S LINE, by who is speaking
 * (ui/daily.tsx). リゼル's arrived 2026-10-12 (assets/rizelFaces.ts): her line's
 * face (NORMAL where it names none). Someone with no picture yet: words only.
 */
export interface DailyFace {
  /** Who and which face, e.g. "rizel:NORMAL". */
  key: string;
  load: () => Promise<{ src: string; box: FaceBox } | null>;
}

export const RIZEL_SPEAKER = 'リゼル';

export function dailyFaceFor(line: { speaker: string | null; face?: NpcExpression }): DailyFace | null {
  if (line.speaker === RIZEL_SPEAKER) {
    const face = rizelFaceDrawn(line.face ?? 'NORMAL');
    return { key: `rizel:${face}`, load: () => rizelFaceSrc(face).then((src) => (src ? { src, box: RIZEL_HEAD } : null)) };
  }
  return null;
}
