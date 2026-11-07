import { describe, expect, it } from 'vitest';
import { BAKERY_OFFERS, BREAD_DEFS } from './breads';
import { itemDef } from './itemDefs';
import { ALDEN_TOOL_SHOP_OFFERS } from './aldenShop';
import { buyPriceOf } from '../../core/economy/shop';
import { autoHealPlan } from '../../game/battle/autoHeal';
import { createBattle } from '../../game/battle/battleLogic';

/**
 * パン屋 MVP (2026-10-09): Lina's four loaves — what the brief asked for,
 * small on purpose, eaten on the road only, never by AUTO.
 */

const HERB = itemDef('FOREST_HERB')!;
const herbPrice = buyPriceOf(ALDEN_TOOL_SHOP_OFFERS.find((o) => o.itemId === 'FOREST_HERB')!)!;

describe('the four loaves', () => {
  it('are the brief’s four, with their lifts and how long they keep', () => {
    const seen = BREAD_DEFS.map((d) => [d.name, d.bread!.buffType, d.bread!.buffValue, d.bread!.freshness]);
    expect(seen).toEqual([
      ['焼きたてパン', 'DEFENSE', 0.05, 2],
      ['森の木の実パン', 'SPEED', 0.05, 2],
      ['魔力パン', 'MAGIC', 0.05, 2],
      ['旅人の硬焼きパン', 'MAX_HP', 0.05, 4],
    ]);
  });

  it('are FOOD in the one catalogue, each with a recipe id and a price at the bakery', () => {
    for (const d of BREAD_DEFS) {
      expect(itemDef(d.itemId)).toBe(d);
      expect(d.category).toBe('FOOD');
      expect(d.bread!.recipeId).not.toBe('');
      expect(BAKERY_OFFERS.some((o) => o.itemId === d.itemId), d.itemId).toBe(true);
    }
    expect(BAKERY_OFFERS.map((o) => o.itemId)).toEqual(BREAD_DEFS.map((d) => d.itemId));
  });

  it('are small: less healing than a herb, a little dearer, and a lift of a twentieth', () => {
    for (const d of BREAD_DEFS) {
      expect(d.use!.kind).toBe('HEAL');
      expect(d.use!.amount).toBeLessThan(HERB.use!.amount);
      expect(d.bread!.buffValue).toBeLessThanOrEqual(0.05);
      expect(buyPriceOf(BAKERY_OFFERS.find((o) => o.itemId === d.itemId)!)!).toBeGreaterThan(herbPrice);
    }
  });

  it('are eaten on the road only, and never sold back', () => {
    for (const d of BREAD_DEFS) {
      expect(d.use!.where).toBe('FIELD_ONLY');
      expect(d.sellPrice).toBe(0);
    }
  });

  it('AUTO never eats one, even with nothing else in the bag', () => {
    const s = createBattle({ name: 'かかし', hp: 999, attackMin: 1, attackMax: 1 });
    const hurt = { ...s, playerHp: 5 };
    const bag = BREAD_DEFS.map((d) => ({ itemId: d.itemId, quantity: 3 }));
    expect(autoHealPlan(hurt, [], bag, itemDef)).toBeNull();
    // With a herb beside them, the herb.
    expect(autoHealPlan(hurt, [], [...bag, { itemId: 'FOREST_HERB', quantity: 1 }], itemDef)).toEqual({
      kind: 'ITEM',
      itemId: 'FOREST_HERB',
    });
  });
});
