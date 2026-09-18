// WHERE TWO LIVES TOUCH.
//
// THE PROBLEM THIS AVOIDS. The obvious way to make a world where people
// affect each other is to ask, every so often, what every person means
// to every other person. That is N² questions, almost all of which have
// the answer "nothing" — a village of forty people is sixteen hundred
// relationships nobody wrote and nobody will ever see. It is also the
// reason living-world systems get shelved: the cost grows with the
// square of the interesting-ness.
//
// So nothing here iterates over pairs. A crossing is an ENTRY: an
// author says "these two lives could touch, and here is what would have
// to be true first". The engine evaluates the entries that exist and
// nothing else, which means the cost is what somebody actually wrote.
// Two hundred villagers and four crossings cost four checks.
//
// WHAT A CROSSING IS AND IS NOT. It is not a future and it is not a
// bloom. A bloom says what somebody's life could BECOME and is only
// ever a candidate, because deciding that is not this engine's business.
// A crossing says two people MET — which is an event, like a spell being
// cast or a village being raided, and events are allowed to simply
// happen. What the meeting then does to either of them goes through the
// ordinary machinery: a record, a seed, growth, and whatever that grows
// into. Nobody's future is settled by a crossing; they just now know
// each other.
//
// WHEN THEY FIRE — 正式仕様, not a known issue.
//
// At story time, never on a clock. The engine has no tick and is not
// getting one: crossings are evaluated when the world is settled after
// something happened, so a meeting made possible by three quiet years
// is recorded at the moment the story next moves. A world walked in
// small steps records meetings at each step; a world jumped three years
// in one go records them at the far end.
//
// The date on a crossing is therefore WHEN THE STORY LOOKED, not when
// the two of them would first have passed in the street. That is the
// adopted specification (decided 2026-09, with the WORLD LIFE ENGINE's
// no-simulation rule) rather than an approximation to be fixed later.
//
// The alternative — working backwards to the day the conditions first
// held — is deliberately NOT implemented. It would mean either keeping
// a history of when every condition became true (a tick by another
// name) or re-deriving the whole world at every past date (a search).
// Both trade away the property this engine is built on: that a village
// of a thousand costs nothing until somebody looks at one of them.
//
// The cost is real and is accepted: a seed planted by a late-recorded
// meeting starts growing from the day it was recorded, so a chain that
// was possible for two years before anybody looked is two years younger
// than it "should" be. In a game where time moves at story beats rather
// than continuously, that gap is bounded by the length of a chapter.

import { toAbsoluteDay, type WorldClock } from '../time/calendar';
import { seedKind, type SeedKindDef } from './defs';
import { atLeast, grownSeed } from './growth';
import { holdsVine } from './vine';
import type {
  NpcCore,
  SeedRequirement,
  WorldActorId,
  WorldLifeState,
  WorldMemoryRecord,
  WorldSeed,
  WorldVine,
} from './types';

/**
 * TWO LIVES THAT COULD TOUCH, and what would have to be true first.
 *
 * `between` is documentation and a guard rather than a lookup: it names
 * whose lives this is about so that a reader can see the shape of the
 * world from the list, and so a crossing cannot quietly be written
 * about somebody it never mentions.
 */
export interface WorldCrossingDef {
  id: string;
  between: readonly [WorldActorId, WorldActorId];
  when: CrossingConditions;
  /** What is recorded when they do. An ordinary event, in every respect. */
  meets: {
    action: string;
    actor: WorldActorId;
    target: WorldActorId | null;
    location: string;
    witnesses?: readonly WorldActorId[];
    metadata?: Readonly<Record<string, string | number | boolean>>;
  };
}

export interface CrossingConditions {
  /** What must be true of either of them, or of anybody else. */
  seeds?: readonly (SeedRequirement & { npcId: string })[];
  /** Lines that must be held. */
  vines?: readonly { source: string; target: string; relationType: string }[];
  /**
   * Futures that must currently be open.
   *
   * The one place a bloom feeds back into the world, and it does so
   * without being realised: 「衛兵がもう目で追わない」 being POSSIBLE is
   * what lets a man walk into a market, whether or not anybody ever
   * plays that scene. A candidate is a fact about the state of a life,
   * and other lives are allowed to depend on it.
   */
  blooms?: readonly string[];
  /**
   * Meetings that must already have happened.
   *
   * How a chain is written. The alternative — requiring that whatever
   * the earlier meeting planted is still live — quietly makes every
   * chain a race against decay, and some of the most human links are
   * made of things that fade fast: a man goes north because somebody
   * gave him work, and he goes whether or not he still feels grateful
   * about it two years later. What has to be true is that it happened.
   */
  after?: readonly string[];
  /** How long the world must have been running. */
  afterDays?: number;
}

export interface CrossingInput {
  state: WorldLifeState;
  kinds: readonly SeedKindDef[];
  cores: readonly NpcCore[];
}

/** One condition, and whether it holds — for a trace to print. */
export interface CrossingCheck {
  def: WorldCrossingDef;
  met: boolean;
  already: boolean;
  reasons: readonly { requirement: string; met: boolean; detail: string }[];
}

/**
 * A meeting's record id, which does not mention the date.
 *
 * So that a crossing happens ONCE, however many times the world is
 * settled, reloaded, or looked at from a different year. Every other id
 * in this engine carries its date; this one deliberately does not,
 * because the question it answers is "have these two met" rather than
 * "did they meet today".
 */
export function crossingMemoryId(def: WorldCrossingDef): string {
  return `cross:${def.id}`;
}

export function checkCrossing(def: WorldCrossingDef, input: CrossingInput): CrossingCheck {
  const { state, kinds } = input;
  const reasons: { requirement: string; met: boolean; detail: string }[] = [];
  const already = state.memories.some((memory) => memory.id === crossingMemoryId(def));

  for (const want of def.when.seeds ?? []) {
    reasons.push(seedReason(want, state.seeds, kinds, state.now));
  }
  for (const want of def.when.vines ?? []) {
    const met = holdsVine(state.vines, want.source, want.target, want.relationType);
    reasons.push({
      requirement: `vine ${want.source} ${want.relationType} → ${want.target}`,
      met,
      detail: met ? '結ばれている' : 'まだ結ばれていない',
    });
  }
  for (const id of def.when.blooms ?? []) {
    const met = state.blooms.some((bloom) => bloom.id === id);
    reasons.push({
      requirement: `bloom ${id}`,
      met,
      detail: met ? '候補が立っている' : 'まだ立っていない',
    });
  }
  for (const id of def.when.after ?? []) {
    const happened = state.memories.some((memory) => memory.id === `cross:${id}`);
    reasons.push({
      requirement: `after ${id}`,
      met: happened,
      detail: happened ? 'もう起きた' : 'まだ起きていない',
    });
  }
  if (def.when.afterDays !== undefined) {
    const elapsed = toAbsoluteDay(state.now) - toAbsoluteDay(state.memories[0]?.time ?? state.now);
    reasons.push({
      requirement: `${def.when.afterDays}日以上`,
      met: elapsed >= def.when.afterDays,
      detail: `${elapsed}日経過`,
    });
  }

  return { def, already, met: !already && reasons.every((reason) => reason.met), reasons };
}

function seedReason(
  want: SeedRequirement & { npcId: string },
  seeds: readonly WorldSeed[],
  kinds: readonly SeedKindDef[],
  now: WorldClock,
): { requirement: string; met: boolean; detail: string } {
  const label =
    `seed ${want.type} of ${want.npcId}` +
    (want.atLeast ? ` ≥ ${want.atLeast}` : '') +
    (want.atMost ? ` ≤ ${want.atMost}` : '');
  const stored = seeds.find((seed) => seed.targetNpcId === want.npcId && seed.type === want.type);
  const kind = stored ? seedKind(kinds, stored.type) : null;
  if (!stored || !kind) {
    return {
      requirement: label,
      met: want.atLeast === undefined && (want.absentCounts ?? true),
      detail: 'まだ蒔かれていない',
    };
  }
  const seed = grownSeed(stored, kind, now);
  const bounded = want.atLeast !== undefined || want.atMost !== undefined;
  const met =
    bounded &&
    (want.atLeast === undefined || atLeast(seed.status, want.atLeast)) &&
    (want.atMost === undefined ||
      !atLeast(seed.status, want.atMost) ||
      seed.status === want.atMost);
  return {
    requirement: bounded ? label : `${label} (条件が書かれていない)`,
    met,
    detail: `${seed.status} (${seed.strength.toFixed(2)})`,
  };
}

/** Every crossing whose conditions hold and which has not happened yet. */
export function crossingsDue(
  defs: readonly WorldCrossingDef[],
  input: CrossingInput,
): WorldCrossingDef[] {
  return defs.filter((def) => checkCrossing(def, input).met).map((def) => def);
}

/** The record a crossing writes, dated to when the story looked. */
export function crossingRecord(def: WorldCrossingDef, now: WorldClock): WorldMemoryRecord {
  return {
    id: crossingMemoryId(def),
    actor: def.meets.actor,
    target: def.meets.target,
    action: def.meets.action,
    location: def.meets.location,
    time: now,
    witnesses: def.meets.witnesses ?? [],
    metadata: { crossing: def.id, ...(def.meets.metadata ?? {}) },
  };
}

/** Everything, held or not, for a developer asking why two people have not met. */
export function allCrossingChecks(
  defs: readonly WorldCrossingDef[],
  input: CrossingInput,
): CrossingCheck[] {
  return defs.map((def) => checkCrossing(def, input));
}

/** Re-exported so callers need one import for the whole idea. */
export type { WorldVine };
