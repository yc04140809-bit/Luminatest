import { describe, expect, it } from 'vitest';
import { COLLAPSE_CRACKS, COLLAPSE_SHARDS, collapseCentre, kaosCollapse } from './kaosCollapse';

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
});
