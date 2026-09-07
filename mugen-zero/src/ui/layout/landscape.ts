// The shape of the stage the whole game is drawn on.
//
// MUGEN ZERO is a landscape game: enemy on the left, party on the
// right, and a battlefield wide enough for the distance between them to
// mean something. Everything inside the stage may assume it is wider
// than it is tall.
//
// It used to get that by turning a portrait window a quarter turn,
// which produced a game whose text ran up the side of the phone. It
// does not do that any more. The stage is laid out landscape and drawn
// landscape; on a window too tall for it, it is made SMALLER and
// centred, with the letterbox left plain and a line asking for the
// phone to be turned. Nothing is ever rotated.

/** What the game is designed against: sixteen by nine. */
export const STAGE_ASPECT = 16 / 9;

/**
 * The narrowest the stage is allowed to get.
 *
 * NOT the shape the game is designed against, deliberately. This used
 * to be STAGE_ASPECT, which meant a window that was genuinely landscape
 * but less wide than 16:9 — a tablet, a desktop window, the panel a
 * published copy is played in — got bars top and bottom for the crime
 * of not being a phone. The game got visibly smaller than the room it
 * had, which is the opposite of what the stage is for.
 *
 * So the floor is looser than the design target — but only for a
 * window that is already wider than it is tall. An UPRIGHT phone still
 * gets 16:9, because there the stage is scaled down to fit and a 4:3
 * stage at the height the screens are written for is a narrower play
 * area than they are written for: taller on the glass, and smaller in
 * the units the screens actually use. Landscape has no such trade —
 * there the stage is not scaled at all, so wider is simply more room.
 */
export const MIN_STAGE_ASPECT = 4 / 3;

/**
 * The widest the stage is allowed to get.
 *
 * A phone held sideways is about 2:1 and gets its whole screen, which
 * is the point of the exercise. A desktop window can be 3:1 or worse,
 * and a battlefield that wide is not a wider picture, it is two
 * characters at opposite ends of a room; past this the extra width
 * becomes letterbox instead.
 */
export const MAX_STAGE_ASPECT = 2.4;

export interface StageBox {
  /** The stage's width in CSS pixels. Always the longer side. */
  width: number;
  /** Its height. Always the shorter side. */
  height: number;
  /**
   * Whether the window itself is taller than it is wide.
   *
   * Not a layout switch — there is no portrait layout — but the game
   * has been shrunk to fit a window it does not fit, so it is worth
   * saying so to the player.
   */
  portraitHost: boolean;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * The landscape stage for a window of this size.
 *
 * A landscape window gives the stage all of itself — a phone held
 * sideways, and equally a window that merely happens to be wider than
 * it is tall, should not be playing inside a box with bars round it.
 * Only a window that is too tall, nearly square, or absurdly wide gets
 * the nearest allowed shape, fitted inside it — smaller, never turned.
 */
export function stageFor(viewportWidth: number, viewportHeight: number): StageBox {
  const w = Math.max(0, Math.floor(viewportWidth));
  const h = Math.max(0, Math.floor(viewportHeight));
  if (w === 0 || h === 0) return { width: w, height: h, portraitHost: h > w };
  // A window already the right way round may keep whatever shape it
  // has; one that is not gets squared up to the shape the game is
  // drawn against before being fitted inside it.
  const floor = w >= h ? MIN_STAGE_ASPECT : STAGE_ASPECT;
  const aspect = clamp(w / h, floor, MAX_STAGE_ASPECT);
  // Fit a box of that shape inside the window, touching whichever pair
  // of edges it reaches first.
  const width = Math.min(w, h * aspect);
  const height = width / aspect;
  return {
    width: Math.floor(width),
    height: Math.floor(height),
    portraitHost: h > w,
  };
}

/**
 * The shortest stage the screens are drawn for.
 *
 * Every layout in the game is written in real pixels against a phone
 * held sideways, and the shortest of the three the game is judged on is
 * 360 tall. A stage shorter than this is not a smaller version of the
 * game, it is a clipped one — so below this the game is laid out at
 * this height and SCALED to fit instead.
 */
export const MIN_STAGE_HEIGHT = 360;

export interface StageLayout {
  /** The width the screens are laid out at, in their own pixels. */
  width: number;
  /** The height they are laid out at. Never below MIN_STAGE_HEIGHT. */
  height: number;
  /**
   * What that layout is multiplied by to reach the screen. One for
   * every phone held sideways — the common case is not scaled at all,
   * so a button is exactly as big as it was measured to be.
   */
  scale: number;
}

/**
 * How to draw a stage box: at what size, and shrunk by how much.
 *
 * A box tall enough to hold the game is laid out at its own size and
 * left alone. A box too short — the upright phone, the small window —
 * is laid out at the height the screens were written for and scaled
 * down uniformly, which keeps every proportion and every line of text
 * the right way up. Scaling, not turning.
 */
export function layoutFor(box: StageBox): StageLayout {
  if (box.height <= 0 || box.height >= MIN_STAGE_HEIGHT) {
    return { width: box.width, height: box.height, scale: 1 };
  }
  const scale = box.height / MIN_STAGE_HEIGHT;
  return {
    width: Math.round(box.width / scale),
    height: MIN_STAGE_HEIGHT,
    scale,
  };
}
