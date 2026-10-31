// HOW MUCH OF THE READING IS ON SCREEN RIGHT NOW.
//
// The HUD is four corners of numbers over a battlefield, and at rest
// that is right: a player deciding what to do needs all of it. During a
// blow it is in the way — the fight is the picture, and the picture is
// competing with two health bars, a turn order, a place name and a
// memory panel for the half second that actually matters.
//
// So the screen has a MODE, and the mode says how present the reading
// is. Not whether: a player must never lose track of how much health
// they have because something looked better without it, which is why
// even the quietest mode leaves the health bars readable and why the floor
// below is not nought.

/** What the screen is doing, as far as the reading is concerned. */
export type Stagecraft =
  /** Nothing is playing. Everything is on, at full. */
  | 'IDLE'
  /** A blow is landing. The reading steps back. */
  | 'ATTACK'
  /** A cut-in has the screen. It steps back further. */
  | 'CUT_IN';

export interface StagecraftLevels {
  /**
   * The corners that are reading rather than fighting — the turn order,
   * the place, WORLD MEMORY.
   */
  reading: number;
  /**
   * The numbers that say how the fight is going. Dimmed, never gone:
   * this is what a player checks mid-swing to know whether they are
   * about to lose.
   */
  vitals: number;
}

/**
 * A floor under everything, so no mode can take the fight away.
 *
 * 0.35 is the number the brief's "HP等は完全消去しなくてもよい" comes to
 * in practice: still legible against the field, plainly further back
 * than it was.
 */
export const VITALS_FLOOR = 0.35;

const LEVELS: Record<Stagecraft, StagecraftLevels> = {
  IDLE: { reading: 1, vitals: 1 },
  // Half, which is the middle of the 40-60% the brief asks for.
  ATTACK: { reading: 0.5, vitals: 0.72 },
  // Nearly gone for the reading; the vitals stay at the floor.
  CUT_IN: { reading: 0.12, vitals: VITALS_FLOOR },
};

/** How present each layer is, in this mode. */
export function stagecraftLevels(mode: Stagecraft): StagecraftLevels {
  const level = LEVELS[mode] ?? LEVELS.IDLE;
  return { reading: level.reading, vitals: Math.max(VITALS_FLOOR, level.vitals) };
}

/**
 * The mode a moment calls for.
 *
 * One place, so that "why did the HUD dim" has one answer. A cut-in
 * outranks a blow, a blow outranks rest, and anything this does not
 * know about is rest — a screen that dimmed for a beat nobody had
 * taught it would be dimming for no reason the player can see.
 */
export function stagecraftFor({
  cutIn,
  hitting,
}: {
  cutIn: boolean;
  hitting: boolean;
}): Stagecraft {
  if (cutIn) return 'CUT_IN';
  if (hitting) return 'ATTACK';
  return 'IDLE';
}
