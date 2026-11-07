import { describe, it, expect } from 'vitest';
import { FollowTrail } from './follow';

/** Walk a straight line from (0,0), one unit at a time. */
function walkUp(trail: FollowTrail, steps: number) {
  trail.reset(0, 0);
  for (let i = 1; i <= steps; i++) trail.record(0, -i);
}

describe('FollowTrail', () => {
  it('has nowhere to stand until the leader has walked that far', () => {
    const trail = new FollowTrail();
    trail.reset(10, 10);
    expect(trail.behind(30)).toBeNull();
    walkUp(trail, 10);
    expect(trail.behind(30)).toBeNull();
  });

  it('puts the follower the asked-for distance back down the path', () => {
    const trail = new FollowTrail();
    walkUp(trail, 100);
    const point = trail.behind(30)!;
    expect(point.x).toBeCloseTo(0, 5);
    // He is at y = -100 and walked up the screen, so thirty back is -70.
    expect(point.y).toBeCloseTo(-70, 5);
  });

  it('follows the corner the leader turned, not the straight line to them', () => {
    const trail = new FollowTrail({ sampleEvery: 1 });
    trail.reset(0, 0);
    for (let i = 1; i <= 40; i++) trail.record(0, -i); // north 40
    for (let i = 1; i <= 40; i++) trail.record(i, -40); // then east 40
    // Fifty back along the path is ten before the corner, on the way up.
    const point = trail.behind(50)!;
    expect(point.x).toBeCloseTo(0, 5);
    expect(point.y).toBeCloseTo(-30, 5);
    // A follower steering straight at the leader would instead be
    // somewhere on the diagonal between them, off the path entirely.
    expect(point.x).not.toBeCloseTo(28, 0);
  });

  it('forgets the far end of the path', () => {
    const trail = new FollowTrail({ sampleEvery: 1, remember: 50 });
    walkUp(trail, 400);
    expect(trail.walkedLength).toBeLessThanOrEqual(51);
    // What it still remembers is the recent end, so following works.
    expect(trail.behind(30)!.y).toBeCloseTo(-370, 5);
  });

  it('does not pile up footsteps for movement too small to be one', () => {
    const trail = new FollowTrail({ sampleEvery: 3 });
    trail.reset(0, 0);
    for (let i = 0; i < 20; i++) trail.record(0.5, 0.5);
    // Twenty calls, still less than one step's worth of path.
    expect(trail.walkedLength).toBeLessThan(3);
    expect(trail.behind(1)).toBeNull();
  });

  it('measures the distance from the leader, not from the last footstep', () => {
    // Footsteps are only written down every three units, but the
    // companion's gap must not wobble by three units because of it.
    const trail = new FollowTrail({ sampleEvery: 3 });
    trail.reset(0, 0);
    for (let i = 1; i <= 100; i++) {
      trail.record(0, -i);
      const point = trail.behind(30);
      if (point) expect(point.y).toBeCloseTo(-i + 30, 5);
    }
  });

  it('starts again where it is told', () => {
    const trail = new FollowTrail();
    walkUp(trail, 100);
    trail.reset(5, 5);
    expect(trail.walkedLength).toBe(0);
    expect(trail.behind(1)).toBeNull();
  });
});
