import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from '../world/world';
import { IdbMemoryStore } from '../memory/idbStore';
import { buildGaldLifeArchive } from './lifeArchive';

let dbCounter = 0;
async function openWorld(dbName = `archive-test-${++dbCounter}`): Promise<World> {
  return World.open(new IdbMemoryStore(dbName));
}

describe('LIFE ARCHIVE projection', () => {
  it('is empty before the player has met anyone', async () => {
    const world = await openWorld();
    expect(world.getLifeArchive()).toEqual([]);
  });

  it('SPARE: only the first-encounter chapter is known, with an unknown continuation', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    const [entry] = world.getLifeArchive();
    expect(entry.displayName).toBe('盗賊'); // the player does not file him by name yet
    expect(entry.chapters).toHaveLength(1);
    expect(entry.chapters[0]).toMatchObject({
      id: 'GALD_CH_FIRST_ENCOUNTER',
      title: '森の盗賊',
      worldYear: 1,
      worldDay: 1,
      sourceEventIds: ['evt_gald_first_encounter_life_choice'],
      sourceEventTypes: ['PLAYER_SPARED_GALD'],
      status: 'KNOWN',
    });
    expect(entry.hasUnknownContinuation).toBe(true);
  });

  it('world truth advancing (3 days) reveals nothing to the archive', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await world.advanceDays(3);
    expect(world.hasEventOfType('GALD_LEAVES_BANDITS')).toBe(true); // truth moved on

    const [entry] = world.getLifeArchive();
    expect(entry.chapters).toHaveLength(1); // …but the player knows nothing new
    expect(entry.chapters[0].id).toBe('GALD_CH_FIRST_ENCOUNTER');
    expect(entry.hasUnknownContinuation).toBe(true);
    // No leaked words anywhere in the projection.
    const text = JSON.stringify(entry);
    expect(text).not.toContain('パン');
    expect(text).not.toContain('盗賊団を離れ');
  });

  it('a 3-year TIME SHIFT (baker in truth, undiscovered) still reveals nothing', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await world.timeShift(3);
    expect(world.isBakeryOpen()).toBe(true); // truth: he bakes

    const [entry] = world.getLifeArchive();
    expect(entry.chapters).toHaveLength(1);
    expect(entry.hasUnknownContinuation).toBe(true);
    expect(JSON.stringify(entry)).not.toContain('パン');
    // The unknown card is knowledge-driven: it looks IDENTICAL to a world
    // where nothing has happened yet — its presence leaks nothing.
    const fresh = await openWorld();
    await fresh.recordGaldLifeChoice('SPARE');
    const [freshEntry] = fresh.getLifeArchive();
    expect(entry.hasUnknownContinuation).toBe(freshEntry.hasUnknownContinuation);
    expect(entry.chapters.length).toBe(freshEntry.chapters.length);
  });

  it('the reunion reveals the whole life as one connected record', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await world.advanceDays(3);
    await world.timeShift(3);
    await world.recordGaldReunion();

    const [entry] = world.getLifeArchive();
    expect(entry.displayName).toBe('ガルド');
    expect(entry.chapters.map((c) => [c.id, c.worldYear, c.worldDay])).toEqual([
      ['GALD_CH_FIRST_ENCOUNTER', 1, 1],
      ['GALD_CH_LEFT_FOREST', 1, 4],
      ['GALD_CH_ARRIVED', 1, 34],
      ['GALD_CH_NEW_WORK', 1, 94],
      ['GALD_CH_REUNION', 4, 4],
    ]);
    expect(entry.chapters.map((c) => c.sourceEventTypes[0])).toEqual([
      'PLAYER_SPARED_GALD',
      'GALD_LEAVES_BANDITS',
      'GALD_ARRIVES_IN_ALDEN',
      'GALD_BECOMES_BAKER',
      'PLAYER_REUNITED_WITH_GALD',
    ]);
    expect(entry.hasUnknownContinuation).toBe(false);
  });

  it('the projection is stable: repeated reads are identical, no duplication', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await world.timeShift(3);
    await world.recordGaldReunion();
    const first = world.getLifeArchive();
    const second = world.getLifeArchive();
    expect(second).toEqual(first);
    expect(first[0].chapters).toHaveLength(5);
  });

  it('a reopened world (restart) restores the identical record', async () => {
    const dbName = `archive-test-${++dbCounter}`;
    const world = await World.open(new IdbMemoryStore(dbName));
    await world.recordGaldLifeChoice('SPARE');
    await world.advanceDays(3);
    await world.timeShift(3);
    await world.recordGaldReunion();
    const before = world.getLifeArchive();

    const reopened = await World.open(new IdbMemoryStore(dbName));
    expect(reopened.getLifeArchive()).toEqual(before);
  });

  it('RESET WORLD empties the archive', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await world.timeShift(3);
    await world.recordGaldReunion();
    await world.resetWorld();
    expect(world.getLifeArchive()).toEqual([]);
  });

  it('RESET SCENARIO removes the Gald record while keeping world history', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await world.timeShift(3);
    await world.recordGaldReunion();
    await world.devResetGaldScenario();
    expect(world.getLifeArchive()).toEqual([]);
    expect(world.hasEventOfType('WORLD_TIME_SHIFTED')).toBe(true);
  });

  it('KILL: the life ended, but the record still says there is more to find', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('KILL');
    let [entry] = world.getLifeArchive();
    expect(entry.chapters).toHaveLength(1);
    expect(entry.chapters[0].title).toBe('森で終わった命');
    // His time stopped; what the world did afterwards is still unseen.
    expect(entry.hasUnknownContinuation).toBe(true);

    // A century of truth passes — the player's record does not move an inch.
    await world.timeShift(100);
    [entry] = world.getLifeArchive();
    expect(entry.chapters).toHaveLength(1);
    expect(entry.hasUnknownContinuation).toBe(true);
    const text = JSON.stringify(entry);
    expect(text).not.toContain('パン');
    expect(text).not.toContain('石');
    expect(text).not.toContain('花');
  });

  it.each([
    ['HELP', '手を差し伸べた'],
    ['CAPTURE', '捕らえた男'],
  ] as const)('%s: own first chapter, no SPARE life even after 100 years', async (choice, title) => {
    const world = await openWorld();
    await world.recordGaldLifeChoice(choice);
    await world.timeShift(100);
    const [entry] = world.getLifeArchive();
    expect(entry.chapters).toHaveLength(1);
    expect(entry.chapters[0].title).toBe(title);
    expect(entry.hasUnknownContinuation).toBe(true); // their futures are unwritten
    const text = JSON.stringify(entry);
    expect(text).not.toContain('見逃した');
    expect(text).not.toContain('パン');
  });

  it('fed the FULL truth (dev admin), the same projection yields the complete canon', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await world.timeShift(3);
    // Player view: 1 chapter. Truth view: 4 chapters (no reunion yet).
    expect(world.getLifeArchive()[0].chapters).toHaveLength(1);
    const truth = buildGaldLifeArchive(world.getEvents())!;
    expect(truth.chapters.map((c) => c.id)).toEqual([
      'GALD_CH_FIRST_ENCOUNTER',
      'GALD_CH_LEFT_FOREST',
      'GALD_CH_ARRIVED',
      'GALD_CH_NEW_WORK',
    ]);
  });
});
