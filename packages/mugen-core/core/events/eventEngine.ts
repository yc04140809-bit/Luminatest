// MUGEN CORE — EVENT ENGINE.
// Pure causality check: WORLD MEMORY + WORLD CLOCK + event definitions in,
// "events due now" out. No storage, no React, no Phaser, no side effects.
// Narrative conditions live HERE (and in the defs) — never in UI components
// or Phaser scenes.

import type { MemoryEvent } from '../memory/types';
import type { LifeEventDef, WorldClock } from './types';
import { elapsedDays, fromAbsoluteDay, toAbsoluteDay } from '../time/calendar';

/** A life event worked out, with the definition it came from. */
export interface ResolvedLifeEvent {
  event: MemoryEvent;
  def: LifeEventDef;
}

export interface DueLifeEvent {
  def: LifeEventDef;
  /** The past fact that satisfied requiredMemory. */
  cause: MemoryEvent;
  /**
   * The absolute day it happens. For most, the cause's day plus the wait;
   * for one with a `bloom`, the first day from then on its people were ready.
   */
  day: number;
}

/**
 * HOW THE RESOLVER ASKS WHETHER PEOPLE ARE READY (LifeEventDef.bloom).
 *
 * Given the world's events up to and including `at`, is that bloom a
 * candidate on that day? The engine stays pure and knows nothing of the life
 * engine: the world hands this in (core/world/world.ts reads the people with
 * core/life). Never handed in, a conditioned event never happens.
 */
export type BloomPossible = (
  bloomId: string,
  events: readonly MemoryEvent[],
  at: WorldClock,
) => boolean;

/** Elapsed days since the cause, on the 365-day calendar (year-aware). */
function elapsedDaysSatisfied(cause: MemoryEvent, clock: WorldClock, minDays: number): boolean {
  return (
    elapsedDays({ worldYear: cause.worldYear, worldDay: cause.worldDay }, clock) >= minDays
  );
}

const dayOfEvent = (e: MemoryEvent) => toAbsoluteDay({ worldYear: e.worldYear, worldDay: e.worldDay });

/**
 * The first day, from `from` up to `until`, the bloom holds — or null.
 *
 * Asked only on the days anything could have changed: the day it fell due,
 * each later day something happened, and the last day. A person's seeds move
 * only when something happens to them, and otherwise only wear — so a bloom
 * of "this has taken" that does not hold on any of those days does not hold
 * between them either. (A bloom of "this has worn away" can come true between
 * them; it is then dated the next day that is asked, never earlier.)
 */
function firstReadyDay(
  bloomId: string,
  events: readonly MemoryEvent[],
  from: number,
  until: number,
  possible: BloomPossible,
): number | null {
  const days = new Set<number>([from]);
  for (const e of events) {
    const d = dayOfEvent(e);
    if (d > from && d <= until) days.add(d);
  }
  days.add(until);
  for (const day of [...days].sort((a, b) => a - b)) {
    if (day < from || day > until) continue;
    const upTo = events.filter((e) => dayOfEvent(e) <= day);
    if (possible(bloomId, upTo, fromAbsoluteDay(day))) return day;
  }
  return null;
}

/** Returns the life events whose conditions hold right now. */
export function findDueLifeEvents(
  defs: readonly LifeEventDef[],
  events: readonly MemoryEvent[],
  clock: WorldClock,
  possible?: BloomPossible,
): DueLifeEvent[] {
  const due: DueLifeEvent[] = [];
  const today = toAbsoluteDay(clock);
  for (const def of defs) {
    // once: an event type that already happened never fires again.
    if (events.some((e) => e.type === def.type)) continue;
    // unless: a life that already went another way.
    if (def.unless && events.some((e) => def.unless!.includes(e.type))) continue;

    const cause = events.find((e) => e.type === def.requiredMemory);
    if (!cause) continue;

    if (!elapsedDaysSatisfied(cause, clock, def.minElapsedDays)) continue;

    const dueDay = Math.min(dayOfEvent(cause) + def.minElapsedDays, today);
    if (def.bloom) {
      // The people, not only the calendar: not ready yet, not yet.
      if (!possible) continue;
      const day = firstReadyDay(def.bloom, events, dueDay, today, possible);
      if (day === null) continue;
      due.push({ def, cause, day });
      continue;
    }
    due.push({ def, cause, day: dueDay });
  }
  // Two that came due in the same stretch of time (a long jump, or several
  // nights at once): one that `unless` names, falling due on or before this
  // one's day, takes its place — the other way the life went happened first.
  return due.filter(
    (d) =>
      !d.def.unless ||
      !due.some((o) => o !== d && d.def.unless!.includes(o.def.type) && o.day <= d.day),
  );
}

/**
 * THE WHOLE CHAIN THAT WOULD HAVE HAPPENED BY `atClock`.
 *
 * `findDueLifeEvents` answers one pass. A life is a chain — he leaves
 * the bandits, and only THEN can he reach Alden — so this runs passes
 * until nothing new comes due, feeding each pass the events the last
 * one produced.
 *
 * PURE, AND THAT IS NOW LOAD-BEARING. It reads events and a clock and
 * returns what would follow; it writes nothing, so the same function
 * serves the world actually living through those days and a screen
 * merely looking at them. Extracted from `World` rather than copied,
 * because a second implementation of "what becomes of him" is exactly
 * the thing that would eventually disagree with the first.
 *
 * Each event is dated the day its condition actually came true (its
 * cause's day plus the wait — and, for one with a `bloom`, the day its
 * people were ready), capped at `atClock` — so a long jump never
 * swallows the history inside it.
 *
 * Bounded by the number of definitions: every pass must produce at
 * least one new once-event, so it cannot loop forever.
 */
export function resolveDueLifeEvents(
  defs: readonly LifeEventDef[],
  events: readonly MemoryEvent[],
  atClock: WorldClock,
  now: () => string = () => new Date().toISOString(),
  possible?: BloomPossible,
): ResolvedLifeEvent[] {
  const all = [...events];
  const resolved: ResolvedLifeEvent[] = [];
  const maxPasses = defs.length + 1;
  for (let pass = 0; pass < maxPasses; pass++) {
    const due = findDueLifeEvents(defs, all, atClock, possible);
    if (due.length === 0) break;
    for (const { def, day } of due) {
      const recordedAt = fromAbsoluteDay(day);
      const event: MemoryEvent = {
        id: def.eventId,
        type: def.type,
        worldYear: recordedAt.worldYear,
        worldDay: recordedAt.worldDay,
        location: def.location,
        actors: [...def.actors],
        importance: def.importance,
        createdAt: now(),
        causedBy: [def.requiredMemory],
      };
      all.push(event);
      resolved.push({ event, def });
    }
  }
  return resolved;
}
