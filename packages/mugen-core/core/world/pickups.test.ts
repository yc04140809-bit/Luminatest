import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { readPickupsTaken } from './explorationState';
import { ALDEN_TOOL_SHOP_OFFERS } from '../../content/economy/aldenShop';

/**
 * 探索アイテム＋道具屋基盤 (2026-10-07): a pickup taken once in a world,
 * kept across a restart; buying and selling the new things, kept too.
 */

let dbCounter = 0;
const freshDbName = () => `pickups-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));
const offer = (id: string) => ALDEN_TOOL_SHOP_OFFERS.find((o) => o.itemId === id)!;

describe('the pickups-taken row', () => {
  it('absent is nothing taken; damage is repaired, never thrown', () => {
    expect(readPickupsTaken(undefined)).toEqual({ value: [], health: 'ok' });
    expect(readPickupsTaken(['a', 'b'])).toEqual({ value: ['a', 'b'], health: 'ok' });
    expect(readPickupsTaken('a')).toEqual({ value: [], health: 'repaired' });
    expect(readPickupsTaken(['a', 'a', 3, '', null, 'b'])).toEqual({ value: ['a', 'b'], health: 'repaired' });
  });
});

describe('taking a pickup', () => {
  it('puts the thing in the bag and marks the pickup taken, in one go', async () => {
    const world = await open(freshDbName());
    expect(world.isPickupTaken('forest_pickup_001')).toBe(false);
    expect(await world.claimPickup('forest_pickup_001', 'FOREST_HERB', 1)).toBe(1);
    expect(world.getItemCount('FOREST_HERB')).toBe(1);
    expect(world.isPickupTaken('forest_pickup_001')).toBe(true);
  });

  it('cannot be taken twice — not now, not after the game is closed and opened', async () => {
    const name = freshDbName();
    const world = await open(name);
    await world.claimPickup('ruins_pickup_001', 'OLD_COIN', 2);
    expect(await world.claimPickup('ruins_pickup_001', 'OLD_COIN', 2)).toBe(0);
    expect(world.getItemCount('OLD_COIN')).toBe(2);
    const reopened = await open(name);
    expect(reopened.isPickupTaken('ruins_pickup_001')).toBe(true);
    expect(reopened.getTakenPickups()).toEqual(['ruins_pickup_001']);
    expect(reopened.getItemCount('OLD_COIN')).toBe(2);
    expect(await reopened.claimPickup('ruins_pickup_001', 'OLD_COIN', 2)).toBe(0);
    expect(reopened.getItemCount('OLD_COIN')).toBe(2);
  });

  it('refuses, writing nothing, for a thing nobody has heard of or a nonsense count', async () => {
    const world = await open(freshDbName());
    const v = world.getVersion();
    expect(await world.claimPickup('forest_pickup_001', 'NO_SUCH_THING', 1)).toBe(0);
    expect(await world.claimPickup('forest_pickup_001', 'FOREST_HERB', 0)).toBe(0);
    expect(await world.claimPickup('', 'FOREST_HERB', 1)).toBe(0);
    expect(world.getVersion()).toBe(v);
    expect(world.isPickupTaken('forest_pickup_001')).toBe(false);
  });

  it('with no room, it stays where it is (to come back for)', async () => {
    const world = await open(freshDbName());
    await world.addItem('IRON_ORE', 99);
    expect(await world.claimPickup('forest_pickup_003', 'IRON_ORE', 1)).toBe(0);
    expect(world.isPickupTaken('forest_pickup_003')).toBe(false);
    expect(world.getItemCount('IRON_ORE')).toBe(99);
  });

  it('a new world has taken nothing', async () => {
    const world = await open(freshDbName());
    await world.claimPickup('forest_pickup_002', 'FOREST_NUT', 2);
    await world.resetWorld();
    expect(world.getTakenPickups()).toEqual([]);
  });
});

describe('the shop: buying and selling the new things, kept across a restart', () => {
  it('buys a herb: LUMI down by its price, one more held — and still so after a restart', async () => {
    const name = freshDbName();
    const world = await open(name);
    await world.addLumi(100);
    const before = world.getLumi();
    expect(await world.buyItem(offer('FOREST_HERB'), 1)).toBe(true);
    expect(world.getLumi()).toBe(before - 16);
    expect(world.getItemCount('FOREST_HERB')).toBe(1);
    const reopened = await open(name);
    expect(reopened.getLumi()).toBe(before - 16);
    expect(reopened.getItemCount('FOREST_HERB')).toBe(1);
  });

  it('refuses without the money, changing nothing', async () => {
    const world = await open(freshDbName());
    await world.spendLumi(world.getLumi());
    await world.addLumi(39);
    expect(await world.buyItem(offer('FINE_HERB'), 1)).toBe(false);
    expect(world.getLumi()).toBe(39);
    expect(world.getItemCount('FINE_HERB')).toBe(0);
  });

  it('refuses past what can be held', async () => {
    const world = await open(freshDbName());
    await world.addLumi(1000);
    await world.addItem('MANA_HERB', 99);
    const lumi = world.getLumi();
    expect(await world.buyItem(offer('MANA_HERB'), 1)).toBe(false);
    expect(world.getLumi()).toBe(lumi);
  });

  it('sells a coin: one fewer, LUMI up by its price — and still so after a restart', async () => {
    const name = freshDbName();
    const world = await open(name);
    await world.claimPickup('ruins_pickup_001', 'OLD_COIN', 2);
    const before = world.getLumi();
    expect(await world.sellItem('OLD_COIN', 1)).toBe(15);
    expect(world.getItemCount('OLD_COIN')).toBe(1);
    expect(world.getLumi()).toBe(before + 15);
    const reopened = await open(name);
    expect(reopened.getItemCount('OLD_COIN')).toBe(1);
    expect(reopened.getLumi()).toBe(before + 15);
  });

  it('sells ore and a shard; never the ancient fragment; never below nought', async () => {
    const world = await open(freshDbName());
    await world.addItem('IRON_ORE', 1);
    await world.addItem('MANA_SHARD', 1);
    await world.addItem('ANCIENT_SHARD', 1);
    expect(await world.sellItem('IRON_ORE', 1)).toBe(10);
    expect(await world.sellItem('MANA_SHARD', 1)).toBe(30);
    const lumi = world.getLumi();
    expect(await world.sellItem('ANCIENT_SHARD', 1)).toBe(0);
    expect(world.getItemCount('ANCIENT_SHARD')).toBe(1);
    expect(world.getLumi()).toBe(lumi);
    // Nothing left to sell: refused, still nought held.
    expect(await world.sellItem('IRON_ORE', 1)).toBe(0);
    expect(world.getItemCount('IRON_ORE')).toBe(0);
  });
});
