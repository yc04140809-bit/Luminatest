// What Greenwood has lying in it, and what lives in it.
//
// A LIST OF IDS NOW, not a second copy of the things themselves.
//
// It used to carry its own name and description for each find, with a
// comment saying none of them change a number "because there are no
// numbers yet". There are numbers now: the catalogue in
// content/economy/itemDefs says what a thing is, what it weighs on a
// shop counter and whether it may be sold, and the bag holds it after
// the card is closed. So the forest says WHICH things are on its floor
// and the catalogue says what they are — one fact in one place, and a
// rebalance that never has to be made twice.

import { itemDef } from '../economy/itemDefs';
import type { ItemDef } from '../../core/economy/items';

/**
 * What a find is, to the screen that draws it.
 *
 * The catalogue's own shape. Kept as a name of its own because the
 * find card reads a find rather than a catalogue row, and the day a
 * find is something the catalogue does not describe — a memory, a
 * line of dialogue — this is the name that widens.
 */
export type FoundItemDef = ItemDef;

/** The ids Greenwood has on its floor, in no particular order. */
export const FOREST_ITEM_IDS: readonly string[] = [
  'FOREST_HERB',
  'OLD_ARROWHEAD',
  'BROKEN_CLASP',
  'ROUND_ACORN',
];

/**
 * The four, as things.
 *
 * Built once from the catalogue, and it THROWS on an id the catalogue
 * does not know — at module load, where a typo is a build that does not
 * start rather than a forest that hands out undefined at some point
 * during a playtest.
 */
export const FOREST_ITEMS: readonly FoundItemDef[] = FOREST_ITEM_IDS.map((id) => {
  const def = itemDef(id);
  if (!def) throw new Error(`Greenwood drops '${id}', which is not in the item catalogue.`);
  return def;
});

/** One of them, at random. Injectable rng so a test can pin it. */
export function pickForestItem(rng: () => number = Math.random): FoundItemDef {
  return FOREST_ITEMS[Math.min(FOREST_ITEMS.length - 1, Math.floor(rng() * FOREST_ITEMS.length))];
}
