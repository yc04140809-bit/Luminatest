import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import { BATTLE_HP_HOLDER } from '../party/condition';
import { BAKERY_OFFERS } from '../../content/economy/breads';
import { ALDEN_TOOL_SHOP_OFFERS } from '../../content/economy/aldenShop';
import { SAVE_VERSION } from './saveSchema';

/**
 * パン屋 MVP (2026-10-09), on the world's side: a loaf bought is in the
 * bag with its nights, LUMI goes down, a short purse buys nothing; eating
 * heals, lifts, spends one, and a second loaf's lift replaces the first; a
 * night's rest ages every loaf and ends the lift; a stale loaf cannot be
 * eaten; all of it survives a reload, and a save from before reads as none.
 */

let dbCounter = 0;
const freshDbName = () => `bread-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));
const offer = (itemId: string) => BAKERY_OFFERS.find((o) => o.itemId === itemId)!;
const hpOf = (world: World) => world.getCharacterCondition(BATTLE_HP_HOLDER).currentHp;
const maxHpOf = (world: World) => world.getCharacterCondition(BATTLE_HP_HOLDER).maxHp;

async function put(dbName: string, key: string, value: unknown) {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readwrite');
  tx.objectStore(WORLD_STATE_STORE).put({ key, value });
  await txDone(tx);
  db.close();
}

async function aPaidWorld(dbName: string, lumi = 200): Promise<World> {
  const world = await open(dbName);
  await world.addLumi(lumi);
  return world;
}

describe('buying bread from Lina', () => {
  it('a loaf in the bag, LUMI down by its price, and as many nights as it keeps', async () => {
    const world = await aPaidWorld(freshDbName());
    expect(await world.buyItem(offer('FRESH_BREAD'), 1)).toBe(true);
    expect(world.getLumi()).toBe(200 - 18);
    expect(world.getItemCount('FRESH_BREAD')).toBe(1);
    expect(world.getBreadFreshness()).toEqual({ FRESH_BREAD: [2] });
    expect(await world.buyItem(offer('TRAVELER_HARDTACK'), 1)).toBe(true);
    expect(world.getBreadFreshness().TRAVELER_HARDTACK).toEqual([4]);
  });

  it('a short purse buys nothing and writes nothing', async () => {
    const world = await aPaidWorld(freshDbName(), 10);
    expect(await world.buyItem(offer('FRESH_BREAD'), 1)).toBe(false);
    expect(world.getLumi()).toBe(10);
    expect(world.getItemCount('FRESH_BREAD')).toBe(0);
    expect(world.getBreadFreshness()).toEqual({});
  });

  it('survives a reload — the loaf, the purse and its nights', async () => {
    const db = freshDbName();
    const world = await aPaidWorld(db);
    await world.buyItem(offer('MANA_BREAD'), 1);
    await world.restBread();
    const again = await open(db);
    expect(again.getItemCount('MANA_BREAD')).toBe(1);
    expect(again.getLumi()).toBe(200 - 26);
    expect(again.getBreadFreshness()).toEqual({ MANA_BREAD: [1] });
  });

  it('the tool shop is as it was: a herb is a herb, with no nights', async () => {
    const world = await aPaidWorld(freshDbName());
    const herb = ALDEN_TOOL_SHOP_OFFERS.find((o) => o.itemId === 'FOREST_HERB')!;
    expect(await world.buyItem(herb, 2)).toBe(true);
    expect(world.getItemCount('FOREST_HERB')).toBe(2);
    expect(world.getBreadFreshness()).toEqual({});
  });
});

describe('eating a loaf', () => {
  it('heals the front rank, gives its lift, and spends one', async () => {
    const world = await aPaidWorld(freshDbName());
    await world.buyItem(offer('FRESH_BREAD'), 2);
    await world.setBattleCondition({ hp: maxHpOf(world) - 50, mp: world.getBattleCondition().mp });
    const before = hpOf(world);
    const ate = await world.eatBread('FRESH_BREAD');
    expect(ate.ok).toBe(true);
    expect(ate.given).toBe(20);
    expect(hpOf(world)).toBe(before + 20);
    expect(world.getItemCount('FRESH_BREAD')).toBe(1);
    expect(world.getBreadBuff()).toEqual({ itemId: 'FRESH_BREAD', buffType: 'DEFENSE', buffValue: 0.05 });
    expect(world.getBreadFreshness()).toEqual({ FRESH_BREAD: [2] });
  });

  it('is eaten for its lift even when whole — the health simply has nowhere to go', async () => {
    const world = await aPaidWorld(freshDbName());
    await world.buyItem(offer('TRAVELER_HARDTACK'), 1);
    const ate = await world.eatBread('TRAVELER_HARDTACK');
    expect(ate).toMatchObject({ ok: true, given: 0 });
    expect(hpOf(world)).toBe(maxHpOf(world));
    expect(world.getBreadBuff()?.buffType).toBe('MAX_HP');
  });

  it('one lift at a time: the second loaf replaces the first, never adds to it', async () => {
    const world = await aPaidWorld(freshDbName());
    await world.buyItem(offer('FRESH_BREAD'), 1);
    await world.buyItem(offer('MANA_BREAD'), 1);
    await world.eatBread('FRESH_BREAD');
    await world.eatBread('MANA_BREAD');
    expect(world.getBreadBuff()).toEqual({ itemId: 'MANA_BREAD', buffType: 'MAGIC', buffValue: 0.05 });
  });

  it('none in the bag is refused and touches nothing', async () => {
    const world = await aPaidWorld(freshDbName());
    const ate = await world.eatBread('FRESH_BREAD');
    expect(ate).toMatchObject({ ok: false, refusal: 'NONE_LEFT' });
    expect(world.getBreadBuff()).toBeNull();
  });

  it('is not used through the ordinary bag path — a loaf is eaten, with its age and its lift', async () => {
    const world = await aPaidWorld(freshDbName());
    await world.buyItem(offer('FRESH_BREAD'), 1);
    await world.setBattleCondition({ hp: maxHpOf(world) - 50, mp: world.getBattleCondition().mp });
    const used = await world.useItemFromBag('FRESH_BREAD');
    expect(used.ok).toBe(false);
    expect(world.getItemCount('FRESH_BREAD')).toBe(1);
  });

  it('the lift survives a reload', async () => {
    const db = freshDbName();
    const world = await aPaidWorld(db);
    await world.buyItem(offer('FOREST_NUT_BREAD'), 1);
    await world.eatBread('FOREST_NUT_BREAD');
    const again = await open(db);
    expect(again.getBreadBuff()).toEqual({ itemId: 'FOREST_NUT_BREAD', buffType: 'SPEED', buffValue: 0.05 });
    expect(again.getItemCount('FOREST_NUT_BREAD')).toBe(0);
  });
});

describe('a night’s rest', () => {
  it('ages every loaf by one and ends the lift', async () => {
    const world = await aPaidWorld(freshDbName());
    await world.buyItem(offer('FRESH_BREAD'), 2);
    await world.buyItem(offer('TRAVELER_HARDTACK'), 1);
    await world.eatBread('FRESH_BREAD');
    await world.restBread();
    expect(world.getBreadFreshness()).toEqual({ FRESH_BREAD: [1], TRAVELER_HARDTACK: [3] });
    expect(world.getBreadBuff()).toBeNull();
  });

  it('at nought a loaf is stale: kept in the bag, but it cannot be eaten', async () => {
    const db = freshDbName();
    const world = await aPaidWorld(db);
    await world.buyItem(offer('FRESH_BREAD'), 1);
    await world.restBread();
    await world.restBread();
    expect(world.getBreadFreshness()).toEqual({ FRESH_BREAD: [0] });
    expect(world.getItemCount('FRESH_BREAD')).toBe(1);
    const ate = await world.eatBread('FRESH_BREAD');
    expect(ate).toMatchObject({ ok: false, refusal: 'STALE' });
    expect(world.getItemCount('FRESH_BREAD')).toBe(1);
    // And stays stale after a reload, and after another rest.
    const again = await open(db);
    await again.restBread();
    expect(again.getBreadFreshness()).toEqual({ FRESH_BREAD: [0] });
  });

  it('with no bread and no lift writes nothing', async () => {
    const world = await aPaidWorld(freshDbName());
    await world.restBread();
    expect(world.getBreadFreshness()).toEqual({});
  });
});

describe('a save from before the bakery', () => {
  it('reads as no bread and no lift, under the same save version', async () => {
    const db = freshDbName();
    const world = await aPaidWorld(db);
    await world.addItem('FOREST_HERB', 1);
    const again = await open(db);
    expect(again.getBreadFreshness()).toEqual({});
    expect(again.getBreadBuff()).toBeNull();
    expect(again.getSaveHealth().version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(3);
  });

  it('a broken row is repaired, never thrown', async () => {
    const db = freshDbName();
    await (await open(db)).addItem('FRESH_BREAD', 1);
    await put(db, 'breadFreshness', 'nonsense');
    await put(db, 'breadBuff', { itemId: 'FRESH_BREAD', buffType: 'ATTACK', buffValue: 3 });
    const again = await open(db);
    // A loaf the row does not know of is as fresh as a new one.
    expect(again.getBreadFreshness()).toEqual({ FRESH_BREAD: [2] });
    expect(again.getBreadBuff()).toBeNull();
  });
});
