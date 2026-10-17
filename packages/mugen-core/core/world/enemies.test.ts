import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';

async function freshWorld(): Promise<World> {
  const world = await World.open(new IdbMemoryStore());
  await world.resetWorld();
  return world;
}

describe('ordinary enemies in the world', () => {
  it('knows nothing about a species until one is beaten', async () => {
    const world = await freshWorld();
    expect(world.getEnemyProgress('moss_rabbit')).toEqual({
      defeated: 0,
      sinceStory: 0,
      named: 0,
    });
    expect(world.getEnemyIndividuals()).toEqual([]);
  });

  it('counts ordinary victories without writing them into WORLD MEMORY', async () => {
    const world = await freshWorld();
    for (let i = 0; i < 3; i++) {
      const met = await world.resolveEnemyVictory('moss_rabbit', { forced: false });
      expect(met).toBeNull();
    }
    expect(world.getEnemyProgress('moss_rabbit')).toEqual({
      defeated: 3,
      sinceStory: 3,
      named: 0,
    });
    // Beating an animal is not a fact about the world.
    expect(world.getEvents()).toHaveLength(0);
    expect(world.getEnemyIndividuals()).toEqual([]);
  });

  it('names the one that turns out to be somebody, and starts the count again', async () => {
    const world = await freshWorld();
    await world.resolveEnemyVictory('moss_rabbit', { forced: false });
    const met = await world.resolveEnemyVictory('moss_rabbit', { forced: true });
    expect(met).not.toBeNull();
    expect(met!.individualId).toBe('moss_rabbit_001');
    expect(met!.status).toBe('alive');
    expect(met!.relationship).toBe('unknown');
    expect(met!.reunionAvailable).toBe(false);
    expect(world.getEnemyProgress('moss_rabbit')).toEqual({
      defeated: 2,
      sinceStory: 0,
      named: 1,
    });
    // Being named is still not a fact until the player decides something.
    expect(world.getEvents()).toHaveLength(0);
  });

  it('keeps naming them in order, so the species outlives any of them', async () => {
    const world = await freshWorld();
    const first = await world.resolveEnemyVictory('moss_rabbit', { forced: true });
    await world.recordCreatureLifeChoice(first!.individualId, 'KILL');
    const second = await world.resolveEnemyVictory('moss_rabbit', { forced: true });
    expect(second!.individualId).toBe('moss_rabbit_002');
    // Killing one did not remove moss rabbits from the world.
    expect(world.getEnemyProgress('moss_rabbit').defeated).toBe(2);
  });

  it('writes the four answers into WORLD MEMORY, one per creature', async () => {
    const world = await freshWorld();
    const met = await world.resolveEnemyVictory('moss_rabbit', { forced: true });
    const event = await world.recordCreatureLifeChoice(met!.individualId, 'SPARE');
    expect(event.type).toBe('PLAYER_SPARED_CREATURE');
    expect(event.actors).toEqual(['PLAYER', 'moss_rabbit_001']);
    expect(event.location).toBe('GREENWOOD_FOREST');
    // The player was there, so they know it happened.
    expect(world.getKnownEvents().map((e) => e.type)).toContain('PLAYER_SPARED_CREATURE');
  });

  it('remembers what the player became to it', async () => {
    const world = await freshWorld();
    const met = await world.resolveEnemyVictory('moss_rabbit', { forced: true });
    await world.recordCreatureLifeChoice(met!.individualId, 'HELP');
    const after = world.getEnemyIndividual('moss_rabbit_001')!;
    expect(after.status).toBe('alive');
    expect(after.relationship).toBe('helped');
    expect(after.reunionAvailable).toBe(true);
  });

  it('closes the door on a creature whose life ended', async () => {
    const world = await freshWorld();
    const met = await world.resolveEnemyVictory('moss_rabbit', { forced: true });
    await world.recordCreatureLifeChoice(met!.individualId, 'KILL');
    const after = world.getEnemyIndividual('moss_rabbit_001')!;
    expect(after.status).toBe('dead');
    expect(after.reunionAvailable).toBe(false);
  });

  it('tells the four answers apart rather than treating them alike', async () => {
    const world = await freshWorld();
    const relationships: string[] = [];
    for (const choice of ['SPARE', 'HELP', 'CAPTURE'] as const) {
      const met = await world.resolveEnemyVictory('moss_rabbit', { forced: true });
      await world.recordCreatureLifeChoice(met!.individualId, choice);
      relationships.push(world.getEnemyIndividual(met!.individualId)!.relationship);
    }
    expect(new Set(relationships).size).toBe(3);
  });

  it('is idempotent for the same answer and refuses a contradictory one', async () => {
    const world = await freshWorld();
    const met = await world.resolveEnemyVictory('moss_rabbit', { forced: true });
    const a = await world.recordCreatureLifeChoice(met!.individualId, 'SPARE');
    const b = await world.recordCreatureLifeChoice(met!.individualId, 'SPARE');
    expect(b.id).toBe(a.id);
    expect(world.getEvents()).toHaveLength(1);
    await expect(world.recordCreatureLifeChoice(met!.individualId, 'KILL')).rejects.toThrow();
  });

  it('survives a reload: the counts and the names come back', async () => {
    const world = await freshWorld();
    await world.resolveEnemyVictory('moss_rabbit', { forced: false });
    const met = await world.resolveEnemyVictory('moss_rabbit', { forced: true });
    await world.recordCreatureLifeChoice(met!.individualId, 'CAPTURE');

    const reopened = await World.open(new IdbMemoryStore());
    expect(reopened.getEnemyProgress('moss_rabbit').defeated).toBe(2);
    expect(reopened.getEnemyIndividual('moss_rabbit_001')?.relationship).toBe('captured');
    expect(reopened.getKnownEvents().map((e) => e.type)).toContain('PLAYER_CAPTURED_CREATURE');
  });

  it('a new world has met nobody', async () => {
    const world = await World.open(new IdbMemoryStore());
    await world.resolveEnemyVictory('moss_rabbit', { forced: true });
    await world.resetWorld();
    expect(world.getEnemyProgress('moss_rabbit').defeated).toBe(0);
    expect(world.getEnemyIndividuals()).toEqual([]);
  });
});
