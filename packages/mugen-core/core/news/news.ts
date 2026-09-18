// PICKING A DAY'S NEWS.
//
// Two piles and a ratio. The interesting part is not the shuffling — it
// is that the signal pile is EARNED: a line about somebody only exists
// on a day when the thing it is about is true, and is otherwise not in
// the pile at all. Nothing invents a rumour to hit a quota.
//
// Which means the ratio is a ceiling rather than a target. A world
// where nothing has happened yet is all chickens, correctly, and the
// day the village has four things to say the player still only hears
// one or two of them among the chickens. Both of those are the same
// rule.

import { seedKind, type SeedKindDef } from '../life/defs';
import { atLeast, grownSeed } from '../life/growth';
import type { WorldLifeState, SeedRequirement } from '../life/types';
import type { NewsImportance, NewsItem, NoiseNews, SignalNews, PlayerNews } from './types';
import { forPlayer } from './types';

/**
 * A line the village says WHEN something is true of it.
 *
 * Authored, one entry at a time, exactly like a crossing — there is no
 * pass that generates a sentence per seed per person, because a world
 * that narrates its own state is a world that has told the player it is
 * a machine.
 */
export interface NewsSignalDef {
  id: string;
  /** What somebody noticed. Always a rumour, never a report. */
  text: string;
  when: {
    /** Seeds that must be alive in somebody. */
    seeds?: readonly (SeedRequirement & { npcId: string })[];
    /** Meetings that must have happened. */
    crossings?: readonly string[];
    /** Futures that must be open. */
    blooms?: readonly string[];
  };
  importance: NewsImportance;
  seedEffect?: SignalNews['seedEffect'];
  vineEffect?: SignalNews['vineEffect'];
  propagationPotential?: number;
}

/**
 * What share of a day's news may be about something.
 *
 * A fifth. Higher and the village becomes a briefing; lower and the
 * player never finds out that anything is happening at all. It is a
 * ceiling on the SIGNAL pile, never a floor — see the note at the top.
 */
export const SIGNAL_SHARE = 0.2;

/** Whether the world currently supports saying this. */
export function signalHolds(def: NewsSignalDef, state: WorldLifeState, kinds: readonly SeedKindDef[]): boolean {
  for (const want of def.when.seeds ?? []) {
    const stored = state.seeds.find(
      (seed) => seed.targetNpcId === want.npcId && seed.type === want.type,
    );
    const kind = stored ? seedKind(kinds, stored.type) : null;
    if (!stored || !kind) {
      if (want.atLeast !== undefined || !(want.absentCounts ?? true)) return false;
      continue;
    }
    const seed = grownSeed(stored, kind, state.now);
    if (want.atLeast !== undefined && !atLeast(seed.status, want.atLeast)) return false;
    if (
      want.atMost !== undefined &&
      atLeast(seed.status, want.atMost) &&
      seed.status !== want.atMost
    ) {
      return false;
    }
  }
  for (const id of def.when.crossings ?? []) {
    if (!state.memories.some((memory) => memory.id === `cross:${id}`)) return false;
  }
  for (const id of def.when.blooms ?? []) {
    if (!state.blooms.some((bloom) => bloom.id === id)) return false;
  }
  return true;
}

/** Every line the village could truthfully say today. */
export function availableSignals(
  defs: readonly NewsSignalDef[],
  state: WorldLifeState,
  kinds: readonly SeedKindDef[],
): SignalNews[] {
  return defs
    .filter((def) => signalHolds(def, state, kinds))
    .map((def) => ({
      kind: 'SIGNAL' as const,
      id: def.id,
      text: def.text,
      importance: def.importance,
      seedEffect: def.seedEffect,
      vineEffect: def.vineEffect,
      propagationPotential: def.propagationPotential,
    }));
}

export interface NewsdayInput {
  state: WorldLifeState;
  kinds: readonly SeedKindDef[];
  signals: readonly NewsSignalDef[];
  noise: readonly NoiseNews[];
  /** How many lines the village says today. */
  count: number;
  /**
   * Which day this is, as a number.
   *
   * The whole of the randomness. A day's news is a pure function of the
   * world and the date, so the same day read twice says the same thing
   * — a player who reopens the screen has not been lied to, and a test
   * does not need a seeded generator.
   */
  day: number;
}

/**
 * TODAY'S NEWS, mixed.
 *
 * Signal first by availability, then capped by the share, then padded
 * with noise, then shuffled by the day so that the interesting line is
 * not reliably third. A player who learns "the real one is always last"
 * has been handed the importance field after all.
 */
export function newsday(input: NewsdayInput): NewsItem[] {
  const { state, kinds, signals, noise, count, day } = input;
  if (count <= 0) return [];

  const allowed = Math.floor(count * SIGNAL_SHARE);
  const available = availableSignals(signals, state, kinds);
  const chosenSignals = rotate(available, day).slice(0, Math.max(0, allowed));

  const room = count - chosenSignals.length;
  const chosenNoise = rotate([...noise], day * 7 + 3).slice(0, Math.max(0, room));

  return shuffleByDay([...chosenSignals, ...chosenNoise], day);
}

/** The same, with everything internal removed. What a screen gets. */
export function playerNewsday(input: NewsdayInput): PlayerNews[] {
  return newsday(input).map(forPlayer);
}

/**
 * A different slice of the same list each day, without a generator.
 *
 * So a village that has six chickens and says two a day gets through
 * all six rather than repeating the first two forever.
 */
function rotate<T>(list: readonly T[], by: number): T[] {
  if (list.length === 0) return [];
  const at = ((by % list.length) + list.length) % list.length;
  return [...list.slice(at), ...list.slice(0, at)];
}

/**
 * Ordered by the day rather than at random.
 *
 * Deterministic on purpose: news that reshuffles every time the screen
 * is opened reads as a slot machine, and a day has one set of gossip.
 */
function shuffleByDay<T>(list: T[], day: number): T[] {
  return [...list]
    .map((item, index) => ({ item, at: (index * 31 + day * 17 + 7) % 97 }))
    .sort((a, b) => a.at - b.at)
    .map((entry) => entry.item);
}

/**
 * What the author can ask that the player cannot.
 *
 * Whether the village is currently able to say anything at all, and
 * what it would be. For GOD VIEW and for tests; no screen calls this.
 */
export function newsReport(
  defs: readonly NewsSignalDef[],
  state: WorldLifeState,
  kinds: readonly SeedKindDef[],
): { available: SignalNews[]; silent: string[] } {
  const available = availableSignals(defs, state, kinds);
  const saying = new Set(available.map((signal) => signal.id));
  return {
    available,
    silent: defs.filter((def) => !saying.has(def.id)).map((def) => def.id),
  };
}
