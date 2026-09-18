// MUGEN CORE — calendar math. Pure functions, no dependencies.
// v0.1: a year is exactly 365 days. No months, seasons or weekdays yet.

export const DAYS_PER_YEAR = 365;

export interface WorldClock {
  worldYear: number;
  worldDay: number;
}

export const INITIAL_CLOCK: WorldClock = { worldYear: 1, worldDay: 1 };

/** Day 1 of year 1 is absolute day 1. */
export function toAbsoluteDay(clock: WorldClock): number {
  return (clock.worldYear - 1) * DAYS_PER_YEAR + clock.worldDay;
}

export function fromAbsoluteDay(absoluteDay: number): WorldClock {
  if (absoluteDay < 1) throw new Error(`Invalid absolute day: ${absoluteDay}`);
  return {
    worldYear: Math.floor((absoluteDay - 1) / DAYS_PER_YEAR) + 1,
    worldDay: ((absoluteDay - 1) % DAYS_PER_YEAR) + 1,
  };
}

/** Adds days, rolling over year boundaries. */
export function addDays(clock: WorldClock, days: number): WorldClock {
  return fromAbsoluteDay(toAbsoluteDay(clock) + days);
}

/** Adds whole years, keeping the day of year (TIME SHIFT). */
export function addYears(clock: WorldClock, years: number): WorldClock {
  return { worldYear: clock.worldYear + years, worldDay: clock.worldDay };
}

/** Whole days elapsed from one clock to another (later minus earlier). */
export function elapsedDays(from: WorldClock, to: WorldClock): number {
  return toAbsoluteDay(to) - toAbsoluteDay(from);
}
