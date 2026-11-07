// THE BAKERY'S BREAD — four loaves Lina sells (パン屋 MVP, 2026-10-09).
//
// Ordinary items in the one catalogue (itemDefs.ts spreads these in), of
// the FOOD kind: each heals a little when eaten on the road and gives one
// small lift until the next night's rest, and each keeps for a number of
// nights' rest before it goes stale (core/economy/bread.ts).
//
// SMALL ON PURPOSE. A herb (16 LUMI) heals 30; a loaf heals less and costs
// a little more, and what it adds is a twentieth to one thing until the
// party sleeps. Nothing here should ever be the answer to a fight — it is
// what a player packs, not what they need.
//
// Eaten outside a fight only (the field's 「食べる」), and never by AUTO:
// it is the player's own choice of what to carry.
//
// `recipeId` names what each is baked from, for the recipes to come; none
// of them is a recipe yet, and nothing is crafted.

import { type ItemDef } from '../../core/economy/items';
import type { ShopOffer } from '../../core/economy/shop';

/** How many of one loaf a bag holds — a basket's worth, not a cellar's. */
export const BREAD_MAX_STACK = 9;

export const BREAD_DEFS: readonly ItemDef[] = [
  {
    itemId: 'FRESH_BREAD',
    name: '焼きたてパン',
    category: 'FOOD',
    maxStack: BREAD_MAX_STACK,
    description: 'リナの店の焼きたて。食べるとHPが少し回復し、次の休息まで少し守りが固くなる。',
    sellPrice: 0,
    isKeyItem: false,
    use: { kind: 'HEAL', amount: 20, where: 'FIELD_ONLY', line: '焼きたてパンを食べた。まだほんのり温かい。' },
    bread: { buffType: 'DEFENSE', buffValue: 0.05, freshness: 2, recipeId: 'BASIC_LOAF' },
    sources: ['SHOP'],
  },
  {
    itemId: 'FOREST_NUT_BREAD',
    name: '森の木の実パン',
    category: 'FOOD',
    maxStack: BREAD_MAX_STACK,
    description: '森の木の実を練り込んだパン。食べるとHPが少し回復し、次の休息まで少し身軽になる。',
    sellPrice: 0,
    isKeyItem: false,
    use: { kind: 'HEAL', amount: 20, where: 'FIELD_ONLY', line: '森の木の実パンを食べた。香ばしい。' },
    bread: {
      buffType: 'SPEED',
      buffValue: 0.05,
      freshness: 2,
      recipeId: 'NUT_LOAF',
      // The forest's own nut (itemDefs FOREST_NUT): what a recipe will ask for.
      ingredients: ['FOREST_NUT'],
    },
    sources: ['SHOP'],
  },
  {
    itemId: 'MANA_BREAD',
    name: '魔力パン',
    category: 'FOOD',
    maxStack: BREAD_MAX_STACK,
    description: 'ほのかに光る生地のパン。食べるとHPが少し回復し、次の休息まで魔力が少し増える。',
    sellPrice: 0,
    isKeyItem: false,
    use: { kind: 'HEAL', amount: 15, where: 'FIELD_ONLY', line: '魔力パンを食べた。舌の先が少しぴりっとする。' },
    bread: { buffType: 'MAGIC', buffValue: 0.05, freshness: 2, recipeId: 'MANA_LOAF' },
    sources: ['SHOP'],
  },
  {
    itemId: 'TRAVELER_HARDTACK',
    name: '旅人の硬焼きパン',
    category: 'FOOD',
    maxStack: BREAD_MAX_STACK,
    description: '固く焼き締めた旅のパン。日持ちする。食べるとHPが少し回復し、次の休息まで最大HPが少し増える。',
    sellPrice: 0,
    isKeyItem: false,
    use: { kind: 'HEAL', amount: 20, where: 'FIELD_ONLY', line: '旅人の硬焼きパンをかじった。……固い。' },
    bread: { buffType: 'MAX_HP', buffValue: 0.05, freshness: 4, recipeId: 'HARD_LOAF' },
    sources: ['SHOP'],
  },
];

/** What Lina sells, and for how much. */
export const BAKERY_OFFERS: readonly ShopOffer[] = [
  { itemId: 'FRESH_BREAD', buyPrice: 18 },
  { itemId: 'FOREST_NUT_BREAD', buyPrice: 22 },
  { itemId: 'MANA_BREAD', buyPrice: 26 },
  { itemId: 'TRAVELER_HARDTACK', buyPrice: 24 },
];
