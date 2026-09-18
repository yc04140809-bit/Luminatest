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
