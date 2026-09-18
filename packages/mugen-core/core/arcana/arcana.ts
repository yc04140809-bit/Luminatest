// ARCANA — what the player has come to know about something in the world.
//
// Not a card you get for winning. An ARCANA is a record of how much of
// a thing you have actually come to know, and the only way it grows is
// by living differently around it: meeting it, being hit by it, seeing
// what it does when it is frightened, finding one that turned out to be
// somebody, deciding, and then letting time pass and coming back.
//
// Two rules hold the whole design up:
//
//  1. A condition counts once. Beating a hundred moss rabbits teaches
//     you what one moss rabbit teaches you. Grinding is not knowledge.
//  2. There is no single road to 100%. The four answers are worth the
//     same as each other and none of them is required, so the game
//     never says "kill one, for the collection". Several different
//     lives all arrive at the same complete memory.
//
// Pure: no React, no world, no store. It reads a definition and a saved
// record and says what the player knows.

/**
 * What kind of thing this is a memory of.
 *
 * One today. The others (people, events, places) are named nowhere and
 * implemented nowhere — when they arrive they are another value here
 * and another entry in content, and nothing in this file changes.
 */
export type ArcanaCategory = 'CREATURE';

/** The ways a memory of something can become more complete. */
export type ArcanaConditionId =
  | 'FIRST_ENCOUNTER'
  | 'OBSERVE_NORMAL_ATTACK'
  | 'OBSERVE_UNIQUE_SKILL'
  | 'WON_A_FIGHT'
  | 'LOST_A_FIGHT'
  | 'MET_SOMEBODY'
  | 'KAOS_INTERVENED'
  | 'TIME_PASSED'
  | 'ROUTE_KILL'
  | 'ROUTE_SPARE'
  | 'ROUTE_HELP'
  | 'ROUTE_CAPTURE'
  | 'REUNION'
  | 'SPECIAL_MEMORY';

export interface ArcanaConditionDef {
  id: ArcanaConditionId;
  /** What meeting it is worth. Content's number, not this file's. */
  points: number;
  /**
   * What the player is told while it is still unmet.
   *
   * Never the condition. "Help it and you get 15%" turns a life into a
   * checklist; the point of this system is that the player goes and
   * lives, and the memory fills in behind them. So these are nudges at
   * most, and several conditions deliberately share one.
   */
  hint: string;
  /**
   * Only countable once the thing is known at all. Time passing teaches
   * you nothing about an animal you have never seen.
   */
  requiresDiscovered?: boolean;
  /**
   * Defined, and not reachable yet, because the moment it describes is
   * not built. It is listed so the numbers below it are honest about
   * what is coming, and it is never counted or hinted at.
   */
  planned?: boolean;
}

import type { SummonAbilityDef } from '../summon/summon';

/** A piece of what is known, readable once the memory is clear enough. */
export interface ArcanaFragmentDef {
  id: string;
  /** The construction percentage at which this becomes legible. */
  at: number;
  label: string;
  text: string;
}

export interface ArcanaVisual {
  src: string;
  /** Where the drawing actually is inside its file. Nothing is edited. */
  box: { fileW: number; fileH: number; x: number; y: number; width: number; height: number };
}

export interface ArcanaDef {
  /** #001. Stable, and what the player calls it. */
  number: number;
  arcanaId: string;
  name: string;
  category: ArcanaCategory;
  visual: ArcanaVisual;
  /** One line, readable from the moment it is discovered at all. */
  summary: string;
  conditions: readonly ArcanaConditionDef[];
  fragments: readonly ArcanaFragmentDef[];
  /** Said once, at 100%. */
  completeLine: string;
  /**
   * What this memory does when Kaos puts it back together, and what she
   * says while doing it.
   *
   * Looked up by arcanaId, so a battle screen that can summon one can
   * summon a hundred without being rewritten. Null for a page that has
   * nothing to call yet.
   */
  summon: ArcanaSummonDef | null;
}

/** Everything about calling one particular memory onto a battlefield. */
export interface ArcanaSummonDef {
  ability: SummonAbilityDef;
  /** Kaos, reaching for a memory that is not all there. */
  incompleteLine: string;
  /** Kaos, when it does not hold. Nothing is taken from the player. */
  failureLine: string;
  /** Kaos, calling a memory that is finished. */
  completeLine: string;
}

/**
 * What is saved about one ARCANA.
 *
 * The percentage is NOT saved. It is worked out from the conditions
 * that have been met, every time it is asked for — so a saved game can
 * never disagree with the rules, and rebalancing the numbers needs no
 * migration and rewrites nobody's history. What is saved is what the
 * player actually did, which is the part that is theirs.
 *
 * `completeSeen` is saved, and is the only reason this is a record
 * rather than a pure projection: the completion moment plays once, and
 * a reload must not play it again.
 */
export interface ArcanaRecord {
  arcanaId: string;
  met: ArcanaConditionId[];
  completeSeen: boolean;
}

export const ARCANA_MAX = 100;

export function emptyArcanaRecord(arcanaId: string): ArcanaRecord {
  return { arcanaId, met: [], completeSeen: false };
}

/**
 * Reads a saved record back, whatever shape the save is in.
 *
 * A save written before ARCANA existed has nothing here; a save written
 * by a later version may have conditions this one has never heard of.
 * Both are ordinary, and both come back as a record this build can use:
 * unknown condition ids are kept in the row but never counted, so
 * loading an old build cannot quietly delete a newer build's progress.
 */
export function readArcanaRecord(def: ArcanaDef, raw: unknown): ArcanaRecord {
  const row = (raw ?? {}) as Partial<ArcanaRecord>;
  const met = Array.isArray(row.met) ? row.met.filter((id): id is ArcanaConditionId => typeof id === 'string') : [];
  return {
    arcanaId: def.arcanaId,
    met: [...new Set(met)],
    completeSeen: row.completeSeen === true,
  };
}

/** Has the player met this at all? 0% means it is not in the book. */
export function isDiscovered(record: ArcanaRecord): boolean {
  return record.met.length > 0;
}

/**
 * How complete this memory is, 0–100.
 *
 * The conditions add up to far more than 100 on purpose: that surplus
 * IS the multiple-routes design. Whichever handful of them a particular
 * life happens to produce, the total is capped here, so no route is
 * longer than another and no route is required.
 */
export function progressOf(def: ArcanaDef, record: ArcanaRecord): number {
  let total = 0;
  for (const condition of def.conditions) {
    if (condition.planned) continue;
    if (record.met.includes(condition.id)) total += condition.points;
  }
  return Math.max(0, Math.min(ARCANA_MAX, Math.round(total)));
}

export function isComplete(def: ArcanaDef, record: ArcanaRecord): boolean {
  return progressOf(def, record) >= ARCANA_MAX;
}

/** What can be read at this much knowledge, in the order it was learned. */
export function fragmentsOf(def: ArcanaDef, record: ArcanaRecord): ArcanaFragmentDef[] {
  const progress = progressOf(def, record);
  return def.conditions.length === 0 ? [] : def.fragments.filter((f) => progress >= f.at);
}

/** The next thing that will become legible, or null at the end. */
export function nextFragmentAt(def: ArcanaDef, record: ArcanaRecord): number | null {
  const progress = progressOf(def, record);
  const next = def.fragments.find((f) => progress < f.at);
  return next ? next.at : null;
}

/**
 * What the player is told is still missing.
 *
 * Hints, not conditions: unmet conditions are collapsed by the text
 * they carry (the four answers all share one line, so the book never
 * reads as "you still have to kill one"), planned conditions are left
 * out entirely, and at most a few are shown at a time. The exact
 * condition list stays exact inside; only this is soft.
 */
export function hintsOf(def: ArcanaDef, record: ArcanaRecord, limit = 3): string[] {
  // A complete memory wants nothing. Almost every road to 100% leaves
  // some conditions unmet — that is the whole point of there being more
  // than one road — so without this the finished page would say "this
  // memory will not be lost" and then list what is missing from it.
  if (isComplete(def, record)) return [];
  const unmet = def.conditions.filter(
    (c) => !c.planned && !record.met.includes(c.id),
  );
  const seen = new Set<string>();
  const hints: string[] = [];
  for (const condition of unmet) {
    if (seen.has(condition.hint)) continue;
    seen.add(condition.hint);
    hints.push(condition.hint);
    if (hints.length >= limit) break;
  }
  return hints;
}

/** What one write to an ARCANA actually changed. */
export interface ArcanaGain {
  arcanaId: string;
  /** Only the ones that were not already met. */
  added: ArcanaConditionId[];
  from: number;
  to: number;
  /** True only on the write that crossed 100 for the first time. */
  completedNow: boolean;
  /** True on the write that put it in the book for the first time. */
  discoveredNow: boolean;
}

/**
 * Meets some conditions, and says what that changed.
 *
 * Everything the twice-counting rule needs is here: a condition already
 * in `met` is dropped, a condition this ARCANA does not define is
 * dropped, a planned one is dropped, and one that needs the thing to be
 * known at all is dropped until it is. If nothing survives that, the
 * result is null and no write happens at all.
 */
export function applyArcanaConditions(
  def: ArcanaDef,
  record: ArcanaRecord,
  conditionIds: readonly ArcanaConditionId[],
): { record: ArcanaRecord; gain: ArcanaGain } | null {
  const from = progressOf(def, record);
  const wasDiscovered = isDiscovered(record);
  const wasComplete = from >= ARCANA_MAX;

  const added: ArcanaConditionId[] = [];
  const met = [...record.met];
  for (const id of conditionIds) {
    if (met.includes(id) || added.includes(id)) continue;
    const condition = def.conditions.find((c) => c.id === id);
    if (!condition || condition.planned) continue;
    if (condition.requiresDiscovered && !wasDiscovered) continue;
    added.push(id);
  }
  if (added.length === 0) return null;

  const next: ArcanaRecord = { ...record, met: [...met, ...added] };
  const to = progressOf(def, next);
  return {
    record: next,
    gain: {
      arcanaId: def.arcanaId,
      added,
      from,
      to,
      completedNow: !wasComplete && to >= ARCANA_MAX,
      discoveredNow: !wasDiscovered,
    },
  };
}

/**
 * The most that can still be reached, for a build-time sanity check.
 *
 * Used by the tests to hold the design to its own promise: that every
 * one of the four answers, on its own, can still reach 100.
 */
export function reachableTotal(def: ArcanaDef, without: readonly ArcanaConditionId[] = []): number {
  return def.conditions
    .filter((c) => !c.planned && !without.includes(c.id))
    .reduce((sum, c) => sum + c.points, 0);
}
