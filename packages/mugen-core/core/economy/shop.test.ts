import { describe, expect, it } from 'vitest';
import { buyPriceOf, inStock, sellPriceOf, type ShopOffer } from './shop';
import type { ItemDef } from './items';

/**
 * THERE IS NO SHOP. What is checked here is the seam a shop will be
 * built on: that a price travels with the OFFER rather than with the
 * thing, and that the refusals a purchase depends on are real.
 */

const HERB: ItemDef = {
  itemId: 'FOREST_HERB',
  name: '薬草',
  category: 'CONSUMABLE',
  maxStack: 99,
  description: '',
  sellPrice: 8,
  isKeyItem: false,
};
/** Story matter. The one thing no price may buy. */
const RELIC: ItemDef = { ...HERB, itemId: 'RELIC', category: 'KEY_ITEM', sellPrice: 0, isKeyItem: true };

const offer = (rest: Partial<ShopOffer> = {}): ShopOffer => ({
  itemId: 'FOREST_HERB',
  buyPrice: 10,
  ...rest,
});

describe('what a shopkeeper charges', () => {
  it('is the offer’s number, whole', () => {
    expect(buyPriceOf(offer())).toBe(10);
    expect(buyPriceOf(offer({ buyPrice: 12.7 }))).toBe(12);
    expect(buyPriceOf(offer({ buyPrice: 0 })), 'a gift is a price').toBe(0);
  });

  /**
   * Null rather than a guessed price: an offer with rubbish in it is a
   * content mistake, and charging something plausible for it would
   * hide the mistake behind a working shop.
   */
  it('is nothing at all when the offer is not an offer', () => {
    expect(buyPriceOf(offer({ buyPrice: -5 }))).toBeNull();
    expect(buyPriceOf(offer({ buyPrice: Number.NaN }))).toBeNull();
  });
});

describe('what a shopkeeper pays', () => {
  it('is the catalogue’s price when the board says nothing', () => {
    expect(sellPriceOf(HERB)).toBe(8);
    expect(sellPriceOf(HERB, offer())).toBe(8);
  });

  /** The collector who wants arrowheads. */
  it('is the override when there is one', () => {
    expect(sellPriceOf(HERB, offer({ sellPriceOverride: 40 }))).toBe(40);
    expect(sellPriceOf(HERB, offer({ sellPriceOverride: 0 }))).toBe(0);
  });

  it('falls back rather than inventing a price for a broken override', () => {
    expect(sellPriceOf(HERB, offer({ sellPriceOverride: -3 }))).toBe(0);
    expect(sellPriceOf(HERB, offer({ sellPriceOverride: Number.NaN }))).toBe(0);
  });

  /**
   * A KEY ITEM IS NEVER SOLD, and its price is not what stops it —
   * `World.sellItem` refuses on the flag before it ever asks what the
   * thing is worth. This is the other half of that: even offered
   * money for one, the answer a shop would pay is nought.
   */
  it('is nothing for story matter, whatever is offered', () => {
    expect(RELIC.isKeyItem).toBe(true);
    expect(sellPriceOf(RELIC)).toBe(0);
  });
});

describe('how many the shopkeeper has', () => {
  it('is as many as you like when they keep no count', () => {
    expect(inStock(offer(), 1)).toBe(true);
    expect(inStock(offer(), 9999)).toBe(true);
  });

  it('is what they say it is when they do', () => {
    expect(inStock(offer({ stock: 2 }), 2)).toBe(true);
    expect(inStock(offer({ stock: 2 }), 3)).toBe(false);
    expect(inStock(offer({ stock: 0 }), 1)).toBe(false);
  });

  it('is none of them when the count is not a count', () => {
    expect(inStock(offer({ stock: Number.NaN }), 1)).toBe(false);
  });
});
