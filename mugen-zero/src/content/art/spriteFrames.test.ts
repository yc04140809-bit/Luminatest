import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FRAME,
  SIZE_BANDS,
  SPRITE_FRAMES,
  frameOf,
  spriteHeight,
  spriteOffset,
} from './spriteFrames';

const STAGE = { width: 844, height: 300 };

describe('how big somebody is on the field', () => {
  it('keeps every character inside the band it declares', () => {
    for (const [id, frame] of Object.entries(SPRITE_FRAMES)) {
      const band = SIZE_BANDS[frame.band];
      if (frame.headShare !== undefined && band.head) {
        // Judged on the head, because this one knows its own. See below.
        const head = frame.scale * frame.headShare;
        expect(head, `${id} head`).toBeGreaterThanOrEqual(band.head.min);
        expect(head, `${id} head`).toBeLessThanOrEqual(band.head.max);
        continue;
      }
      expect(frame.scale, `${id} standing`).toBeGreaterThanOrEqual(band.min);
      expect(frame.scale, `${id} standing`).toBeLessThanOrEqual(band.max);
    }
  });

  /**
   * WHY THE HEAD, FOR ANYBODY WHO HAS ONE RECORDED.
   *
   * `scale` is a share of the stage applied to the FILE, so it says how
   * big a person is only while everybody's file is the same shape. The
   * day Gald's standing figure came back as a 1536x1024 lunge — the
   * hero is 1024x1536 — the same number drew a man half again his size,
   * and the number that actually matched them was 0.44, outside a band
   * written for portraits. The band was right about the intent and
   * wrong about the measurement.
   *
   * These are the three the fight puts side by side, and all three land
   * within a tenth of each other.
   */
  it('draws the three people in a fight at one size, however they are drawn', () => {
    const headOf = (id: string) => {
      const f = SPRITE_FRAMES[id];
      expect(f.headShare, `${id} should know its own head`).toBeDefined();
      return f.scale * (f.headShare ?? 0);
    };
    const hero = headOf('hero');
    expect(headOf('gald') / hero).toBeCloseTo(1, 1);
    // Kaos is the one deliberate exception: she is drawn flying, with
    // wings and a full skirt, so the same head buys her half again the
    // silhouette. Nine tenths keeps her the back rank she stands in.
    expect(headOf('kaos') / hero).toBeGreaterThan(0.85);
    expect(headOf('kaos') / hero).toBeLessThan(0.95);
  });

  it('never lets a pose change somebody into a different-sized creature', () => {
    // The rule the down-state fix is about: a drawing of a thing lying
    // down is the same thing. Its height on screen may drop — a lying
    // body is shorter than a standing one — but not past half, which is
    // what "a huge picture in the middle of the screen" looked like
    // from the other direction.
    for (const [id, frame] of Object.entries(SPRITE_FRAMES)) {
      for (const [state, tweak] of Object.entries(frame.states ?? {})) {
        if (tweak?.scale === undefined) continue;
        // NOT `<= standing`, which is what this said until Gald's
        // poses stopped sharing a canvas. His flinch is drawn on a
        // 1145x1374 portrait where his standing figure is a 1536x1024
        // landscape, so the same man needs a LARGER share of the stage
        // to come out the same size — 0.58 against 0.44 draws his head
        // within two percent of his standing one, measured. What this
        // guard is actually for is the runaway: a per-state number that
        // fills the screen with a face. Half again is past any honest
        // change of canvas and well short of that.
        expect(tweak.scale, `${id}/${state} has run away from standing`).toBeLessThanOrEqual(
          frame.scale * 1.5,
        );
        expect(tweak.scale, `${id}/${state} is still the same creature`).toBeGreaterThanOrEqual(
          frame.scale * 0.4,
        );
      }
    }
  });

  it('says out loud which entries are standing in for art nobody has drawn', () => {
    // A stand-in scale is a promise to revisit, so it cannot be quiet.
    for (const [id, frame] of Object.entries(SPRITE_FRAMES)) {
      if (frame.band === 'CHIBI') {
        expect(frame.standIn, `${id} is chibi-scaled and must say it is a stand-in`).toBe(true);
      }
    }
  });

  it('measures everybody against the stage rather than their own file', () => {
    // The same character on a taller stage is taller, in proportion.
    const short = spriteHeight('gald', 'battle_idle', 300);
    const tall = spriteHeight('gald', 'battle_idle', 600);
    expect(tall).toBe(short * 2);
  });

  it('draws a creature nobody has registered as a person, not as a giant', () => {
    expect(frameOf('unheard_of')).toBe(DEFAULT_FRAME);
    expect(spriteHeight('unheard_of', 'front', 300)).toBe(Math.round(300 * DEFAULT_FRAME.scale));
  });

  it('shrinks a moss rabbit lying down rather than filling the screen with it', () => {
    const standing = spriteHeight('moss_rabbit', 'front', 300);
    const lying = spriteHeight('moss_rabbit', 'down', 300);
    expect(lying).toBeLessThan(standing);
    // And the two are still recognisably one animal.
    expect(lying / standing).toBeGreaterThan(0.5);
  });

  it('falls back to the standing size for a pose with no opinion', () => {
    expect(spriteHeight('moss_rabbit', 'attack', 300)).toBe(
      spriteHeight('moss_rabbit', 'front', 300),
    );
    expect(spriteHeight('moss_rabbit', null, 300)).toBe(spriteHeight('moss_rabbit', 'front', 300));
  });

  it('has no nudges nobody asked for', () => {
    expect(spriteOffset('moss_rabbit', 'front', STAGE)).toEqual({ x: 0, y: 0 });
  });
});
