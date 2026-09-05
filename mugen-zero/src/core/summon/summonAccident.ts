// SUMMONING ACCIDENTS — the moment a memory the player does not have
// crosses one they do.
//
// The rule this whole file exists to protect: an accident is NOT a
// prize. Nothing is granted by one. What the player gets is a sight
// they cannot account for, and its meaning arrives later — in the
// world, when they finally meet whatever it was.
//
// It follows that this is not a drop table. What can cross, and when,
// is a matter of conditions: which memory was being rebuilt and how
// much of it there is, where the fight is, what year it is, and — the
// part that matters most — where the player already stands with the
// thing itself. Something they have already made their own can never
// cross them by accident again.

import type { Rng } from './summon';

/**
 * How far the player has got with one thing that has crossed them.
 *
 * A one-way road, and only the first step of it is built today:
 *
 *   UNSEEN      never crossed. In the pool.
 *   OBSERVED    seen once, for a second, without a name.
 *   IDENTIFIED  met properly in the world, and now has one. The
 *               event that does this is a later phase; the state and
 *               the exclusion rules that read it are here so that
 *               phase has somewhere to land.
 *   ACQUIRED    the player holds its ARCANA and can call it on
 *               purpose. Out of the pool, permanently.
 */
export type AccidentState = 'UNSEEN' | 'OBSERVED' | 'IDENTIFIED' | 'ACQUIRED';

/** What a thing that crosses does while it is here. */
export interface SummonAccidentAbility {
  id: string;
  /** For the book and the log. Not for the cut-in — see `titleInArt`. */
  name: string;
  /**
   * Whether the artwork already carries its own title.
   *
   * The breath's picture has 「エンシェントブレス」 drawn into it. A
   * screen that prints the name again puts it on the player twice,
   * so this flag exists to stop that ever happening by accident.
   */
  titleInArt: boolean;
  effect: AccidentEffect;
}

/**
 * One effect today, and it is deliberately shaped for the fight this
 * game does not have yet: STRIKE_ALL means every enemy, not "the
 * enemy". One creature is the current answer to "every".
 */
export type AccidentEffect = { kind: 'STRIKE_ALL'; amount: number };

/**
 * One thing that could cross, and what has to be true for it to.
 *
 * The pool is a list of these. Adding UNKNOWN #002 is adding an entry
 * — no new branch, no `if` about any particular creature, and nothing
 * in the battle or the preview to change.
 */
export interface SummonAccidentDef {
  /** The accident, for the save and the preview. */
  id: string;
  enabled: boolean;
  /**
   * The ARCANA this thing turns out to be, once the player has it.
   *
   * The join between a sighting and a page, and the only thing the
   * exclusion rule reads. It is a reserved id today: no such ARCANA
   * exists yet, so nobody can own it, so the candidate always stands.
   */
  arcanaId: string;
  /** What the book and the preview call it. Never its real name. */
  unknownLabel: string;
  /** The page the book writes when somebody sees this. */
  unknownArcanaId: string;
  /** Which piece of theatre the admin preview plays for it. */
  previewId: string;
  /**
   * The band of construction an unstable memory has to be in.
   *
   * A band, not a curve. "The less complete, the more accidents" as
   * the whole design would make the rarest sight in the game a reward
   * for collecting badly. Part of WHETHER an accident happens, which
   * is why it is here and not among the things left for later.
   */
  minProgress: number;
  maxProgress: number;
  ability: SummonAccidentAbility;

  /*
   * The door, deliberately left shut.
   *
   * A candidate may one day want a place, a year, a story flag, a
   * rarity, a draw weight or a cooldown before it may recur. None of
   * those are here, because none of them have a second candidate to
   * be different about yet, and a condition engine written before
   * there are conditions is a guess with a schema. When the second
   * one arrives, they go on this interface and into
   * eligibleAccidents, and nothing else moves.
   */
}

/** Where the player stands with one of them. */
export interface AccidentRecord {
  accidentId: string;
  state: AccidentState;
  timesObserved: number;
  /** Absolute world day of the last sighting, for the cooldown. */
  lastObservedDay: number | null;
}

export function emptyAccidentRecord(accidentId: string): AccidentRecord {
  return { accidentId, state: 'UNSEEN', timesObserved: 0, lastObservedDay: null };
}

/** The one number that is not per-candidate. */
export const SUMMON_ACCIDENT_CONFIG = {
  /**
   * How often an incomplete reconstruction crosses something else
   * instead of simply holding or not.
   *
   * A prototype value, not balance: it is checked only when a
   * candidate already fits, so the real rate is this times how rarely
   * Kaos reaches for an unfinished memory at all. It will be set from
   * playtesting, and this is the only place to set it.
   */
  chance: 0.06,
};

export interface AccidentPickOptions {
  defs: readonly SummonAccidentDef[];
  /** How much of the memory being rebuilt exists. */
  progress: number;
  /**
   * ARCANA the player holds outright.
   *
   * The one and only reason a candidate is taken out of the pool, and
   * it is read from the book rather than kept here — a second copy of
   * "does the player own this" is a second copy that can disagree.
   *
   * Note what is NOT a reason: having seen it. A sighting is not an
   * acquisition, and somebody who watched something enormous go past
   * and still has no idea what it was has exactly as much reason to
   * see it again as anybody else.
   */
  acquiredArcanaIds?: readonly string[];
  rng?: Rng;
  /**
   * Development only: skip the chance roll, but never the conditions.
   * A string forces one candidate by id.
   */
  forced?: boolean | string;
  chance?: number;
}

/**
 * Everything that could cross here.
 *
 * Two questions, and deliberately only two. Is this candidate live at
 * all, and is this memory unfinished enough for something to cross it
 * — then: does the player already own the thing? That last one is the
 * whole of PHASE 2, and it is written once, for every candidate, by
 * reading the book rather than by asking about any creature by name.
 */
export function eligibleAccidents(options: AccidentPickOptions): SummonAccidentDef[] {
  const acquired = new Set(options.acquiredArcanaIds ?? []);
  return options.defs.filter((def) => {
    if (!def.enabled) return false;
    if (options.progress < def.minProgress) return false;
    if (options.progress > def.maxProgress) return false;
    // Owned is out, and nothing else is. Once a thing is the player's
    // to call on purpose it stops being a thing that crossed them by
    // chance; until then it stays in the pool however many times they
    // have watched it go past.
    return !acquired.has(def.arcanaId);
  });
}

/**
 * Everything the admin may look at, which is everything that exists.
 *
 * A separate list from the one above on purpose. The preview answers
 * "does this piece of theatre still look right", and that question has
 * nothing to do with what any save happens to own — an owned creature
 * whose cut-in has broken is exactly the case somebody needs to be
 * able to check.
 */
export function previewableAccidents(
  defs: readonly SummonAccidentDef[],
): SummonAccidentDef[] {
  return defs.filter((def) => def.enabled);
}

/**
 * What crosses, if anything does.
 *
 * Two gates, in this order, and the order is the point: something has
 * to be able to happen here, and only then does the world roll for it.
 * Whether an accident happens at all is unchanged by anything in this
 * round — the same chance, checked in the same place. What changed is
 * only which of them is chosen once it has.
 *
 * Nothing eligible means no accident, and no dice thrown: the caller
 * falls back to an ordinary summon with its own roll untouched.
 * Forcing skips the chance and never the conditions.
 */
export function pickAccident(options: AccidentPickOptions): SummonAccidentDef | null {
  let candidates = eligibleAccidents(options);
  if (typeof options.forced === 'string') {
    candidates = candidates.filter((def) => def.id === options.forced);
  }
  if (candidates.length === 0) return null;
  const rng = options.rng ?? Math.random;
  const chance = options.chance ?? SUMMON_ACCIDENT_CONFIG.chance;
  if (!options.forced && rng() >= chance) return null;
  // Evenly, for now. A per-candidate draw weight is one of the things
  // waiting on there being a second candidate to weigh against.
  return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))];
}

/**
 * Where a sighting leaves the record.
 *
 * OBSERVED only ever moves UNSEEN forward: seeing a thing again after
 * you have identified it does not un-identify it.
 */
export function observed(record: AccidentRecord, day: number | null): AccidentRecord {
  return {
    ...record,
    state: record.state === 'UNSEEN' ? 'OBSERVED' : record.state,
    timesObserved: record.timesObserved + 1,
    lastObservedDay: day,
  };
}
