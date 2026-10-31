import { describe, expect, it } from 'vitest';
import { COLLAPSE_CRACKS, COLLAPSE_SHARDS, SUCTION_CRYSTALS, SUCTION_MOTES, SUCTION_STREAKS, collapseCentre, collapseSuction, kaosCollapse } from './kaosCollapse';

describe('《双極臨界 → 界核崩壊》 on the screen', () => {
  it('the core forms over the middle of those struck — kept clear of the edges and of the HUD along the bottom', () => {
    expect(collapseCentre([{ x: 20, y: 40 }, { x: 40, y: 50 }])).toEqual({ x: 30, y: 45 });
    expect(collapseCentre([{ x: 2, y: 90 }])).toEqual({ x: 18, y: 58 });
    expect(collapseCentre([])).toEqual({ x: 32, y: 44 });
  });

  it('the same collapse every time: the cracks out from the core, the shards around it', () => {
    const a = kaosCollapse([{ x: 30, y: 45 }]);
    expect(kaosCollapse([{ x: 30, y: 45 }])).toEqual(a);
    expect(a.cracks).toHaveLength(COLLAPSE_CRACKS);
    expect(a.shards).toHaveLength(COLLAPSE_SHARDS);
    for (const d of a.cracks) expect(d.startsWith('M30 45')).toBe(true);
    // All the way round: shards to its left and right, above and below.
    expect(a.shards.some((s) => s.dx < -10) && a.shards.some((s) => s.dx > 10)).toBe(true);
    expect(a.shards.some((s) => s.dy < -10) && a.shards.some((s) => s.dy > 10)).toBe(true);
    expect(new Set(a.shards.map((s) => s.tone))).toEqual(new Set(['gold', 'white', 'violet']));
  });

  it('the suction (v2): motes, light and crystals from all round, far out, each going round on its way in — the same every time', () => {
    const { motes, crystals } = collapseSuction();
    expect(collapseSuction()).toEqual({ motes, crystals });
    expect(motes.filter((m) => !m.streak)).toHaveLength(SUCTION_MOTES);
    expect(motes.filter((m) => m.streak)).toHaveLength(SUCTION_STREAKS);
    expect(crystals).toHaveLength(SUCTION_CRYSTALS);
    // White, gold, purple and black-purple — never purple alone.
    expect(new Set(motes.map((m) => m.tone))).toEqual(new Set(['white', 'gold', 'violet', 'dark']));
    expect(new Set(crystals.map((c) => c.tone))).toEqual(new Set(['violet', 'silver']));
    // From every side (each quarter round the point), and a spiral each: never straight in.
    for (const q of [0, 90, 180, 270]) expect(motes.some((m) => m.a >= q && m.a < q + 90)).toBe(true);
    for (const m of [...motes, ...crystals]) expect(m.turn).toBeGreaterThanOrEqual(40);
    // Far out, and every mote let go in the first half of the pull (so all are in before the stillness).
    for (const m of motes) expect(m.far).toBeGreaterThanOrEqual(0.42);
    for (const m of motes) expect(m.start).toBeLessThanOrEqual(0.5);
  });
});
