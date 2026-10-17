// WHERE THE GROUND IS.
//
// The forest is a painting. A painting has trees you cannot stand in,
// water you cannot stand on and a sky that is not a floor — and until
// now the whole of it took a tap, so the player was told "walk here" by
// a picture that meant "look at this". This is the part that says which
// of it is ground.
//
// It is a band across the bottom, not a mask traced round the art: a
// path going away from the camera is wide where you are standing and
// narrow where it disappears, and that is a shape with two numbers
// rather than a polygon somebody has to maintain against a repaint.
// Nothing here knows about Phaser, so the rule can be argued about in a
// test instead of by walking into a tree.

export interface FieldSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * The walkable band, in fractions of the field so it survives a resize.
 *
 * `top` and `bottom` are where the ground begins and ends going down the
 * screen. `farInset` and `nearInset` are how far in from each side the
 * ground is at those two edges — bigger at the far edge, which is what
 * gives the perspective.
 */
export interface GroundBand {
  top: number;
  bottom: number;
  farInset: number;
  nearInset: number;
}

/**
 * Greenwood's ground, measured against its own painting: the clearing
 * floor starts a little over halfway down and runs to the bottom edge,
 * and the trees close in on both sides as it goes back.
 */
/**
 * The size of the field the forest is drawn at.
 *
 * Landscape, like the rest of the game. The world's own units, not the
 * screen's: Phaser fits this box into whatever room the screen has, so
 * everything below is written once and holds at every phone size.
 */
export const GREENWOOD_FIELD: FieldSize = { width: 640, height: 360 };

/**
 * A field shaped like the screen it will be drawn on.
 *
 * Phaser fits the world into the room it is given, so a world of a
 * fixed shape leaves bars down both sides of a phone that is a
 * different shape — and phones are all slightly different shapes. Since
 * everything about the ground is written in fractions, the field can
 * simply take the screen's proportions instead. The height is fixed so
 * that walking speed and character sizes mean the same thing on every
 * device; only the width moves.
 *
 * Clamped, because a window can be any shape at all and a field forty
 * times wider than it is tall is not a forest.
 */
export const FIELD_MIN_ASPECT = 1.5;
export const FIELD_MAX_ASPECT = 2.6;

export function fieldForScreen(
  screenWidth: number,
  screenHeight: number,
  base: FieldSize = GREENWOOD_FIELD,
): FieldSize {
  if (!(screenWidth > 0) || !(screenHeight > 0)) return base;
  const aspect = Math.min(FIELD_MAX_ASPECT, Math.max(FIELD_MIN_ASPECT, screenWidth / screenHeight));
  return { width: Math.round(base.height * aspect), height: base.height };
}

export const GREENWOOD_GROUND: GroundBand = {
  top: 0.56,
  bottom: 0.95,
  farInset: 0.2,
  nearInset: 0.03,
};

/** How far in from the sides the ground is at this height, in pixels. */
function insetAt(band: GroundBand, size: FieldSize, y: number): number {
  const topPx = band.top * size.height;
  const bottomPx = band.bottom * size.height;
  const span = Math.max(1, bottomPx - topPx);
  // 0 at the far edge, 1 at the near one.
  const t = Math.min(1, Math.max(0, (y - topPx) / span));
  const inset = band.farInset + (band.nearInset - band.farInset) * t;
  return inset * size.width;
}

/** The left and right edges of the ground at this height. */
export function groundRowAt(
  band: GroundBand,
  size: FieldSize,
  y: number,
): { left: number; right: number } {
  const inset = insetAt(band, size, y);
  return { left: inset, right: size.width - inset };
}

export function isWalkable(band: GroundBand, size: FieldSize, p: Point): boolean {
  const topPx = band.top * size.height;
  const bottomPx = band.bottom * size.height;
  if (p.y < topPx || p.y > bottomPx) return false;
  const row = groundRowAt(band, size, p.y);
  return p.x >= row.left && p.x <= row.right;
}

/**
 * The nearest place on the ground to somewhere that is not.
 *
 * A tap on a tree is not an error and is not ignored: it is a tap on
 * the ground in front of that tree, which is what the player meant. The
 * alternative — swallowing the tap — makes the forest feel broken in
 * exactly the places a player is most likely to press.
 */
export function clampToGround(band: GroundBand, size: FieldSize, p: Point): Point {
  const topPx = band.top * size.height;
  const bottomPx = band.bottom * size.height;
  const y = Math.min(bottomPx, Math.max(topPx, p.y));
  const row = groundRowAt(band, size, y);
  return { x: Math.min(row.right, Math.max(row.left, p.x)), y };
}

/**
 * A place on the ground, given in fractions along and across it.
 *
 * `along` is 0 at the left edge of the field and 1 at the right;
 * `depth` is 0 at the back of the band and 1 at the front. Spots are
 * written this way so that they sit on the path by construction rather
 * than by having been measured against one particular painting.
 */
export function groundPoint(
  band: GroundBand,
  size: FieldSize,
  along: number,
  depth: number,
): Point {
  const topPx = band.top * size.height;
  const bottomPx = band.bottom * size.height;
  const y = topPx + (bottomPx - topPx) * Math.min(1, Math.max(0, depth));
  const row = groundRowAt(band, size, y);
  return { x: row.left + (row.right - row.left) * Math.min(1, Math.max(0, along)), y };
}

/**
 * The same place, as fractions of the field rather than pixels of it.
 *
 * Everything about the ground is proportional, so where a ring is on
 * screen does not depend on how wide the field turned out to be. That
 * is what lets a test say "tap the third ring" without knowing the size
 * of anybody's phone — and it is why the eight rings moved out of
 * hand-measured pixels in the first place.
 */
export function groundFraction(
  band: GroundBand,
  along: number,
  depth: number,
): { fx: number; fy: number } {
  const d = Math.min(1, Math.max(0, depth));
  const a = Math.min(1, Math.max(0, along));
  const inset = band.farInset + (band.nearInset - band.farInset) * d;
  return { fx: inset + (1 - 2 * inset) * a, fy: band.top + (band.bottom - band.top) * d };
}

/**
 * The two ends of the path.
 *
 * The player walks right to left: they came in from the right, and the
 * forest goes on to the left. Which of the two does what is the screen's
 * business — this only says which end of the ground somebody is standing
 * at, so an exit or a way back can be put there without any screen
 * measuring pixels.
 */
export type EdgeZone = 'LEFT' | 'RIGHT';

/** How much of the field's width each end takes. */
export const EDGE_ZONE_WIDTH = 0.07;

export function edgeZoneAt(
  band: GroundBand,
  size: FieldSize,
  p: Point,
  zoneWidth: number = EDGE_ZONE_WIDTH,
): EdgeZone | null {
  if (!isWalkable(band, size, p)) return null;
  const row = groundRowAt(band, size, p.y);
  const margin = size.width * zoneWidth;
  if (p.x <= row.left + margin) return 'LEFT';
  if (p.x >= row.right - margin) return 'RIGHT';
  return null;
}
