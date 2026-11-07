// WHAT A SHOP IS ASKING FOR IT — which is not what the thing is.
//
// THERE IS NO SHOP. No screen, no stock list, no counter in Alden.
// This file is one interface and the arithmetic that reads it, and it
// exists now for a single reason: to keep a PRICE off the catalogue.
//
// The distinction is the same one that keeps `quantity` off an ItemDef.
// What a herb IS — its name, its category, what it weighs on a counter
// when you hand it over — is a fact about the world, decided once in
// content/economy/itemDefs. What a herb COSTS is a fact about a
// particular shopkeeper on a particular day: a village with a bad
// harvest charges more, the second town charges differently, and a
// festival charges less. Writing that number into the catalogue would
// mean one price forever, everywhere, and a rebalance that rewrites
// the definition of a herb.
//
// So the shop brings the price with it. `World.buyItem` takes an OFFER
// rather than an id and a number, which is what makes the shop round a
// matter of writing offers rather than of changing the economy.
//
// WHAT IS DELIBERATELY NOT HERE: a shop's identity, its stock as
// SAVED state, restocking, haggling, reputation, a list of goods for
// any actual village. All of that is the shop round's, and none of it
// changes anything in this file.

import type { ItemDef } from './items';

/**
 * One line on a shopkeeper's board.
 *
 * `stock` and `sellPriceOverride` are optional because most offers do
 * not need them, and an absent one means the plain answer: unlimited,
 * and the catalogue's own price. They are declared now so that the day
 * a shopkeeper runs out of something, or pays over the odds for a
 * particular material, is a change to the OFFER rather than a change
 * to the purchase.
 */
export interface ShopOffer {
  itemId: string;
  /** What this shopkeeper charges for one, in LUMI. */
  buyPrice: number;
  /**
   * How many they have, when they keep count.
   *
   * A purchase REFUSES to take more than this; it does not take it
   * away. Counting down is the shop's own state and the shop round
   * owns it — a guard that cannot be wrong either way is worth having
   * now, and a half-kept stock number would not be.
   */
  stock?: number;
  /**
   * What this shopkeeper pays, when it is not the catalogue's price.
   *
   * For the collector who wants arrowheads. Absent is the ordinary
   * case and means `sellPrice` from the definition.
   */
  sellPriceOverride?: number;
}

/** Whole LUMI, and never negative. A price is not a fraction. */
function cleanPrice(value: number | undefined, fallback: number): number | null {
  if (value === undefined) return fallback;
  const whole = Math.floor(value);
  if (!Number.isFinite(whole) || whole < 0) return null;
  return whole;
}

/**
 * What this offer charges for one, or null if the offer is not one.
 *
 * Null rather than a guessed price: an offer with a nonsense number in
 * it is a content mistake, and charging something plausible for it
 * would hide the mistake behind a working shop.
 */
export function buyPriceOf(offer: ShopOffer): number | null {
  return cleanPrice(offer.buyPrice, Number.NaN) ?? null;
}

/**
 * What is paid for one of these when they are handed back.
 *
 * The offer may override the catalogue, and an offer is not required:
 * a player selling to somebody with nothing on their board still gets
 * what the thing is worth.
 *
 * NOUGHT IS A REAL ANSWER and it means the sale does not happen. A
 * shop that took a pretty acorn and paid nothing for it would be
 * taking it, so `World.sellItem` refuses at this price rather than
 * completing a sale worth nothing.
 */
export function sellPriceOf(def: ItemDef, offer?: ShopOffer): number {
  const price = cleanPrice(offer?.sellPriceOverride, def.sellPrice);
  return price === null ? 0 : price;
}

/**
 * Whether the shopkeeper has this many to sell.
 *
 * An offer that keeps no count has as many as you like — which is the
 * honest reading of a board that does not mention stock, and the one
 * every offer gives until somebody writes a shop that counts.
 */
export function inStock(offer: ShopOffer, quantity: number): boolean {
  if (offer.stock === undefined) return true;
  const held = Math.floor(offer.stock);
  return Number.isFinite(held) && held >= quantity;
}
