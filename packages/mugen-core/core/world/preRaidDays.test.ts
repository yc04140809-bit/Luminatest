import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { graveCraft } from '../../content/economy/graveCraft';

/**
 * 襲撃前の日々 (2026-10-11): the ordinary pickups that grow back after some
 * days, Grave's simple handwork at the tavern, and the charm it makes.
 */

let dbCounter = 0;
const freshDbName = () => `pre-raid-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));

describe('an ordinary pickup grows back', () => {
  it('taken today, gone; two days on, there again — and taken again, gone again', async () => {
    const world = await open(freshDbName());
    expect(await world.claimPickup('forest_pickup_001', 'FOREST_HERB', 1)).toBe(1);
    expect(world.isPickupTaken('forest_pickup_001')).toBe(true);
    expect(world.hasRegrownPickup()).toBe(false);
    await world.advanceDays(1);
    expect(world.isPickupTaken('forest_pickup_001')).toBe(true);
    await world.advanceDays(1);
    expect(world.isPickupTaken('forest_pickup_001')).toBe(false);
    expect(world.getTakenPickups()).not.toContain('forest_pickup_001');
    expect(world.hasRegrownPickup()).toBe(true);
    expect(await world.claimPickup('forest_pickup_001', 'FOREST_HERB', 1)).toBe(1);
    expect(world.getItemCount('FOREST_HERB')).toBe(2);
    expect(world.isPickupTaken('forest_pickup_001')).toBe(true);
    expect(await world.claimPickup('forest_pickup_001', 'FOREST_HERB', 1)).toBe(0);
  });

  it('kept across a restart: the day it was taken is remembered', async () => {
    const name = freshDbName();
    const world = await open(name);
    await world.advanceDays(3);
    await world.claimPickup('forest_pickup_002', 'FOREST_NUT', 2);
    await world.advanceDays(1);
    const reopened = await open(name);
    expect(reopened.isPickupTaken('forest_pickup_002')).toBe(true);
    await reopened.advanceDays(1);
    expect(reopened.isPickupTaken('forest_pickup_002')).toBe(false);
  });

  it('a rare or one-off pickup never grows back', async () => {
    const world = await open(freshDbName());
    await world.claimPickup('ruins_pickup_001', 'OLD_COIN', 2);
    await world.advanceDays(30);
    expect(world.isPickupTaken('ruins_pickup_001')).toBe(true);
    expect(await world.claimPickup('ruins_pickup_001', 'OLD_COIN', 2)).toBe(0);
  });

  it('a new world forgets the days', async () => {
    const world = await open(freshDbName());
    await world.claimPickup('forest_pickup_001', 'FOREST_HERB', 1);
    await world.resetWorld();
    expect(world.getTakenPickups()).toEqual([]);
    expect(world.hasRegrownPickup()).toBe(false);
  });
});

describe("Grave's handwork", () => {
  it('three herbs into one fine herb, in one go; short, nothing moves', async () => {
    const world = await open(freshDbName());
    const herbs = graveCraft('CRAFT_HERB_BUNDLE')!;
    await world.addItem('FOREST_HERB', 2);
    const v = world.getVersion();
    expect(await world.craftAtTavern(herbs)).toBe('SHORT');
    expect(world.getVersion()).toBe(v);
    expect(world.getItemCount('FOREST_HERB')).toBe(2);
    await world.addItem('FOREST_HERB', 4);
    expect(await world.craftAtTavern(herbs)).toBe('OK');
    expect(await world.craftAtTavern(herbs)).toBe('OK');
    expect(world.getItemCount('FOREST_HERB')).toBe(0);
    expect(world.getItemCount('FINE_HERB')).toBe(2);
  });

  it('two mana herbs into a flask of mana water', async () => {
    const world = await open(freshDbName());
    await world.addItem('MANA_HERB', 2);
    expect(await world.craftAtTavern(graveCraft('CRAFT_MANA_DROP')!)).toBe('OK');
    expect(world.getItemCount('MANA_HERB')).toBe(0);
    expect(world.getItemCount('MANA_WATER')).toBe(1);
  });

  it('with no room for what comes out, nothing moves', async () => {
    const world = await open(freshDbName());
    await world.addItem('FOREST_HERB', 3);
    await world.addItem('FINE_HERB', 99);
    expect(await world.craftAtTavern(graveCraft('CRAFT_HERB_BUNDLE')!)).toBe('FULL');
    expect(world.getItemCount('FOREST_HERB')).toBe(3);
    expect(world.getItemCount('FINE_HERB')).toBe(99);
  });

  it('the charm: made once, +1 on his swing while carried, kept across a restart', async () => {
    const name = freshDbName();
    const world = await open(name);
    const before = world.getPartyStats();
    await world.addItem('IRON_ORE', 6);
    const charm = graveCraft('CRAFT_IRON_CHARM')!;
    expect(await world.craftAtTavern(charm)).toBe('OK');
    expect(world.getItemCount('IRON_CHARM')).toBe(1);
    expect(world.getItemCount('IRON_ORE')).toBe(3);
    expect(await world.craftAtTavern(charm)).toBe('OWNED');
    expect(world.getItemCount('IRON_ORE')).toBe(3);
    const after = world.getPartyStats();
    expect(after.attackMin).toBe(before.attackMin + 1);
    expect(after.attackMax).toBe(before.attackMax + 1);
    expect(after.maxHp).toBe(before.maxHp);
    const reopened = await open(name);
    expect(reopened.getPartyStats().attackMin).toBe(before.attackMin + 1);
  });

  it('making something moves no incident point', async () => {
    const world = await open(freshDbName());
    const points = world.getIncidentPoint();
    await world.addItem('FOREST_HERB', 3);
    await world.craftAtTavern(graveCraft('CRAFT_HERB_BUNDLE')!);
    expect(world.getIncidentPoint()).toBe(points);
  });
});
