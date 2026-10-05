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
