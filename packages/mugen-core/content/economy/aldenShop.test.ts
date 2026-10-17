import { describe, expect, it } from 'vitest';
import { ALDEN_SHOP_OFFERS, aldenOfferFor } from './aldenShop';
import { itemDef } from './itemDefs';

describe('the board at Alden', () => {
  it('only offers things that exist', () => {
    for (const offer of ALDEN_SHOP_OFFERS) {
      expect(itemDef(offer.itemId), offer.itemId).not.toBeNull();
    }
  });

  it('names each thing once', () => {
    const ids = ALDEN_SHOP_OFFERS.map((o) => o.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The oldest shop rule there is, and the one a player works out
   * without being told. A keeper who sold for less than they paid would
   * be a money printer with a counter in front of it.
   */
  it('charges more than it pays', () => {
    for (const offer of ALDEN_SHOP_OFFERS) {
      const def = itemDef(offer.itemId)!;
      expect(offer.buyPrice, offer.itemId).toBeGreaterThan(def.sellPrice);
    }
  });

  it('will not stock something it would pay nothing for', () => {
    for (const offer of ALDEN_SHOP_OFFERS) {
      expect(itemDef(offer.itemId)!.sellPrice, offer.itemId).toBeGreaterThan(0);
    }
    expect(aldenOfferFor('ROUND_ACORN')).toBeNull();
  });

  it('says nothing about a thing it does not have', () => {
    expect(aldenOfferFor('NO_SUCH_THING')).toBeNull();
  });
});
