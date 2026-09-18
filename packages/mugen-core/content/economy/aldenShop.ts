// THE DOOR AT ALDEN — one shopkeeper, four things, no personality yet.
//
// Content, and the smallest amount of it that makes the loop real: walk
// into the forest, come back with a herb and some LUMI, and have
// somewhere to put both. What is deliberately NOT here is everything
// that makes a shop interesting — haggling, standing, a keeper with an
// opinion, stock that runs out and comes back, a price that moves with
// the harvest. Those belong to the WORLD LIFE round, and every one of
// them is a change to this file plus a field that already exists on
// ShopOffer rather than a change to the economy.
//
// THE PRICES ARE THE SHOP'S, NOT THE THINGS'. `buyPrice` lives on the
// offer, so the day there is a second village it charges its own
// numbers without anybody editing the catalogue. What the shop PAYS
// falls through to each item's own `sellPrice`, because what a thing is
// worth when you hand it over is a fact about the thing.

import type { ShopOffer } from '../../core/economy/shop';

/**
 * What Alden's keeper has on the board.
 *
 * No `stock`: this one does not count, which is the honest reading of a
 * village shop in a game with no restocking. The field exists on the
 * offer for the day one of them does.
 *
 * A MARK-UP RATHER THAN A PRICE LIST PULLED FROM NOWHERE. Each of these
 * is about double what the same keeper pays for it, which is the oldest
 * shop rule there is and the one a player works out without being told.
 * The acorn is not on the board at all: the shop will not buy one (it
 * is worth nought) and it would be strange to sell one.
 */
export const ALDEN_SHOP_OFFERS: readonly ShopOffer[] = [
  { itemId: 'FOREST_HERB', buyPrice: 16 },
  // Dearer than a herb, because MP is the scarcer of the two: health
  // comes back in full at the start of every fight and magic does not
  // come back at all except by spending a turn on it.
  { itemId: 'MANA_WATER', buyPrice: 24 },
  { itemId: 'OLD_ARROWHEAD', buyPrice: 24 },
  { itemId: 'BROKEN_CLASP', buyPrice: 10 },
];

/** 道具屋, as the sign over the door says it. */
export const ALDEN_SHOP_NAME = 'アルデン道具屋';

/** What this shop charges for one, or nothing if it does not stock it. */
export function aldenOfferFor(itemId: string): ShopOffer | null {
  return ALDEN_SHOP_OFFERS.find((offer) => offer.itemId === itemId) ?? null;
}
