import { describe, expect, it } from 'vitest';
import {
  addItem,
  getItemCount,
  hasItem,
  readInventory,
  removeItem,
  roomFor,
} from './inventory';
import { EMPTY_INVENTORY, type Inventory, type ItemDef } from './items';

const HERB: ItemDef = {
  itemId: 'FOREST_HERB',
  name: '薬草',
  category: 'CONSUMABLE',
  maxStack: 99,
  description: '',
  sellPrice: 8,
  isKeyItem: false,
};
const ACORN: ItemDef = { ...HERB, itemId: 'ROUND_ACORN', name: 'まるいどんぐり', sellPrice: 0 };
/** Something with almost no room in it, for the edges of a stack. */
const RELIC: ItemDef = { ...HERB, itemId: 'RELIC', maxStack: 3, isKeyItem: true };

function bag(...rows: [string, number][]): Inventory {
  return rows.map(([itemId, quantity]) => ({ itemId, quantity }));
}

describe('picking things up', () => {
  it('is nothing at all until something is picked up', () => {
    expect(getItemCount(EMPTY_INVENTORY, 'FOREST_HERB')).toBe(0);
    expect(hasItem(EMPTY_INVENTORY, 'FOREST_HERB')).toBe(false);
  });

  /** The rule the brief asks for by name: the same thing STACKS. */
  it('adds to the count rather than making a second row', () => {
    let inv = addItem(EMPTY_INVENTORY, HERB, 1).inventory;
    inv = addItem(inv, HERB, 1).inventory;
    inv = addItem(inv, HERB, 3).inventory;
    expect(inv).toHaveLength(1);
    expect(getItemCount(inv, 'FOREST_HERB')).toBe(5);
  });

  it('keeps one row per thing, in the order they were first found', () => {
    let inv = addItem(EMPTY_INVENTORY, ACORN, 1).inventory;
    inv = addItem(inv, HERB, 2).inventory;
    inv = addItem(inv, ACORN, 1).inventory;
    expect(inv.map((row) => row.itemId)).toEqual(['ROUND_ACORN', 'FOREST_HERB']);
    expect(inv.map((row) => row.quantity)).toEqual([2, 2]);
  });

  /**
   * PARTIAL IS A REAL OUTCOME, and the number that comes back is what
   * lets a screen say 「持ちきれない」 rather than swallow a find.
   */
  it('takes what fits and says how much that was', () => {
    const full = bag(['RELIC', 2]);
    expect(roomFor(full, RELIC)).toBe(1);
    const change = addItem(full, RELIC, 5);
    expect(change.moved).toBe(1);
    expect(getItemCount(change.inventory, 'RELIC')).toBe(3);
  });

  it('changes nothing when the stack is already full', () => {
    const full = bag(['RELIC', 3]);
    const change = addItem(full, RELIC, 1);
    expect(change.moved).toBe(0);
    expect(change.inventory).toBe(full);
  });

  it('ignores an amount that is not a number of things', () => {
    for (const bad of [0, -3, Number.NaN, 0.4]) {
      expect(addItem(EMPTY_INVENTORY, HERB, bad).moved).toBe(0);
    }
  });

  it('falls back to a sane cap when a definition has a nonsense one', () => {
    const broken: ItemDef = { ...HERB, maxStack: 0 };
    expect(addItem(EMPTY_INVENTORY, broken, 5).moved).toBe(5);
  });
});

describe('putting things down', () => {
  it('takes the count down, and the row away when it empties', () => {
    const inv = bag(['FOREST_HERB', 3], ['ROUND_ACORN', 1]);
    const one = removeItem(inv, 'FOREST_HERB', 1);
    expect(one.moved).toBe(1);
    expect(getItemCount(one.inventory, 'FOREST_HERB')).toBe(2);

    const rest = removeItem(one.inventory, 'FOREST_HERB', 2);
    expect(rest.inventory.map((row) => row.itemId)).toEqual(['ROUND_ACORN']);
  });

  /**
   * ALL OR NOTHING. A shop asked for three and given two has sold at
   * the wrong price, so a short bag is a sale that did not happen.
   */
  it('refuses to take more than is there, and takes nothing instead', () => {
    const inv = bag(['FOREST_HERB', 2]);
    const change = removeItem(inv, 'FOREST_HERB', 3);
    expect(change.moved).toBe(0);
    expect(change.inventory).toBe(inv);
    expect(getItemCount(change.inventory, 'FOREST_HERB')).toBe(2);
  });

  it('says nothing happened for something that was never held', () => {
    expect(removeItem(EMPTY_INVENTORY, 'NO_SUCH_THING', 1).moved).toBe(0);
  });
});

describe('a bag out of a save', () => {
  it('is empty when the save has never heard of one', () => {
    expect(readInventory(undefined)).toEqual([]);
    expect(readInventory(null)).toEqual([]);
    expect(readInventory('acorn')).toEqual([]);
    expect(readInventory({ FOREST_HERB: 2 })).toEqual([]);
  });

  it('survives a save with rubbish in it, keeping what is real', () => {
    const raw = [
      { itemId: 'FOREST_HERB', quantity: 2 },
      null,
      'acorn',
      { itemId: '', quantity: 4 },
      { itemId: 'ROUND_ACORN', quantity: 0 },
      { itemId: 'OLD_ARROWHEAD', quantity: -2 },
      { itemId: 'BROKEN_CLASP', quantity: '3' },
    ];
    expect(readInventory(raw)).toEqual([
      { itemId: 'FOREST_HERB', quantity: 2 },
      { itemId: 'BROKEN_CLASP', quantity: 3 },
    ]);
  });

  it('adds two rows for one thing together rather than keeping both', () => {
    const raw = [
      { itemId: 'FOREST_HERB', quantity: 2 },
      { itemId: 'FOREST_HERB', quantity: 5 },
    ];
    expect(readInventory(raw)).toEqual([{ itemId: 'FOREST_HERB', quantity: 7 }]);
  });

  /**
   * A save holding something this build has dropped from the catalogue
   * is a player holding a thing. Forgetting it to tidy a table would be
   * taking their property.
   */
  it('keeps a thing the catalogue no longer describes', () => {
    expect(readInventory([{ itemId: 'A_THING_FROM_A_LATER_BUILD', quantity: 2 }])).toEqual([
      { itemId: 'A_THING_FROM_A_LATER_BUILD', quantity: 2 },
    ]);
  });
});
