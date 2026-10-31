import { describe, expect, it } from 'vitest';
import { itemDef, ITEM_DEFS } from './itemDefs';
import { TAVERN_TRADES } from './tavernTrades';
import { ALDEN_TOOL_SHOP_OFFERS } from './aldenShop';
import { BAKERY_OWNER_NOTICES, ownerNoticeFor } from '../dialogue/bakeryTalk';
import { sellPriceOf } from '../../core/economy/shop';

/**
 * 探索素材 → 村施設連携 Phase 1 (2026-10-10): what is picked up has more
 * than one worth — sold, swapped, a baker's interest, a hint — and the
 * ancient fragment is still never sold or swapped.
 */

const MATERIALS = ['FOREST_NUT', 'IRON_ORE', 'OLD_COIN', 'MANA_SHARD', 'MANA_HERB', 'ANCIENT_SHARD'];

describe('a hint at what it is for', () => {
  it('the materials have one; short, and never the answer (no shop, no person named)', () => {
    for (const id of MATERIALS) {
      const hint = itemDef(id)!.useHint;
      expect(hint, id).toBeTruthy();
      expect(hint!.length, id).toBeLessThanOrEqual(30);
      expect(hint, id).not.toMatch(/パン屋|酒場|道具屋|主人|リナ|ミレイ|グレイヴ|持って行/);
    }
    expect(itemDef('FOREST_NUT')!.useHint).toBe('パンの材料にもなりそうだ。');
    expect(itemDef('ANCIENT_SHARD')!.useHint).toBe('用途不明。古代遺跡と関係がありそうだ。');
  });

  it('the author’s descriptions are as they were', () => {
    expect(itemDef('ANCIENT_SHARD')!.description).toBe('何かの一部と思われる小さな破片。表面には、見慣れない模様が刻まれている。');
    expect(itemDef('FOREST_NUT')!.description).toBe('森で拾った固い木の実。煎れば食べられるかもしれない。');
  });

  it('kinds of making are named for later, from a fixed few', () => {
    const kinds = new Set(['fruit', 'herb', 'magic', 'mineral', 'ancient']);
    for (const def of ITEM_DEFS) for (const t of def.ingredientTags ?? []) expect(kinds.has(t), def.itemId).toBe(true);
    expect(itemDef('FOREST_NUT')!.ingredientTags).toEqual(['fruit']);
    expect(itemDef('MANA_HERB')!.ingredientTags).toContain('magic');
    expect(itemDef('MANA_SHARD')!.ingredientTags).toContain('magic');
  });
});

describe('more than one worth', () => {
  it('every material but the fragment sells, and some swap at the tavern', () => {
    for (const id of MATERIALS.filter((m) => m !== 'ANCIENT_SHARD')) {
      expect(sellPriceOf(itemDef(id)!), id).toBeGreaterThan(0);
    }
    const swapped = new Set(TAVERN_TRADES.flatMap((t) => t.give.map((l) => l.itemId)));
    for (const id of ['FOREST_NUT', 'IRON_ORE', 'OLD_COIN', 'MANA_SHARD']) expect(swapped.has(id), id).toBe(true);
  });

  it('the ancient fragment: never sold, never swapped, never on a board', () => {
    const shard = itemDef('ANCIENT_SHARD')!;
    expect(shard.isKeyItem).toBe(true);
    expect(shard.sellPrice).toBe(0);
    for (const t of TAVERN_TRADES) for (const l of [...t.give, ...t.get]) expect(l.itemId, t.id).not.toBe('ANCIENT_SHARD');
    expect(ALDEN_TOOL_SHOP_OFFERS.some((o) => o.itemId === 'ANCIENT_SHARD')).toBe(false);
  });
});

describe('the baker notices what is carried', () => {
  const carrying = (bag: Record<string, number>) => ({
    held: (id: string) => bag[id] ?? 0,
    tagged: (tag: string) => Object.keys(bag).some((id) => bag[id] > 0 && (itemDef(id)?.ingredientTags ?? []).some((t) => t === tag)),
  });
  const none = () => false;

  it('a forest nut: his word on it; magic: his word on that; nothing carried: nothing', () => {
    expect(ownerNoticeFor(carrying({ FOREST_NUT: 1 }), none)?.id).toBe('NUT');
    expect(ownerNoticeFor(carrying({ MANA_HERB: 1 }), none)?.id).toBe('MAGIC');
    expect(ownerNoticeFor(carrying({ MANA_SHARD: 2 }), none)?.id).toBe('MAGIC');
    expect(ownerNoticeFor(carrying({ FOREST_HERB: 3, IRON_ORE: 1 }), none)).toBeNull();
  });

  it('once each: the nut first, then the magic, then his hints again', () => {
    const bag = carrying({ FOREST_NUT: 1, MANA_SHARD: 1 });
    const read = new Set<string>();
    const first = ownerNoticeFor(bag, (m) => read.has(m))!;
    expect(first.id).toBe('NUT');
    read.add(first.mark);
    const second = ownerNoticeFor(bag, (m) => read.has(m))!;
    expect(second.id).toBe('MAGIC');
    read.add(second.mark);
    expect(ownerNoticeFor(bag, (m) => read.has(m))).toBeNull();
  });

  it('short, his alone, readMarks talk: ids, and no recipe promised', () => {
    for (const n of BAKERY_OWNER_NOTICES) {
      expect(n.mark.startsWith('talk:')).toBe(true);
      expect(n.lines.length).toBeLessThanOrEqual(2);
      for (const l of n.lines) {
        expect(l.speaker).toBe('パン屋の主人');
        expect(l.text).not.toMatch(/ガルド|レシピ|作ってやる/);
      }
    }
  });
});
