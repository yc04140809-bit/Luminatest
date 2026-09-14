import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import { itemDef } from '../../content/economy/itemDefs';

/**
 * THE BAG AND THE PURSE, on the world's side: what is written, what is
 * refused, what survives a reload, and what a reset takes with it.
 *
 * The arithmetic is `core/economy`'s and is tested there. What is
 * checked here is that the world SAVES it — because the whole point of
 * the round is that a hundred acorns stop coming to nothing.
 */

let dbCounter = 0;
function freshDbName(): string {
  return `economy-test-${++dbCounter}`;
}

async function openWorld(dbName: string): Promise<World> {
  return World.open(new IdbMemoryStore(dbName));
}

/** Writes a row straight into the save, as an older build would have. */
async function putRaw(dbName: string, key: string, value: unknown): Promise<void> {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readwrite');
  tx.objectStore(WORLD_STATE_STORE).put({ key, value });
  await txDone(tx);
  db.close();
}

const ACORN = 'ROUND_ACORN';
const HERB = 'FOREST_HERB';

describe('a world nobody has played', () => {
  it('is carrying nothing and has never been paid', async () => {
    const world = await openWorld(freshDbName());
    expect(world.getInventory()).toEqual([]);
    expect(world.getItemCount(ACORN)).toBe(0);
    expect(world.hasItem(ACORN)).toBe(false);
    expect(world.getLumi()).toBe(0);
    expect(world.canAfford(1)).toBe(false);
    expect(world.canAfford(0)).toBe(true);
  });
});

describe('what the forest hands over', () => {
  it('is held, and held again as one row with a bigger number', async () => {
    const world = await openWorld(freshDbName());
    expect(await world.addItem(ACORN, 1)).toBe(1);
    expect(await world.addItem(ACORN, 1)).toBe(1);
    expect(world.getItemCount(ACORN)).toBe(2);
    expect(world.getInventory()).toHaveLength(1);
  });

  /** The round's whole point, said as a test. */
  it('is still there after the game is closed and opened again', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.addItem(ACORN, 3);
    await world.addItem(HERB, 1);
    await world.addLumi(120);

    const reopened = await openWorld(dbName);
    expect(reopened.getItemCount(ACORN)).toBe(3);
    expect(reopened.getItemCount(HERB)).toBe(1);
    expect(reopened.getLumi()).toBe(120);
  });

  it('is refused, silently and without saving, for a thing that does not exist', async () => {
    const world = await openWorld(freshDbName());
    const before = world.getVersion();
    expect(await world.addItem('NO_SUCH_THING', 1)).toBe(0);
    expect(world.getInventory()).toEqual([]);
    expect(world.getVersion(), 'nothing changed, so nothing was announced').toBe(before);
  });

  it('comes back out again, and the row goes when it empties', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.addItem(HERB, 2);
    expect(await world.removeItem(HERB, 2)).toBe(2);
    expect(world.getInventory()).toEqual([]);
    expect((await openWorld(dbName)).getInventory()).toEqual([]);
  });

  it('refuses to hand over more than is held, and hands over none', async () => {
    const world = await openWorld(freshDbName());
    await world.addItem(HERB, 1);
    expect(await world.removeItem(HERB, 2)).toBe(0);
    expect(world.getItemCount(HERB)).toBe(1);
  });
});

describe('the purse', () => {
  it('is paid, and remembers being paid', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    expect(await world.addLumi(40)).toBe(40);
    expect(await world.addLumi(2)).toBe(42);
    expect((await openWorld(dbName)).getLumi()).toBe(42);
  });

  it('spends what it has and refuses what it has not', async () => {
    const world = await openWorld(freshDbName());
    await world.addLumi(30);
    expect(await world.spendLumi(31)).toBe(false);
    expect(world.getLumi(), 'a refused payment costs nothing').toBe(30);
    expect(await world.spendLumi(30)).toBe(true);
    expect(world.getLumi()).toBe(0);
  });
});

/**
 * NO SHOP EXISTS. These two are here because a purchase changes TWO
 * saved rows, and a shop built on `spendLumi` then `addItem` could be
 * interrupted between them — money gone, nothing bought.
 */
describe('the two moves a shop will make', () => {
  it('takes the money and hands over the goods, together', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.addLumi(100);
    expect(await world.buyItem(HERB, 3, 10)).toBe(true);
    expect(world.getLumi()).toBe(70);
    expect(world.getItemCount(HERB)).toBe(3);

    const reopened = await openWorld(dbName);
    expect(reopened.getLumi()).toBe(70);
    expect(reopened.getItemCount(HERB)).toBe(3);
  });

  it('sells nothing and takes nothing when the purse is short', async () => {
    const world = await openWorld(freshDbName());
    await world.addLumi(20);
    expect(await world.buyItem(HERB, 3, 10)).toBe(false);
    expect(world.getLumi(), 'not a single LUMI moved').toBe(20);
    expect(world.getItemCount(HERB)).toBe(0);
  });

  it('refuses an order the bag has no room for, rather than part of it', async () => {
    const world = await openWorld(freshDbName());
    await world.addLumi(10_000);
    const cap = itemDef(HERB)!.maxStack;
    expect(await world.buyItem(HERB, cap, 1)).toBe(true);
    expect(await world.buyItem(HERB, 1, 1)).toBe(false);
    expect(world.getItemCount(HERB)).toBe(cap);
  });

  it('pays the catalogue price for what is handed back', async () => {
    const world = await openWorld(freshDbName());
    await world.addItem(HERB, 2);
    const price = itemDef(HERB)!.sellPrice;
    expect(await world.sellItem(HERB, 2)).toBe(price * 2);
    expect(world.getLumi()).toBe(price * 2);
    expect(world.getItemCount(HERB)).toBe(0);
  });

  /**
   * A shop that took a pretty acorn and paid nothing for it would be
   * taking it. Nought is an honest price and it is not a sale.
   */
  it('will not take something it would pay nothing for', async () => {
    const world = await openWorld(freshDbName());
    await world.addItem(ACORN, 1);
    expect(itemDef(ACORN)!.sellPrice).toBe(0);
    expect(await world.sellItem(ACORN, 1)).toBe(0);
    expect(world.getItemCount(ACORN), 'and the acorn is still in the bag').toBe(1);
  });

  it('will not sell more than is held', async () => {
    const world = await openWorld(freshDbName());
    await world.addItem(HERB, 1);
    expect(await world.sellItem(HERB, 2)).toBe(0);
    expect(world.getItemCount(HERB)).toBe(1);
  });
});

describe('a save written before any of this existed', () => {
  it('opens as an empty bag and an empty purse rather than a broken world', async () => {
    const dbName = freshDbName();
    // A world with history in it, and no economy rows at all.
    const first = await openWorld(dbName);
    await first.markExperienceSeen('anything');

    const reopened = await openWorld(dbName);
    expect(reopened.getInventory()).toEqual([]);
    expect(reopened.getLumi()).toBe(0);
    // And it can be written to from there.
    expect(await reopened.addItem(ACORN, 1)).toBe(1);
  });

  it('repairs a save whose rows are the wrong shape, keeping what is real', async () => {
    const dbName = freshDbName();
    await openWorld(dbName);
    await putRaw(dbName, 'inventory', [
      { itemId: HERB, quantity: 2 },
      { itemId: HERB, quantity: 3 },
      { itemId: '', quantity: 9 },
      'rubbish',
    ]);
    await putRaw(dbName, 'lumi', -50);

    const world = await openWorld(dbName);
    expect(world.getItemCount(HERB)).toBe(5);
    expect(world.getInventory()).toHaveLength(1);
    expect(world.getLumi()).toBe(0);
  });
});

describe('RESET WORLD', () => {
  it('empties the bag and the purse with everything else', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.addItem(ACORN, 4);
    await world.addLumi(500);

    await world.resetWorld();
    expect(world.getInventory()).toEqual([]);
    expect(world.getLumi()).toBe(0);
    expect((await openWorld(dbName)).getInventory()).toEqual([]);
    expect((await openWorld(dbName)).getLumi()).toBe(0);
  });
});
