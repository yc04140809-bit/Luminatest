// AUTO, HURT — mend with magic if she can, else a herb from the bag.
//
// 実装メイン⑥ AUTO改善 (2026-10-08). `decideTurn` (magicChoice.ts, shared
// with the Artifact) never reaches into the bag, so an unattended party with
// herbs could go down holding them. This is asked FIRST, each AUTO turn, by
// the App: when health is low it answers how to mend (her mending spell
// when she can cast it, else the herb that fits the wound), otherwise null
// and the turn is the existing AUTO's. Nothing here spends anything — the
// caller uses the item through the same path a tapped one takes (the bag in
// the save, one fewer).
//
// Room left, not built: switching AUTO off when things go badly is a
// caller's decision about this answer (null vs a plan), not a change here.

import type { Inventory } from '../../core/economy/items';
import type { ItemDef } from '../../core/economy/items';
import { isMending, type MagicDef } from '../../core/magic/magic';
import { refuseItem, type BattleState } from './battleLogic';
import { magicBlocked } from './magicChoice';

/** At or below this share of health, AUTO mends before anything else. */
export const AUTO_HEAL_AT = 0.35;

export type AutoHeal = { kind: 'MAGIC'; magicId: string } | { kind: 'ITEM'; itemId: string };

/**
 * How AUTO should mend this turn, or null when it should not (not hurt
 * enough, already whole, nothing to mend with, the fight is over).
 *
 * Magic first when she can cast a mending spell (the biggest she can); a
 * herb otherwise — the smallest that closes the wound, or the biggest held
 * when none does (薬草 for a graze, 上薬草 for a deep one).
 */
export function autoHealPlan(
  state: BattleState,
  spells: readonly MagicDef[],
  bag: Inventory,
  itemDefOf: (itemId: string) => ItemDef | null,
  healAt: number = AUTO_HEAL_AT,
): AutoHeal | null {
  if (state.outcome !== 'ONGOING') return null;
  const room = state.playerMaxHp - state.playerHp;
  if (room <= 0 || state.playerHp > state.playerMaxHp * healAt) return null;

  const mend = spells
    .filter((spell) => isMending(spell) && magicBlocked(state, spell) === null)
    .sort((a, b) => b.power - a.power)[0];
  if (mend) return { kind: 'MAGIC', magicId: mend.id };

  const herbs = bag
    .map((row) => ({ row, def: itemDefOf(row.itemId) }))
    .filter(
      (x): x is { row: (typeof bag)[number]; def: ItemDef } =>
        // Never a loaf: bread is the player's own choice (パン屋 MVP).
        !!x.def?.use && !x.def.bread && x.def.use.kind === 'HEAL' && x.def.use.amount > 0 && refuseItem(state, x.def.use, x.row.quantity) === null,
    )
    .sort((a, b) => a.def.use!.amount - b.def.use!.amount);
  if (herbs.length === 0) return null;
  const fits = herbs.find((h) => h.def.use!.amount >= room);
  return { kind: 'ITEM', itemId: (fits ?? herbs[herbs.length - 1]).def.itemId };
}
