// WHAT A SEED HAS BECOME, asked rather than ticked.
//
// Nothing here updates anything. A seed keeps the day it was planted
// and the days it was fed, and what it is worth today is computed from
// those and today's date — which means a village of a thousand people
// costs nothing until somebody asks about one of them, and a world that
// is saved, closed and opened a year later is in exactly the state it
// would have been in had it stayed open.
//
// It is the same trick as a battle buff that stores the turn it ends on
// instead of a countdown, and for the same reason: a number nobody has
// to remember to decrement is a number that cannot be wrong.

import { toAbsoluteDay, type WorldClock } from '../time/calendar';
import type { SeedKindDef } from './defs';
import type { SeedStatus, WorldSeed } from './types';

/**
 * Where the four words sit on the one number.
 *
 * ROOTED is high on purpose. A life is not redirected by an afternoon,
 * and a threshold low enough to be crossed by a single impressive
 * stranger would make the player's every passing kindness load-bearing
 * — which is the thing this engine exists not to do.
 */
export const GROWING_AT = 0.25;
export const ROOTED_AT = 0.65;
export const FADED_BELOW = 0.05;

export function statusOf(strength: number): SeedStatus {
  if (strength < FADED_BELOW) return 'FADED';
  if (strength >= ROOTED_AT) return 'ROOTED';
  if (strength >= GROWING_AT) return 'GROWING';
  return 'DORMANT';
}

/** Whether one status is at least as far along as another. */
const ORDER: Record<SeedStatus, number> = { FADED: -1, DORMANT: 0, GROWING: 1, ROOTED: 2 };
export function atLeast(status: SeedStatus, floor: SeedStatus): boolean {
  return ORDER[status] >= ORDER[floor];
}

/**
 * HOW MUCH OF IT IS LEFT, on this day.
 *
 * Everything that was ever put in, each worn down by how long ago it
 * went in. So a wanting fed once a year holds, a wanting fed once and
 * never again fades, and — the part that matters — a wanting fed
 * steadily for three years is a different thing from the same wanting
 * fed once very hard, which is what makes a life take time.
 *
 * A seed already rooted wears down far more slowly. That is not a
 * special case bolted on: it is what the word means. Before it roots it
 * is something that happened to you; after, it is something you are.
 */
export const ROOTED_DECAY_SHARE = 0.25;

export function strengthAt(seed: WorldSeed, kind: SeedKindDef, now: WorldClock): number {
  const today = toAbsoluteDay(now);
  const planted = toAbsoluteDay(seed.createdAt);
  if (today < planted) return seed.strength;

  // Each deposit worn down on its own, then added up. Added rather than
  // compounded so that being fed twice is worth more than being fed
  // once, however long ago — a person who was reminded is not back
  // where they started.
  const deposits = [
    { at: planted, amount: seed.strength },
    ...seed.fedBy.map((fed) => ({ at: toAbsoluteDay(fed.at), amount: fed.amount })),
  ];
  const raw = Math.min(1, totalAt(deposits, keeps(seed, kind), today));
  if (!kind.permanentOnceRooted) return raw;

  // Something that cannot be undone, once it genuinely happened. The
  // peak is always the day of the last deposit — every deposit only
  // wears down from where it went in, so nothing can be higher later —
  // which means asking whether it EVER rooted costs one more sum and
  // needs nothing remembered.
  const last = deposits.reduce((latest, deposit) => Math.max(latest, deposit.at), planted);
  const peak = Math.min(1, totalAt(deposits, keeps(seed, kind), last));
  return peak >= ROOTED_AT ? Math.max(ROOTED_AT, raw) : raw;
}

/** Every deposit worn down to one day, and added up. */
function totalAt(
  deposits: readonly { at: number; amount: number }[],
  keeps: number,
  day: number,
): number {
  let total = 0;
  for (const deposit of deposits) {
    const days = Math.max(0, day - deposit.at);
    total += deposit.amount * Math.pow(keeps, days / 100);
  }
  return total;
}

/** What a hundred days takes off it, given how deep it already is. */
function keeps(seed: WorldSeed, kind: SeedKindDef): number {
  const base = clamp01(kind.keepsPer100Days);
  // Read off what it was planted at plus what has been put in since,
  // undecayed — a cheap standing-in for "was this ever deep", which
  // avoids asking a question that would need this function's answer.
  const ever = seed.strength + seed.fedBy.reduce((sum, fed) => sum + fed.amount, 0);
  if (ever < ROOTED_AT) return base;
  return base + (1 - base) * (1 - ROOTED_DECAY_SHARE);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * The seed as it stands today: same identity, current numbers.
 *
 * Returned rather than written back, and nothing in the engine ever
 * stores one of these. The stored seed is the history; this is the
 * reading.
 */
export function grownSeed(seed: WorldSeed, kind: SeedKindDef, now: WorldClock): WorldSeed {
  const strength = strengthAt(seed, kind, now);
  return { ...seed, strength, status: statusOf(strength), visibility: visibilityOf(strength) };
}

/**
 * How much of it shows.
 *
 * A thing somebody has not admitted to themselves is hidden; a thing
 * they have is legible; a thing they have started saying out loud is
 * only ever something that has rooted.
 */
export function visibilityOf(strength: number): WorldSeed['visibility'] {
  if (strength >= ROOTED_AT) return 'SPOKEN';
  if (strength >= GROWING_AT) return 'FELT';
  return 'HIDDEN';
}
