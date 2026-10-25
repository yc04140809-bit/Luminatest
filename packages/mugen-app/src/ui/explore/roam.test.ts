import { describe, expect, it } from 'vitest';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { RUINS_WALK } from '@mugen/content/exploration/ruinsWalk';
import { GREENWOOD_WALK } from '@mugen/content/exploration/greenwoodWalk';
import {
  FAR_SCALE,
  NOTICE,
  REACH,
  SNAP,
  alongTrail,
  findBuzz,
  findJolt,
  joltDue,
  JOLT_GAP_MS,
  depthScale,
  dist,
  onFloor,
  pickFind,
  pickSpot,
  standBeside,
  toFloor,
} from './roam';
import { groundOf } from './walkArea';

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

  it('never turns up where it would sit behind the doors (作者 2026-10-25): a spot `hidden` says so is never chosen', () => {
    const hero = roam.start;
    const hidden = (p: { x: number; y: number }) => p.y > 0.7 && p.x < 0.5;
    expect(roam.spots.some(hidden)).toBe(true);
    for (let i = 0; i < 40; i++) {
      const s = pickSpot(roam.spots, hero, [], [], () => i / 40, hidden);
      if (s !== null) expect(hidden(roam.spots[s])).toBe(false);
    }
    // With nothing hidden, every spot may be chosen, as before.
    const any = new Set(Array.from({ length: 80 }, (_, i) => pickSpot(roam.spots, hero, [], [], () => i / 80)));
    expect([...any].some((s) => s !== null && hidden(roam.spots[s]))).toBe(true);
  });

  it('every spot can be stood beside, on the floor', () => {
    for (const s of [{ x: 0.3, y: 0.6 }, { x: 0.79, y: 0.52 }, { x: 0.5, y: 0.88 }]) {
      const at = standBeside(s, square);
      expect(onFloor(at, square)).toBe(true);
      expect(dist(at, s)).toBeLessThan(NOTICE);
    }
    // A place whose ground is told apart (the ruins, the forest): every spot is on it already.
    const g = groundOf(roam);
    for (const s of roam.spots) expect(g.on(s), JSON.stringify(s)).toBe(true);
  });
});

describe('the ruins, walked about in', () => {
  it('the start, every spot and where each thing is looked from are on the ground (the road or a way off it)', () => {
    const g = groundOf(roam);
    expect(g.on(roam.start)).toBe(true);
    for (const s of roam.spots) expect(g.on(s)).toBe(true);
    for (const p of RUINS_WALK.points) expect(g.on(p.stand!), p.id).toBe(true);
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
    // A golden find hands a material already in the catalogue over (2026-10-11) — the glass bead stays a sight.
    for (const d of roam.rareDiscoveries!) {
      if (d.id === 'GLASS_BEAD') expect(d.reward).toBeUndefined();
      else expect(itemDef(d.reward!.itemId), d.id).not.toBeNull();
    }
    expect(roam.rainbow).toEqual({ id: 'STAR_CREST_RELIC_SWORD', label: '虹色の光', equipmentId: 'weapon/star_crest_relic_sword' });
    const ids = [...roam.discoveries, ...roam.rareDiscoveries!].map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('グリーンウッドの森, walked about in the same way', () => {
  const forest = GREENWOOD_WALK.roam!;

  it('the start, every spot and where each thing is looked from are on the ground (the road or a way off it)', () => {
    const g = groundOf(forest);
    expect(g.on(forest.start)).toBe(true);
    for (const s of forest.spots) expect(g.on(s), JSON.stringify(s)).toBe(true);
    for (const p of GREENWOOD_WALK.points) expect(g.on(p.stand!), p.id).toBe(true);
  });

  it('nothing is noticed from where they first stand', () => {
    for (const p of GREENWOOD_WALK.points) expect(dist(p.stand!, forest.start), p.id).toBeGreaterThan(NOTICE);
  });

  it('its spots keep clear of its things, and high enough to stay above the forest’s doors', () => {
    for (const s of forest.spots) {
      for (const p of GREENWOOD_WALK.points) expect(dist(s, p.stand!)).toBeGreaterThan(SNAP);
      expect(s.y).toBeLessThanOrEqual(0.72);
    }
  });
});

describe('a find\'s small jolt (TIGS 2026-10-23)', () => {
  it('only for the finds worth it: none for an ordinary one, a tiny one for gold, a little more for the rainbow', () => {
    expect(findJolt('NORMAL')).toBeNull();
    expect(findJolt('RARE')).toBe('tiny');
    expect(findJolt('RAINBOW')).toBe('small');
  });

  it('the same finds buzz in the hand: none for an ordinary one, light for gold, firmer for the rainbow', () => {
    expect(findBuzz('NORMAL')).toBeNull();
    expect(findBuzz('RARE')).toBe('light');
    expect(findBuzz('RAINBOW')).toBe('rare');
    for (const g of ['NORMAL', 'RARE', 'RAINBOW'] as const) expect(findBuzz(g) === null).toBe(findJolt(g) === null);
  });

  it('never two close together', () => {
    expect(joltDue(1000, null)).toBe(true);
    expect(joltDue(1000 + JOLT_GAP_MS - 1, 1000)).toBe(false);
    expect(joltDue(1000 + JOLT_GAP_MS, 1000)).toBe(true);
  });
});

