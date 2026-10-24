import { describe, expect, it } from 'vitest';
import { LILIES_ALONE, LILIES_EACH, NEAR_PETALS, PETAL_COUNT, higanbanaBloom } from './higanbanaBloom';

// 《彼岸花》's ground (作者 2026-10-24 最終仕様 §7–9): it splits under them, the lilies come up out of the cracks,
// petals over the whole screen.

const giant = { x: 40, y: 70, w: 46 };
const small = (x: number) => ({ x, y: 72, w: 14 });

describe('the ground split, and the lilies out of it', () => {
  it('is the same bloom every time', () => {
    expect(higanbanaBloom([giant])).toEqual(higanbanaBloom([giant]));
  });

  it('a crack under each one struck, running out both ways along the ground from its feet', () => {
    const { cracks } = higanbanaBloom([small(20), small(35), small(50)]);
    expect(cracks).toHaveLength(3);
    for (const [i, d] of cracks.entries()) {
      const xs = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
      const x = [20, 35, 50][i];
      expect(Math.min(...xs)).toBeLessThan(x - 4);
      expect(Math.max(...xs)).toBeGreaterThan(x + 4);
    }
  });

  it('the lilies stand on the cracks: the first, the biggest, at its feet; then on its arms — fewer each with several', () => {
    const one = higanbanaBloom([giant]);
    expect(one.lilies).toHaveLength(LILIES_ALONE);
    expect(one.lilies[0]).toMatchObject({ x: giant.x, y: giant.y });
    expect(Math.max(...one.lilies.map((l) => l.size))).toBe(one.lilies[0].size);
    for (const l of one.lilies) expect(one.cracks[0]).toContain(`${l.x} ${l.y}`);
    const three = higanbanaBloom([small(20), small(35), small(50)]);
    expect(three.lilies).toHaveLength(3 * LILIES_EACH);
  });

  it('as big as the creature allows: an ordinary one\'s smaller than a giant\'s, so they never bury it', () => {
    expect(higanbanaBloom([small(30)]).lilies[0].size).toBeLessThan(higanbanaBloom([giant]).lilies[0].size * 0.6);
  });

  it('they open one after another, all within the dark', () => {
    const { lilies } = higanbanaBloom([small(20), small(35), small(50)]);
    for (const l of lilies) expect(l.delay).toBeGreaterThanOrEqual(0);
    for (const l of lilies) expect(l.delay).toBeLessThan(0.5);
    expect(new Set(lilies.map((l) => l.delay)).size).toBeGreaterThan(1);
  });

  it('petals over the whole screen: from the lilies, every way out, a few near the camera (big) — after the lilies have opened', () => {
    const { petals, lilies } = higanbanaBloom([giant]);
    expect(petals).toHaveLength(PETAL_COUNT);
    expect(petals.filter((p) => p.scale >= 3)).toHaveLength(NEAR_PETALS);
    expect(petals.some((p) => p.dx < -30) && petals.some((p) => p.dx > 30)).toBe(true);
    expect(petals.some((p) => p.dy < -20) && petals.some((p) => p.dy > 20)).toBe(true);
    expect(Math.min(...petals.map((p) => p.delay))).toBeGreaterThan(Math.min(...lilies.map((l) => l.delay)));
  });
});
