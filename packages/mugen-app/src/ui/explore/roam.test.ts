import { describe, expect, it } from 'vitest';
import { RUINS_WALK } from '@mugen/content/exploration/ruinsWalk';
import {
  FAR_SCALE,
  NOTICE,
  REACH,
  SNAP,
  alongTrail,
  depthScale,
  dist,
  onFloor,
  pickFind,
  pickSpot,
  standBeside,
  toFloor,
} from './roam';

const roam = RUINS_WALK.roam!;
const square = [
  { x: 0.2, y: 0.5 },
  { x: 0.8, y: 0.5 },
  { x: 0.8, y: 0.9 },
  { x: 0.2, y: 0.9 },
];

describe('the floor', () => {
  it('a point is on it or not', () => {
    expect(onFloor({ x: 0.5, y: 0.7 }, square)).toBe(true);
    expect(onFloor({ x: 0.5, y: 0.3 }, square)).toBe(false);
    expect(onFloor({ x: 0.9, y: 0.7 }, square)).toBe(false);
  });

  it('a touch on the floor walks to that very spot', () => {
    expect(toFloor({ x: 0.4, y: 0.6 }, square)).toEqual({ x: 0.4, y: 0.6 });
  });

  it('a touch on a wall or the sky walks to the floor nearest it, just inside', () => {
    const up = toFloor({ x: 0.5, y: 0.2 }, square);
    expect(onFloor(up, square)).toBe(true);
    expect(up.x).toBeCloseTo(0.5, 2);
    expect(up.y).toBeGreaterThan(0.5);
    expect(up.y).toBeLessThan(0.52);
    const side = toFloor({ x: 0.95, y: 0.7 }, square);
    expect(onFloor(side, square)).toBe(true);
    expect(side.x).toBeLessThan(0.8);
    expect(side.x).toBeGreaterThan(0.78);
  });
});

describe('depth: smaller farther back, never a jump', () => {
  it('0.8 at the farthest floor, 1 at the nearest, and in between in between', () => {
    expect(depthScale(0.47, 0.47, 0.67)).toBeCloseTo(FAR_SCALE, 6);
    expect(depthScale(0.67, 0.47, 0.67)).toBe(1);
    expect(depthScale(0.57, 0.47, 0.67)).toBeCloseTo(0.9, 6);
    // Beyond either end it holds, it does not keep growing or shrinking.
    expect(depthScale(0.2, 0.47, 0.67)).toBeCloseTo(FAR_SCALE, 6);
    expect(depthScale(0.95, 0.47, 0.67)).toBe(1);
  });

  it('within what the brief asks: farthest 0.78–0.85, nearest 1.0', () => {
    expect(FAR_SCALE).toBeGreaterThanOrEqual(0.78);
    expect(FAR_SCALE).toBeLessThanOrEqual(0.85);
  });
});

describe('Kaos, a step behind along the way he came', () => {
  it('stands the gap back along the trail, round corners too', () => {
    const trail = [
      { x: 0.5, y: 0.8 },
      { x: 0.5, y: 0.6 },
      { x: 0.4, y: 0.6 },
    ];
    expect(alongTrail(trail, 0.05)).toEqual({ x: 0.45, y: 0.6 });
    const round = alongTrail(trail, 0.1 + 0.05);
    expect(round.x).toBeCloseTo(0.5, 6);
    expect(round.y).toBeGreaterThan(0.6);
  });

  it('with too little trail, at its start', () => {
    expect(alongTrail([{ x: 0.3, y: 0.6 }, { x: 0.31, y: 0.6 }], 0.5)).toEqual({ x: 0.3, y: 0.6 });
  });
});

describe('small finds', () => {
  const pool = roam.discoveries;

  it('the same one does not come round again while it is among the recent', () => {
    const recent = pool.slice(0, 6).map((d) => d.id);
    for (let i = 0; i < 50; i++) {
      const d = pickFind(pool, recent, [], () => i / 50)!;
      expect(recent).not.toContain(d.id);
    }
  });

  it('nor one already waiting', () => {
    const waiting = [pool[0].id];
    for (let i = 0; i < 20; i++) expect(pickFind(pool, [], waiting, () => i / 20)!.id).not.toBe(pool[0].id);
  });

  it('when everything was read lately, the one read longest ago comes round', () => {
    const all = pool.map((d) => d.id);
    expect(pickFind(pool, all, [all[0]])!.id).toBe(all[1]);
  });

  it('turns up somewhere else: out of notice, off recent spots, off the place’s own things', () => {
    const hero = roam.start;
    const avoid = RUINS_WALK.points.map((p) => p.stand!);
    for (let i = 0; i < 40; i++) {
      const s = pickSpot(roam.spots, hero, avoid, [0, 1], () => i / 40)!;
      expect(s).not.toBeNull();
      expect([0, 1]).not.toContain(s);
      expect(dist(roam.spots[s], hero)).toBeGreaterThan(NOTICE);
      for (const a of avoid) expect(dist(roam.spots[s], a)).toBeGreaterThan(SNAP);
    }
  });

  it('every spot can be stood beside, on the floor', () => {
    for (const s of roam.spots) {
      const at = standBeside(s, roam.floor);
      expect(onFloor(at, roam.floor)).toBe(true);
      expect(dist(at, s)).toBeLessThan(NOTICE);
    }
  });
});

describe('the ruins, walked about in', () => {
  it('the start, every spot and where each thing is looked from are on the floor', () => {
    expect(onFloor(roam.start, roam.floor)).toBe(true);
    for (const s of roam.spots) expect(onFloor(s, roam.floor)).toBe(true);
    for (const p of RUINS_WALK.points) expect(onFloor(toFloor(p.stand!, roam.floor), roam.floor), p.id).toBe(true);
  });

  it('nothing is noticed from where they first stand: the walk comes first', () => {
    for (const p of RUINS_WALK.points) expect(dist(p.stand!, roam.start)).toBeGreaterThan(NOTICE);
  });

  it('beside one of its things, the next is not yet in notice — one 「！」 at a time', () => {
    const stands = RUINS_WALK.points.map((p) => p.stand!);
    for (const a of stands) for (const b of stands) if (a !== b) expect(dist(a, b)).toBeGreaterThan(NOTICE);
  });

  it('the spots keep clear of the things, so a find never sits on one', () => {
    for (const s of roam.spots) for (const p of RUINS_WALK.points) expect(dist(s, p.stand!)).toBeGreaterThan(SNAP);
    expect(REACH).toBeLessThan(SNAP);
  });
});

describe('how rare a find is', () => {
  it('the rainbow’s chance is visit × 0.3%, up to 3%', async () => {
    const { rainbowChance } = await import('./roam');
    expect(rainbowChance(1)).toBeCloseTo(0.003, 9);
    expect(rainbowChance(3)).toBeCloseTo(0.009, 9);
    expect(rainbowChance(10)).toBeCloseTo(0.03, 9);
    expect(rainbowChance(50)).toBeCloseTo(0.03, 9);
  });

  it('a roll under the chance is the rainbow; golden at 8%; otherwise NORMAL', async () => {
    const { rollGrade } = await import('./roam');
    // First visit: 0.3%.
    expect(rollGrade(0, 1, true, () => 0.0029)).toBe('RAINBOW');
    const seq = (...xs: number[]) => () => xs.shift()!;
    expect(rollGrade(0, 1, true, seq(0.5, 0.05))).toBe('RARE');
    expect(rollGrade(0, 1, true, seq(0.5, 0.5))).toBe('NORMAL');
    // Taken (or already seen this visit): never the rainbow, whatever the roll.
    expect(rollGrade(0, 1, false, () => 0)).toBe('RARE');
    expect(rollGrade(20, 9, false, () => 0.9)).toBe('NORMAL');
  });

  it('certain on the eighth real visit, as its fifth find — and on any visit after, until taken', async () => {
    const { rollGrade } = await import('./roam');
    const never = () => 0.99;
    for (let f = 1; f <= 4; f++) expect(rollGrade(7, f, true, never)).not.toBe('RAINBOW');
    expect(rollGrade(7, 5, true, never)).toBe('RAINBOW');
    expect(rollGrade(6, 5, true, never)).not.toBe('RAINBOW');
    expect(rollGrade(9, 6, true, never)).toBe('RAINBOW');
    expect(rollGrade(7, 5, false, never)).not.toBe('RAINBOW');
  });

  it('across visits of fifteen finds it is likelier each time, and nobody needs more than eight', async () => {
    const { rainbowChance } = await import('./roam');
    let miss = 1;
    const by: number[] = [];
    for (let v = 1; v <= 7; v++) {
      miss *= (1 - rainbowChance(v)) ** 15;
      by.push(1 - miss);
    }
    expect(by[0]).toBeGreaterThan(0.03);
    expect(by[0]).toBeLessThan(0.06);
    expect(by[4]).toBeGreaterThan(0.4);
    expect(by[4]).toBeLessThan(0.6);
    for (let i = 1; i < by.length; i++) expect(by[i]).toBeGreaterThan(by[i - 1]);
  });

  it('the ruins carry golden finds and their rainbow find', () => {
    expect(roam.rareDiscoveries!.map((d) => d.text)).toEqual(
      expect.arrayContaining(['古いコインが落ちている。', '珍しい鉱石の欠片を見つけた。', '古びた金具が土に埋もれている。']),
    );
    // A golden find is a line for now: it hands nothing over.
    for (const d of roam.rareDiscoveries!) expect(d.reward).toBeUndefined();
    expect(roam.rainbow).toEqual({ id: 'STAR_CREST_RELIC_SWORD', label: '虹色の光', equipmentId: 'weapon/star_crest_relic_sword' });
    const ids = [...roam.discoveries, ...roam.rareDiscoveries!].map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
