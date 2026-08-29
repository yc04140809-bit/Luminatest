import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import type { LifeChoiceId } from '../flow/types';
import type { GaldLifeChoiceEventType } from '../memory/types';

let dbCounter = 0;
function freshDbName(): string {
  return `world-test-${++dbCounter}`;
}

async function openWorld(dbName: string): Promise<World> {
  return World.open(new IdbMemoryStore(dbName));
}

const CHOICE_TO_TYPE: Array<[LifeChoiceId, GaldLifeChoiceEventType]> = [
  ['KILL', 'PLAYER_KILLED_GALD'],
  ['SPARE', 'PLAYER_SPARED_GALD'],
  ['HELP', 'PLAYER_HELPED_GALD'],
  ['CAPTURE', 'PLAYER_CAPTURED_GALD'],
];

describe('World — life choice persistence (Phase B behavior preserved)', () => {
  it.each(CHOICE_TO_TYPE)('persists %s as %s and restores it on reopen', async (choice, type) => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    const event = await world.recordGaldLifeChoice(choice);
    expect(event.type).toBe(type);
    expect(event.worldYear).toBe(1);
    expect(event.worldDay).toBe(1);

    const reopened = await openWorld(dbName);
    expect(reopened.getGaldLifeChoice()).toBe(choice);
    expect(reopened.hasEventOfType(type)).toBe(true);
  });

  it('refuses a contradictory second life choice (exclusivity)', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE');
    await expect(world.recordGaldLifeChoice('KILL')).rejects.toThrow(/already recorded/);
    expect(world.getGaldLifeChoice()).toBe('SPARE');
    expect(world.getEvents()).toHaveLength(1);
  });

  it('records the choice with the CURRENT world day', async () => {
    const world = await openWorld(freshDbName());
    await world.advanceDay();
    await world.advanceDay();
    const event = await world.recordGaldLifeChoice('SPARE');
    expect(event.worldDay).toBe(3);
  });
});

describe('World — WORLD CLOCK', () => {
  it('starts at year 1, day 1', async () => {
    const world = await openWorld(freshDbName());
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 1 });
  });

  it('advanceDay increments the day and persists it across reopen', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.advanceDay();
    await world.advanceDay();
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 3 });

    const reopened = await openWorld(dbName);
    expect(reopened.getClock()).toEqual({ worldYear: 1, worldDay: 3 });
  });
});

describe('World — GALD_LEAVES_BANDITS causality', () => {
  it('does not fire before 3 days have elapsed since SPARE', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE'); // day 1
    expect(await world.advanceDay()).toEqual([]); // day 2
    expect(await world.advanceDay()).toEqual([]); // day 3
    expect(world.hasEventOfType('GALD_LEAVES_BANDITS')).toBe(false);
    expect(world.getCharacter('GALD')?.occupation).toBe('BANDIT');
  });

  it('fires exactly once after 3 elapsed days, with causedBy and state effects', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE'); // day 1
    await world.advanceDay(); // 2
    await world.advanceDay(); // 3
    const fired = await world.advanceDay(); // 4 -> elapsed 3

    expect(fired).toHaveLength(1);
    const event = fired[0];
    expect(event.type).toBe('GALD_LEAVES_BANDITS');
    expect(event.causedBy).toEqual(['PLAYER_SPARED_GALD']);
    expect(event.actors).toEqual(['GALD']);
    expect(event.importance).toBe('MAJOR');
    expect(event.worldDay).toBe(4);

    // CHARACTER STATE (current) updated; the past stays in WORLD MEMORY.
    const gald = world.getCharacter('GALD')!;
    expect(gald.occupation).toBe('NONE');
    expect(gald.location).toBe('UNKNOWN');
    expect(gald.alive).toBe(true);
    // The sparing event itself is untouched.
    expect(world.getEvents().find((e) => e.type === 'PLAYER_SPARED_GALD')).toBeTruthy();
  });

  it('elapsed days are measured from the sparing day, not worldDay >= 4', async () => {
    const world = await openWorld(freshDbName());
    await world.advanceDay(); // day 2
    await world.advanceDay(); // day 3
    await world.advanceDay(); // day 4
    await world.advanceDay(); // day 5
    await world.recordGaldLifeChoice('SPARE'); // spared on day 5
    expect(await world.advanceDay()).toEqual([]); // 6
    expect(await world.advanceDay()).toEqual([]); // 7
    expect((await world.advanceDay()).map((e) => e.type)).toEqual(['GALD_LEAVES_BANDITS']); // 8
  });

  it.each(['KILL', 'HELP', 'CAPTURE'] as const)(
    'never fires on the %s route even after many days',
    async (choice) => {
      const world = await openWorld(freshDbName());
      await world.recordGaldLifeChoice(choice);
      for (let i = 0; i < 6; i++) {
        expect(await world.advanceDay()).toEqual([]);
      }
      expect(world.hasEventOfType('GALD_LEAVES_BANDITS')).toBe(false);
      expect(world.getCharacter('GALD')?.occupation).toBe('BANDIT');
    },
  );

  it('once: repeated advances never register it twice', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE');
    for (let i = 0; i < 8; i++) await world.advanceDay();
    const occurrences = world.getEvents().filter((e) => e.type === 'GALD_LEAVES_BANDITS');
    expect(occurrences).toHaveLength(1);
  });

  it('once survives a restart: a reopened world does not re-fire it', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    for (let i = 0; i < 3; i++) await world.advanceDay();
    expect(world.hasEventOfType('GALD_LEAVES_BANDITS')).toBe(true);

    const reopened = await openWorld(dbName);
    for (let i = 0; i < 4; i++) await reopened.advanceDay();
    expect(reopened.getEvents().filter((e) => e.type === 'GALD_LEAVES_BANDITS')).toHaveLength(1);
  });

  it('restores both events AND Gald\'s updated state after a restart', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    for (let i = 0; i < 3; i++) await world.advanceDay();

    const reopened = await openWorld(dbName);
    expect(reopened.hasEventOfType('PLAYER_SPARED_GALD')).toBe(true);
    expect(reopened.hasEventOfType('GALD_LEAVES_BANDITS')).toBe(true);
    const gald = reopened.getCharacter('GALD')!;
    expect(gald.occupation).toBe('NONE');
    expect(gald.location).toBe('UNKNOWN');
    expect(reopened.getClock()).toEqual({ worldYear: 1, worldDay: 4 });
  });
});

describe('World — TIME SYSTEM (Phase D)', () => {
  it('REST rolls over the year: day 365 + 1 becomes year 2 day 1', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    for (let i = 0; i < 364; i++) await world.advanceDay();
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 365 });
    await world.advanceDay();
    expect(world.getClock()).toEqual({ worldYear: 2, worldDay: 1 });

    const reopened = await openWorld(dbName);
    expect(reopened.getClock()).toEqual({ worldYear: 2, worldDay: 1 });
  });

  it('TIME SHIFT +3 years moves the clock and ages Gald 27 -> 30', async () => {
    const world = await openWorld(freshDbName());
    await world.advanceDay(); // day 2, so the shift lands mid-year
    const { shift } = await world.timeShift(3);

    expect(world.getClock()).toEqual({ worldYear: 4, worldDay: 2 });
    expect(world.getCharacter('GALD')?.age).toBe(30);

    expect(shift.type).toBe('WORLD_TIME_SHIFTED');
    expect(shift.from).toEqual({ worldYear: 1, worldDay: 2 });
    expect(shift.to).toEqual({ worldYear: 4, worldDay: 2 });
    expect(shift.yearsElapsed).toBe(3);
    expect(shift.importance).toBe('MAJOR');
  });

  it('the shift API takes arbitrary year spans', async () => {
    const world = await openWorld(freshDbName());
    await world.timeShift(1);
    await world.timeShift(10);
    expect(world.getClock()).toEqual({ worldYear: 12, worldDay: 1 });
    expect(world.getCharacter('GALD')?.age).toBe(27 + 11);
  });

  it('rejects a re-entrant TIME SHIFT (double-tap cannot shift twice)', async () => {
    const world = await openWorld(freshDbName());
    const first = world.timeShift(3);
    await expect(world.timeShift(3)).rejects.toThrow(/already in progress/);
    await first;
    expect(world.getClock().worldYear).toBe(4);
    expect(world.getCharacter('GALD')?.age).toBe(30);
    // Sequential shifts (after the first completes) still work.
    await world.timeShift(3);
    expect(world.getClock().worldYear).toBe(7);
  });

  it('rejects invalid shift lengths', async () => {
    const world = await openWorld(freshDbName());
    await expect(world.timeShift(0)).rejects.toThrow(/Invalid/);
    await expect(world.timeShift(-3)).rejects.toThrow(/Invalid/);
    await expect(world.timeShift(1.5)).rejects.toThrow(/Invalid/);
  });

  it('TIME SHIFT does not swallow events due mid-span: SPARE then immediate shift', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE'); // year 1 day 1
    const { lifeEvents } = await world.timeShift(3);

    expect(lifeEvents.map((e) => e.type)).toEqual(['GALD_LEAVES_BANDITS']);
    const leaves = lifeEvents[0];
    // Recorded the day it actually became due, not the post-shift date.
    expect(leaves.worldYear).toBe(1);
    expect(leaves.worldDay).toBe(4);
    expect(leaves.causedBy).toEqual(['PLAYER_SPARED_GALD']);
    expect(world.getCharacter('GALD')?.occupation).toBe('NONE');
    expect(world.getCharacter('GALD')?.age).toBe(30);

    // World-chronological order: spared -> leaves -> shift.
    const types = world.getEvents().map((e) => e.type);
    expect(types).toEqual(['PLAYER_SPARED_GALD', 'GALD_LEAVES_BANDITS', 'WORLD_TIME_SHIFTED']);
  });

  it('once holds across REST firing followed by a TIME SHIFT', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE');
    for (let i = 0; i < 3; i++) await world.advanceDay(); // fires on day 4
    const { lifeEvents } = await world.timeShift(3);
    expect(lifeEvents).toEqual([]);
    expect(world.getEvents().filter((e) => e.type === 'GALD_LEAVES_BANDITS')).toHaveLength(1);
  });

  it('KILL marks Gald dead; the dead do not age and his life never moves on', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('KILL');
    expect(world.getCharacter('GALD')?.alive).toBe(false);

    await world.timeShift(3);
    expect(world.getCharacter('GALD')?.age).toBe(27); // no aging after death
    expect(world.hasEventOfType('GALD_LEAVES_BANDITS')).toBe(false);
    // The past facts are untouched.
    expect(world.hasEventOfType('PLAYER_KILLED_GALD')).toBe(true);
  });

  it('restores clock, age and all events after a simulated restart', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    await world.timeShift(3);

    const reopened = await openWorld(dbName);
    expect(reopened.getClock()).toEqual({ worldYear: 4, worldDay: 1 });
    expect(reopened.getCharacter('GALD')?.age).toBe(30);
    expect(reopened.getCharacter('GALD')?.occupation).toBe('NONE');
    expect(reopened.getEvents().map((e) => e.type)).toEqual([
      'PLAYER_SPARED_GALD',
      'GALD_LEAVES_BANDITS',
      'WORLD_TIME_SHIFTED',
    ]);
    // And the reopened world does not re-fire anything.
    await reopened.timeShift(3);
    expect(reopened.getEvents().filter((e) => e.type === 'GALD_LEAVES_BANDITS')).toHaveLength(1);
  });
});

describe('World — RESET WORLD', () => {
  it('resets memory, clock, age and character state, in memory and on disk', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    for (let i = 0; i < 3; i++) await world.advanceDay();
    await world.timeShift(3);
    expect(world.getCharacter('GALD')?.occupation).toBe('NONE');
    expect(world.getCharacter('GALD')?.age).toBe(30);

    await world.resetWorld();
    expect(world.getEvents()).toEqual([]);
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 1 });
    expect(world.getCharacter('GALD')?.occupation).toBe('BANDIT');
    expect(world.getCharacter('GALD')?.location).toBe('GREENWOOD_FOREST');
    expect(world.getCharacter('GALD')?.age).toBe(27);

    const reopened = await openWorld(dbName);
    expect(reopened.getEvents()).toEqual([]);
    expect(reopened.getClock()).toEqual({ worldYear: 1, worldDay: 1 });
    expect(reopened.getCharacter('GALD')?.occupation).toBe('BANDIT');
    expect(reopened.getCharacter('GALD')?.age).toBe(27);
  });
});
