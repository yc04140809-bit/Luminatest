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

/**
 * How near, in t, a thing must be for its 「！」 to show — wide on purpose:
 * far enough that "there is something over there" is plain from a good
 * way off, which is the whole job of the mark.
 */
export const MARK_RANGE = 0.45;

/** How tall the 「！」 stands on a screen this high (styles.css `.walk-marker`). */
export function markHeight(h: number): number {
  return Math.min(40, Math.max(27, 0.09 * h));
}

/**
 * The top of the screen belongs to the words: the place's name and, under
 * it, what was noticed. No 「！」 rises into them; one on a thing painted
 * that high stands at their foot. MARK_CEILING is that foot for a
 * one-line caption (from 48px, about 34px tall); a caption that runs to
 * more lines pushes it down — the scene passes where its caption ends.
 */
export const MARK_CEILING = 86;

/** Where a 「！」's bottom tip goes, in px: at the thing, but never up under the words. */
export function markTipY(paintY: number, h: number, wordsEnd = MARK_CEILING): number {
  return Math.max(paintY, Math.max(MARK_CEILING, wordsEnd) + markHeight(h));
}

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

/**
 * WHERE A TAP ON THE GROUND SENDS THE PARTY — the t at which the leader's
 * feet stand under the spot that was touched.
 *
 * `screenX` is the tap as a share of the screen's width, `t` where the
 * walk is now. The spot is read off the painting as it lies at this
 * moment, so a tap means the place in the picture, not the place on the
 * glass. Only the horizontal matters: the walk is a line across the
 * place, and a tap above or below it is rounded onto it. Clamped to the
 * walk's two ends.
 */
export function tapToT(screenX: number, t: number): number {
  const px = (screenX - layerShift(t, DEPTH.painting)) / (1 + PAN);
  const to = (HERO_START + PAN - px * (1 + PAN)) / (HERO_START - HERO_END + PAN);
  return Math.min(1, Math.max(0, to));
}

/** How near a thing a tap must land to be taken as "go to that thing". */
export const SNAP = 0.09;

/**
 * Where a walk to `to` should end: beside the nearest thing, if the tap
 * was meant for it (within SNAP of where one stops to look at it);
 * otherwise exactly where it was tapped — anywhere along the walk.
 */
export function settleAt(to: number, pointXs: readonly number[]): number {
  let best: number | null = null;
  for (const x of pointXs) {
    const s = stopFor(x);
    if (Math.abs(s - to) <= SNAP && (best === null || Math.abs(s - to) < Math.abs(best - to))) best = s;
  }
  return best ?? to;
}
