import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { INITIAL_EQUIPMENT } from '../../content/equipment/equipment';
import { DEFAULT_HERO_NAME } from './heroName';

/**
 * A PIECE OF MUSIC WON IS A FACT ABOUT ONE WORLD.
 *
 * It is written into that world's save, it comes back when the game is
 * closed and opened again, and it does not leak into any other world —
 * not a second save, and not the new world a reset makes.
 */

let dbCounter = 0;
const freshDbName = () => `battle-bgm-unlock-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));

describe('unlocking fighting music', () => {
  it('starts with the ordinary piece only', async () => {
    const world = await open(freshDbName());
    expect(world.getUnlockedBattleBgm()).toEqual(['NORMAL_BATTLE']);
  });

  it('survives closing the game and opening it again', async () => {
    const name = freshDbName();
    const world = await open(name);
    expect(await world.unlockBattleBgm('BOSS_BATTLE')).toBe(true);
    expect(world.getUnlockedBattleBgm()).toEqual(['NORMAL_BATTLE', 'BOSS_BATTLE']);
    const reopened = await open(name);
    expect(reopened.getUnlockedBattleBgm()).toEqual(['NORMAL_BATTLE', 'BOSS_BATTLE']);
  });

  it('writes nothing the second time, and refuses a piece that does not exist', async () => {
    const world = await open(freshDbName());
    await world.unlockBattleBgm('BOSS_BATTLE');
    const v = world.getVersion();
    expect(await world.unlockBattleBgm('BOSS_BATTLE')).toBe(false);
    expect(await world.unlockBattleBgm('NOT_A_PIECE')).toBe(false);
    expect(world.getVersion()).toBe(v);
  });

  it('does not reach another save', async () => {
    const mine = await open(freshDbName());
    await mine.unlockBattleBgm('BOSS_BATTLE');
    const theirs = await open(freshDbName());
    expect(theirs.getUnlockedBattleBgm()).toEqual(['NORMAL_BATTLE']);
  });

  it('is forgotten by a reset, at once and after a restart', async () => {
    const name = freshDbName();
    const world = await open(name);
    await world.unlockBattleBgm('BOSS_BATTLE');
    await world.resetWorld();
    expect(world.getUnlockedBattleBgm()).toEqual(['NORMAL_BATTLE']);
    expect((await open(name)).getUnlockedBattleBgm()).toEqual(['NORMAL_BATTLE']);
  });
});

describe('a reset forgets the rest of what the last world added, too', () => {
  it('the name and the equipment', async () => {
    const world = await open(freshDbName());
    await world.setHeroName('アレン');
    await world.grantEquipment('training_long_sword');
    await world.resetWorld();
    expect(world.getHeroName()).toBe(DEFAULT_HERO_NAME);
    expect(world.hasNamedHero()).toBe(false);
    expect(world.getOwnedEquipment()['training_long_sword'] ?? 0).toBe(0);
    for (const [who, slots] of Object.entries(INITIAL_EQUIPMENT)) {
      for (const [slot, id] of Object.entries(slots)) {
        expect(world.getEquipped(who, slot as never)).toBe(id);
      }
    }
  });
});
