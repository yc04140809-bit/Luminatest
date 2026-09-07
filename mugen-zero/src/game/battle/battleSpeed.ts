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

/** What the player may pick. One, and then the ones worth having. */
export type BattleSpeed = 1 | 2 | 3;

export const BATTLE_SPEEDS: readonly BattleSpeed[] = [1, 2, 3];

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

/** The next one round the loop, for a control that cycles. */
export function nextSpeed(speed: BattleSpeed): BattleSpeed {
  const at = BATTLE_SPEEDS.indexOf(speed);
  return BATTLE_SPEEDS[(at + 1) % BATTLE_SPEEDS.length] ?? DEFAULT_BATTLE_SPEED;
}

/** What to print on that control. */
export function speedLabel(speed: BattleSpeed): string {
  return `×${speed}`;
}
