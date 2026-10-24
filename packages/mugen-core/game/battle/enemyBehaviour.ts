// WHAT AN ENEMY IS LIKE, beyond its health.
//
// A fight that ends in three taps has no room in it for music, for the
// creature's own way of doing things, or for the player to have felt
// anything about what they are about to be asked. The obvious fix — a
// bigger number in the HP field — buys seconds and spends interest: a
// creature that is only harder to get through is a wall with a face.
//
// So this adds two things that are about the SHAPE of a fight rather
// than its length:
//
//   POISE     something to aim at in the middle of a fight. Every blow
//             costs the creature its footing, and a blow that lands on
//             something already bracing costs it more — so guarding is
//             a thing to break rather than a thing to wait out. At zero
//             it is off balance: it cannot act, and it takes more.
//
//   PHASES    a creature is not the same all the way down. At a share
//             of its health it does something different and says so —
//             which is where "this one was frightened" and "this one
//             was protecting something" get to be visible.
//
// Both are pure and both are optional: an enemy with neither fights
// exactly as it did before this file existed.

/** How a creature changes once it is hurt past some point. */
export interface EnemyPhase {
  id: string;
  /**
   * Entered when its health falls to this share or below. Phases are
   * checked in the order given, and the first one that fits wins, so
   * write them worst-hurt last.
   */
  atOrBelow: number;
  /** One line when it enters. Said once, never repeated. */
  line: string;
  /** What its blows are multiplied by from here on. */
  attack?: number;
  /** How much more likely it is to use its one trick. */
  skillChance?: number;
  /** What lands on it from here on: below 1 is tougher, above 1 softer. */
  damageTaken?: number;
}

export interface EnemyPoiseSpec {
  /** How many blows' worth of footing it has. */
  max: number;
  /** Taken by an ordinary blow. */
  perHit: number;
  /**
   * Taken by a blow that lands while it is bracing.
   *
   * Higher than perHit on purpose: hitting something that is guarding
   * should be how you break the guard, not a turn thrown away.
   */
  perGuardedHit: number;
  /** How many of its turns it loses once its footing is gone. */
  staggerTurns: number;
  /** What lands on it while it is off balance. */
  staggerDamageTaken: number;
  /** Said when it loses its footing. */
  breakLine: string;
  /** Said when it gets it back. */
  recoverLine: string;
}

/** What a hit did to a creature's footing. */
export interface PoiseResult {
  poise: number;
  staggerTurns: number;
  /** True on the blow that took the last of it. */
  broke: boolean;
}

export function hitPoise(
  spec: EnemyPoiseSpec | null,
  poise: number,
  staggerTurns: number,
  guarded: boolean,
): PoiseResult {
  if (!spec) return { poise, staggerTurns, broke: false };
  // Already off balance: there is no footing left to take.
  if (staggerTurns > 0) return { poise, staggerTurns, broke: false };
  const cost = guarded ? spec.perGuardedHit : spec.perHit;
  const left = Math.max(0, poise - cost);
  if (left > 0) return { poise: left, staggerTurns, broke: false };
  return { poise: 0, staggerTurns: spec.staggerTurns, broke: true };
}

/** A creature's turn spent getting its footing back, or not. */
export function recoverPoise(
  spec: EnemyPoiseSpec | null,
  poise: number,
  staggerTurns: number,
): { poise: number; staggerTurns: number; recovered: boolean } {
  if (!spec || staggerTurns <= 0) return { poise, staggerTurns, recovered: false };
  const left = staggerTurns - 1;
  if (left > 0) return { poise, staggerTurns: left, recovered: false };
  return { poise: spec.max, staggerTurns: 0, recovered: true };
}

/**
 * Which phase a creature is in at this much health.
 *
 * Null while it is still itself. The FIRST matching entry wins, so a
 * list written worst-hurt-last behaves the way it reads.
 */
export function phaseAt(
  phases: readonly EnemyPhase[] | null,
  hp: number,
  maxHp: number,
): EnemyPhase | null {
  if (!phases || phases.length === 0 || maxHp <= 0) return null;
  const share = Math.max(0, hp) / maxHp;
  let found: EnemyPhase | null = null;
  for (const phase of phases) {
    if (share <= phase.atOrBelow) found = phase;
  }
  return found;
}

/**
 * Whether a creature has just crossed into a new phase.
 *
 * Compared by id rather than by number so that a phase entered, left
 * (by being healed) and entered again says its line again — and so that
 * nothing says its line twice for one crossing.
 */
export function phaseChanged(before: EnemyPhase | null, after: EnemyPhase | null): boolean {
  return (before?.id ?? null) !== (after?.id ?? null);
}
