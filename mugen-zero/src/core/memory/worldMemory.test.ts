import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { WorldMemory } from './worldMemory';
import { IdbMemoryStore } from './idbStore';
import type { LifeChoiceId } from '../flow/types';
import type { GaldLifeChoiceEventType } from './types';

let dbCounter = 0;
function freshDbName(): string {
  return `wm-test-${++dbCounter}`;
}

const CHOICE_TO_TYPE: Array<[LifeChoiceId, GaldLifeChoiceEventType]> = [
  ['KILL', 'PLAYER_KILLED_GALD'],
  ['SPARE', 'PLAYER_SPARED_GALD'],
  ['HELP', 'PLAYER_HELPED_GALD'],
  ['CAPTURE', 'PLAYER_CAPTURED_GALD'],
];

describe('WorldMemory', () => {
  it.each(CHOICE_TO_TYPE)(
    'persists the %s choice as %s with all required fields',
    async (choice, expectedType) => {
      const memory = await WorldMemory.open(new IdbMemoryStore(freshDbName()));
      const event = await memory.recordGaldLifeChoice(choice);

      expect(event.type).toBe(expectedType);
      expect(event.id).toBeTruthy();
      expect(event.worldYear).toBe(1);
      expect(event.worldDay).toBe(1);
      expect(event.location).toBe('GREENWOOD_FOREST');
      expect(event.actors).toEqual(['PLAYER', 'GALD']);
      expect(event.importance).toBe('MAJOR');
      expect(Date.parse(event.createdAt)).not.toBeNaN();

      expect(memory.hasEventOfType(expectedType)).toBe(true);
      expect(memory.getGaldLifeChoice()).toBe(choice);
    },
  );

  it.each(CHOICE_TO_TYPE)(
    'restores the %s choice after a simulated restart (new connection, same DB)',
    async (choice, expectedType) => {
      const dbName = freshDbName();
      const first = new IdbMemoryStore(dbName);
      const memory = await WorldMemory.open(first);
      await memory.recordGaldLifeChoice(choice);
      first.close();

      const reopened = await WorldMemory.open(new IdbMemoryStore(dbName));
      expect(reopened.hasEventOfType(expectedType)).toBe(true);
      expect(reopened.getGaldLifeChoice()).toBe(choice);
      expect(reopened.getEvents()).toHaveLength(1);
    },
  );

  it('refuses a contradictory second life choice (exclusivity)', async () => {
    const memory = await WorldMemory.open(new IdbMemoryStore(freshDbName()));
    await memory.recordGaldLifeChoice('SPARE');
    await expect(memory.recordGaldLifeChoice('KILL')).rejects.toThrow(/already recorded/);

    expect(memory.getGaldLifeChoice()).toBe('SPARE');
    expect(memory.hasEventOfType('PLAYER_KILLED_GALD')).toBe(false);
    expect(memory.getEvents()).toHaveLength(1);
  });

  it('is idempotent for the same choice (double-tap safety)', async () => {
    const memory = await WorldMemory.open(new IdbMemoryStore(freshDbName()));
    const first = await memory.recordGaldLifeChoice('HELP');
    const second = await memory.recordGaldLifeChoice('HELP');
    expect(second).toEqual(first);
    expect(memory.getEvents()).toHaveLength(1);
  });

  it('enforces exclusivity at the DB level even with a stale cache', async () => {
    // Two connections to the same world (e.g. two tabs).
    const dbName = freshDbName();
    const storeA = new IdbMemoryStore(dbName);
    const storeB = new IdbMemoryStore(dbName);
    const memoryA = await WorldMemory.open(storeA);
    const memoryB = await WorldMemory.open(storeB); // loaded before A records

    await memoryA.recordGaldLifeChoice('SPARE');
    // B's cache doesn't know yet; the store itself must reject the write.
    await expect(memoryB.recordGaldLifeChoice('KILL')).rejects.toBeTruthy();

    const truth = await WorldMemory.open(new IdbMemoryStore(dbName));
    expect(truth.getGaldLifeChoice()).toBe('SPARE');
    expect(truth.getEvents()).toHaveLength(1);
  });

  it('resetWorld deletes everything and a reopen starts fresh', async () => {
    const dbName = freshDbName();
    const memory = await WorldMemory.open(new IdbMemoryStore(dbName));
    await memory.recordGaldLifeChoice('CAPTURE');
    await memory.resetWorld();
    expect(memory.getEvents()).toEqual([]);

    const reopened = await WorldMemory.open(new IdbMemoryStore(dbName));
    expect(reopened.getEvents()).toEqual([]);
    expect(reopened.getGaldLifeChoice()).toBeNull();
  });
});
