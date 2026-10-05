// WHERE EVERYTHING IS, AS THE PARTY WALKS — pure arithmetic, no React.
//
// The walk is one number, `t`: 0 standing at the right where the party
// came in, 1 at the far left. Everything on screen is a function of it:
//
//   the party     crosses the screen from HERO_START to HERO_END
//   the painting  is wider than the screen by PAN, and slides right as
//                 the party goes left — the camera following them
//   other layers  slide by PAN times their own factor: less for what is
//                 far (light, mist), more for what is near (leaves) —
//                 which is the whole of the parallax
//
// All in fractions of the screen's width, so it holds on every phone.

/** Where the leader stands at t = 0 and t = 1, as a share of the width. */
export const HERO_START = 0.78;
export const HERO_END = 0.22;
/** How much wider than the screen the painting is. */
export const PAN = 0.3;
/** How far right of a thing the leader stops to look at it. */
export const STOP_GAP = 0.05;

/** Parallax factors: 1 is the painting, the ground the party walks on. */
export const DEPTH = {
  // Widened a little from 0.5 / 0.35 / 1.7: enough that the near leaves
  // and the far light part company as the party walks, never so much
  // that the backdrop pulls the eye from the people or turns a stomach.
  light: 0.4,
  mist: 0.25,
  painting: 1,
  near: 1.9,
} as const;

/** How near, in t, the party must be before a thing ahead begins to glint. */
export const APPROACH = 0.11;

/**
 * How strongly a thing glints at this distance: nothing beyond APPROACH,
 * a faint light as they come near, full only when standing beside it.
 */
export function glintStrength(distance: number): number {
  const d = Math.abs(distance);
  if (d >= APPROACH) return 0;
  return 0.4 + 0.6 * (1 - d / APPROACH) ** 2;
}

/** The leader's x, as a share of the screen width. */
export function heroX(t: number): number {
  return HERO_START + (HERO_END - HERO_START) * t;
}

/** How far a layer is slid left, as a share of the screen width. */
export function layerShift(t: number, depth: number): number {
  return -(1 - t) * PAN * depth;
}

/** Where a point at painting fraction `x` is on screen at `t`, as a share of the width. */
export function paintingX(x: number, t: number): number {
  return x * (1 + PAN) + layerShift(t, DEPTH.painting);
}

/**
 * Where to stop to look at a thing at painting fraction `x`: the t at
 * which the leader stands STOP_GAP to its right. Clamped to the walk.
 */
export function stopFor(x: number): number {
  const t = (HERO_START + PAN - x * (1 + PAN) - STOP_GAP) / (HERO_START - HERO_END + PAN);
  return Math.min(1, Math.max(0, t));
}

/** The stops along the walk, right to left: the start, each thing, the end. */
export function stopsFor(xs: readonly number[]): number[] {
  const ts = [0, ...xs.map(stopFor), 1].sort((a, b) => a - b);
  return ts.filter((t, i) => i === 0 || t - ts[i - 1] > 0.02);
}

/** The next stop to the left (larger t) or right (smaller t), or null at the end. */
export function nextStop(stops: readonly number[], t: number, way: 'left' | 'right'): number | null {
  if (way === 'left') return stops.find((s) => s > t + 1e-6) ?? null;
  for (let i = stops.length - 1; i >= 0; i--) if (stops[i] < t - 1e-6) return stops[i];
  return null;
}
