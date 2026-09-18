// WHAT A FIGHT WAS WORTH — described in one place, applied in one go.
//
// A reward is DATA, not a series of calls. That is the whole design:
// the thing that decides what a victory gives hands back one object,
// and the world writes all of it or none of it. A shop taught this
// lesson already — money out and goods in have to land together — and a
// battle reward is the same problem with more rows.
//
// WHAT IS HERE NOW AND WHAT IS ONLY DECLARED. Experience, LUMI and
// items are real: they are earned, saved and shown. The three below
// them are named and deliberately inert, because a reward that could
// carry world memory is a reward the WORLD MEMORY round can fill in
// without anybody re-plumbing the battle. Declaring them costs three
// optional fields; leaving them out would cost a rewrite.
//
// AND THEY ARE NOT ONE NUMBER. `resonance` and `arcanaProgress` sit
// beside `exp` rather than inside it on purpose — see the note in
// levelCurve about the two kinds of growth. Anything that folds them
// together has made caring about the world a slower way of grinding.

import type { ItemStack } from '../economy/items';

/** What a victory gives. */
export interface BattleReward {
  /** Experience, for whoever was in the fight. */
  exp: number;
  lumi: number;
  items: readonly ItemStack[];
  /**
   * DECLARED AND NOT APPLIED — the WORLD MEMORY round's field.
   *
   * A fight that changes what the world remembers about itself. Today
   * `resolveEnemyVictory` does that separately and well, so this stays
   * empty rather than becoming a second door to the same place.
   */
  worldMemory?: readonly string[];
  /** DECLARED AND NOT APPLIED — how deeply this touched the world. */
  resonance?: number;
  /** DECLARED AND NOT APPLIED — arcana conditions a fight met. */
  arcanaProgress?: readonly string[];
}

export const NO_REWARD: BattleReward = { exp: 0, lumi: 0, items: [] };

/** Whole and never negative: a reward that takes something is a bug. */
function cleanAmount(value: number | undefined): number {
  const whole = Math.floor(Number(value ?? 0));
  return Number.isFinite(whole) ? Math.max(0, whole) : 0;
}

/**
 * A reward out of whatever a caller assembled.
 *
 * Repaired rather than trusted, and the repair is always DOWNWARD: a
 * negative amount becomes nothing rather than taking something away,
 * and a stack of nought is dropped. A reward is content, and content
 * with a typo in it should give less, never rob somebody.
 */
export function readReward(raw: Partial<BattleReward> | null | undefined): BattleReward {
  if (!raw) return NO_REWARD;
  const items: ItemStack[] = [];
  for (const stack of raw.items ?? []) {
    if (!stack || typeof stack.itemId !== 'string' || stack.itemId === '') continue;
    const quantity = cleanAmount(stack.quantity);
    if (quantity <= 0) continue;
    const already = items.find((seen) => seen.itemId === stack.itemId);
    if (already) already.quantity += quantity;
    else items.push({ itemId: stack.itemId, quantity });
  }
  return { exp: cleanAmount(raw.exp), lumi: cleanAmount(raw.lumi), items };
}

/** Whether there is anything in it at all. */
export function isEmptyReward(reward: BattleReward): boolean {
  return reward.exp <= 0 && reward.lumi <= 0 && reward.items.length === 0;
}

/**
 * What a reward actually came to, once the world had applied it.
 *
 * NOT THE SAME AS THE REWARD. A bag with no room takes fewer items than
 * were offered, and a character at the ceiling earns no experience — so
 * a result screen must draw what LANDED rather than what was promised,
 * or it will congratulate a player on something they did not get.
 */
export interface AppliedReward {
  exp: number;
  lumi: number;
  items: readonly ItemStack[];
  /** One per character who earned, whether or not they levelled. */
  levels: readonly {
    characterId: string;
    label: string;
    from: number;
    to: number;
    levelsGained: number;
  }[];
  /** True when this reward had already been paid and was refused. */
  alreadyClaimed: boolean;
}

export const NOTHING_APPLIED: AppliedReward = {
  exp: 0,
  lumi: 0,
  items: [],
  levels: [],
  alreadyClaimed: false,
};
