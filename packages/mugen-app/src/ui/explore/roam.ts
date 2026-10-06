// WALKING ABOUT IN A PLACE — pure arithmetic for the two-dimensional walk.
//
// Everything is in the painting's own fractions (x across, y down), so it
// holds on every screen. Distances are measured as they look: a step up
// the picture counts for as much as a step across it in pixels, so `dist`
// scales y by the painting's height-to-width.

import type { PaintingPoint, WalkDiscovery } from '@mugen/content/exploration/walkScene';

/** The painting's height over its width (1672 × 941). */
export const PAINT_ASPECT = 941 / 1672;

/** A walker's size at the farthest floor; 1 at the nearest. Never a jump. */
export const FAR_SCALE = 0.8;

/** How near a thing must be for its 「！」 to show — near, not across the screen. */
export const NOTICE = 0.15;
/** At most this many 「！」 at once — a few things noticed, not a screen of signs. */
export const MAX_NOTICED = 2;
/** How near to stand for 調べる. */
export const REACH = 0.05;
/** A touch this near where a thing is looked at from is taken as "go there". */
export const SNAP = 0.08;

/** How far behind him Kaos walks, along the way he came. */
export const KAOS_GAP = 0.06;

/** At most this many small finds are waiting at once. */
export const MAX_FINDS = 2;
/** A new find turns up only after this much walking … */
export const FIND_WALK = 0.3;
/** … and this long, since the last one turned up or was looked at. */
export const FIND_WAIT_MS = 3000;
/** A find just read is not offered again until this many others have been. */
export const FIND_MEMORY = 6;
/** A spot just used stays empty for this many finds. */
export const SPOT_MEMORY = 3;

export function dist(a: PaintingPoint, b: PaintingPoint): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) * PAINT_ASPECT);
}

/** Whether a point is on the floor (inside the outline). */
export function onFloor(p: PaintingPoint, floor: readonly PaintingPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = floor.length - 1; i < floor.length; j = i++) {
    const a = floor[i];
    const b = floor[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The nearest point on a segment, as the eye measures. */
function nearestOnSegment(p: PaintingPoint, a: PaintingPoint, b: PaintingPoint): PaintingPoint {
  const ax = a.x;
  const ay = a.y * PAINT_ASPECT;
  const bx = b.x - ax;
  const by = b.y * PAINT_ASPECT - ay;
  const len = bx * bx + by * by;
  const k = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - ax) * bx + (p.y * PAINT_ASPECT - ay) * by) / len));
  return { x: ax + bx * k, y: (ay + by * k) / PAINT_ASPECT };
}

/**
 * Where a touch walks to: the spot itself when it is floor, otherwise the
 * nearest floor to it (a touch on a wall walks to its foot), nudged a
 * hair inside so the walker stands on the floor, not on its edge.
 */
export function toFloor(p: PaintingPoint, floor: readonly PaintingPoint[]): PaintingPoint {
  if (onFloor(p, floor)) return p;
  let best = floor[0];
  let bestD = Infinity;
  for (let i = 0, j = floor.length - 1; i < floor.length; j = i++) {
    const q = nearestOnSegment(p, floor[j], floor[i]);
    const d = dist(p, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  // Step a little toward the middle of the floor.
  const mid = floor.reduce((m, q) => ({ x: m.x + q.x / floor.length, y: m.y + q.y / floor.length }), { x: 0, y: 0 });
  const step = 0.006 / Math.max(1e-6, dist(best, mid));
  return { x: best.x + (mid.x - best.x) * step, y: best.y + (mid.y - best.y) * step };
}

/** How big a walker is drawn standing at painting height `y`: smaller farther back. */
export function depthScale(y: number, far: number, near: number): number {
  const k = Math.max(0, Math.min(1, (y - far) / (near - far)));
  return FAR_SCALE + (1 - FAR_SCALE) * k;
}

/**
 * Where a follower walks: `gap` back along the way the leader came. The
 * trail runs oldest first and ends where the leader is; before there is
 * enough of it, the follower stands at its oldest point.
 */
export function alongTrail(trail: readonly PaintingPoint[], gap: number): PaintingPoint {
  let left = gap;
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i];
    const b = trail[i - 1];
    const d = dist(a, b);
    if (d >= left) {
      const k = d === 0 ? 0 : left / d;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    left -= d;
  }
  return trail[0];
}

/**
 * WHICH SMALL FIND TURNS UP NEXT: any not read lately and not already
 * waiting, at random. When everything has been read lately, the one read
 * longest ago comes round again.
 */
export function pickFind(
  pool: readonly WalkDiscovery[],
  recent: readonly string[],
  waiting: readonly string[],
  rnd: () => number = Math.random,
): WalkDiscovery | null {
  const fresh = pool.filter((d) => !recent.includes(d.id) && !waiting.includes(d.id));
  if (fresh.length > 0) return fresh[Math.floor(rnd() * fresh.length) % fresh.length];
  const oldest = recent.find((id) => !waiting.includes(id) && pool.some((d) => d.id === id));
  return pool.find((d) => d.id === oldest) ?? null;
}

/**
 * WHERE IT TURNS UP: somewhere else — out of notice from where the party
 * stands, not on a spot used lately, not on a waiting find, and not
 * where one of the place's own things is looked at from.
 */
export function pickSpot(
  spots: readonly PaintingPoint[],
  hero: PaintingPoint,
  avoid: readonly PaintingPoint[],
  recent: readonly number[],
  rnd: () => number = Math.random,
): number | null {
  const ok = (i: number, strict: boolean) =>
    dist(spots[i], hero) > NOTICE + 0.05 &&
    avoid.every((a) => dist(spots[i], a) > SNAP) &&
    (!strict || !recent.includes(i));
  for (const strict of [true, false]) {
    const free = spots.map((_, i) => i).filter((i) => ok(i, strict));
    if (free.length > 0) return free[Math.floor(rnd() * free.length) % free.length];
  }
  return null;
}

/** Where to stand to look at a find on the floor: a little to its right. */
export function standBeside(p: PaintingPoint, floor: readonly PaintingPoint[]): PaintingPoint {
  return toFloor({ x: p.x + 0.05, y: p.y }, floor);
}

// ---- HOW RARE EACH FIND IS ----
//
// Decided as each small find turns up. NORMAL most of the time; golden
// (RARE) now and then; the place's once-in-a-world RAINBOW find very
// rarely — a little less rarely each real visit, and certain on the
// eighth, so nobody walks for ever and never sees it. Once taken, never.

/** A golden find, per find. */
export const RARE_CHANCE = 0.08;
/** The rainbow find, per find, per real visit: visit n gives n × this … */
export const RAINBOW_STEP = 0.003;
/** … up to this. */
export const RAINBOW_CAP = 0.03;
/** On this real visit (and any after it, while it has not been taken) it is certain … */
export const RAINBOW_SURE_VISIT = 8;
/** … as this find of the visit (1 is the first). */
export const RAINBOW_SURE_FIND = 5;
/** A visit counts as real once this many finds have turned up in it. */
export const VISIT_COUNTS_AT = 3;

/** The rainbow find's chance on a given real visit (1 is the first). */
export function rainbowChance(visit: number): number {
  return Math.min(RAINBOW_CAP, Math.max(0, Math.floor(visit)) * RAINBOW_STEP);
}

export type FindGrade = 'NORMAL' | 'RARE' | 'RAINBOW';

/**
 * WHAT THIS FIND IS.
 *
 * `visitsBefore` is how many real visits the place had before this one;
 * `findNumber` which find of this visit it is (1 first); `rainbowOpen`
 * whether the rainbow may turn up at all — not taken in this world, and
 * not already turned up this visit (one per visit; if it is walked past
 * it is gone, and the next visit's chance carries on rising).
 */
export function rollGrade(
  visitsBefore: number,
  findNumber: number,
  rainbowOpen: boolean,
  rnd: () => number = Math.random,
): FindGrade {
  if (rainbowOpen) {
    const visit = visitsBefore + 1;
    if (visit >= RAINBOW_SURE_VISIT && findNumber >= RAINBOW_SURE_FIND) return 'RAINBOW';
    if (rnd() < rainbowChance(visit)) return 'RAINBOW';
  }
  return rnd() < RARE_CHANCE ? 'RARE' : 'NORMAL';
}
