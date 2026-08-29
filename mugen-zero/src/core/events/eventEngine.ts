// MUGEN CORE — EVENT ENGINE.
// Pure causality check: WORLD MEMORY + WORLD CLOCK + event definitions in,
// "events due now" out. No storage, no React, no Phaser, no side effects.
// Narrative conditions live HERE (and in the defs) — never in UI components
// or Phaser scenes.

import type { MemoryEvent } from '../memory/types';
import type { LifeEventDef, WorldClock } from './types';

export interface DueLifeEvent {
  def: LifeEventDef;
  /** The past fact that satisfied requiredMemory. */
  cause: MemoryEvent;
}

/**
 * Elapsed days since the cause, on the Phase C calendar (no year wrap-around;
 * a later year simply counts as "long enough").
 */
function elapsedDaysSatisfied(cause: MemoryEvent, clock: WorldClock, minDays: number): boolean {
  if (clock.worldYear > cause.worldYear) return true;
  if (clock.worldYear < cause.worldYear) return false;
  return clock.worldDay - cause.worldDay >= minDays;
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
