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
 * window that is already wider than it is tall, where the stage is not
 * scaled at all and wider is simply more room. A window that is TALLER
 * than it is wide has a floor of its own, MIN_PORTRAIT_ASPECT below,
 * because there the trade runs the other way.
 */
export const MIN_STAGE_ASPECT = 4 / 3;

/**
 * And the floor for a host that is TALLER than it is wide.
 *
 * Not the same number, and the difference is the whole of it. On a
 * portrait host the stage cannot be wider than the host, so its width
 * is fixed and the aspect decides its HEIGHT: a smaller aspect is a
 * taller stage, which is a bigger game. It used to be STAGE_ASPECT, and
 * 16:9 is the smallest game that shape can give.
 *
 * It cannot go all the way to MIN_STAGE_ASPECT, because a portrait host
 * is also the case that gets SCALED — the stage is laid out at
 * MIN_STAGE_HEIGHT and shrunk — so the aspect is also the layout's
 * width in units of 360. At 16:9 the screens are laid out 640 wide; at
 * 4:3 they would be 480, and the battle screen's bottom row alone —
 * WORLD MEMORY, five commands, three chips — needs about 558 of them.
 * A stage that is taller on the glass but too narrow to hold the game
 * is not a bigger game.
 *
 * 1.6 is the largest stage that clears that, with room to spare: the
 * screens are laid out 576 wide, and a portrait host gets a stage about
 * a ninth taller than 16:9 gave it.
 */
export const MIN_PORTRAIT_ASPECT = 1.6;

/**
 * The widest the stage is allowed to get.
 *
 * A desktop window can be 4:1 or worse, and a battlefield that wide is
 * not a wider picture, it is two characters at opposite ends of a room.
 * Past this the extra width becomes letterbox instead.
 *
 * RAISED FROM 2.4, WHICH WAS CUTTING INTO PHONES. A phone held sideways
 * is about 2.2:1 with the browser's address bar showing — and about
 * 2.5:1 the moment it retracts, which is most of the time anyone is
 * actually playing. At 2.4 that retraction did not give the game the
 * height back, it took width away: a 932×360 screen was handed an
 * 864-wide stage and 68 pixels of bar down each side, for no reason a
 * player could see. Every phone is now inside the cap and gets its
 * whole screen, which was always the point of the exercise.
 *
 * Measured across the sizes this is judged on: side margin is nought at
 * 844×390, 915×412, 800×360, 844×340, 932×360 and 1000×360.
 *
 * RAISED AGAIN, from 3.2, for the box a published copy is played in. An
 * artifact is shown inside a frame the page does not control, and that
 * frame is often SHORTER than the phone it is on — 844×300 is 2.8 and
 * fine, but 900×260 is 3.46 and was being handed an 832-wide stage with
 * 68 pixels of bar down each side, for no reason a player could see.
 * Four is past anything a phone produces and still short of the "two
 * characters at opposite ends of a room" this cap exists to prevent.
 */
export const MAX_STAGE_ASPECT = 4;

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
  const floor = w >= h ? MIN_STAGE_ASPECT : MIN_PORTRAIT_ASPECT;
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
// LEFT AT 360 ON PURPOSE, and it was a candidate for lowering. It is
// not what puts bars down the sides — the cap above was, and lowering
// this removes nought pixels of margin at any size measured. What it
// WOULD remove is the reason a window shorter than the game is drawn
// for still shows all of it: at 844×340 the game is laid out at its own
// 360 and drawn at 0.944, which is a slightly smaller game rather than
// a clipped one. Dropping the floor to 320 would hand those screens
// twenty fewer pixels than any layout in the game was written against.
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
