import { describe, expect, it } from 'vitest';
import { GREENWOOD_WALK } from '@mugen/content/exploration/greenwoodWalk';
import { DEPTH, HERO_END, HERO_START, STOP_GAP, heroX, layerShift, nextStop, paintingX, stopFor, stopsFor } from './walkPath';

describe('the walk, as arithmetic', () => {
  it('goes right to left: the party from right to left, the painting sliding right behind it', () => {
    expect(heroX(0)).toBe(HERO_START);
    expect(heroX(1)).toBeCloseTo(HERO_END);
    expect(heroX(0)).toBeGreaterThan(heroX(1));
    expect(layerShift(0, 1)).toBeLessThan(layerShift(1, 1));
    expect(layerShift(1, 1)).toBeCloseTo(0);
  });

  it('is parallax: the near layer slides further than the painting, the far ones less', () => {
    const slide = (d: number) => layerShift(1, d) - layerShift(0, d);
    expect(slide(DEPTH.near)).toBeGreaterThan(slide(DEPTH.painting));
    expect(slide(DEPTH.painting)).toBeGreaterThan(slide(DEPTH.light));
    expect(slide(DEPTH.light)).toBeGreaterThan(slide(DEPTH.mist));
  });

  it('stops just to the right of each thing in the forest, every one of them reachable', () => {
    for (const p of GREENWOOD_WALK.points) {
      const t = stopFor(p.at.x);
      expect(t, p.id).toBeGreaterThan(0);
      expect(t, p.id).toBeLessThan(1);
      expect(heroX(t) - paintingX(p.at.x, t), p.id).toBeCloseTo(STOP_GAP);
    }
  });

  it('walks stop to stop, both ways, and says when there is nowhere further', () => {
    const stops = stopsFor(GREENWOOD_WALK.points.map((p) => p.at.x));
    expect(stops[0]).toBe(0);
    // The old tree stands at the very end of the path, so its stop is the end.
    expect(stops[stops.length - 1]).toBeGreaterThan(0.95);
    expect(stops.length).toBeGreaterThanOrEqual(GREENWOOD_WALK.points.length + 1);
    for (const p of GREENWOOD_WALK.points) expect(stops, p.id).toContain(stopFor(p.at.x));
    expect(nextStop(stops, 0, 'left')).toBe(stops[1]);
    expect(nextStop(stops, stops[1], 'right')).toBe(0);
    expect(nextStop(stops, 0, 'right')).toBeNull();
    expect(nextStop(stops, stops[stops.length - 1], 'left')).toBeNull();
  });
});

describe('a thing ahead is noticed only when near', () => {
  it('no glint from afar; faint as they come near; full beside it', async () => {
    const { APPROACH, glintStrength } = await import('./walkPath');
    expect(glintStrength(APPROACH)).toBe(0);
    expect(glintStrength(0.5)).toBe(0);
    expect(glintStrength(APPROACH * 0.9)).toBeGreaterThan(0);
    expect(glintStrength(APPROACH * 0.9)).toBeLessThan(0.5);
    expect(glintStrength(APPROACH * 0.5)).toBeLessThan(glintStrength(APPROACH * 0.1));
    expect(glintStrength(0)).toBe(1);
  });
});

describe('between two things, nothing glints', () => {
  it('neighbouring things in the forest are further apart than both their glints together', async () => {
    const { APPROACH } = await import('./walkPath');
    for (const world of [[], ['PLAYER_SPARED_GALD']]) {
      const { pointsFor } = await import('@mugen/content/exploration/walkScene');
      const xs = pointsFor(GREENWOOD_WALK, { known: new Set(world), day: 1 }).map((p) => stopFor(p.at.x)).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(2 * APPROACH);
    }
  });
});

describe('古代遺跡 on the same walk', () => {
  it('every thing is reachable, and no two glints overlap', async () => {
    const { APPROACH } = await import('./walkPath');
    const { RUINS_WALK } = await import('@mugen/content/exploration/ruinsWalk');
    const ts = RUINS_WALK.points.map((p) => stopFor(p.at.x)).sort((a, b) => a - b);
    for (const t of ts) {
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThanOrEqual(1);
    }
    for (let i = 1; i < ts.length; i++) expect(ts[i] - ts[i - 1]).toBeGreaterThan(2 * APPROACH);
  });
});

describe('a tap on the ground', () => {
  it('sends the leader to stand under the spot that was touched', async () => {
    const { tapToT } = await import('./walkPath');
    for (const t of [0, 0.3, 0.7]) {
      for (const x of [0.3, 0.5, 0.7]) {
        const to = tapToT(x, t);
        if (to <= 0 || to >= 1) continue;
        // Where the touched spot of the painting will be once he is there.
        const px = (x - layerShift(t, 1)) / 1.3;
        expect(heroX(to)).toBeCloseTo(paintingX(px, to));
      }
    }
  });

  it('left of him walks left, right of him walks right, and the walk’s ends hold', async () => {
    const { tapToT } = await import('./walkPath');
    const t = 0.5;
    expect(tapToT(heroX(t) - 0.2, t)).toBeGreaterThan(t);
    expect(tapToT(heroX(t) + 0.2, t)).toBeLessThan(t);
    expect(tapToT(-5, t)).toBe(1);
    expect(tapToT(5, t)).toBe(0);
  });

  it('near a thing it stops beside the thing; anywhere else it stops where it was told', async () => {
    const { settleAt, SNAP } = await import('./walkPath');
    const xs = GREENWOOD_WALK.points.map((p) => p.at.x);
    for (const x of xs) {
      const s = stopFor(x);
      expect(settleAt(s + SNAP * 0.8, xs)).toBe(s);
      expect(settleAt(s - SNAP * 0.8, xs)).toBe(s);
    }
    // Halfway between the first two things: free ground.
    const ss = xs.map(stopFor).sort((a, b) => a - b);
    const mid = (ss[0] + ss[1]) / 2;
    expect(settleAt(mid, xs)).toBe(mid);
  });
});

describe('「！」 on screen', () => {
  it('seen from well before the glint, so "there is something over there" comes first', async () => {
    const { APPROACH, MARK_RANGE } = await import('./walkPath');
    expect(MARK_RANGE).toBeGreaterThan(3 * APPROACH);
  });

  it('as tall as a thumb can find on a phone held sideways, never a sign that fills the screen', async () => {
    const { markHeight } = await import('./walkPath');
    expect(markHeight(300)).toBe(27);
    expect(markHeight(390)).toBeCloseTo(35.1, 5);
    expect(markHeight(900)).toBe(40);
  });

  it('stands at the thing, but never up under the name and the words', async () => {
    const { MARK_CEILING, markHeight, markTipY } = await import('./walkPath');
    expect(markTipY(250, 412)).toBe(250);
    expect(markTipY(20, 412)).toBe(MARK_CEILING + markHeight(412));
    expect(markTipY(-100, 300) - markHeight(300)).toBe(MARK_CEILING);
    // A caption that runs to two lines ends further down; the marks stand under it.
    expect(markTipY(20, 412, 108)).toBe(108 + markHeight(412));
    expect(markTipY(20, 412, 30)).toBe(MARK_CEILING + markHeight(412));
  });
});
