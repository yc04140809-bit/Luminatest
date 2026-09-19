import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';

/**
 * TWO NIGHTS ASKED FOR AT ONCE.
 *
 * `advanceDay` reads the clock, works out tomorrow, resolves whatever
 * is due and commits. None of that is atomic across the await, so two
 * calls in flight together both start from TODAY: they compute the
 * same tomorrow, resolve the same events and write the same rows. The
 * world ends up one day older instead of two, and on a day when a life
 * event is due the second commit is refused outright because history
 * is write-once and the id is already taken.
 *
 * `timeShift` has always guarded itself against exactly this. This is
 * the same protection for the one that is used far more often — and it
 * SERIALISES rather than refuses, because a second night asked for is
 * a real second night, not a stutter to be dropped. What must never
 * happen is a night applied twice or lost.
 */

let dbCounter = 0;
const freshDbName = () => `time-safety-${++dbCounter}`;
const openWorld = (dbName: string) => World.open(new IdbMemoryStore(dbName));

const day = (w: World) => w.getClock().worldDay;

describe('time passes once per night asked for', () => {
  it('two nights requested together are two nights, not one', async () => {
    const world = await openWorld(freshDbName());
    expect(day(world)).toBe(1);

    // Both fired before either resolves — the double tap.
    await Promise.all([world.advanceDay(), world.advanceDay()]);

    expect(day(world), 'a night must not be swallowed').toBe(3);
  });

  it('holds up under a burst, and loses none of it', async () => {
    const world = await openWorld(freshDbName());
    await Promise.all(Array.from({ length: 10 }, () => world.advanceDay()));
    expect(day(world)).toBe(11);
  });

  it('writes a life event exactly once when nights overlap', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE');
    // He leaves the bandits on day 4. Crossing that day with two
    // requests in flight must still produce one event.
    await Promise.all([
      world.advanceDay(),
      world.advanceDay(),
      world.advanceDay(),
      world.advanceDay(),
    ]);
    expect(day(world)).toBe(5);
    const leaving = world.getEvents().filter((e) => e.type === 'GALD_LEAVES_BANDITS');
    expect(leaving, 'written once, not once per caller').toHaveLength(1);
  });

  it('survives a reopen with the days it actually counted', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await Promise.all([world.advanceDay(), world.advanceDay(), world.advanceDay()]);
    expect(day(world)).toBe(4);
    expect(day(await openWorld(dbName)), 'what is on disk agrees').toBe(4);
  });

  it('a night that fails does not shut the gate on the next one', async () => {
    const world = await openWorld(freshDbName());
    // Break the store for exactly one commit, then let it heal.
    const store = (world as unknown as { store: { commit: (c: unknown) => Promise<void> } }).store;
    const real = store.commit.bind(store);
    let broken = true;
    store.commit = async (changes: unknown) => {
      if (broken) {
        broken = false;
        throw new Error('the disk said no');
      }
      return real(changes);
    };

    await expect(world.advanceDay()).rejects.toThrow(/the disk said no/);
    // THE GATE MUST HAVE REOPENED. A lock left shut by a failure is a
    // world that can never age again.
    await world.advanceDay();
    expect(day(world)).toBe(2);
  });

  it('still walks n days in order when asked for them one at a time', async () => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice('SPARE');
    const fired = await world.advanceDays(40);
    expect(day(world)).toBe(41);
    // Order preserved: he leaves the bandits before he reaches Alden.
    expect(fired.map((e) => e.type)).toEqual(['GALD_LEAVES_BANDITS', 'GALD_ARRIVES_IN_ALDEN']);
  });

  it('a shift and a night cannot interleave', async () => {
    const world = await openWorld(freshDbName());
    const [, ,] = await Promise.all([world.timeShift(1), world.advanceDay()]);
    // One year and one day, in whichever order they were granted —
    // what matters is that both landed and neither was lost.
    const clock = world.getClock();
    expect(clock.worldYear).toBe(2);
    expect(world.getEvents().filter((e) => e.type === 'WORLD_TIME_SHIFTED')).toHaveLength(1);
  });
});
