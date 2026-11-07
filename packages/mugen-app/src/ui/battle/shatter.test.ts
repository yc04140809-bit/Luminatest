import { describe, expect, it } from 'vitest';
import { RAYS, RINGS, shatter } from './shatter';

// BREAK's glass (作者 実機 2026-10-24): the whole screen cracks from the point struck and flies apart.

describe('the screen breaking like glass', () => {
  it('is the same break every time', () => {
    expect(shatter(30, 45)).toEqual(shatter(30, 45));
  });

  it('cracks out from the point struck: triangles at it, four-sided pieces beyond, every one of them', () => {
    const { shards, cracks } = shatter(30, 45);
    expect(shards).toHaveLength(RAYS * RINGS.length);
    expect(cracks).toHaveLength(2 * RAYS * RINGS.length);
    const inner = shards.filter((s) => s.ring === 0);
    expect(inner).toHaveLength(RAYS);
    for (const s of inner) expect(s.points.startsWith('30% 45%')).toBe(true);
    for (const s of shards.filter((k) => k.ring > 0)) expect(s.points.split(', ')).toHaveLength(4);
  });

  it('leaves no gap: the pieces either side of a crack share its ends', () => {
    const { shards } = shatter(40, 50);
    const corners = (s: (typeof shards)[number]) => s.points.split(', ');
    for (let j = 1; j < RINGS.length; j++) {
      for (let i = 0; i < RAYS; i++) {
        const me = corners(shards[j * RAYS + i]);
        const next = corners(shards[j * RAYS + ((i + 1) % RAYS)]);
        // This piece's far side is the next one's near side.
        expect(next[0]).toBe(me[3]);
        expect(next[1]).toBe(me[2]);
        // Its inner edge is the outer edge of the piece inside it.
        const inside = corners(shards[(j - 1) * RAYS + i]);
        expect(me[0]).toBe(inside[inside.length === 3 ? 1 : 1]);
      }
    }
  });

  it('covers the screen: the last ring is past every corner, wherever the point is', () => {
    for (const [x, y] of [
      [10, 20],
      [30, 45],
      [90, 80],
    ]) {
      const outer = shatter(x, y).shards.filter((s) => s.ring === RINGS.length - 1);
      const xs = outer.flatMap((s) => s.points.split(', ').map((p) => Number(p.split('% ')[0])));
      const ys = outer.flatMap((s) => s.points.split(', ').map((p) => Number(p.split('% ')[1].replace('%', ''))));
      expect(Math.min(...xs)).toBeLessThan(0);
      expect(Math.max(...xs)).toBeGreaterThan(100);
      expect(Math.min(...ys)).toBeLessThan(0);
      expect(Math.max(...ys)).toBeGreaterThan(100);
    }
  });

  it('each piece is drawn at its own size, on the screen, and flies as far as it would at the screen\'s', () => {
    for (const s of shatter(30, 45).shards) {
      expect(s.box.x).toBeGreaterThanOrEqual(-2);
      expect(s.box.x + s.box.w).toBeLessThanOrEqual(102.01);
      expect(s.box.w).toBeLessThanOrEqual(104);
      expect(s.local.split(', ')).toHaveLength(s.points.split(', ').length);
      expect((s.tx / 100) * s.box.w).toBeCloseTo(s.dx, 0);
      expect((s.ty / 100) * s.box.h).toBeCloseTo(s.dy, 0);
    }
  });

  it('flies apart: away from the point and falling, turning; the pieces nearest it let go first', () => {
    const { shards } = shatter(30, 45);
    for (const s of shards) {
      expect(s.dy).toBeGreaterThan(0);
      expect(Math.abs(s.rot)).toBeGreaterThan(0);
      // Sideways, away from the point.
      if (Math.abs(s.cx - 30) > 5) expect(Math.sign(s.dx)).toBe(Math.sign(s.cx - 30));
    }
    const firstOf = (ring: number) => Math.min(...shards.filter((s) => s.ring === ring).map((s) => s.delay));
    expect(firstOf(0)).toBeLessThan(firstOf(RINGS.length - 1));
  });
});
