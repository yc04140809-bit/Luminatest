import { describe, expect, it } from 'vitest';
import { ITEM_DEFS, itemDef } from './itemDefs';
import { ITEM_CATEGORIES } from '../../core/economy/items';
import { FOREST_ITEM_IDS } from '../exploration/forestFinds';

/**
 * The catalogue is content, so what is checked here is that it is
 * WELL FORMED rather than what any particular price is: a price is a
 * decision somebody is allowed to change, and a duplicate id or a
 * forest that drops something nobody has written down is not.
 */
describe('the catalogue', () => {
  it('names every thing once', () => {
    const ids = ITEM_DEFS.map((def) => def.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every thing a name, a category and room to stack', () => {
    for (const def of ITEM_DEFS) {
      expect(def.name, def.itemId).not.toBe('');
      expect(def.description, def.itemId).not.toBe('');
      expect(ITEM_CATEGORIES, def.itemId).toContain(def.category);
      expect(def.maxStack, def.itemId).toBeGreaterThan(0);
      expect(def.sellPrice, def.itemId).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * The flag and the category have to agree, or a bag that sorts by
   * one and a shop that refuses by the other would disagree about the
   * same object.
   */
  it('keeps the KEY_ITEM category and the key-item flag in step', () => {
    for (const def of ITEM_DEFS) {
      if (def.category === 'KEY_ITEM') expect(def.isKeyItem, def.itemId).toBe(true);
      if (def.isKeyItem) expect(def.sellPrice, `${def.itemId} is never sold`).toBe(0);
    }
  });

  it('answers with null for something it has never heard of', () => {
    expect(itemDef('NO_SUCH_THING')).toBeNull();
  });

  /** The forest may only drop things that exist. */
  it('describes everything Greenwood has on its floor', () => {
    for (const id of FOREST_ITEM_IDS) {
      expect(itemDef(id), id).not.toBeNull();
    }
  });
});
