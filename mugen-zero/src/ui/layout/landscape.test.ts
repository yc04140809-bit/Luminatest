import { describe, it, expect } from 'vitest';
import { stageFor, STAGE_ASPECT, MIN_STAGE_ASPECT, MAX_STAGE_ASPECT } from './landscape';

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
    // Still 16:9 here, and deliberately not the looser floor a
    // landscape window gets: an upright phone is SCALED to fit, so a
    // taller stage would be a narrower play area in the units the
    // screens are written in. Landscape has no such trade.
    expect(aspect(box)).toBeCloseTo(STAGE_ASPECT, 1);
    expect(box.height).toBeLessThan(844);
  });

  it('gives a landscape window all of itself, not just a phone-shaped one', () => {
    // The reason the floor is looser than the shape the game is drawn
    // against. A window wider than it is tall is already the right way
    // round; letterboxing it for not being 16:9 made the game smaller
    // than the room it had.
    for (const [w, h] of [
      [1200, 800],
      [1024, 700],
      [900, 600],
    ]) {
      expect(stageFor(w, h), `${w}x${h}`).toEqual({ width: w, height: h, portraitHost: false });
    }
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

  it('still squares up a window that is not really landscape at all', () => {
    // A 600x600 window is landscape by the letter of it, but a stage
    // that shape is not a battlefield. It gets the narrowest allowed
    // shape, letterboxed — bigger than it used to be, and still a
    // battlefield.
    const box = stageFor(600, 600);
    expect(box.portraitHost).toBe(false);
    expect(aspect(box)).toBeCloseTo(MIN_STAGE_ASPECT, 1);
    expect(box.height).toBeGreaterThan(400);
  });

  it('stops widening once the window is absurd', () => {
    // A window wider than the cap, so the cap is what is being tested
    // rather than a coincidence. 2560×800 used to be absurd; it is 3.2
    // exactly, which is now simply the widest allowed.
    const box = stageFor(3440, 800);
    expect(aspect(box)).toBeLessThanOrEqual(MAX_STAGE_ASPECT + 0.01);
    expect(box.height).toBe(800);
    expect(box.width).toBeLessThan(3440);
  });

  /**
   * THE ONE THAT SENT THIS BACK TO BE FIXED.
   *
   * A phone held sideways with the address bar retracted is past 2.4:1,
   * and at 2.4 that cost it width it could see rather than buying it
   * height it could not. Every one of these gets its whole screen.
   */
  it('gives a phone held sideways the whole of its screen, bar or no bar', () => {
    for (const [w, h] of [
      [844, 390],
      [915, 412],
      [800, 360],
      [844, 340],
      [932, 360],
      [1000, 360],
    ]) {
      const box = stageFor(w, h);
      expect(box.width, `${w}x${h} uses the full width`).toBe(w);
      expect(box.height, `${w}x${h} uses the full height`).toBe(h);
    }
  });

  it('survives a zero-sized window instead of producing a negative stage', () => {
    expect(stageFor(0, 0)).toEqual({ width: 0, height: 0, portraitHost: false });
    expect(stageFor(-10, 40)).toEqual({ width: 0, height: 40, portraitHost: true });
  });
});
