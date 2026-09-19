import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import type { LifeChoiceId } from '../flow/types';
import type { MemoryEventType } from '../memory/types';

/**
 * FOUR LIVES, ONE CLOCK.
 *
 * Each of the four answers starts a different chain of things that
 * happen to Gald while nobody is watching, and all four are driven by
 * the same `advanceDay` — there is no second mechanism for the long
 * ones. This pins WHAT happens and WHEN, so that a change to the
 * shared clock cannot quietly reschedule somebody's life, and so the
 * numbers are written down somewhere a person can read them.
 *
 * THE DAYS HERE ARE A RECORD, NOT A PROPOSAL. They are read off
 * `content/events/lifeEvents` as it stands. If one of them is ever
 * meant to change, this test is the place that says what it used to
 * be — it is not a reason to leave the schedule alone forever.
 *
 * Bulk advancement is a TEST's way of getting to day 745. It is not a
 * feature: nothing in the player's UI walks time like this.
 */

let dbCounter = 0;
const freshDbName = () => `gald-timing-${++dbCounter}`;
const openWorld = (dbName: string) => World.open(new IdbMemoryStore(dbName));

interface Route {
  choice: LifeChoiceId;
  /** [absolute world day it lands on, what lands] — in order. */
  chain: Array<[number, MemoryEventType]>;
}

const ROUTES: Route[] = [
  {
    choice: 'SPARE',
    chain: [
      [4, 'GALD_LEAVES_BANDITS'],
      [34, 'GALD_ARRIVES_IN_ALDEN'],
      [94, 'GALD_BECOMES_BAKER'],
    ],
  },
  {
    choice: 'HELP',
    chain: [
      [4, 'GALD_WALKS_THE_ROAD'],
      [124, 'GALD_BECOMES_HEALER'],
    ],
  },
  {
    choice: 'KILL',
    chain: [
      [31, 'GALD_IS_BURIED'],
      [331, 'GALD_GRAVE_TENDED'],
    ],
  },
  {
    choice: 'CAPTURE',
    chain: [
      [15, 'GALD_STANDS_TRIAL'],
      [715, 'GALD_COMPLETES_SENTENCE'],
      [745, 'GALD_WORKS_FOR_ALDEN'],
    ],
  },
];

/** Day 1 is the day the choice is made, so n days later is day n+1. */
const lastDay = (route: Route) => route.chain[route.chain.length - 1][0];

describe('what becomes of him, and when', () => {
  it.each(ROUTES.map((r) => [r.choice, r] as const))(
    '%s runs its whole chain on the ordinary clock',
    async (_choice, route) => {
      const world = await openWorld(freshDbName());
      await world.recordGaldLifeChoice(route.choice);

      const seen: Array<[number, MemoryEventType]> = [];
      for (let i = 0; i < lastDay(route); i++) {
        for (const event of await world.advanceDay()) {
          seen.push([world.getClock().worldDay + (world.getClock().worldYear - 1) * 365, event.type]);
        }
      }

      // The right things, in the right order, on the right days.
      expect(seen).toEqual(route.chain);
    },
  );

  it.each(ROUTES.map((r) => [r.choice, r] as const))(
    '%s writes each step exactly once, however long time runs on',
    async (_choice, route) => {
      const world = await openWorld(freshDbName());
      await world.recordGaldLifeChoice(route.choice);
      // Well past the end of the chain: nothing may fire twice.
      await world.advanceDays(lastDay(route) + 40);
      for (const [, type] of route.chain) {
        expect(world.getEvents().filter((e) => e.type === type), type).toHaveLength(1);
      }
    },
  );

  it.each(ROUTES.map((r) => [r.choice, r] as const))(
    '%s never picks up another route’s life',
    async (_choice, route) => {
      const world = await openWorld(freshDbName());
      await world.recordGaldLifeChoice(route.choice);
      await world.advanceDays(lastDay(route) + 10);

      const mine = new Set(route.chain.map(([, type]) => type));
      const everyone = ROUTES.flatMap((r) => r.chain.map(([, type]) => type));
      for (const type of everyone) {
        if (mine.has(type)) continue;
        expect(world.hasEventOfType(type), `${route.choice} must not reach ${type}`).toBe(false);
      }
    },
  );

  it('a chain picks up again after the world is closed and reopened', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    await world.advanceDays(33); // day 34: he has reached Alden, not yet baking
    expect(world.hasEventOfType('GALD_ARRIVES_IN_ALDEN')).toBe(true);
    expect(world.hasEventOfType('GALD_BECOMES_BAKER')).toBe(false);

    const reopened = await openWorld(dbName);
    expect(reopened.getClock().worldDay).toBe(34);
    await reopened.advanceDays(60); // day 94
    expect(reopened.hasEventOfType('GALD_BECOMES_BAKER'), 'the rest of his life still came').toBe(
      true,
    );
  });
});
