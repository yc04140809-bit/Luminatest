import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MINI_STATUE_SPRITES } from './miniStatueSprites';
import type { Direction } from './explorationSprites';

const DIRECTIONS: Direction[] = ['front', 'back', 'left', 'right'];
const DIR = (who: string) => fileURLToPath(new URL(`../../../mugen-assets/files/characters/${who}/explore/`, import.meta.url));

/** A WebP's canvas (its VP8X header — every one of these has alpha, so every one has that header). */
function canvas(path: string): { w: number; h: number } {
  const b = readFileSync(path);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 12, 16)).toBe('VP8X');
  return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
}

/**
 * THE MINI STATUES (作者 2026-10-18: 探索キャラクターを最新素材へ差し替え) — the App's explorers.
 * One canvas per character, the feet on one point of it, so nothing jumps between frames or turns.
 */
describe('the explorers as mini statues', () => {
  for (const [id, who, size] of [
    ['HERO', 'hero', { w: 380, h: 360 }],
    ['KAOS', 'kaos', { w: 400, h: 360 }],
  ] as const) {
    describe(id, () => {
      const set = MINI_STATUE_SPRITES[id];
      const files = readdirSync(DIR(who)).filter((f) => f.endsWith('.webp'));

      it('faces all four ways, each with its own drawing (none mirrored)', () => {
        const idles = DIRECTIONS.map((d) => set.frames[d].idle.url);
        expect(new Set(idles).size).toBe(4);
      });

      it('every delivered frame is on one canvas, and every frame is anchored at the same feet', () => {
        expect(files.length).toBeGreaterThanOrEqual(4);
        for (const f of files) expect(canvas(DIR(who) + f), f).toEqual(size);
        const frames = DIRECTIONS.flatMap((d) => [set.frames[d].idle, ...set.frames[d].walk]);
        for (const fr of frames) {
          expect(fr.anchor).toEqual(frames[0].anchor);
          expect(fr.anchor.x).toBe(size.w / 2);
          expect(fr.anchor.y).toBeLessThan(size.h);
          expect(fr.scale).toBeUndefined();
        }
      });
    });
  }

  it('the hero walks with four frames front, back and left; facing right with the one drawing delivered', () => {
    const f = MINI_STATUE_SPRITES.HERO.frames;
    for (const d of ['front', 'back', 'left'] as const) expect(f[d].walk).toHaveLength(4);
    expect(f.right.walk).toHaveLength(1);
  });

  it('her height leaves out the curl of hair above it (as before: a flourish, not her size)', () => {
    // Both are drawn 340 tall crown to sole; hers is measured to the top of her head.
    expect(MINI_STATUE_SPRITES.HERO.referencePixels).toBe(340);
    expect(MINI_STATUE_SPRITES.KAOS.referencePixels).toBeLessThan(340);
  });
});
