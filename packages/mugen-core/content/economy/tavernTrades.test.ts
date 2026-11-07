import { describe, expect, it } from 'vitest';
import { TAVERN_TRADES, tavernTrade } from './tavernTrades';
import { itemDef } from './itemDefs';

/** 酒場の物々交換 (2026-10-09): only things that exist; never a key item; handy, not a mint. */

const worth = (lines: readonly { itemId: string; quantity: number }[]) =>
  lines.reduce((sum, l) => sum + (itemDef(l.itemId)?.sellPrice ?? 0) * l.quantity, 0);

describe('the swaps', () => {
  it('ask for and give only things in the catalogue — and never a key item or bread', () => {
    for (const t of TAVERN_TRADES)
      for (const l of [...t.give, ...t.get]) {
        const def = itemDef(l.itemId);
        expect(def, `${t.id} ${l.itemId}`).not.toBeNull();
        expect(def!.isKeyItem, l.itemId).toBe(false);
        expect(def!.bread, l.itemId).toBeUndefined();
        expect(l.quantity).toBeGreaterThan(0);
      }
  });

  it('are the order’s four ordinary swaps, as written', () => {
    const ordinary = TAVERN_TRADES.filter((t) => !t.rare).map((t) => [
      t.give.map((l) => `${l.itemId}×${l.quantity}`).join('+'),
      t.get.map((l) => `${l.itemId}×${l.quantity}`).join('+'),
    ]);
    expect(ordinary).toEqual([
      ['FOREST_HERB×2', 'FINE_HERB×1'],
      ['FOREST_NUT×2', 'MANA_HERB×1'],
      ['IRON_ORE×2', 'OLD_COIN×1'],
      ['MANA_SHARD×2', 'MANA_WATER×1'],
    ]);
  });

  it('are never a way to mint LUMI: what comes back sells for little more than what goes', () => {
    for (const t of TAVERN_TRADES) expect(worth(t.get), t.id).toBeLessThanOrEqual(worth(t.give) * 2);
  });

  it('the hooded guest’s give what no shop sells', () => {
    const rare = TAVERN_TRADES.filter((t) => t.rare);
    expect(rare.length).toBeGreaterThanOrEqual(1);
    for (const t of rare) for (const l of t.get) expect(itemDef(l.itemId)!.sources ?? []).not.toContain('SHOP');
  });

  it('the hooded guest’s are a little in the player’s favour — better than every ordinary swap', () => {
    const ratio = (t: (typeof TAVERN_TRADES)[number]) => worth(t.get) / worth(t.give);
    const ordinaryBest = Math.max(...TAVERN_TRADES.filter((t) => !t.rare).map(ratio));
    for (const t of TAVERN_TRADES.filter((t) => t.rare)) {
      expect(ratio(t), t.id).toBeGreaterThan(1.5);
      expect(ratio(t), t.id).toBeGreaterThan(ordinaryBest);
    }
  });

  it('are found by id', () => {
    expect(tavernTrade('TRADE_ORE_FOR_COIN')?.get[0].itemId).toBe('OLD_COIN');
    expect(tavernTrade('NOPE')).toBeNull();
    expect(tavernTrade(undefined)).toBeNull();
  });
});
