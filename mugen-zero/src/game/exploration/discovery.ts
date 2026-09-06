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
import {
  GREENWOOD_FIELD,
  GREENWOOD_GROUND,
  groundPoint,
  type FieldSize,
  type GroundBand,
} from './walkable';

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
 * Placed ON THE GROUND BAND rather than measured against the painting:
 * each one is given as how far along the clearing it is and how far
 * forward, and walkable.ts turns that into a point that is on the path
 * by construction. That is the whole reason these moved — hand-placed
 * pixels have to be re-placed every time the art or the field's shape
 * changes, and a ring standing in a tree is not a bug anybody can see
 * in a screenshot until they walk into it.
 *
 * The player comes in from the right and the forest goes on to the
 * left, so the spots lean that way: something to walk towards, not
 * something that appeared underfoot.
 */
export interface GroundSpot {
  id: string;
  /** 0 at the left edge of the clearing, 1 at the right. */
  along: number;
  /** 0 at the back of the clearing, 1 at the front. */
  depth: number;
}

export const GREENWOOD_GROUND_SPOTS: readonly GroundSpot[] = [
  { id: 'PATH_FAR', along: 0.22, depth: 0.18 },
  { id: 'PATH_BEND_LEFT', along: 0.1, depth: 0.52 },
  { id: 'PATH_BEND_RIGHT', along: 0.36, depth: 0.34 },
  { id: 'ROOTS_LEFT', along: 0.17, depth: 0.86 },
  { id: 'PATH_MIDDLE', along: 0.5, depth: 0.62 },
  { id: 'STONES_RIGHT', along: 0.68, depth: 0.28 },
  { id: 'PATH_NEAR_RIGHT', along: 0.74, depth: 0.9 },
  { id: 'PATH_NEAR_LEFT', along: 0.42, depth: 0.96 },
];

/**
 * The same eight places, as coordinates in a field of this size.
 *
 * Derived rather than written down, so the ring is on the path because
 * of where the path is — not because somebody once measured a pixel
 * and nobody has re-measured it since.
 */
export function spotsOnGround(
  spots: readonly GroundSpot[],
  size: FieldSize = GREENWOOD_FIELD,
  band: GroundBand = GREENWOOD_GROUND,
): DiscoverySpot[] {
  return spots.map((s) => {
    const p = groundPoint(band, size, s.along, s.depth);
    return { id: s.id, x: p.x, y: p.y };
  });
}

/** Greenwood's, at the size the forest is actually drawn. */
export const GREENWOOD_DISCOVERY_SPOTS: readonly DiscoverySpot[] =
  spotsOnGround(GREENWOOD_GROUND_SPOTS);

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
