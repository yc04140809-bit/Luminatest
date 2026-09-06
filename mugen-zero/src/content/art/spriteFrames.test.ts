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
      expect(frame.scale, `${id} standing`).toBeGreaterThanOrEqual(band.min);
      expect(frame.scale, `${id} standing`).toBeLessThanOrEqual(band.max);
    }
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
        expect(tweak.scale, `${id}/${state} is not larger than standing`).toBeLessThanOrEqual(
          frame.scale,
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
