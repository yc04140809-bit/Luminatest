import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { GALD_FUTURE_VISION_ID, GALD_FUTURE_VISION_YEARS } from '../../content/events/galdLifeChoice';
import type { LifeChoiceId } from '../flow/types';

/**
 * A LOOK AHEAD THAT COSTS THE WORLD NOTHING.
 *
 * Kaos shows the player where their decision ends up and then brings
 * them back. The whole design rests on one claim — that looking is not
 * living — so these tests take a complete photograph of the world
 * before the look and insist it is unchanged afterwards. Not the
 * clock, not an age, not a life phase, not an event, not a row.
 *
 * The three states the scene can be in are read from the world, never
 * remembered in the screen, so a restart answers the same question:
 *
 *   A  the four answers are not decided  → nothing owed
 *   B  decided, vision not finished      → owed
 *   C  vision finished                   → never again
 */

let dbCounter = 0;
const freshDbName = () => `future-vision-${++dbCounter}`;
const openWorld = (dbName: string) => World.open(new IdbMemoryStore(dbName));

const ROUTES: LifeChoiceId[] = ['SPARE', 'HELP', 'KILL', 'CAPTURE'];

/** Everything the look must leave exactly as it found it. */
const photograph = (w: World) => ({
  clock: w.getClock(),
  events: w.getEvents().map((e) => `${e.type}@Y${e.worldYear}D${e.worldDay}`).sort(),
  known: w.getKnownEvents().map((e) => e.type).sort(),
  archive: JSON.stringify(w.getLifeArchive()),
  characters: ['GALD', 'LINA', 'BAKERY_OWNER'].map((id) => JSON.stringify(w.getCharacter(id))),
  sites: w.getOpenFutureSites().map((s) => `${s.def.id}:${s.discovered}`).sort(),
  lumi: w.getLumi(),
  inventory: JSON.stringify(w.getInventory()),
});

describe('looking three years ahead', () => {
  it.each(ROUTES)('%s: shows that route’s life and changes nothing at all', async (choice) => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice(choice);

    const before = photograph(world);
    const future = world.previewLifeEvents(GALD_FUTURE_VISION_YEARS);

    // It really did look at something.
    expect(future.length, 'his life goes somewhere').toBeGreaterThan(0);
    // And it is HIS life on THIS route — every previewed event is
    // caused by the answer the player actually gave.
    for (const event of future) {
      expect(event.actors, event.type).toContain('GALD');
    }

    expect(photograph(world), 'the world is untouched').toEqual(before);
    // Including on disk: a preview that wrote nothing cannot have
    // changed what a reopened world says.
    expect(photograph(await openWorld(dbName))).toEqual(before);
  });

  it('is idempotent: looking twice gives the identical answer', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE');
    expect(world.previewLifeEvents(3)).toEqual(world.previewLifeEvents(3));
  });

  it('KILL looks at a grave, not at a living man', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('KILL');
    const types = world.previewLifeEvents(3).map((e) => e.type);
    expect(types).toEqual(['GALD_IS_BURIED', 'GALD_GRAVE_TENDED']);
    // He is dead in the present and the look does not revive him.
    expect(world.getCharacter('GALD')?.alive).toBe(false);
  });

  it('shows nothing before the four answers are decided', async () => {
    const world = await openWorld(freshDbName());
    expect(world.previewLifeEvents(3)).toEqual([]);
  });

  it('refuses a nonsense distance rather than guessing', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE');
    expect(world.previewLifeEvents(0)).toEqual([]);
    expect(world.previewLifeEvents(-3)).toEqual([]);
    expect(world.previewLifeEvents(1.5)).toEqual([]);
  });

  it('never writes what it showed into WORLD MEMORY', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    const shown = world.previewLifeEvents(3).map((e) => e.type);
    expect(shown).toContain('GALD_BECOMES_BAKER');

    // Seen on a screen; not a thing that happened.
    for (const type of shown) {
      expect(world.hasEventOfType(type), type).toBe(false);
    }
    expect(world.getKnownEvents().map((e) => e.type)).toEqual(['PLAYER_SPARED_GALD']);
    expect((await openWorld(dbName)).getEvents()).toHaveLength(1);
  });
});

describe('remembering that the look was taken', () => {
  it('walks A → B → C, and C survives a reopen', async () => {
    const dbName = freshDbName();
    const owed = (w: World) =>
      w.getGaldLifeChoice() !== null && !w.hasSeenExperience(GALD_FUTURE_VISION_ID);

    const world = await openWorld(dbName);
    expect(owed(world), 'A: nothing decided, nothing owed').toBe(false);

    await world.recordGaldLifeChoice('SPARE');
    expect(owed(world), 'B: decided, still owed').toBe(true);
    // B SURVIVES A RESTART — this is the case that used to lose the
    // scene, and the four answers are not asked again.
    const resumed = await openWorld(dbName);
    expect(owed(resumed), 'B after a restart').toBe(true);
    expect(resumed.getGaldLifeChoice(), 'and the decision stands').toBe('SPARE');

    await resumed.markExperienceSeen(GALD_FUTURE_VISION_ID);
    expect(owed(resumed), 'C: finished').toBe(false);
    expect(owed(await openWorld(dbName)), 'C after a restart').toBe(false);
  });

  it('does not borrow WORLD_TIME_SHIFTED, which would mean something else', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE');
    await world.markExperienceSeen(GALD_FUTURE_VISION_ID);
    // Three years were LOOKED AT, not lived: nothing may claim they passed.
    expect(world.hasEventOfType('WORLD_TIME_SHIFTED')).toBe(false);
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 1 });
  });

  it('an old save simply has not seen it yet', async () => {
    // The set is a plain list of ids that a save written before this
    // build does not have; absent reads as empty, which is the right
    // answer. Nothing needed migrating.
    const dbName = freshDbName();
    const old = await openWorld(dbName);
    await old.recordGaldLifeChoice('SPARE');
    await old.advanceDays(3);

    const reopened = await openWorld(dbName);
    expect(reopened.hasSeenExperience(GALD_FUTURE_VISION_ID)).toBe(false);
    await reopened.markExperienceSeen(GALD_FUTURE_VISION_ID);
    expect((await openWorld(dbName)).hasSeenExperience(GALD_FUTURE_VISION_ID)).toBe(true);
  });
});
