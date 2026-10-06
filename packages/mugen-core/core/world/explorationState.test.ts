import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { readRareFinds, readVisits } from './explorationState';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { SAVE_VERSION } from './saveSchema';

/**
 * WHAT EXPLORING KEEPS: whether a place's once-in-a-world find is taken,
 * and how many real visits each place has had. An old save has neither
 * row and must read as "nothing taken, never been" — with no schema
 * version moved and no migration written.
 */

let n = 0;
const fresh = () => `exploration-state-test-${++n}`;
const open = (name: string) => World.open(new IdbMemoryStore(name));
const SWORD = 'weapon/star_crest_relic_sword';

describe('the rows out of a save', () => {
  it('absent reads as nothing taken and no visits, and is healthy', () => {
    expect(readRareFinds(undefined)).toEqual({ value: {}, health: 'ok' });
    expect(readVisits(undefined)).toEqual({ value: {}, health: 'ok' });
  });

  it('never fails, whatever a save holds', () => {
    for (const junk of [null, 42, 'x', [], true]) {
      expect(readRareFinds(junk)).toEqual({ value: {}, health: 'repaired' });
      expect(readVisits(junk)).toEqual({ value: {}, health: 'repaired' });
    }
  });

  it('only a plain true is taken; counts are whole and never negative', () => {
    expect(readRareFinds({ ANCIENT_RUINS: true })).toEqual({ value: { ANCIENT_RUINS: true }, health: 'ok' });
    expect(readRareFinds({ ANCIENT_RUINS: 'yes', SWAMP: false })).toEqual({ value: {}, health: 'repaired' });
    expect(readVisits({ ANCIENT_RUINS: 3 })).toEqual({ value: { ANCIENT_RUINS: 3 }, health: 'ok' });
    expect(readVisits({ ANCIENT_RUINS: 2.7, SWAMP: -1, BEACH: 'x' })).toEqual({ value: { ANCIENT_RUINS: 2 }, health: 'repaired' });
  });

  it('the save version did not move for them', () => {
    expect(SAVE_VERSION).toBe(3);
  });
});

describe('a world that walks the ruins', () => {
  it('starts having been nowhere and taken nothing', async () => {
    const world = await open(fresh());
    expect(world.getExplorationVisits('ANCIENT_RUINS')).toBe(0);
    expect(world.hasRareFind('ANCIENT_RUINS')).toBe(false);
  });

  it('counts real visits, and they survive closing the game', async () => {
    const name = fresh();
    const world = await open(name);
    expect(await world.recordExplorationVisit('ANCIENT_RUINS')).toBe(1);
    expect(await world.recordExplorationVisit('ANCIENT_RUINS')).toBe(2);
    expect((await open(name)).getExplorationVisits('ANCIENT_RUINS')).toBe(2);
    expect((await open(name)).getExplorationVisits('SWAMP')).toBe(0);
  });

  it('takes the find once — marked taken and the sword held, in one go — and never twice', async () => {
    const name = fresh();
    const world = await open(name);
    expect(await world.claimRareFind('ANCIENT_RUINS', SWORD)).toBe(true);
    expect(world.hasRareFind('ANCIENT_RUINS')).toBe(true);
    expect(world.getOwnedEquipment()[SWORD]).toBe(1);
    expect(await world.claimRareFind('ANCIENT_RUINS', SWORD)).toBe(false);
    expect(world.getOwnedEquipment()[SWORD]).toBe(1);
    // After a restart: still taken, still held, and he can put it on.
    const again = await open(name);
    expect(again.hasRareFind('ANCIENT_RUINS')).toBe(true);
    expect(again.getOwnedEquipment()[SWORD]).toBe(1);
    expect(await again.claimRareFind('ANCIENT_RUINS', SWORD)).toBe(false);
    expect(await again.setEquipped('hero', 'WEAPON', SWORD)).toBe(true);
    expect((await open(name)).getEquipped('hero', 'WEAPON')).toBe(SWORD);
    // The starting sword is still owned beside it.
    expect(again.getOwnedEquipment()['weapon/worn_long_sword']).toBe(1);
  });

  it('refuses something that is not equipment, writing nothing', async () => {
    const world = await open(fresh());
    expect(await world.claimRareFind('ANCIENT_RUINS', 'weapon/nonexistent')).toBe(false);
    expect(world.hasRareFind('ANCIENT_RUINS')).toBe(false);
  });

  it('a new world forgets both', async () => {
    const name = fresh();
    const world = await open(name);
    await world.recordExplorationVisit('ANCIENT_RUINS');
    await world.claimRareFind('ANCIENT_RUINS', SWORD);
    await world.resetWorld();
    expect(world.hasRareFind('ANCIENT_RUINS')).toBe(false);
    expect(world.getExplorationVisits('ANCIENT_RUINS')).toBe(0);
    const again = await open(name);
    expect(again.hasRareFind('ANCIENT_RUINS')).toBe(false);
    expect(again.getOwnedEquipment()[SWORD]).toBeUndefined();
  });

  it('writes nothing to WORLD MEMORY', async () => {
    const world = await open(fresh());
    const before = world.getEvents().length;
    await world.recordExplorationVisit('ANCIENT_RUINS');
    await world.claimRareFind('ANCIENT_RUINS', SWORD);
    expect(world.getEvents().length).toBe(before);
  });
});
