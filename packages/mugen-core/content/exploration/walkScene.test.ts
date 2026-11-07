import { describe, expect, it } from 'vitest';
import { ambientLinesFor, figuresFor, pointLine, pointsFor, walkConditionHolds, type WalkWorldView } from './walkScene';
import { GREENWOOD_WALK } from './greenwoodWalk';

const view = (known: string[] = [], day = 1): WalkWorldView => ({ known: new Set(known), day });

describe('walk scene conditions — read only, never written', () => {
  it('KNOWN, NOT_KNOWN and DAY_AT_LEAST say what they say', () => {
    expect(walkConditionHolds(undefined, view())).toBe(true);
    expect(walkConditionHolds({ kind: 'KNOWN', types: ['PLAYER_SPARED_GALD'] }, view())).toBe(false);
    expect(walkConditionHolds({ kind: 'KNOWN', types: ['PLAYER_SPARED_GALD'] }, view(['PLAYER_SPARED_GALD']))).toBe(true);
    expect(walkConditionHolds({ kind: 'NOT_KNOWN', types: ['PLAYER_SPARED_GALD'] }, view(['PLAYER_SPARED_GALD']))).toBe(false);
    expect(walkConditionHolds({ kind: 'DAY_AT_LEAST', day: 30 }, view([], 29))).toBe(false);
    expect(walkConditionHolds({ kind: 'DAY_AT_LEAST', day: 30 }, view([], 30))).toBe(true);
  });
});

describe('グリーンウッドの森, walked', () => {
  it('has at least two things to look at in any world, each in the painting and each with a line there', () => {
    for (const world of [view(), view(['PLAYER_KILLED_GALD'])]) {
      const points = pointsFor(GREENWOOD_WALK, world);
      expect(points.length).toBeGreaterThanOrEqual(2);
      for (const p of points) {
        expect(p.at.x).toBeGreaterThan(0);
        expect(p.at.x).toBeLessThan(1);
        expect(p.at.y).toBeGreaterThan(0);
        expect(p.at.y).toBeLessThan(1);
        expect(pointLine(p, world), p.id).toBeTruthy();
      }
    }
  });

  it('fresh footprints: one person, away from the village — nobody named, and only before the four answers', () => {
    const prints = GREENWOOD_WALK.points.find((p) => p.id === 'FRESH_FOOTPRINTS')!;
    expect(pointLine(prints, view())).toBe('湿った土に、まだ新しい足跡が残っている。\n一人分だ。村とは逆方向へ続いている。');
    expect(pointLine(prints, view())).not.toMatch(/ガルド|盗賊/);
    expect(pointsFor(GREENWOOD_WALK, view()).map((p) => p.id)).toContain('FRESH_FOOTPRINTS');
    for (const answered of ['PLAYER_KILLED_GALD', 'PLAYER_SPARED_GALD', 'PLAYER_HELPED_GALD', 'PLAYER_CAPTURED_GALD']) {
      expect(pointsFor(GREENWOOD_WALK, view([answered])).map((p) => p.id), answered).not.toContain('FRESH_FOOTPRINTS');
    }
  });

  it('the same log says something else once the four answers are given', () => {
    const log = GREENWOOD_WALK.points.find((p) => p.id === 'FALLEN_LOG')!;
    expect(pointLine(log, view())).not.toBe(pointLine(log, view(['PLAYER_HELPED_GALD'])));
  });

  it('the forest is quieter after, and the figure in the distance is gone', () => {
    const before = ambientLinesFor(GREENWOOD_WALK, view());
    const after = ambientLinesFor(GREENWOOD_WALK, view(['PLAYER_CAPTURED_GALD']));
    expect(before).toContain('遠くで枝の折れる音がした。');
    expect(after).not.toContain('遠くで枝の折れる音がした。');
    expect(after).toContain('森は、前より少し静かになった気がする。');
    expect(figuresFor(GREENWOOD_WALK, view()).map((f) => f.id)).toEqual(['GALD']);
    expect(figuresFor(GREENWOOD_WALK, view(['PLAYER_SPARED_GALD']))).toEqual([]);
  });

  it('every ambient line is short — noticed, not explained', () => {
    for (const l of GREENWOOD_WALK.ambientLines) expect(l.text.length, l.text).toBeLessThanOrEqual(24);
  });
});
