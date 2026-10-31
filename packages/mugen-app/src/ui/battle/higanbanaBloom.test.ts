import { describe, expect, it } from 'vitest';
import { LILIES_ALONE, LILIES_EACH, PETALS, PETAL_COUNT, PETAL_VARIANTS, bloomGoneMs, higanbanaBloom } from './higanbanaBloom';

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

  it('petals over the whole screen, in layers (作者 仕上げ §4–5): a few rising off the lilies first; many small, faint, slow far behind; big, clear, fast across the front', () => {
    const { petals, lilies } = higanbanaBloom([giant]);
    expect(petals).toHaveLength(PETAL_COUNT);
    const of = (layer: string) => petals.filter((p) => p.layer === layer);
    expect(of('back')).toHaveLength(PETALS.back);
    expect(of('rise')).toHaveLength(PETALS.rise);
    expect(of('front')).toHaveLength(PETALS.front);
    // The middle depth (最終 §9 — 奥・中・手前): bigger than the far ones, smaller than the near ones, off to a side.
    const mid = of('mid');
    expect(mid).toHaveLength(PETALS.mid);
    expect(Math.min(...mid.map((p) => p.size))).toBeGreaterThan(Math.max(...of('back').map((p) => p.size)));
    expect(Math.max(...mid.map((p) => p.size))).toBeLessThan(Math.min(...of('front').map((p) => p.size)));
    expect(mid.some((p) => p.dx > 40) && mid.some((p) => p.dx < -40)).toBe(true);
    // Back: small, a little faint, slow; every way out from the lilies.
    const back = of('back');
    expect(Math.max(...back.map((p) => p.size))).toBeLessThan(Math.min(...of('front').map((p) => p.size)) / 2);
    expect(Math.max(...back.map((p) => p.alpha))).toBeLessThan(1);
    expect(Math.min(...back.map((p) => p.dur))).toBeGreaterThan(Math.max(...of('front').map((p) => p.dur)));
    expect(back.some((p) => p.dx < -30) && back.some((p) => p.dx > 30)).toBe(true);
    expect(back.some((p) => p.dy < -20) && back.some((p) => p.dy > 20)).toBe(true);
    // Rise: off the lilies, up, before the rest.
    for (const p of of('rise')) expect(p.dy).toBeLessThan(0);
    expect(Math.max(...of('rise').map((p) => p.delay))).toBeLessThan(Math.min(...back.map((p) => p.delay)));
    expect(Math.min(...petals.map((p) => p.delay))).toBeGreaterThan(Math.min(...lilies.map((l) => l.delay)));
    // Front: from off one side to past the other, both ways, turning hard.
    for (const p of of('front')) {
      expect(p.x < 0 || p.x > 100).toBe(true);
      expect(p.x + p.dx > 100 || p.x + p.dx < 0).toBe(true);
      expect(Math.abs(p.rot)).toBeGreaterThan(200);
    }
    expect(of('front').some((p) => p.dx > 0) && of('front').some((p) => p.dx < 0)).toBe(true);
  });

  it('the author\'s sixteen petals, all of them used, and the last few drifting down after the rest (作者 2026-10-25 ブラッシュアップ §2)', () => {
    const { petals } = higanbanaBloom([giant]);
    // Every petal one of the sixteen; all sixteen seen; neighbours in a layer never the same one.
    for (const p of petals) expect(Number.isInteger(p.variant) && p.variant >= 0 && p.variant < PETAL_VARIANTS).toBe(true);
    expect(new Set(petals.map((p) => p.variant)).size).toBe(PETAL_VARIANTS);
    for (const layer of ['back', 'mid', 'rise', 'front', 'drift'] as const) {
      const vs = petals.filter((p) => p.layer === layer).map((p) => p.variant);
      vs.slice(1).forEach((v, i) => expect(v).not.toBe(vs[i]));
    }
    // 余韻: high up, falling (down, not out), slowly — the last to go.
    const drift = petals.filter((p) => p.layer === 'drift');
    expect(drift).toHaveLength(PETALS.drift);
    const others = petals.filter((p) => p.layer !== 'drift');
    for (const p of drift) {
      expect(p.y).toBeLessThan(25);
      expect(p.dy).toBeGreaterThan(40);
      expect(Math.abs(p.dx)).toBeLessThan(10);
    }
    expect(Math.min(...drift.map((p) => p.delay + p.dur))).toBeGreaterThan(Math.max(...others.map((p) => p.delay + p.dur)));
    // The bloom is taken away only once every petal is down, and never before SPEED DOWN has been said
    // (640ms of dark at ×1, 380 at its floor) — nor long after.
    for (const ms of [640, 380]) {
      const gone = bloomGoneMs(ms, petals);
      for (const p of petals) expect((p.delay + p.dur) * ms).toBeLessThan(gone);
      expect(gone).toBeGreaterThanOrEqual(ms * 0.55 + 1450);
      expect(gone).toBeLessThan(ms * 0.55 + 1450 + 400);
    }
  });
});
