import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';

/**
 * WINDING THE STORY BACK WITHOUT EMPTYING THE POCKETS.
 *
 * A world reset is right for a player who wants a new world, and it is
 * untouched. It is wrong for the job a developer does twenty times an
 * hour — put the story at a known point and go and look at something —
 * because it took the bag, the purse and the levels with it, so every
 * test of the economy began by rebuilding the economy.
 */

let dbCounter = 0;
const freshDbName = () => `scenario-reset-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));

/** Somebody who has played: a story, a purse, a bag and some levels. */
async function aLivedWorld(dbName: string): Promise<World> {
  const world = await open(dbName);
  await world.recordGaldLifeChoice('SPARE');
  await world.advanceDays(3);
  await world.applyBattleReward('fight-1', {
    exp: 40,
    lumi: 120,
    items: [{ itemId: 'FOREST_HERB', quantity: 3 }],
  });
  return world;
}

describe('what a scenario reset keeps', () => {
  it('the purse, the bag and the levels', async () => {
    const world = await aLivedWorld(freshDbName());
    const lumi = world.getLumi();
    const level = world.getLevel('hero');
    expect(lumi).toBeGreaterThan(0);
    expect(level).toBeGreaterThan(1);

    await world.devResetScenario();

    expect(world.getLumi()).toBe(lumi);
    expect(world.getItemCount('FOREST_HERB')).toBe(3);
    expect(world.getLevel('hero')).toBe(level);
  });

  /**
   * ON PURPOSE. Clearing it would let the same fight be paid for twice
   * across a reset, which is the exact hole the ledger exists to close
   * — and a developer tool that can mint money is a tool that will be
   * blamed for a balance problem it caused.
   */
  it('the ledger of fights already paid for', async () => {
    const world = await aLivedWorld(freshDbName());
    await world.devResetScenario();
    const again = await world.applyBattleReward('fight-1', { exp: 40, lumi: 120, items: [] });
    expect(again.alreadyClaimed).toBe(true);
    expect(world.getLumi(), 'nothing was minted').toBe(120);
  });

  it('and it survives closing the game', async () => {
    const dbName = freshDbName();
    const world = await aLivedWorld(dbName);
    await world.devResetScenario();
    const reopened = await open(dbName);
    expect(reopened.getLumi()).toBe(120);
    expect(reopened.getItemCount('FOREST_HERB')).toBe(3);
    expect(reopened.getLevel('hero')).toBeGreaterThan(1);
    expect(reopened.getSaveHealth().health, 'and it is a healthy save').toBe('ok');
  });
});

describe('what a scenario reset takes', () => {
  it('everything the story is made of', async () => {
    const dbName = freshDbName();
    const world = await aLivedWorld(dbName);
    expect(world.getEvents().length).toBeGreaterThan(0);

    await world.devResetScenario();

    expect(world.getEvents()).toEqual([]);
    expect(world.getClock()).toEqual({ worldYear: 1, worldDay: 1 });
    expect(world.getResumeArea()).toBe('HOME');
    const reopened = await open(dbName);
    expect(reopened.getEvents()).toEqual([]);
  });
});

describe('the world reset it is not', () => {
  /** Untouched, and this is the guard that keeps it that way. */
  it('still takes everything, pockets included', async () => {
    const dbName = freshDbName();
    const world = await aLivedWorld(dbName);
    await world.resetWorld();
    expect(world.getLumi()).toBe(0);
    expect(world.getItemCount('FOREST_HERB')).toBe(0);
    expect(world.getLevel('hero')).toBe(1);
    expect(world.getEvents()).toEqual([]);
    expect(world.hasProgress()).toBe(false);
    const reopened = await open(dbName);
    expect(reopened.hasProgress()).toBe(false);
  });
});
