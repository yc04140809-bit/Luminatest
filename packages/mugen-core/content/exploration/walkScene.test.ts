import { describe, expect, it } from 'vitest';
import { ambientLinesFor, figuresFor, pointLine, walkConditionHolds, type WalkWorldView } from './walkScene';
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
  it('has at least two things to look at, each in the painting and each with a line in any world', () => {
    expect(GREENWOOD_WALK.points.length).toBeGreaterThanOrEqual(2);
    for (const p of GREENWOOD_WALK.points) {
      expect(p.at.x).toBeGreaterThan(0);
      expect(p.at.x).toBeLessThan(1);
      expect(p.at.y).toBeGreaterThan(0);
      expect(p.at.y).toBeLessThan(1);
      expect(pointLine(p, view()), p.id).toBeTruthy();
      expect(pointLine(p, view(['PLAYER_KILLED_GALD'])), p.id).toBeTruthy();
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
