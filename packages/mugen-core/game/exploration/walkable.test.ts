import { describe, it, expect } from 'vitest';
import {
  FIELD_MAX_ASPECT,
  groundFraction,
  FIELD_MIN_ASPECT,
  GREENWOOD_GROUND,
  fieldForScreen,
  clampToGround,
  edgeZoneAt,
  groundPoint,
  groundRowAt,
  isWalkable,
  type FieldSize,
} from './walkable';

const SIZE: FieldSize = { width: 640, height: 360 };
const band = GREENWOOD_GROUND;

describe('the ground', () => {
  it('is the bottom of the field, not all of it', () => {
    // The sky, the canopy and the far bank are a picture, not a floor.
    expect(isWalkable(band, SIZE, { x: 320, y: 20 })).toBe(false);
    expect(isWalkable(band, SIZE, { x: 320, y: 120 })).toBe(false);
    expect(isWalkable(band, SIZE, { x: 320, y: 320 })).toBe(true);
  });

  it('narrows going away from the camera', () => {
    const near = groundRowAt(band, SIZE, 0.94 * SIZE.height);
    const far = groundRowAt(band, SIZE, 0.57 * SIZE.height);
    expect(far.right - far.left).toBeLessThan(near.right - near.left);
    // And it is symmetrical: the path runs up the middle.
    expect(near.left + near.right).toBeCloseTo(SIZE.width, 5);
    expect(far.left + far.right).toBeCloseTo(SIZE.width, 5);
  });

  it('keeps the player out of the trees at the sides', () => {
    const y = 0.7 * SIZE.height;
    expect(isWalkable(band, SIZE, { x: 4, y })).toBe(false);
    expect(isWalkable(band, SIZE, { x: SIZE.width - 4, y })).toBe(false);
  });
});

describe('a tap that is not on the ground', () => {
  it('becomes the nearest place that is, rather than nothing at all', () => {
    // Tapping a tree means "walk to the foot of that tree", not "do
    // nothing" — swallowing the tap is how a forest starts feeling
    // broken exactly where people press.
    const up = clampToGround(band, SIZE, { x: 320, y: 10 });
    expect(isWalkable(band, SIZE, up)).toBe(true);
    expect(up.x).toBe(320);
    expect(up.y).toBeCloseTo(band.top * SIZE.height, 5);
  });

  it('pulls a tap past the side of the path back onto it', () => {
    const off = clampToGround(band, SIZE, { x: -50, y: 0.8 * SIZE.height });
    expect(isWalkable(band, SIZE, off)).toBe(true);
    expect(off.x).toBeGreaterThan(0);
  });

  it('pulls a tap below the field back up onto it', () => {
    const under = clampToGround(band, SIZE, { x: 320, y: SIZE.height + 80 });
    expect(isWalkable(band, SIZE, under)).toBe(true);
  });

  it('leaves a tap that is already on the ground exactly where it was', () => {
    const on = { x: 300, y: 0.8 * SIZE.height };
    expect(clampToGround(band, SIZE, on)).toEqual(on);
  });

  it('always lands somewhere walkable, wherever it is tapped', () => {
    for (let x = -100; x <= SIZE.width + 100; x += 37) {
      for (let y = -100; y <= SIZE.height + 100; y += 29) {
        expect(isWalkable(band, SIZE, clampToGround(band, SIZE, { x, y }))).toBe(true);
      }
    }
  });
});

describe('places on the ground', () => {
  it('are on it by construction, at every corner of the band', () => {
    for (const along of [0, 0.25, 0.5, 0.75, 1]) {
      for (const depth of [0, 0.5, 1]) {
        expect(isWalkable(band, SIZE, groundPoint(band, SIZE, along, depth))).toBe(true);
      }
    }
  });

  it('run left to right along the path', () => {
    expect(groundPoint(band, SIZE, 0.1, 0.5).x).toBeLessThan(groundPoint(band, SIZE, 0.9, 0.5).x);
  });
});

describe('the two ends of the path', () => {
  it('names the far end LEFT and the way in RIGHT', () => {
    expect(edgeZoneAt(band, SIZE, groundPoint(band, SIZE, 0, 0.7))).toBe('LEFT');
    expect(edgeZoneAt(band, SIZE, groundPoint(band, SIZE, 1, 0.7))).toBe('RIGHT');
  });

  it('says nothing about the middle of the path', () => {
    expect(edgeZoneAt(band, SIZE, groundPoint(band, SIZE, 0.5, 0.7))).toBeNull();
  });

  it('says nothing about somewhere that is not ground at all', () => {
    expect(edgeZoneAt(band, SIZE, { x: 4, y: 10 })).toBeNull();
  });
});


describe('a field shaped like the screen', () => {
  it('keeps its height and takes the screen\'s proportions', () => {
    const f = fieldForScreen(844, 390);
    expect(f.height).toBe(360);
    expect(f.width / f.height).toBeCloseTo(844 / 390, 2);
  });

  it('is the same game on every phone: only the width moves', () => {
    for (const [w, h] of [
      [800, 360],
      [844, 390],
      [915, 412],
    ]) {
      const f = fieldForScreen(w, h);
      expect(f.height).toBe(360);
      expect(f.width).toBeGreaterThan(f.height);
    }
  });

  it('refuses to become a letterbox slit or a square', () => {
    expect(fieldForScreen(4000, 300).width / 360).toBeCloseTo(FIELD_MAX_ASPECT, 5);
    expect(fieldForScreen(300, 400).width / 360).toBeCloseTo(FIELD_MIN_ASPECT, 5);
  });

  it('falls back to the standard field for a screen with no size', () => {
    expect(fieldForScreen(0, 0)).toEqual({ width: 640, height: 360 });
  });

  it('still puts every ground rule on the ground, whatever the width', () => {
    for (const [w, h] of [
      [800, 360],
      [915, 412],
      [1280, 720],
    ]) {
      const f = fieldForScreen(w, h);
      for (const along of [0, 0.5, 1]) {
        expect(isWalkable(band, f, groundPoint(band, f, along, 0.5))).toBe(true);
      }
    }
  });
});


describe('a place given as fractions of the field', () => {
  it('is the same place as the pixels, whatever the field size', () => {
    for (const size of [
      { width: 640, height: 360 },
      { width: 844, height: 390 },
      { width: 1280, height: 420 },
    ]) {
      for (const [along, depth] of [
        [0.1, 0.2],
        [0.5, 0.5],
        [0.9, 0.95],
      ]) {
        const px = groundPoint(band, size, along, depth);
        const fr = groundFraction(band, along, depth);
        expect(fr.fx * size.width).toBeCloseTo(px.x, 5);
        expect(fr.fy * size.height).toBeCloseTo(px.y, 5);
      }
    }
  });
});
