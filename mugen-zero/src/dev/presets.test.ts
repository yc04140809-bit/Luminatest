import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from '../core/world/world';
import { IdbMemoryStore } from '../core/memory/idbStore';
import { SCENARIO_PRESETS, type PresetId } from './presets';

let dbCounter = 0;
async function openWorld(dbName = `preset-test-${++dbCounter}`): Promise<World> {
  return World.open(new IdbMemoryStore(dbName));
}

function preset(id: PresetId) {
  const found = SCENARIO_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown preset ${id}`);
  return found;
}

describe('DEV ADMIN scenario presets (built through official game flow)', () => {
  it('INITIAL leaves a blank canonical world', async () => {
    const world = await openWorld();
    await preset('SPARE_3Y').run(world); // dirty the world first
    await preset('INITIAL').run(world);
    expect(world.getEvents()).toEqual([]);
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 1 });
    expect(world.getCharacter('GALD')).toMatchObject({ age: 27, alive: true, occupation: 'BANDIT' });
  });

  it('SPARE records PLAYER_SPARED_GALD only', async () => {
    const world = await openWorld();
    await preset('SPARE').run(world);
    expect(world.getEvents().map((e) => e.type)).toEqual(['PLAYER_SPARED_GALD']);
    expect(world.getGaldLifeChoice()).toBe('SPARE');
  });

  it('SPARE + 2 DAYS has not fired GALD_LEAVES_BANDITS yet', async () => {
    const world = await openWorld();
    await preset('SPARE_2D').run(world);
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 3 });
    expect(world.hasEventOfType('GALD_LEAVES_BANDITS')).toBe(false);
  });

  it('SPARE + 3 DAYS fires GALD_LEAVES_BANDITS', async () => {
    const world = await openWorld();
    await preset('SPARE_3D').run(world);
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 4 });
    expect(world.hasEventOfType('GALD_LEAVES_BANDITS')).toBe(true);
    expect(world.getCharacter('GALD')?.occupation).toBe('NONE');
  });

  it('SPARE + 3 YEARS builds the full canonical causal chain', async () => {
    const world = await openWorld();
    await preset('SPARE_3Y').run(world);

    const types = world.getEvents().map((e) => e.type);
    expect(types).toEqual(['PLAYER_SPARED_GALD', 'GALD_LEAVES_BANDITS', 'WORLD_TIME_SHIFTED']);
    const leaves = world.getEvents().find((e) => e.type === 'GALD_LEAVES_BANDITS')!;
    expect(leaves.causedBy).toEqual(['PLAYER_SPARED_GALD']);
    expect(leaves.worldYear).toBe(1);
    expect(leaves.worldDay).toBe(4);
    expect(world.getClock()).toEqual({ worldYear: 4, worldDay: 4 });
    expect(world.getCharacter('GALD')).toMatchObject({ age: 30, occupation: 'NONE' });
    // No duplicate firing.
    expect(types.filter((t) => t === 'GALD_LEAVES_BANDITS')).toHaveLength(1);
  });

  it.each(['KILL', 'HELP', 'CAPTURE'] as const)('%s preset records the choice', async (id) => {
    const world = await openWorld();
    await preset(id).run(world);
    expect(world.getGaldLifeChoice()).toBe(id);
  });

  it('KILL preset + time shift: the dead do not age', async () => {
    const world = await openWorld();
    await preset('KILL').run(world);
    expect(world.getCharacter('GALD')?.alive).toBe(false);
    await world.timeShift(3);
    expect(world.getCharacter('GALD')?.age).toBe(27);
  });
});

describe('World.devResetGaldScenario (RESET SCENARIO)', () => {
  it('clears Gald events and state but preserves the clock and world history', async () => {
    const dbName = `preset-test-${++dbCounter}`;
    const world = await World.open(new IdbMemoryStore(dbName));
    await preset('SPARE_3Y').run(world);

    await world.devResetGaldScenario();

    const types = world.getEvents().map((e) => e.type);
    expect(types).toEqual(['WORLD_TIME_SHIFTED']); // non-Gald history preserved
    expect(world.getGaldLifeChoice()).toBeNull();
    expect(world.getCharacter('GALD')).toMatchObject({
      age: 27,
      alive: true,
      occupation: 'BANDIT',
      location: 'GREENWOOD_FOREST',
    });
    expect(world.getClock()).toEqual({ worldYear: 4, worldDay: 4 }); // clock untouched

    // Persisted: a reopened world agrees.
    const reopened = await World.open(new IdbMemoryStore(dbName));
    expect(reopened.getEvents().map((e) => e.type)).toEqual(['WORLD_TIME_SHIFTED']);
    expect(reopened.getCharacter('GALD')?.age).toBe(27);
  });

  it('the same scenario can be replayed from scratch afterwards', async () => {
    const world = await openWorld();
    await preset('SPARE_3Y').run(world);
    await world.devResetGaldScenario();

    // The fixed life-choice slot is free again — official flow works anew.
    await world.recordGaldLifeChoice('SPARE');
    await world.advanceDays(3);
    expect(world.getEvents().filter((e) => e.type === 'GALD_LEAVES_BANDITS')).toHaveLength(1);
    expect(world.getCharacter('GALD')?.occupation).toBe('NONE');
  });
});
