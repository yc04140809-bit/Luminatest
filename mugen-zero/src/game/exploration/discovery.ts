// EXPLORATION DISCOVERY — what is waiting at the gold ring, and where
// the next one appears.
//
// Two small decisions live here, both pure and both testable, because
// they are the ones that decide whether walking somewhere is worth it:
// what the player finds when they arrive, and whether the next thing
// worth walking to looks worth walking to.
//
// It generates nothing else. It writes no world truth, it knows nothing
// about Gald, WORLD MEMORY or the event engine, and the numbers in it
// are hypotheses for a playtest rather than a design.

/**
 * What an arrival turns out to be.
 *
 * Three, and deliberately no more: a fourth kind is a fourth thing to
 * explain and a fourth thing to balance, and none of the three are
 * proven yet.
 */
export type DiscoveryCategory = 'EVENT' | 'ITEM' | 'BATTLE';

export const DISCOVERY_CATEGORIES: readonly DiscoveryCategory[] = ['EVENT', 'ITEM', 'BATTLE'];

/**
 * The opening hypothesis, not a specification.
 *
 * Half the arrivals are something to listen to, a quarter something to
 * take away, a quarter a fight — so that walking over is usually
 * rewarded with a moment rather than a threat. Change the numbers here
 * and nothing else needs to move.
 */
export const EXPLORATION_ENCOUNTER_WEIGHTS: Readonly<Record<DiscoveryCategory, number>> = {
  EVENT: 50,
  ITEM: 25,
  BATTLE: 25,
};

export type Rng = () => number;

export interface ResolveOptions {
  /** What the last arrival turned out to be, so it is less likely twice. */
  previous?: DiscoveryCategory | null;
  /** Development only: force a category so each route can be tested. */
  forced?: DiscoveryCategory | null;
  weights?: Readonly<Record<DiscoveryCategory, number>>;
  rng?: Rng;
}

/**
 * What the player finds at the ring they just walked to.
 *
 * Weighted, with exactly one re-roll when the draw repeats the last
 * arrival. That is not a fairness system and is not trying to be one —
 * it only takes the edge off BATTLE, BATTLE, BATTLE, which reads as the
 * forest being hostile rather than the dice being dice.
 */
export function resolveExplorationEncounter(options: ResolveOptions = {}): DiscoveryCategory {
  if (options.forced) return options.forced;
  const weights = options.weights ?? EXPLORATION_ENCOUNTER_WEIGHTS;
  const rng = options.rng ?? Math.random;
  const first = weightedPick(weights, rng);
  if (options.previous && first === options.previous) return weightedPick(weights, rng);
  return first;
}

function weightedPick(weights: Readonly<Record<DiscoveryCategory, number>>, rng: Rng): DiscoveryCategory {
  const usable = DISCOVERY_CATEGORIES.filter((c) => (weights[c] ?? 0) > 0);
  if (usable.length === 0) return 'EVENT';
  const total = usable.reduce((sum, c) => sum + weights[c], 0);
  let roll = rng() * total;
  for (const category of usable) {
    roll -= weights[category];
    if (roll < 0) return category;
  }
  return usable[usable.length - 1];
}

export interface DiscoverySpot {
  id: string;
  x: number;
  y: number;
}

/**
 * Where a gold ring may stand in Greenwood.
 *
 * Hand-placed against the background art rather than worked out by a
 * machine: each one is on or beside the path, far enough from the edges
 * that nothing is half off-screen, and up the slope from where the
 * player enters, so the ring is something seen ahead rather than
 * something that appeared underfoot. No navmesh, no image analysis —
 * eight coordinates and a rule about which one comes next.
 */
export const GREENWOOD_DISCOVERY_SPOTS: readonly DiscoverySpot[] = [
  { id: 'PATH_FAR', x: 180, y: 118 },
  { id: 'PATH_BEND_LEFT', x: 138, y: 166 },
  { id: 'PATH_BEND_RIGHT', x: 224, y: 158 },
  { id: 'ROOTS_LEFT', x: 120, y: 250 },
  { id: 'PATH_MIDDLE', x: 172, y: 232 },
  { id: 'STONES_RIGHT', x: 238, y: 258 },
  { id: 'PATH_NEAR_RIGHT', x: 206, y: 322 },
  { id: 'PATH_NEAR_LEFT', x: 134, y: 330 },
];

export interface NextSpotOptions {
  spots?: readonly DiscoverySpot[];
  /** The spot that has just been used up. Never chosen again next. */
  previousId?: string | null;
  /** Where the player is standing, so the next ring is not on top of them. */
  from?: { x: number; y: number } | null;
  /** How far from the player counts as "worth walking to". */
  minDistance?: number;
  rng?: Rng;
}

/**
 * The next place worth walking to.
 *
 * Two rules, both about the feeling rather than the mathematics: never
 * the spot just used, so the forest does not look like it is repeating
 * itself, and never within a few steps of the player, so arriving is
 * something they did rather than something that happened to them. If
 * the rules cannot both be met, the second one gives way — a ring
 * somewhere is better than no ring at all.
 */
export function nextDiscoverySpot(options: NextSpotOptions = {}): DiscoverySpot {
  const spots = options.spots ?? GREENWOOD_DISCOVERY_SPOTS;
  const rng = options.rng ?? Math.random;
  const minDistance = options.minDistance ?? 130;
  const from = options.from ?? null;

  const notJustUsed = spots.filter((s) => s.id !== options.previousId);
  const pool = notJustUsed.length > 0 ? notJustUsed : [...spots];
  const farEnough = from
    ? pool.filter((s) => Math.hypot(s.x - from.x, s.y - from.y) >= minDistance)
    : pool;
  const choices = farEnough.length > 0 ? farEnough : pool;
  return choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))];
}
