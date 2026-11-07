import { describe, it, expect } from 'vitest';
import {
  DAYS_PER_YEAR,
  toAbsoluteDay,
  fromAbsoluteDay,
  addDays,
  addYears,
  elapsedDays,
} from './calendar';

describe('calendar', () => {
  it('year 1 day 1 is absolute day 1', () => {
    expect(toAbsoluteDay({ worldYear: 1, worldDay: 1 })).toBe(1);
    expect(fromAbsoluteDay(1)).toEqual({ worldYear: 1, worldDay: 1 });
  });

  it('roundtrips arbitrary clocks', () => {
    for (const clock of [
      { worldYear: 1, worldDay: 365 },
      { worldYear: 2, worldDay: 1 },
      { worldYear: 4, worldDay: 10 },
      { worldYear: 100, worldDay: 200 },
    ]) {
      expect(fromAbsoluteDay(toAbsoluteDay(clock))).toEqual(clock);
    }
  });

  it('day 365 + 1 rolls over into the next year', () => {
    expect(addDays({ worldYear: 1, worldDay: 365 }, 1)).toEqual({ worldYear: 2, worldDay: 1 });
  });

  it('multi-day additions cross multiple years correctly', () => {
    expect(addDays({ worldYear: 1, worldDay: 360 }, 10)).toEqual({ worldYear: 2, worldDay: 5 });
    expect(addDays({ worldYear: 1, worldDay: 1 }, DAYS_PER_YEAR * 2)).toEqual({
      worldYear: 3,
      worldDay: 1,
    });
    expect(addDays({ worldYear: 2, worldDay: 100 }, DAYS_PER_YEAR * 3 + 300)).toEqual({
      worldYear: 6,
      worldDay: 35,
    });
  });

  it('addYears keeps the day of year', () => {
    expect(addYears({ worldYear: 1, worldDay: 10 }, 3)).toEqual({ worldYear: 4, worldDay: 10 });
  });

  it('elapsedDays is year-aware', () => {
    expect(
      elapsedDays({ worldYear: 1, worldDay: 364 }, { worldYear: 2, worldDay: 2 }),
    ).toBe(3);
    expect(elapsedDays({ worldYear: 1, worldDay: 10 }, { worldYear: 4, worldDay: 10 })).toBe(
      DAYS_PER_YEAR * 3,
    );
  });
});
