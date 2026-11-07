import { describe, it, expect } from 'vitest';
import {
  endBlow,
  landBlow,
  latestOn,
  motionSlot,
  MOST_BLOWS_AT_ONCE,
  type Blow,
} from './blows';

const hit = (id: number, on: Blow['on'] = 'enemy', amount = 10): Blow => ({ id, on, amount });

/**
 * The rule that broke, tested against the shape it broke on.
 *
 * One slot and one clear timer meant the first blow of a turn ended the
 * second one. These are the cases that says cannot happen again — and
 * they go past the two blows the game has today, because the whole
 * point of the change is the combos that do not exist yet.
 */
describe('a blow ends itself and nobody else', () => {
  it('one blow: lands, and is gone when it says so', () => {
    let live = landBlow([], hit(1));
    expect(live.map((b) => b.id)).toEqual([1]);
    live = endBlow(live, 1);
    expect(live).toEqual([]);
  });

  it('TWO blows: the first one ending does not take the second with it', () => {
    // This is the measured bug, in five lines. HIT_001's timer fires
    // while HIT_002 is still being drawn.
    let live = landBlow([], hit(1, 'enemy'));
    live = landBlow(live, hit(2, 'hero'));
    live = endBlow(live, 1);
    expect(live.map((b) => b.id), 'HIT_002 is still on the field').toEqual([2]);
    expect(latestOn(live, 'hero')?.id).toBe(2);
    expect(latestOn(live, 'enemy')).toBeNull();
  });

  it('THREE blows: any one of them ending leaves the other two alone', () => {
    const all = [hit(1), hit(2), hit(3)];
    for (const gone of [1, 2, 3]) {
      const live = all.reduce<Blow[]>((l, b) => landBlow(l, b), []);
      const after = endBlow(live, gone);
      expect(after.map((b) => b.id)).toEqual([1, 2, 3].filter((id) => id !== gone));
    }
  });

  it('clears arriving in any order leave exactly the right ones standing', () => {
    let live = [hit(1), hit(2), hit(3), hit(4)].reduce<Blow[]>((l, b) => landBlow(l, b), []);
    // Out of order on purpose: timers do not promise to fire in the
    // order they were set, and a blow at ×2 can outlive a slower one.
    live = endBlow(live, 3);
    live = endBlow(live, 1);
    expect(live.map((b) => b.id)).toEqual([2, 4]);
    live = endBlow(live, 4);
    live = endBlow(live, 2);
    expect(live).toEqual([]);
  });

  it('an id that is not there is not an error, and touches nothing', () => {
    const live = landBlow(landBlow([], hit(1)), hit(2));
    expect(endBlow(live, 99)).toBe(live);
    expect(endBlow([], 1)).toEqual([]);
  });

  it('the same blow landing twice is one blow', () => {
    const live = landBlow(landBlow([], hit(7, 'hero', 5)), hit(7, 'hero', 9));
    expect(live).toHaveLength(1);
    expect(live[0].amount, 'the later one wins').toBe(9);
  });
});

describe('a great many blows', () => {
  it('never grows without end, and keeps the newest', () => {
    let live: Blow[] = [];
    for (let i = 1; i <= 30; i++) live = landBlow(live, hit(i));
    expect(live).toHaveLength(MOST_BLOWS_AT_ONCE);
    expect(live.map((b) => b.id)).toEqual([25, 26, 27, 28, 29, 30]);
  });

  it('a dropped blow ending is still not an error', () => {
    let live: Blow[] = [];
    for (let i = 1; i <= 30; i++) live = landBlow(live, hit(i));
    expect(() => endBlow(live, 1)).not.toThrow();
    expect(endBlow(live, 1)).toHaveLength(MOST_BLOWS_AT_ONCE);
  });
});

describe('who is being hit, and which motion answers', () => {
  it('names the most recent blow on each side, not the first', () => {
    const live = [hit(1, 'enemy'), hit(2, 'hero'), hit(3, 'enemy')].reduce<Blow[]>(
      (l, b) => landBlow(l, b),
      [],
    );
    expect(latestOn(live, 'enemy')?.id).toBe(3);
    expect(latestOn(live, 'hero')?.id).toBe(2);
  });

  it('alternates the motion, so a second blow on the same body is drawn', () => {
    // A combo lands three times on one target. Each one must be a
    // CHANGE, or the animation already running simply keeps running and
    // the second and third blows draw no reaction at all.
    const slots = [hit(1), hit(2), hit(3)].map((b) => motionSlot(b));
    expect(slots).toEqual(['b', 'a', 'b']);
    expect(new Set(slots).size, 'consecutive blows never share a slot').toBe(2);
  });

  it('nobody being hit is nobody flinching', () => {
    expect(motionSlot(null)).toBeUndefined();
    expect(latestOn([], 'hero')).toBeNull();
  });
});
