import { describe, it, expect } from 'vitest';
import { MemoryOnlyStore } from './memoryOnlyStore';
import { World } from '../world/world';
import { SAVE_VERSION } from '../world/saveSchema';
import type { MemoryEvent } from './types';

/**
 * PLAYING WITH NOWHERE TO KEEP IT.
 *
 * The decision this file tests is "playable without saving" rather
 * than "refuse to start". What has to be true for that to be safe is
 * that the fallback is the SAME game: not a reduced one, not one with
 * its own rules. So these are the world's own guarantees, asked again
 * of a store with a Map behind it.
 */

const event = (id: string): MemoryEvent => ({
  id,
  type: 'PLAYER_SPARED_GALD',
  worldYear: 1,
  worldDay: 1,
  location: 'GREENWOOD_FOREST',
  actors: ['PLAYER', 'GALD'],
  importance: 'MAJOR',
  createdAt: new Date().toISOString(),
});

describe('a world with nowhere to save', () => {
  it('opens, and opens clean', async () => {
    const world = await World.open(new MemoryOnlyStore());
    expect(world.getSaveHealth().health).toBe('ok');
    expect(world.getSaveHealth().version).toBe(SAVE_VERSION);
    expect(world.hasProgress()).toBe(false);
  });

  /**
   * Everything the last two rounds built runs on top of this without
   * knowing the difference — which is exactly what makes falling back
   * to it safe rather than a second, less-tested game.
   */
  it('earns, carries, grows and remembers, all session', async () => {
    const world = await World.open(new MemoryOnlyStore());
    await world.addLumi(90);
    await world.grantExp('hero', 60);
    const paid = await world.applyBattleReward('fight-1', {
      exp: 16,
      lumi: 9,
      items: [{ itemId: 'FOREST_HERB', quantity: 1 }],
    });
    expect(paid.lumi).toBe(9);
    expect(world.getLumi()).toBe(99);
    expect(world.getItemCount('FOREST_HERB')).toBe(1);
    expect(world.getLevel('hero')).toBeGreaterThan(1);
    expect(world.hasProgress(), 'and the title would offer it back').toBe(true);
  });

  it('refuses to pay for the same fight twice, exactly as a real save does', async () => {
    const world = await World.open(new MemoryOnlyStore());
    await world.applyBattleReward('fight-1', { exp: 16, lumi: 9, items: [] });
    const again = await world.applyBattleReward('fight-1', { exp: 16, lumi: 9, items: [] });
    expect(again.alreadyClaimed).toBe(true);
    expect(world.getLumi()).toBe(9);
  });

  it('keeps history write-once, because that is a rule about the game', async () => {
    const store = new MemoryOnlyStore();
    await store.init();
    await store.add(event('evt_one'));
    await expect(store.add(event('evt_one'))).rejects.toThrow();
    expect(await store.getAll()).toHaveLength(1);
  });

  it('leaves nothing behind when a commit is refused', async () => {
    const store = new MemoryOnlyStore();
    await store.init();
    await store.add(event('evt_one'));
    await expect(
      store.commit({
        addEvents: [event('evt_one')],
        putState: [{ key: 'lumi', value: 9999 }],
      }),
    ).rejects.toThrow();
    expect(await store.getStateValue('lumi'), 'the state row went with it').toBeUndefined();
  });

  /** A new store is a new session, which is the whole of what is lost. */
  it('is gone when the tab is', async () => {
    const first = await World.open(new MemoryOnlyStore());
    await first.addLumi(140);
    const second = await World.open(new MemoryOnlyStore());
    expect(second.getLumi()).toBe(0);
    expect(second.hasProgress()).toBe(false);
  });

  it('can be reset like any other world', async () => {
    const store = new MemoryOnlyStore();
    const world = await World.open(store);
    await world.addLumi(140);
    await world.resetWorld();
    expect(world.getLumi()).toBe(0);
    expect(await store.getAllState()).toEqual([]);
  });
});
