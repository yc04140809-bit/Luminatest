import { describe, expect, it } from 'vitest';
import { GREENWOOD_WALK } from '@mugen/content/exploration/greenwoodWalk';
import { RUINS_WALK, RUINS_WALK_AREAS_POC } from '@mugen/content/exploration/ruinsWalk';
import type { WalkAreas } from '@mugen/content/exploration/walkScene';
import { areaKind, clearLine, groundOf } from './walkArea';
import { onFloor, toFloor } from './roam';

// The ground told apart (作者「探索画面仕様 更新指示」2026-10-17): MAIN 緑, SIDE 黄, the rest 赤.

const square = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

/** An L: a road along the bottom and a side path up its left end — the corner between them is not ground. */
const L: WalkAreas = {
  main: [square(0.1, 0.7, 0.9, 0.9)],
  side: [{ outline: square(0.1, 0.2, 0.3, 0.75), enter: 'x' }],
};

describe('areaKind', () => {
  it('MAIN, SIDE or not ground (null); a blocked outline is cut out of either', () => {
    expect(areaKind({ x: 0.5, y: 0.8 }, L)).toBe('MAIN');
    expect(areaKind({ x: 0.2, y: 0.4 }, L)).toBe('SIDE');
    expect(areaKind({ x: 0.6, y: 0.4 }, L)).toBeNull();
    const withRock: WalkAreas = { ...L, blocked: [square(0.45, 0.75, 0.55, 0.85)] };
    expect(areaKind({ x: 0.5, y: 0.8 }, withRock)).toBeNull();
    expect(areaKind({ x: 0.4, y: 0.8 }, withRock)).toBe('MAIN');
  });
});

describe('groundOf', () => {
  it('without areas: the one floor, walked in a straight line — exactly as before', () => {
    const roam = GREENWOOD_WALK.roam!;
    const g = groundOf(roam);
    for (const p of [{ x: 0.5, y: 0.1 }, { x: 0.02, y: 0.99 }, roam.start, ...roam.spots]) {
      expect(g.to(p)).toEqual(toFloor(p, roam.floor));
      expect(g.on(p)).toBe(onFloor(p, roam.floor));
    }
    expect(g.path(roam.start, roam.spots[0])).toEqual([roam.spots[0]]);
  });

  it('with areas: the way from the road to the top of the side path goes round the corner, never across what is not ground', () => {
    const g = groundOf({ floor: L.main[0], areas: L });
    const from = { x: 0.8, y: 0.8 };
    const to = { x: 0.2, y: 0.25 };
    const way = g.path(from, to);
    expect(way[way.length - 1]).toEqual(to);
    expect(way.length).toBeGreaterThan(1);
    let at = from;
    for (const next of way) {
      expect(clearLine(at, next, g.on), `${JSON.stringify(at)} → ${JSON.stringify(next)}`).toBe(true);
      at = next;
    }
    // Along the road it is straight.
    expect(g.path(from, { x: 0.2, y: 0.8 })).toEqual([{ x: 0.2, y: 0.8 }]);
  });

  it('a touch where the ground is not walks to the nearest ground, toward the touch', () => {
    const g = groundOf({ floor: L.main[0], areas: L });
    const q = g.to({ x: 0.6, y: 0.4 });
    expect(g.on(q)).toBe(true);
    const r = g.to({ x: 0.5, y: 0.97 });
    expect(g.on(r)).toBe(true);
    expect(r.y).toBeGreaterThan(0.85);
  });
});

describe('the ruins PoC (RUINS_WALK_AREAS_POC — DEBUG `&areas=1`)', () => {
  const roam = RUINS_WALK_AREAS_POC.roam!;
  const g = groundOf(roam);

  it('the ruins the game walks are untouched (one floor, no areas, its own painting)', () => {
    expect(RUINS_WALK.roam!.areas).toBeUndefined();
    expect(RUINS_WALK.painting).toBeUndefined();
    expect(RUINS_WALK_AREAS_POC.painting).toBe('RUINS_PATH');
  });

  it('keeps every thing of the old: the same points, pickups (ids and contents) and finds — only where they stand moves', () => {
    const ids = (xs: readonly { id: string }[]) => xs.map((x) => x.id);
    for (const id of ids(RUINS_WALK.points)) expect(ids(RUINS_WALK_AREAS_POC.points)).toContain(id);
    expect(ids(roam.pickups!)).toEqual(ids(RUINS_WALK.roam!.pickups!));
    roam.pickups!.forEach((p, i) => expect(p.items).toEqual(RUINS_WALK.roam!.pickups![i].items));
    expect(roam.discoveries).toBe(RUINS_WALK.roam!.discoveries);
    expect(roam.rainbow).toEqual(RUINS_WALK.roam!.rainbow);
    // The grid's two new blue marks.
    expect(ids(RUINS_WALK_AREAS_POC.points)).toEqual(expect.arrayContaining(['CARVED_STONE', 'FALLEN_PILLAR']));
  });

  it('everything stood on is ground: where they stop, each thing\'s stand, each pickup, each find\'s spot', () => {
    expect(g.on(roam.start), 'start').toBe(true);
    for (const p of RUINS_WALK_AREAS_POC.points) expect(g.on(p.stand!), p.id).toBe(true);
    for (const p of roam.pickups!) expect(g.on(p.at), p.id).toBe(true);
    roam.spots.forEach((s, i) => expect(g.on(s), `spot ${i}`).toBe(true));
  });

  it('the side steps are a 寄り道 with things in them, reached from the road around the rubble', () => {
    expect(g.kind({ x: 0.2, y: 0.45 })).toBe('SIDE');
    expect(g.kind(roam.start)).toBe('MAIN');
    const sidePickups = roam.pickups!.filter((p) => g.kind(p.at) === 'SIDE');
    expect(sidePickups.length).toBeGreaterThanOrEqual(2);
    const arch = RUINS_WALK_AREAS_POC.points.find((p) => p.id === 'STONE_ARCH')!;
    const way = g.path(roam.start, arch.stand!);
    let at = roam.start;
    for (const next of way) {
      expect(clearLine(at, next, g.on)).toBe(true);
      at = next;
    }
  });

  it('the rubble at the front, the low walls and the distance are not ground', () => {
    for (const p of [{ x: 0.1, y: 0.85 }, { x: 0.45, y: 0.25 }, { x: 0.6, y: 0.4 }, { x: 0.95, y: 0.35 }]) expect(g.on(p), JSON.stringify(p)).toBe(false);
  });
});
