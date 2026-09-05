import { describe, it, expect } from 'vitest';
import { stageFor, stageTransform } from './landscape';

describe('the landscape stage', () => {
  it('leaves a landscape window alone', () => {
    expect(stageFor(844, 390)).toEqual({ width: 844, height: 390, rotated: false });
  });

  it('turns a phone held upright rather than offering it a portrait game', () => {
    expect(stageFor(390, 844)).toEqual({ width: 844, height: 390, rotated: true });
  });

  it('always makes the longer side the width', () => {
    for (const [w, h] of [
      [360, 800],
      [412, 915],
      [1280, 720],
      [768, 1024],
    ]) {
      const box = stageFor(w, h);
      expect(box.width).toBe(Math.max(w, h));
      expect(box.height).toBe(Math.min(w, h));
    }
  });

  it('does not turn a square window', () => {
    // Resizing a desktop window through square must not flip the game
    // back and forth.
    expect(stageFor(600, 600).rotated) .toBe(false);
  });

  it('survives a zero-sized window instead of producing a negative stage', () => {
    expect(stageFor(0, 0)).toEqual({ width: 0, height: 0, rotated: false });
    expect(stageFor(-10, 40).width).toBe(40);
  });

  it('gives a landscape window no transform at all', () => {
    expect(stageTransform(stageFor(844, 390))).toBeUndefined();
  });

  it('pushes a turned stage back by its own height, so it covers the window', () => {
    // Turned a quarter clockwise about its top-left corner, the stage
    // swings off the left edge by its height (390 here, the window's
    // width). Anything else leaves the game partly or wholly off screen.
    expect(stageTransform(stageFor(390, 844))).toBe('translateX(390px) rotate(90deg)');
  });
});
