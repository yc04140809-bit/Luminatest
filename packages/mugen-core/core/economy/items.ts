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
  /**
   * What happens when it is used, or absent for a thing that is not
   * for using.
   *
   * A pretty acorn and an old arrowhead have no `use` and that is not
   * an oversight: most of what a player picks up is material, and a
   * bag where everything is a button is a bag with no decisions in it.
   */
  use?: ItemUse;
}

/**
 * WHAT USING SOMETHING DOES.
 *
 * A KIND and an AMOUNT rather than a loose `heal?: number`, because
 * the second kind has arrived and cost nothing to add: everything that
 * reads this switches on `kind`, so a third — something that cures,
 * something that wards, something that is only read — is a new case in
 * three places and no change anywhere else.
 *
 * `where` is the refusal the player is most likely to meet, so it is a
 * field rather than a rule buried in a screen: a thing usable only in
 * a fight says so, and a screen outside a fight can say WHY the button
 * is not there rather than simply not drawing it.
 */
export interface ItemUse {
  kind: ItemUseKind;
  /** How much, flat. Never a share of a maximum — see the item defs. */
  amount: number;
  where: ItemUseWhere;
  /** Said in the log as it is used, before what it did. */
  line: string;
}

/**
 * WHERE A THING CAN BE USED.
 *
 * The fourth answer — a thing that cannot be used at all — is not in
 * here on purpose: it is the ABSENCE of a `use`. An acorn with
 * `where: 'NOWHERE'` would be a thing that claims to do something and
 * then refuses, and every screen would have to know the difference
 * between "no use" and "a use that never applies". One of those is a
 * fact about the item; the other is a rule dressed up as one.
 */
export type ItemUseWhere = 'BATTLE_ONLY' | 'FIELD_ONLY' | 'BOTH';

/** Whether this use applies where the player currently is. */
export function usableIn(where: ItemUseWhere, place: 'BATTLE' | 'FIELD'): boolean {
  if (where === 'BOTH') return true;
  return place === 'BATTLE' ? where === 'BATTLE_ONLY' : where === 'FIELD_ONLY';
}

export type ItemUseKind = 'HEAL' | 'RESTORE_MP';

/** What the thing this use puts back is called, on a screen. */
export function useStatLabel(kind: ItemUseKind): string {
  return kind === 'HEAL' ? 'HP' : 'MP';
}

/**
 * What a category is called in front of a player.
 *
 * ONE PLACE, because a bag that calls something 消耗品 and a shop that
 * calls the same thing 消費アイテム is a game that looks like it was
 * written by two people who never met.
 */
export function categoryLabel(category: ItemCategory): string {
  switch (category) {
    case 'CONSUMABLE':
      return '消耗品';
    case 'MATERIAL':
      return '素材';
    case 'KEY_ITEM':
      return '大切なもの';
    case 'OTHER':
      return 'その他';
  }
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
