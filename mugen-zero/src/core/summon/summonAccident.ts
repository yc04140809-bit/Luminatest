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

/**
 * Whether a thing that has already crossed may cross again.
 *
 * Deliberately data rather than a rule. "Once, ever" reads well and
 * plays badly: a player who was looking away has missed the only
 * strange thing in the build, forever. And "……またアイツだ" is worth
 * having as an experience in its own right.
 *
 *   ONCE            never again.
 *   RARE_REPEAT     rarely, after a cooldown, forever.
 *   UNTIL_ACQUIRED  rarely, after a cooldown, until it is theirs.
 */
export type AccidentRepeatPolicy = 'ONCE' | 'RARE_REPEAT' | 'UNTIL_ACQUIRED';

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

/** One thing that could cross, and what has to be true for it to. */
export interface SummonAccidentDef {
  id: string;
  enabled: boolean;
  /**
   * The band of construction an unstable memory has to be in.
   *
   * A band, not a curve. "The less complete, the more accidents" as
   * the whole design would make the rarest sight in the game a reward
   * for collecting badly.
   */
  minProgress: number;
  maxProgress: number;
  /** Where the fight is, when it matters. */
  location?: string;
  /** The world year, when it matters. */
  year?: number;
  /** Its share the first time. */
  weight: number;
  /** Its share every time after that. Zero means "never again". */
  repeatWeight: number;
  repeatPolicy: AccidentRepeatPolicy;
  /** Days that must pass before it may cross again. Stops it recurring. */
  cooldownDays: number;
  /** The page the book writes when somebody sees this. */
  unknownArcanaId: string;
  /**
   * The real ARCANA this turns out to be, once the world contains it.
   *
   * Null while there is no such thing. It is the join between a
   * sighting and a page, and it is what makes the exclusion rule below
   * general instead of a special case about one creature.
   */
  resolvedArcanaId: string | null;
  ability: SummonAccidentAbility;
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
  /** Where the player stands with each of them. Absent reads as UNSEEN. */
  records?: readonly AccidentRecord[];
  /**
   * ARCANA the player holds outright.
   *
   * The exclusion this drives is the important one, and it is written
   * once for everything rather than as an `if` about a dragon: a thing
   * whose page you own is a thing you summon on purpose, and it must
   * never turn up again as an accident.
   */
  acquiredArcanaIds?: readonly string[];
  /** Today, in absolute world days, for cooldowns. */
  day?: number | null;
  location?: string | null;
  year?: number | null;
  rng?: Rng;
  /**
   * Development only: skip the chance roll, but never the conditions.
   * A string forces one candidate by id.
   */
  forced?: boolean | string;
  chance?: number;
}

function recordFor(
  options: AccidentPickOptions,
  def: SummonAccidentDef,
): AccidentRecord {
  return (
    options.records?.find((r) => r.accidentId === def.id) ?? emptyAccidentRecord(def.id)
  );
}

/** Whether enough time has passed since the last sighting. */
function cooledDown(def: SummonAccidentDef, record: AccidentRecord, day: number | null): boolean {
  if (record.lastObservedDay === null) return true;
  if (def.cooldownDays <= 0) return true;
  // A world with no clock to read cannot prove the wait is over, and
  // the safe answer to that is "not yet": better a sight withheld than
  // the same sight twice in one afternoon.
  if (day === null) return false;
  return day - record.lastObservedDay >= def.cooldownDays;
}

/** Everything that could happen here, before the dice. */
export function eligibleAccidents(options: AccidentPickOptions): SummonAccidentDef[] {
  const acquired = new Set(options.acquiredArcanaIds ?? []);
  const day = options.day ?? null;
  return options.defs.filter((def) => {
    if (!def.enabled) return false;
    if (options.progress < def.minProgress) return false;
    if (options.progress > def.maxProgress) return false;
    if (def.location !== undefined && def.location !== options.location) return false;
    if (def.year !== undefined && def.year !== options.year) return false;

    const record = recordFor(options, def);
    // The hard rule, and the reason `resolvedArcanaId` exists: what
    // the player owns is theirs to call, and can never be an accident
    // again. Checked from both sides — the state the record reached,
    // and the page the player holds — because either can arrive first.
    if (record.state === 'ACQUIRED') return false;
    if (def.resolvedArcanaId !== null && acquired.has(def.resolvedArcanaId)) return false;

    if (record.timesObserved === 0) return true;
    if (def.repeatPolicy === 'ONCE') return false;
    if (weightFor(def, record) <= 0) return false;
    return cooledDown(def, record, day);
  });
}

/** Its share of the draw, which drops sharply after the first time. */
export function weightFor(def: SummonAccidentDef, record: AccidentRecord): number {
  return record.timesObserved === 0 ? Math.max(0, def.weight) : Math.max(0, def.repeatWeight);
}

/**
 * What crosses, if anything does.
 *
 * Two gates, in this order: something has to be able to happen here,
 * and then the world has to be unlucky. Forcing skips the second and
 * never the first — a tester whose candidate is out of band, on
 * cooldown or already owned gets an ordinary summon, exactly as a
 * player would.
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

  const weights = candidates.map((def) => weightFor(def, recordFor(options, def)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return candidates[0];
  let cut = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    cut -= weights[i];
    if (cut < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
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
