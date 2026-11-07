// HOW FAST THE FIGHT IS WATCHED.
//
// Not how fast it is fought: every number, every roll and every rule is
// untouched by this. What it scales is the theatre — how long a blow is
// held on screen before the next thing happens — because a player on
// their fifth fight has already read all of it.
//
// It exists as its own file, with the multiplier passed in rather than
// read from anywhere, so that turning it on is a control somebody adds
// to a screen and not a change to how a battle is timed. At ×1 every
// number that comes out is the number that went in, which is what makes
// adopting this invisible until somebody asks for it.

/** Every speed the timing knows how to hold a beat at. */
export type BattleSpeed = 1 | 2 | 3;

/**
 * What the player is actually offered, in the order the control cycles.
 *
 * Two, because two is the choice somebody makes — "normal" and "I have
 * seen this" — and a third step is worth adding when somebody has sat
 * through enough fights to want it rather than because the type allows
 * it. Adding it is appending `3` to this array: the timing already
 * holds beats at three, and a test below proves it.
 */
export const BATTLE_SPEEDS: readonly BattleSpeed[] = [1, 2];

/** What a fight starts at, and what every fight is timed against today. */
export const DEFAULT_BATTLE_SPEED: BattleSpeed = 1;

/**
 * The shortest a beat is ever allowed to become.
 *
 * A blow landing in 90ms still reads as a blow landing. Below that it
 * is a flicker somebody's eye misses, and a fight where the player
 * cannot see what hit them is not a faster fight, it is a broken one.
 * The floor is why this is a function rather than a division.
 */
export const MIN_BEAT_MS = 90;

/** How long to hold something that normally takes `ms`. */
export function beatMs(ms: number, speed: BattleSpeed): number {
  const asked = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  if (speed === 1) return asked;
  // Nought stays nought: something with no duration is not a beat that
  // has been made too short, it is a beat that was never held.
  if (asked === 0) return 0;
  return Math.max(MIN_BEAT_MS, Math.round(asked / speed));
}

/**
 * How long to hold a MOTION that normally takes `ms`.
 *
 * THE DIFFERENCE FROM `beatMs` IS THE WHOLE POINT. Speed is a promise
 * about tempo, not about what the player is allowed to see: a wait can
 * be halved and lose nothing, while a blow halved twice stops being a
 * blow and becomes a flicker. So waits go through `beatMs` and motions
 * come through here, where each one carries the shortest it can be and
 * still be read.
 *
 * `minReadable` is a floor, never a stretch: a motion already shorter
 * than its own floor at ×1 is left exactly as it was authored, because
 * a "minimum" that made ×2 SLOWER than ×1 would be a bug wearing the
 * word minimum. That is what the inner `Math.min` is for.
 */
export function visualMs(ms: number, speed: BattleSpeed, minReadable: number): number {
  const asked = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const floor = Number.isFinite(minReadable) ? Math.max(0, minReadable) : 0;
  return Math.max(beatMs(asked, speed), Math.min(asked, floor));
}

/** The next one round the loop, for a control that cycles. */
export function nextSpeed(speed: BattleSpeed): BattleSpeed {
  const at = BATTLE_SPEEDS.indexOf(speed);
  return BATTLE_SPEEDS[(at + 1) % BATTLE_SPEEDS.length] ?? DEFAULT_BATTLE_SPEED;
}

/** What to print on that control. */
export function speedLabel(speed: BattleSpeed): string {
  return `×${speed}`;
}
