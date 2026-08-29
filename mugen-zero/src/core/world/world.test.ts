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

describe('World — RESET WORLD', () => {
  it('resets memory, clock and character state, in memory and on disk', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    for (let i = 0; i < 3; i++) await world.advanceDay();
    expect(world.getCharacter('GALD')?.occupation).toBe('NONE');

    await world.resetWorld();
    expect(world.getEvents()).toEqual([]);
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 1 });
    expect(world.getCharacter('GALD')?.occupation).toBe('BANDIT');
    expect(world.getCharacter('GALD')?.location).toBe('GREENWOOD_FOREST');

    const reopened = await openWorld(dbName);
    expect(reopened.getEvents()).toEqual([]);
    expect(reopened.getClock()).toEqual({ worldYear: 1, worldDay: 1 });
    expect(reopened.getCharacter('GALD')?.occupation).toBe('BANDIT');
  });
});
