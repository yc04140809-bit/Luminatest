import { describe, expect, it } from 'vitest';
import { EXPLORATION_SPRITES, allFrames, type Direction } from './explorationSprites';

const DIRECTIONS: Direction[] = ['front', 'back', 'left', 'right'];

/**
 * WHAT A FOREST SPRITE HAS TO BE.
 *
 * Both characters walk the same field through the same code, so the
 * shape of their art is a contract rather than a preference: four
 * directions, an idle apiece, and a cycle long enough to read as walking
 * rather than as sliding.
 */
describe('everyone who walks the forest', () => {
  for (const id of ['HERO', 'KAOS'] as const) {
    describe(id, () => {
      const set = EXPLORATION_SPRITES[id];

      it('faces all four ways', () => {
        for (const d of DIRECTIONS) expect(set.frames[d], d).toBeDefined();
      });

      it('walks rather than slides', () => {
        for (const d of DIRECTIONS) {
          expect(set.frames[d].walk.length, `${d} walk frames`).toBeGreaterThanOrEqual(3);
        }
      });

      it('states where its feet are, in every frame', () => {
        for (const frame of allFrames(id)) {
          expect(frame.anchor.x).toBeGreaterThan(0);
          expect(frame.anchor.y).toBeGreaterThan(0);
          if (frame.rect) {
            expect(frame.anchor.x).toBeLessThanOrEqual(frame.rect.width);
            expect(frame.anchor.y).toBeLessThanOrEqual(frame.rect.height);
          }
        }
      });

      it('keeps its feet on one line while it walks', () => {
        // A sole line that moved frame to frame would be a character
        // bobbing through the ground rather than walking on it.
        for (const d of DIRECTIONS) {
          const group = set.frames[d];
          const soles = [group.idle, ...group.walk].map((f) => f.anchor.y);
          expect(Math.max(...soles) - Math.min(...soles), `${d} sole line`).toBeLessThanOrEqual(8);
        }
      });

      it('stands on one axis while it walks', () => {
        // And one that slid sideways would be a character stepping off
        // the spot every time the frame changed.
        for (const d of DIRECTIONS) {
          const group = set.frames[d];
          const axes = [group.idle, ...group.walk].map((f) => f.anchor.x);
          expect(Math.max(...axes) - Math.min(...axes), `${d} axis`).toBe(0);
        }
      });
    });
  }
});

/**
 * THE ONE SHEET THAT NEEDS HELP, held where it can be seen.
 *
 * `scale` is a hotfix for art delivered at the wrong size. It is meant
 * to be temporary, and temporary things need something that notices when
 * they are still here — so this states exactly which frames carry one,
 * and fails both when a new one appears unannounced and when the right
 * sheet is redelivered and the correction should have gone.
 */
describe('the temporary size corrections', () => {
  it('is on Kaos facing right, and nowhere else in the game', () => {
    const corrected: string[] = [];
    for (const id of ['HERO', 'KAOS'] as const) {
      const set = EXPLORATION_SPRITES[id];
      for (const d of DIRECTIONS) {
        const group = set.frames[d];
        for (const frame of [group.idle, ...group.walk]) {
          if (frame.scale !== undefined) corrected.push(`${id}.${d}`);
        }
      }
    }
    expect(new Set(corrected)).toEqual(new Set(['KAOS.right']));
  });

  it('corrects every frame of that sheet by the same amount', () => {
    const scales = [
      EXPLORATION_SPRITES.KAOS.frames.right.idle.scale,
      ...EXPLORATION_SPRITES.KAOS.frames.right.walk.map((f) => f.scale),
    ];
    expect(new Set(scales).size, 'one correction for the whole sheet').toBe(1);
    // About a tenth: the sheet is drawn 9.6% smaller than its siblings.
    expect(scales[0]!).toBeGreaterThan(1.05);
    expect(scales[0]!).toBeLessThan(1.15);
  });

  it('leaves the other three sheets alone, because they agree already', () => {
    for (const d of ['front', 'back', 'left'] as const) {
      const group = EXPLORATION_SPRITES.KAOS.frames[d];
      for (const frame of [group.idle, ...group.walk]) {
        expect(frame.scale, `${d} needs no correction`).toBeUndefined();
      }
    }
  });
});

/**
 * HER WINGS AND HER EYES BELONG TO HER, NOT TO THE SCREEN.
 *
 * White on her right shoulder, black on her left, gold right eye, blue
 * left — and which of each the viewer sees is what changes when she
 * turns. There are therefore four drawings and not two mirrored ones,
 * and the cheapest way to break that is for somebody to "save space" by
 * pointing two directions at one file and flipping it.
 */
describe('Kaos is drawn four times, never flipped twice', () => {
  it('gives every direction its own sheet', () => {
    const sheets = new Map<Direction, string>();
    for (const d of DIRECTIONS) sheets.set(d, EXPLORATION_SPRITES.KAOS.frames[d].idle.url);
    expect(new Set(sheets.values()).size, 'four directions, four files').toBe(4);
  });

  it('draws every frame of a direction from that direction’s own sheet', () => {
    for (const d of DIRECTIONS) {
      const group = EXPLORATION_SPRITES.KAOS.frames[d];
      for (const frame of group.walk) {
        expect(frame.url, `${d} walk`).toBe(group.idle.url);
      }
    }
  });
});
