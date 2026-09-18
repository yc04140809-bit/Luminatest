// LEVEL AND EXPERIENCE — the arithmetic, and nothing else.
//
// No React, no database, no battle: every function takes what somebody
// has and gives back what they would have. That is what lets the curve
// be argued about in a test rather than in a playthrough, and it is
// what makes a level-up safe to compute before anything is saved.
//
// TWO LAYERS OF GROWTH, AND THIS IS ONLY THE FIRST.
//
// MUGEN ZERO grows a character two ways, and they must never become one
// bar. LEVEL is what fighting gives you: ordinary, repeatable, earned
// by turning up. WORLD MEMORY, WORLD RESONANCE and ARCANA are what
// INVOLVING YOURSELF IN THE WORLD gives you — sparing a man, learning
// what a creature is, changing what a place becomes — and those are
// deliberately not experience points. Folding them into one number
// would make "go and care about something" a slower way of grinding,
// which is the opposite of what this game is about.
//
// So nothing in this file knows the word `resonance`, and nothing that
// grants resonance will ever call `gainExp`.

/** What one character has earned. The only thing ever saved. */
export interface LevelProgress {
  level: number;
  /** Everything ever earned, not what is left over. See `gainExp`. */
  totalExp: number;
}

/**
 * TOTAL, NOT REMAINDER, and the choice matters.
 *
 * A save that keeps "experience toward the next level" is a save that
 * cannot survive a rebalanced curve: change a threshold and everybody's
 * remainder means something different, and there is no way to work out
 * what it should have been. A save that keeps the TOTAL can always be
 * re-read against whatever the curve is today — the level is derived,
 * not stored, so `level` below is a cache of a pure function and the
 * migration can simply recompute it.
 */
export const INITIAL_PROGRESS: LevelProgress = { level: 1, totalExp: 0 };

/** Where the curve stops. Nothing earns past it. */
export const MAX_LEVEL = 99;

/**
 * What the WHOLE JOURNEY to a level costs, from nothing.
 *
 * Quadratic-ish and deliberately gentle at the bottom: the first few
 * come quickly because a player who has just learned the battle should
 * see the system work, and they stretch out afterwards.
 *
 * ONE PLACE. Nothing else in the project may write an experience
 * threshold — a screen that wanted to draw a bar and computed its own
 * would be a second curve that can disagree with this one.
 */
export function expForLevel(level: number): number {
  const at = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  if (at <= 1) return 0;
  const n = at - 1;
  return Math.round(12 * n + 4 * n * n);
}

/** Whole, and never negative. Experience is not a fraction. */
function cleanExp(value: number): number {
  const whole = Math.floor(Number(value));
  return Number.isFinite(whole) ? Math.max(0, whole) : 0;
}

/**
 * The level this much experience actually is.
 *
 * Derived every time rather than counted up, so it cannot drift: a save
 * whose stored level disagrees with its total is repaired on load, and
 * a rebalanced curve re-reads every save correctly.
 */
export function levelForExp(totalExp: number): number {
  const exp = cleanExp(totalExp);
  let level = 1;
  while (level < MAX_LEVEL && exp >= expForLevel(level + 1)) level += 1;
  return level;
}

/** How much more is needed for the next one. Null at the ceiling. */
export function expToNextLevel(progress: LevelProgress): number | null {
  const level = levelForExp(progress.totalExp);
  if (level >= MAX_LEVEL) return null;
  return expForLevel(level + 1) - cleanExp(progress.totalExp);
}

/** How far into this level they are, and how long it is. For a bar. */
export function levelBand(progress: LevelProgress): { into: number; span: number } | null {
  const level = levelForExp(progress.totalExp);
  if (level >= MAX_LEVEL) return null;
  const floor = expForLevel(level);
  return { into: cleanExp(progress.totalExp) - floor, span: expForLevel(level + 1) - floor };
}

/** What a gain came to. */
export interface LevelGain {
  progress: LevelProgress;
  /** How many levels it crossed. Nought is the ordinary answer. */
  levelsGained: number;
  from: number;
  to: number;
}

/**
 * Experience earned.
 *
 * MANY LEVELS AT ONCE ARE ORDINARY. A player who comes back from a long
 * absence, or a fight worth a great deal, crosses several thresholds and
 * all of them count — the level is derived from the new total, so there
 * is no loop to get wrong and no way to stop one short.
 *
 * THERE IS NO LEVEL DOWN. A negative or nonsense gain is worth nothing
 * rather than taking something away: whatever bug produced it, a player
 * losing a level they earned is worse than a reward going missing.
 */
export function gainExp(progress: LevelProgress, amount: number): LevelGain {
  const before = readProgress(progress);
  const gain = Math.floor(Number(amount));
  const earned = Number.isFinite(gain) && gain > 0 ? gain : 0;
  const capped = Math.min(before.totalExp + earned, expForLevel(MAX_LEVEL));
  const totalExp = Math.max(before.totalExp, capped);
  const to = levelForExp(totalExp);
  return {
    progress: { level: to, totalExp },
    levelsGained: Math.max(0, to - before.level),
    from: before.level,
    to,
  };
}

/**
 * One character's progress out of a save.
 *
 * REPAIRED RATHER THAN TRUSTED, and the level is recomputed rather than
 * believed: it is a cache of `levelForExp`, so a save written under a
 * different curve — or by a build with a bug in it — comes back
 * consistent instead of coming back wrong. A save with no progress at
 * all reads as level one with nothing earned, which is what a new
 * character has.
 */
export function readProgress(raw: unknown): LevelProgress {
  if (!raw || typeof raw !== 'object') return { ...INITIAL_PROGRESS };
  const row = raw as Partial<LevelProgress>;
  const totalExp = cleanExp(row.totalExp ?? 0);
  return { level: levelForExp(totalExp), totalExp };
}

/** Everybody's progress out of a save, keyed by character id. */
export function readProgressTable(raw: unknown): Record<string, LevelProgress> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, LevelProgress> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof id !== 'string' || id === '') continue;
    out[id] = readProgress(value);
  }
  return out;
}
