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
}

/** Elapsed days since the cause, on the 365-day calendar (year-aware). */
function elapsedDaysSatisfied(cause: MemoryEvent, clock: WorldClock, minDays: number): boolean {
  return (
    elapsedDays({ worldYear: cause.worldYear, worldDay: cause.worldDay }, clock) >= minDays
  );
}

/** Returns the life events whose conditions hold right now. */
export function findDueLifeEvents(
  defs: readonly LifeEventDef[],
  events: readonly MemoryEvent[],
  clock: WorldClock,
): DueLifeEvent[] {
  const due: DueLifeEvent[] = [];
  for (const def of defs) {
    // once: an event type that already happened never fires again.
    if (events.some((e) => e.type === def.type)) continue;

    const cause = events.find((e) => e.type === def.requiredMemory);
    if (!cause) continue;

    if (!elapsedDaysSatisfied(cause, clock, def.minElapsedDays)) continue;

    due.push({ def, cause });
  }
  return due;
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
 * cause's day plus the wait), capped at `atClock` — so a long jump
 * never swallows the history inside it.
 *
 * Bounded by the number of definitions: every pass must produce at
 * least one new once-event, so it cannot loop forever.
 */
export function resolveDueLifeEvents(
  defs: readonly LifeEventDef[],
  events: readonly MemoryEvent[],
  atClock: WorldClock,
  now: () => string = () => new Date().toISOString(),
): ResolvedLifeEvent[] {
  const all = [...events];
  const resolved: ResolvedLifeEvent[] = [];
  const maxPasses = defs.length + 1;
  for (let pass = 0; pass < maxPasses; pass++) {
    const due = findDueLifeEvents(defs, all, atClock);
    if (due.length === 0) break;
    for (const { def, cause } of due) {
      const dueAbsolute =
        toAbsoluteDay({ worldYear: cause.worldYear, worldDay: cause.worldDay }) +
        def.minElapsedDays;
      const recordedAt = fromAbsoluteDay(Math.min(dueAbsolute, toAbsoluteDay(atClock)));
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
