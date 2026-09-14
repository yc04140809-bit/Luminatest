// WHAT A THING IS, AND WHAT HOLDING IT MEANS.
//
// Two shapes, and the split between them is the whole design: an
// ItemDef is a fact about the WORLD — what a herb is, what it is worth
// — and an ItemStack is a fact about the PLAYER — that they have four
// of them. The first is content and never saved; the second is save
// data and holds nothing but an id and a count.
//
// That is what lets the catalogue be rebalanced without rewriting
// anybody's bag: change a sell price and every save in existence is
// already correct, because no save has ever recorded a price.

/**
 * The four kinds of thing, and no more yet.
 *
 * KEY_ITEM is a category AND a flag on the definition, which looks
 * like a duplicate and is not: the category is what a bag SORTS by,
 * and `isKeyItem` is what the shop, the sell list and any future
 * discard REFUSE by. A material that must never be sold would be a
 * MATERIAL with the flag set, and a key item in a bag that has not
 * grown a KEY tab yet still cannot be sold.
 */
export type ItemCategory = 'CONSUMABLE' | 'MATERIAL' | 'KEY_ITEM' | 'OTHER';

export const ITEM_CATEGORIES: readonly ItemCategory[] = [
  'CONSUMABLE',
  'MATERIAL',
  'KEY_ITEM',
  'OTHER',
];

/** A thing that exists in the world. Content, never save data. */
export interface ItemDef {
  itemId: string;
  name: string;
  category: ItemCategory;
  /**
   * How many of it fit in one row of the bag.
   *
   * A cap rather than a rule about rows: the bag keeps ONE row per
   * item, so this is how many of the thing a player may hold at all.
   * Beyond it a pickup is refused and the caller is told how many it
   * could take, which is what lets a screen say 「持ちきれない」 rather
   * than silently swallowing a find.
   */
  maxStack: number;
  /** Two lines at most: this is read standing up, in a forest. */
  description: string;
  /**
   * What the shop pays for one, in LUMI.
   *
   * Nought means the shop will not take it — an honest answer for a
   * pretty acorn — and that is different from a key item, which the
   * shop will not take because it must not.
   */
  sellPrice: number;
  /** Story matter. Never sold, never dropped. */
  isKeyItem: boolean;
}

/** How many of one thing the player is holding. Save data. */
export interface ItemStack {
  itemId: string;
  quantity: number;
}

/**
 * The bag: one row per item, in the order they were first acquired.
 *
 * An ARRAY rather than a map, because the order is worth keeping — a
 * bag screen that reshuffled itself every time something was picked up
 * would be a bag nobody could learn — and because it serialises to
 * JSON as itself, with no keys to escape.
 */
export type Inventory = readonly ItemStack[];

export const EMPTY_INVENTORY: Inventory = [];

/** What a bag row may hold when nothing says otherwise. */
export const DEFAULT_MAX_STACK = 99;
