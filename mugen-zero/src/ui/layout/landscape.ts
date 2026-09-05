// Which way round the game is drawn.
//
// MUGEN ZERO is a landscape game now: enemy on the left, party on the
// right, and a battlefield wide enough for the distance between them to
// mean something. That is true whichever way the device is held, so the
// decision is made here, once, in a pure function that the layout and
// its tests can both read.

export interface StageBox {
  /** The landscape stage's own width, in CSS pixels. Always the longer side. */
  width: number;
  /** Its height. Always the shorter side. */
  height: number;
  /**
   * Whether the stage has to be turned to fit the window.
   *
   * True only when the device is being held upright. It is a fact about
   * the window, never a preference: the game does not offer a portrait
   * layout to fall back to.
   */
  rotated: boolean;
}

/**
 * The landscape stage for a window of this size.
 *
 * The longer side of the window is always the stage's width, so the
 * game is the same shape on a phone held sideways and on a desktop
 * window that happens to be tall.
 */
export function stageFor(viewportWidth: number, viewportHeight: number): StageBox {
  const w = Math.max(0, Math.floor(viewportWidth));
  const h = Math.max(0, Math.floor(viewportHeight));
  // Square counts as landscape: nothing is gained by turning it, and a
  // window that is resized through square must not flicker.
  if (h > w) return { width: h, height: w, rotated: true };
  return { width: w, height: h, rotated: false };
}

/**
 * The CSS transform that puts a rotated stage back over the window.
 *
 * The stage is laid out at its landscape size with its origin at the
 * window's top-left corner. Turning it a quarter clockwise swings it off
 * the left edge by exactly its own height, so it is pushed back by that
 * much. Written out rather than left to a magic string because it is
 * the one piece of this that is easy to get wrong and impossible to see
 * wrong in a screenshot — it simply looks empty.
 */
export function stageTransform(box: StageBox): string | undefined {
  if (!box.rotated) return undefined;
  return `translateX(${box.height}px) rotate(90deg)`;
}
