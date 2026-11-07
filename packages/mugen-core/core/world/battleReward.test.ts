import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { itemDef } from '../../content/economy/itemDefs';
import { readReward, isEmptyReward, NO_REWARD } from '../progression/battleReward';
import { expForLevel } from '../progression/levelCurve';

let dbCounter = 0;
const freshDbName = () => `reward-test-${++dbCounter}`;
const openWorld = (dbName: string) => World.open(new IdbMemoryStore(dbName));

const HERB = 'FOREST_HERB';
const PAIR = [
  { id: 'hero', label: 'あなた' },
  { id: 'kaos', label: 'ケイオス' },
];

describe('a reward, as data', () => {
  it('is repaired downward rather than trusted', () => {
    const got = readReward({ exp: -5, lumi: 12.9, items: [{ itemId: HERB, quantity: -2 }] });
    expect(got).toEqual({ exp: 0, lumi: 12, items: [] });
  });

  it('adds two stacks of one thing together', () => {
    const got = readReward({
      exp: 1,
      lumi: 0,
      items: [
        { itemId: HERB, quantity: 1 },
        { itemId: HERB, quantity: 2 },
      ],
    });
    expect(got.items).toEqual([{ itemId: HERB, quantity: 3 }]);
  });

  it('knows when there is nothing in it', () => {
    expect(isEmptyReward(NO_REWARD)).toBe(true);
    expect(isEmptyReward(readReward({ exp: 0, lumi: 0, items: [] }))).toBe(true);
    expect(isEmptyReward(readReward({ exp: 1, lumi: 0, items: [] }))).toBe(false);
  });
});

describe('a fight’s winnings', () => {
  it('land together, and survive the game being closed', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    const got = await world.applyBattleReward(
      'fight-1',
      { exp: 14, lumi: 9, items: [{ itemId: HERB, quantity: 1 }] },
      { earners: PAIR },
    );
    expect(got.exp).toBe(14);
    expect(got.lumi).toBe(9);
    expect(got.items).toEqual([{ itemId: HERB, quantity: 1 }]);
    expect(got.levels.map((l) => l.characterId)).toEqual(['hero', 'kaos']);

    const reopened = await openWorld(dbName);
    expect(reopened.getLumi()).toBe(9);
    expect(reopened.getItemCount(HERB)).toBe(1);
    expect(reopened.getProgress('hero').totalExp).toBe(14);
    expect(reopened.getProgress('kaos').totalExp).toBe(14);
  });

  /**
   * THE ONE THIS GUARD EXISTS FOR. A battle screen calls its own ending
   * more than once — a re-render, a double tap, AUTO and the player
   * arriving together, a timer firing after the state moved on.
   */
  it('is paid once however many times it is applied', async () => {
    const world = await openWorld(freshDbName());
    const reward = { exp: 14, lumi: 9, items: [{ itemId: HERB, quantity: 1 }] };
    await world.applyBattleReward('fight-1', reward, { earners: PAIR });
    const again = await world.applyBattleReward('fight-1', reward, { earners: PAIR });
    expect(again.alreadyClaimed).toBe(true);
    expect(again.exp).toBe(0);
    expect(again.lumi).toBe(0);
    expect(again.items).toEqual([]);
    expect(world.getLumi()).toBe(9);
    expect(world.getItemCount(HERB)).toBe(1);
    expect(world.getProgress('hero').totalExp).toBe(14);
  });

  it('survives a reload still knowing it was paid', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.applyBattleReward('fight-1', { exp: 5, lumi: 5, items: [] }, { earners: PAIR });
    const reopened = await openWorld(dbName);
    expect(reopened.hasClaimedReward('fight-1')).toBe(true);
    const again = await reopened.applyBattleReward(
      'fight-1',
      { exp: 5, lumi: 5, items: [] },
      { earners: PAIR },
    );
    expect(again.alreadyClaimed).toBe(true);
    expect(reopened.getLumi()).toBe(5);
  });

  it('pays a different fight separately', async () => {
    const world = await openWorld(freshDbName());
    await world.applyBattleReward('fight-1', { exp: 5, lumi: 5, items: [] }, { earners: PAIR });
    await world.applyBattleReward('fight-2', { exp: 5, lumi: 5, items: [] }, { earners: PAIR });
    expect(world.getLumi()).toBe(10);
    expect(world.getProgress('hero').totalExp).toBe(10);
  });

  /** An empty reward is still a fight that happened, and still claimed. */
  it('records an empty reward so a later one cannot slip through its id', async () => {
    const world = await openWorld(freshDbName());
    const first = await world.applyBattleReward('fight-1', NO_REWARD, { earners: PAIR });
    expect(first.alreadyClaimed).toBe(false);
    const second = await world.applyBattleReward(
      'fight-1',
      { exp: 999, lumi: 999, items: [] },
      { earners: PAIR },
    );
    expect(second.alreadyClaimed).toBe(true);
    expect(world.getLumi()).toBe(0);
  });

  it('refuses a reward with no id at all', async () => {
    const world = await openWorld(freshDbName());
    const got = await world.applyBattleReward('', { exp: 9, lumi: 9, items: [] }, { earners: PAIR });
    expect(got.exp).toBe(0);
    expect(world.getLumi()).toBe(0);
  });

  /**
   * WHAT LANDED, NOT WHAT WAS OFFERED. A screen that drew the offer
   * would congratulate a player on a herb their bag had no room for.
   */
  it('reports what the bag actually took', async () => {
    const world = await openWorld(freshDbName());
    const cap = itemDef(HERB)!.maxStack;
    await world.addItem(HERB, cap - 1);
    const got = await world.applyBattleReward(
      'fight-1',
      { exp: 1, lumi: 0, items: [{ itemId: HERB, quantity: 5 }] },
      { earners: PAIR },
    );
    expect(got.items).toEqual([{ itemId: HERB, quantity: 1 }]);
    expect(world.getItemCount(HERB)).toBe(cap);
  });

  it('ignores a drop the catalogue has never heard of', async () => {
    const world = await openWorld(freshDbName());
    const got = await world.applyBattleReward(
      'fight-1',
      { exp: 1, lumi: 0, items: [{ itemId: 'NO_SUCH_THING', quantity: 1 }] },
      { earners: PAIR },
    );
    expect(got.items).toEqual([]);
    expect(world.getInventory()).toEqual([]);
  });

  it('says who levelled up, and who merely earned', async () => {
    const world = await openWorld(freshDbName());
    const got = await world.applyBattleReward(
      'fight-1',
      { exp: expForLevel(3), lumi: 0, items: [] },
      { earners: PAIR },
    );
    for (const row of got.levels) {
      expect(row.from).toBe(1);
      expect(row.to).toBe(3);
      expect(row.levelsGained).toBe(2);
    }
    const quiet = await world.applyBattleReward(
      'fight-2',
      { exp: 1, lumi: 0, items: [] },
      { earners: PAIR },
    );
    expect(quiet.levels.every((l) => l.levelsGained === 0)).toBe(true);
  });
});

describe('RESET WORLD', () => {
  it('forgets which rewards were paid, so a new world can earn them', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.applyBattleReward('fight-1', { exp: 5, lumi: 5, items: [] }, { earners: PAIR });
    await world.resetWorld();
    expect(world.hasClaimedReward('fight-1')).toBe(false);
    const again = await world.applyBattleReward(
      'fight-1',
      { exp: 5, lumi: 5, items: [] },
      { earners: PAIR },
    );
    expect(again.alreadyClaimed).toBe(false);
    expect(world.getLumi()).toBe(5);
  });
});
