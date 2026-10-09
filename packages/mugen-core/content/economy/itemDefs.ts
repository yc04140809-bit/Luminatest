// THE CATALOGUE — every thing that exists, in one list.
//
// Content, not code: what a herb is worth is a decision about the game
// and it is made here, where it can be read and argued with, rather
// than in whatever screen happens to hand one over.
//
// IT IS DELIBERATELY FOUR THINGS LONG. The economy round is the data
// underneath a shop, not the shop, and a hundred rows of goods written
// before anything can be bought with them is a hundred rows written
// blind. What is here is what the forest already drops, given the
// fields a bag and a shop need — so the things the player has been
// picking up for weeks become things they OWN, and nothing is invented
// to fill a table.
//
// Adding another is one entry and nothing else: the bag, the save, the
// migration and the shop all read this list.

import { DEFAULT_MAX_STACK, type ItemDef } from '../../core/economy/items';
import { BREAD_DEFS } from './breads';

export const ITEM_DEFS: readonly ItemDef[] = [
  {
    itemId: 'FOREST_HERB',
    name: '薬草',
    category: 'CONSUMABLE',
    maxStack: DEFAULT_MAX_STACK,
    description: '森に生える香りの強い薬草。小さな傷なら役に立ちそうだ。',
    // The one thing here a shop would actually want, because it is the
    // one thing that does something.
    sellPrice: 8,
    isKeyItem: false,
    /**
     * THIRTY, AND IN A FIGHT ONLY.
     *
     * Thirty is a bit under a third of a level-one health bar, which
     * is four or five of a moss rabbit's blows — enough to matter and
     * nowhere near enough to be the answer to every fight, especially
     * since using it IS the turn. It is a flat number rather than a
     * share of the maximum so that it gets relatively weaker as the
     * party levels: the first herb a player buys should not still be
     * the best answer at level twenty.
     *
     * BOTH, now that there is a wound outside a fight to close. It was
     * BATTLE_ONLY, and that was the truth at the time rather than a
     * restriction: health was restored in full at the start of every
     * fight, so a herb taken on the road would have healed nothing and
     * been gone. What changed is the game, not the herb — the party
     * carries what a fight cost them out of it now.
     */
    use: {
      kind: 'HEAL',
      amount: 30,
      where: 'BOTH',
      line: '薬草を使った。青い匂いが立つ。',
    },
    sources: ['SHOP', 'FOREST', 'RUINS'],
  },
  /**
   * 魔力水 — the second thing a turn can be spent on.
   *
   * ONE HERB IS NOT A CHOICE. With a single consumable the アイテム
   * command is "press when hurt", which is a reflex rather than a
   * decision; the tray only becomes interesting when two things in it
   * are both worth having and only one of them is this turn.
   *
   * SIXTEEN, which is exactly one 《コメットストライク》 and exactly
   * twice what 身構える gathers. That relationship is the whole of the
   * balance: bracing costs a turn and gives eight, so a flask costs a
   * turn and gives sixteen — better, because it also cost LUMI and is
   * finite, and not SO much better that bracing stops being the answer
   * in a fight where nobody bought anything.
   *
   * Dearer than a herb to buy and worth more to sell, because MP is
   * the scarcer of the two: health comes back in full at the start of
   * every fight, and magic does not come back at all except by
   * spending a turn on it.
   */
  {
    itemId: 'MANA_WATER',
    name: '魔力水',
    category: 'CONSUMABLE',
    maxStack: DEFAULT_MAX_STACK,
    description: '澄んだ水に星の匂いがする。飲むと頭の奥が冷たくなる。',
    sellPrice: 12,
    isKeyItem: false,
    use: {
      kind: 'RESTORE_MP',
      amount: 16,
      where: 'BOTH',
      line: '魔力水を飲んだ。頭の奥が冷たくなる。',
    },
    sources: ['SHOP'],
  },
  {
    itemId: 'OLD_ARROWHEAD',
    name: '古い矢じり',
    category: 'MATERIAL',
    maxStack: DEFAULT_MAX_STACK,
    description: '地面から半分だけ出ていた。誰かがここで狩りをしていた。',
    sellPrice: 12,
    isKeyItem: false,
  },
  {
    itemId: 'BROKEN_CLASP',
    name: '割れた留め金',
    category: 'MATERIAL',
    maxStack: DEFAULT_MAX_STACK,
    description: '紐が切れている。落とした人は、まだ探しているだろうか。',
    sellPrice: 5,
    isKeyItem: false,
  },
  {
    itemId: 'ROUND_ACORN',
    name: 'まるいどんぐり',
    category: 'OTHER',
    maxStack: DEFAULT_MAX_STACK,
    description: 'つやがあって、よくまるい。持っていても、たぶん何も起きない。',
    // WORTH NOTHING, AND WORTH KEEPING. Its own description says it
    // will probably never do anything, and a shop that offered three
    // LUMI for it would be contradicting the only line it has. Nought
    // is the honest price, and the bag holds it anyway — which is the
    // whole reason this round exists.
    sellPrice: 0,
    isKeyItem: false,
  },

  // ---- 探索アイテム＋道具屋基盤 (2026-10-07) ----
  //
  // Two things to buy (a bigger herb and a herb for magic), and what the
  // forest and the ruins now let a player pick up (content/exploration's
  // `pickups`). Every number is set against what was already here: a herb
  // heals 30 for 16 LUMI, a flask gives 16 MP for 24, and the shop pays
  // half what it asks.

  /**
   * 上薬草 — twice a herb (60), for a little more than twice the price.
   * Shop only: no floor has one, so it is not had in quantity early on.
   */
  {
    itemId: 'FINE_HERB',
    name: '上薬草',
    category: 'CONSUMABLE',
    maxStack: DEFAULT_MAX_STACK,
    description: 'よく育った薬草を干して束ねたもの。薬草より深い傷に効く。',
    sellPrice: 20,
    isKeyItem: false,
    use: {
      kind: 'HEAL',
      amount: 60,
      where: 'BOTH',
      line: '上薬草を使った。苦い香りが広がる。',
    },
    rarity: 'UNCOMMON',
    sources: ['SHOP'],
  },
  /**
   * 魔力草 — the herb for magic: 12 MP, between bracing (8) and a flask
   * (16), at the flask's own price per point (18 LUMI for 12).
   */
  {
    itemId: 'MANA_HERB',
    name: '魔力草',
    category: 'CONSUMABLE',
    maxStack: DEFAULT_MAX_STACK,
    description: '葉脈がかすかに青く光る草。噛むと、頭の奥がすっと冴える。',
    sellPrice: 9,
    isKeyItem: false,
    use: {
      kind: 'RESTORE_MP',
      amount: 12,
      where: 'BOTH',
      line: '魔力草を噛んだ。頭の奥がすっと冴える。',
    },
    sources: ['SHOP', 'FOREST'],
  },
  {
    itemId: 'OLD_COIN',
    name: '古びた硬貨',
    category: 'MATERIAL',
    maxStack: DEFAULT_MAX_STACK,
    description: '長い年月で表面が擦り減った古い硬貨。今では通貨として使えないが、収集価値はある。',
    // Sold for now — and kept as a thing with a history (tags), not junk.
    sellPrice: 15,
    isKeyItem: false,
    rarity: 'UNCOMMON',
    sources: ['RUINS'],
    tags: ['RUINS', 'HISTORY'],
  },
  {
    itemId: 'IRON_ORE',
    name: '鉄鉱石',
    category: 'MATERIAL',
    maxStack: DEFAULT_MAX_STACK,
    description: 'ずしりと重い石。割れ目に鉄の色がのぞいている。',
    sellPrice: 10,
    isKeyItem: false,
    sources: ['FOREST', 'RUINS'],
    tags: ['ORE'],
  },
  {
    itemId: 'MANA_SHARD',
    name: '魔力の欠片',
    category: 'MATERIAL',
    maxStack: DEFAULT_MAX_STACK,
    description: '指先ほどの透き通った欠片。触れると、かすかに温かい。',
    sellPrice: 30,
    isKeyItem: false,
    rarity: 'RARE',
    sources: ['FOREST', 'RUINS'],
    tags: ['MAGIC'],
  },
  {
    itemId: 'FOREST_NUT',
    name: '森の木の実',
    category: 'MATERIAL',
    maxStack: DEFAULT_MAX_STACK,
    description: '森で拾った固い木の実。煎れば食べられるかもしれない。',
    // A material for now; 'FOOD' keeps it ready for cooking, a gift or a
    // use of its own later.
    sellPrice: 3,
    isKeyItem: false,
    sources: ['FOREST'],
    tags: ['FOOD'],
  },
  /**
   * 古代の破片 — WHAT IT IS IS NOT SAID. Kept for the ruins' story to
   * come: never sold (the key-item flag), filed with the materials.
   */
  {
    itemId: 'ANCIENT_SHARD',
    name: '古代の破片',
    category: 'MATERIAL',
    maxStack: DEFAULT_MAX_STACK,
    description: '何かの一部と思われる小さな破片。表面には、見慣れない模様が刻まれている。',
    sellPrice: 0,
    isKeyItem: true,
    rarity: 'RARE',
    sources: ['RUINS'],
    tags: ['LORE', 'RUINS'],
  },
  // パン屋 MVP (2026-10-09): Lina's four loaves (breads.ts).
  ...BREAD_DEFS,
];

const BY_ID = new Map(ITEM_DEFS.map((def) => [def.itemId, def]));

/**
 * What this id is, or null.
 *
 * NULL IS A REAL ANSWER rather than a crash: a save may hold something
 * a later build has dropped from the catalogue, and the bag keeps that
 * row on purpose. A caller that cannot price an unknown thing does not
 * price it; it does not lose the player's property over it.
 */
export function itemDef(itemId: string): ItemDef | null {
  return BY_ID.get(itemId) ?? null;
}
