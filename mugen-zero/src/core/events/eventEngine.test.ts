import { describe, it, expect } from 'vitest';
import { findDueLifeEvents } from './eventEngine';
import { GALD_LEAVES_BANDITS_DEF, LIFE_EVENT_DEFS } from '../../content/events/lifeEvents';
import type { MemoryEvent, MemoryEventType } from '../memory/types';

function event(type: MemoryEventType, worldDay: number, worldYear = 1): MemoryEvent {
  return {
    id: `evt_${type.toLowerCase()}_${worldYear}_${worldDay}`,
    type,
    worldYear,
    worldDay,
    location: 'GREENWOOD_FOREST',
    actors: ['PLAYER', 'GALD'],
    importance: 'MAJOR',
    createdAt: new Date().toISOString(),
  };
}

describe('findDueLifeEvents — GALD_LEAVES_BANDITS', () => {
  it('does not fire before 3 days have elapsed since the sparing', () => {
    const events = [event('PLAYER_SPARED_GALD', 1)];
    expect(findDueLifeEvents(LIFE_EVENT_DEFS, events, { worldYear: 1, worldDay: 2 })).toEqual([]);
    expect(findDueLifeEvents(LIFE_EVENT_DEFS, events, { worldYear: 1, worldDay: 3 })).toEqual([]);
  });

  it('fires once exactly 3 days have elapsed', () => {
    const events = [event('PLAYER_SPARED_GALD', 1)];
    const due = findDueLifeEvents(LIFE_EVENT_DEFS, events, { worldYear: 1, worldDay: 4 });
    expect(due).toHaveLength(1);
    expect(due[0].def.type).toBe('GALD_LEAVES_BANDITS');
    expect(due[0].cause.type).toBe('PLAYER_SPARED_GALD');
  });

  it('measures elapsed days from the sparing day, not from worldDay >= 4', () => {
    // Spared late, on day 10: day 12 (elapsed 2) must NOT fire even though
    // worldDay is far past 4; day 13 (elapsed 3) fires.
    const events = [event('PLAYER_SPARED_GALD', 10)];
    expect(findDueLifeEvents(LIFE_EVENT_DEFS, events, { worldYear: 1, worldDay: 12 })).toHaveLength(0);
    expect(findDueLifeEvents(LIFE_EVENT_DEFS, events, { worldYear: 1, worldDay: 13 })).toHaveLength(1);
  });

  it('requires PLAYER_SPARED_GALD — an empty world never fires it', () => {
    expect(findDueLifeEvents(LIFE_EVENT_DEFS, [], { worldYear: 1, worldDay: 100 })).toEqual([]);
  });

  it.each(['PLAYER_KILLED_GALD', 'PLAYER_HELPED_GALD', 'PLAYER_CAPTURED_GALD'] as const)(
    'never fires on the %s route',
    (type) => {
      const events = [event(type, 1)];
      expect(findDueLifeEvents(LIFE_EVENT_DEFS, events, { worldYear: 1, worldDay: 50 })).toEqual([]);
    },
  );

  it('never fires twice (once): an existing GALD_LEAVES_BANDITS blocks it', () => {
    const events = [event('PLAYER_SPARED_GALD', 1), event('GALD_LEAVES_BANDITS', 4)];
    expect(findDueLifeEvents(LIFE_EVENT_DEFS, events, { worldYear: 1, worldDay: 30 })).toEqual([]);
  });

  it('counts elapsed days across a year boundary (365-day calendar)', () => {
    // Spared on year 1 day 364: due on year 2 day 2, not simply "next year".
    const events = [event('PLAYER_SPARED_GALD', 364)];
    expect(findDueLifeEvents(LIFE_EVENT_DEFS, events, { worldYear: 2, worldDay: 1 })).toHaveLength(0);
    expect(findDueLifeEvents(LIFE_EVENT_DEFS, events, { worldYear: 2, worldDay: 2 })).toHaveLength(1);
  });

  it('def data matches the Phase C contract', () => {
    expect(GALD_LEAVES_BANDITS_DEF.requiredMemory).toBe('PLAYER_SPARED_GALD');
    expect(GALD_LEAVES_BANDITS_DEF.minElapsedDays).toBe(3);
    expect(GALD_LEAVES_BANDITS_DEF.once).toBe(true);
  });
});
