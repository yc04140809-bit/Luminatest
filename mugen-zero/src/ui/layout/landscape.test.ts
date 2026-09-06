import { describe, it, expect } from 'vitest';
import { stageFor, STAGE_ASPECT, MAX_STAGE_ASPECT } from './landscape';

const aspect = (box: { width: number; height: number }) => box.width / box.height;

describe('the landscape stage', () => {
  it('gives a phone held sideways its whole screen', () => {
    // Not a 16:9 box with bars down both sides: the phone is already
    // the right way round, and the game should use all of it.
    expect(stageFor(844, 390)).toEqual({ width: 844, height: 390, portraitHost: false });
  });

  it('never turns anything, however the window is held', () => {
    // The property this file exists for. A stage is a width and a
    // height and nothing else — there is no rotation to get wrong, and
    // no way for text to end up running up the side of a phone.
    for (const [w, h] of [
      [390, 844],
      [844, 390],
      [600, 600],
      [1280, 720],
    ]) {
      const box = stageFor(w, h);
      expect(Object.keys(box).sort()).toEqual(['height', 'portraitHost', 'width']);
      expect(box.width).toBeGreaterThanOrEqual(box.height);
    }
  });

  it('shrinks to fit a phone held upright instead of rotating the game', () => {
    const box = stageFor(390, 844);
    expect(box.portraitHost).toBe(true);
    // Landscape-shaped, as wide as the window, and small enough to sit
    // inside it with room to spare.
    expect(box.width).toBe(390);
    expect(aspect(box)).toBeCloseTo(STAGE_ASPECT, 1);
    expect(box.height).toBeLessThan(844);
  });

  it('never lets the stage stick out of the window', () => {
    for (const [w, h] of [
      [390, 844],
      [844, 390],
      [600, 600],
      [1024, 768],
      [2560, 800],
      [360, 800],
      [915, 412],
    ]) {
      const box = stageFor(w, h);
      expect(box.width, `${w}x${h} width`).toBeLessThanOrEqual(w);
      expect(box.height, `${w}x${h} height`).toBeLessThanOrEqual(h);
    }
  });

  it('keeps a nearly square window inside the shape the game is designed for', () => {
    // A 600x600 window is landscape by the letter of it, but a stage
    // that shape is not a battlefield. It gets 16:9, letterboxed.
    const box = stageFor(600, 600);
    expect(box.portraitHost).toBe(false);
    expect(aspect(box)).toBeCloseTo(STAGE_ASPECT, 1);
  });

  it('stops widening once the window is absurd', () => {
    const box = stageFor(2560, 800);
    expect(aspect(box)).toBeLessThanOrEqual(MAX_STAGE_ASPECT + 0.01);
    expect(box.height).toBe(800);
  });

  it('survives a zero-sized window instead of producing a negative stage', () => {
    expect(stageFor(0, 0)).toEqual({ width: 0, height: 0, portraitHost: false });
    expect(stageFor(-10, 40)).toEqual({ width: 0, height: 40, portraitHost: true });
  });
});
