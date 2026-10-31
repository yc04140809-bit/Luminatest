import { describe, expect, it } from 'vitest';
import { AUTO_HEAL_AT, autoHealPlan } from './autoHeal';
import { createBattle, type BattleState } from './battleLogic';
import { MAGIC_DEFS, MENDING_LIGHT } from '../../content/magic/magicDefs';
import { itemDef } from '../../content/economy/itemDefs';
import type { Inventory } from '../../core/economy/items';

/** 実装メイン⑥ (2026-10-08): AUTO mends — magic first, else the herb that fits. */

const FOE = { name: 'かかし', hp: 999, attackMin: 1, attackMax: 1 };
/** A fight at this much health, magic open or not, and this much MP. */
function at(hp: number, opts: { magic?: boolean; mp?: number } = {}): BattleState {
  const s = createBattle(FOE, undefined, { magicUnlocked: opts.magic ?? false });
  return { ...s, playerHp: hp, playerMp: opts.mp ?? s.playerMp };
}
const HERBS: Inventory = [{ itemId: 'FOREST_HERB', quantity: 3 }];
const BOTH: Inventory = [
  { itemId: 'FOREST_HERB', quantity: 1 },
  { itemId: 'FINE_HERB', quantity: 1 },
];

describe('AUTO, hurt', () => {
  it('whole, or not hurt enough: nothing — the turn is the usual AUTO', () => {
    const s = createBattle(FOE);
    expect(autoHealPlan(s, MAGIC_DEFS, HERBS, itemDef)).toBeNull();
    expect(autoHealPlan(at(Math.floor(s.playerMaxHp * AUTO_HEAL_AT) + 1), MAGIC_DEFS, HERBS, itemDef)).toBeNull();
  });

  it('at 35% or below, with a herb and no mending spell: the herb', () => {
    expect(autoHealPlan(at(35), [], HERBS, itemDef)).toEqual({ kind: 'ITEM', itemId: 'FOREST_HERB' });
    // Her spells are not open yet (before her awakening): the herb too.
    expect(autoHealPlan(at(20, { magic: false }), MAGIC_DEFS, HERBS, itemDef)).toEqual({ kind: 'ITEM', itemId: 'FOREST_HERB' });
  });

  it('with no herb left: nothing (the usual AUTO decides)', () => {
    expect(autoHealPlan(at(10), [], [], itemDef)).toBeNull();
    expect(autoHealPlan(at(10), [], [{ itemId: 'OLD_COIN', quantity: 5 }], itemDef)).toBeNull();
    expect(autoHealPlan(at(10), [], [{ itemId: 'MANA_HERB', quantity: 5 }], itemDef)).toBeNull();
  });

  it('her mending spell first when she can cast it; a herb when she cannot afford it', () => {
    expect(autoHealPlan(at(20, { magic: true }), MAGIC_DEFS, HERBS, itemDef)).toEqual({ kind: 'MAGIC', magicId: MENDING_LIGHT.id });
    expect(autoHealPlan(at(20, { magic: true, mp: MENDING_LIGHT.mpCost - 1 }), MAGIC_DEFS, HERBS, itemDef)).toEqual({
      kind: 'ITEM',
      itemId: 'FOREST_HERB',
    });
  });

  it('the herb that fits: 薬草 for a graze, 上薬草 for a deep wound', () => {
    // A max-HP 100 party: at 35, the wound is 65 — neither closes it, so the bigger.
    expect(autoHealPlan(at(35), [], BOTH, itemDef)).toEqual({ kind: 'ITEM', itemId: 'FINE_HERB' });
    // A wider threshold, a smaller wound (25): the herb closes it.
    expect(autoHealPlan(at(75), [], BOTH, itemDef, 0.8)).toEqual({ kind: 'ITEM', itemId: 'FOREST_HERB' });
    // Only 上薬草 held: that.
    expect(autoHealPlan(at(35), [], [{ itemId: 'FINE_HERB', quantity: 1 }], itemDef)).toEqual({ kind: 'ITEM', itemId: 'FINE_HERB' });
  });

  it('never once the fight is over', () => {
    expect(autoHealPlan({ ...at(10), outcome: 'VICTORY' }, [], HERBS, itemDef)).toBeNull();
    expect(autoHealPlan({ ...at(0), outcome: 'DEFEAT' }, [], HERBS, itemDef)).toBeNull();
  });
});
