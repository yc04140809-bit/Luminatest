import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from '../world/world';
import { IdbMemoryStore } from '../memory/idbStore';
import { kaosHasAwakened } from './awakened';
import { createBattle } from '../../game/battle/battleLogic';
import { specOf } from '../../game/battle/enemySpec';
import { MOSS_RABBIT } from '../../content/enemies/species';
import type { LifeChoiceId } from '../flow/types';

/**
 * THE WHOLE CHAIN, THROUGH A REAL WORLD AND A REAL REOPEN.
 *
 * `awakened.test.ts` already proves the rule as arithmetic: hand
 * `kaosHasAwakened` one of the four event types and it says yes. What
 * nothing proved is the chain a player actually walks —
 *
 *   recordGaldLifeChoice → the world remembers → the memory survives
 *   being closed and opened → an ORDINARY fight now begins with her
 *   spells available
 *
 * — and that chain is what App Alpha's magic depends on. It is worth
 * its own test because every link is a different module: the world's
 * write, the store's durability, the known-events filter, and
 * `createBattle`'s reading of `magicUnlocked`. All four routes are
 * covered here; one of them (SPARE) is also walked in a browser by the
 * App's e2e, and the other three are covered by this.
 */

let dbCounter = 0;
const freshDbName = () => `awakening-test-${++dbCounter}`;
const openWorld = (dbName: string) => World.open(new IdbMemoryStore(dbName));

const ROUTES: LifeChoiceId[] = ['KILL', 'SPARE', 'HELP', 'CAPTURE'];

/** What the App asks before it builds a fight. */
const awakenedIn = (world: World) =>
  kaosHasAwakened(world.getKnownEvents().map((e) => e.type));

describe('what deciding his life unlocks', () => {
  it('is locked in a world where he has not been met', async () => {
    const world = await openWorld(freshDbName());
    expect(awakenedIn(world)).toBe(false);
  });

  it.each(ROUTES)('is unlocked by %s, and stays unlocked after a reopen', async (choice) => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    expect(awakenedIn(world)).toBe(false);

    await world.recordGaldLifeChoice(choice);
    expect(awakenedIn(world), 'immediately after the write').toBe(true);

    // CLOSED AND OPENED AGAIN. No new key was added to the save for
    // this — the answer is derived from the event that was already
    // being stored — so what is really being checked is that the
    // derivation survives a round trip through the database.
    const reopened = await openWorld(dbName);
    expect(reopened.getGaldLifeChoice()).toBe(choice);
    expect(awakenedIn(reopened), 'after closing and opening').toBe(true);
  });

  it.each(ROUTES)(
    'lets an ordinary rabbit fight start with magic once %s is remembered',
    async (choice) => {
      const dbName = freshDbName();
      const before = await openWorld(dbName);
      // A MOSS RABBIT CARRIES NO AWAKENING BEAT. Before the decision
      // there is no way for magic to appear in this fight at all,
      // which is exactly why it has to come from the world.
      expect(
        createBattle(specOf(MOSS_RABBIT), undefined, { magicUnlocked: awakenedIn(before) })
          .magicUnlocked,
      ).toBe(false);

      await before.recordGaldLifeChoice(choice);
      const after = await openWorld(dbName);
      expect(
        createBattle(specOf(MOSS_RABBIT), undefined, { magicUnlocked: awakenedIn(after) })
          .magicUnlocked,
      ).toBe(true);
    },
  );

  it.each(ROUTES)('records %s once, and refuses to be asked twice', async (choice) => {
    const world = await openWorld(freshDbName());
    await world.recordGaldLifeChoice(choice);

    // The same answer again is the double-tap case and is harmless.
    await world.recordGaldLifeChoice(choice);
    expect(world.getEvents()).toHaveLength(1);

    // A DIFFERENT answer is a contradiction and is refused, which is
    // what makes "the encounter cannot be offered again" a property of
    // the world rather than of a screen remembering to hide a button.
    const other = ROUTES.find((r) => r !== choice)!;
    await expect(world.recordGaldLifeChoice(other)).rejects.toThrow(/already recorded/);
    expect(world.getGaldLifeChoice()).toBe(choice);
  });
});
