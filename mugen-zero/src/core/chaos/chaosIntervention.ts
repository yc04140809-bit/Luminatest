// CHAOS BATTLE INTERVENTION — whether she does anything, and what.
//
// Kaos stands at the back of the field. Now and then, at the moment a
// fight starts, she helps. Most of the time she does not, and that is
// the design: a thing that happens every time is a rule, and a rule is
// not a gift. The whole feeling this is for — "is she going to do
// something this time?" — depends on the answer usually being no.
//
// Decided once, when the fight begins. Never re-rolled per turn.
//
// Pure: no React, no battle state, no world. It picks one of the things
// content offers and hands it back.

import type { BattleModifiers } from '../../game/battle/battleLogic';

/**
 * What KIND of thing she did.
 *
 * ARCANA is named here and implemented nowhere. It is the door the
 * summoning system will come through: a def whose category is ARCANA
 * can carry whatever presentation and effect that system needs without
 * this module, the battle logic, or the damage code changing. Nothing
 * today returns one, and nothing today should.
 */
export type ChaosInterventionCategory = 'NONE' | 'BUFF' | 'DEBUFF' | 'ARCANA';

export type ChaosInterventionId =
  | 'NONE'
  | 'CHAOS_BLESSING'
  | 'CHAOS_GUARD'
  | 'CHAOS_WEAKEN'
  | 'CHAOS_BREAK';

export interface ChaosInterventionDef {
  id: ChaosInterventionId;
  category: ChaosInterventionCategory;
  /** 《ケイオスの加護》 */
  name: string;
  /** What she says. Two clauses at most: this is not a scene. */
  line: string;
  /** What it did, in the fewest words that are still true. */
  effect: string;
  /** Who the small mark plays on. */
  target: 'PLAYER' | 'ENEMY';
  /** What it multiplies. Anything left out is 1. */
  modifiers: Partial<BattleModifiers>;
}

/**
 * Every number this system has, in one place.
 *
 * These are opening values, not balance: conservative enough that a
 * fight is still a fight either way. Change them here and nothing else
 * moves — no multiplier is written anywhere else in the codebase.
 */
export const CHAOS_INTERVENTION_CONFIG = {
  /** How often she does anything at all. Most fights, she does not. */
  chance: 0.35,
  /** 《加護》 what his blows are worth. */
  playerAttackUp: 1.25,
  /** 《守護》 what reaches him. */
  playerDamageTakenDown: 0.7,
  /** 《弱体》 what the creature's blows are worth. */
  enemyAttackDown: 0.7,
  /** 《崩し》 what reaches the creature. */
  enemyDamageTakenUp: 1.3,
};

export type Rng = () => number;

export interface ChaosRollOptions {
  /** What she could do here. Content supplies the list. */
  defs: readonly ChaosInterventionDef[];
  rng?: Rng;
  chance?: number;
  /** Development only: settle it without the dice. */
  forced?: ChaosInterventionId | null;
}

/**
 * What Kaos does as this fight begins, or null for the usual nothing.
 *
 * One roll for whether, one for which. Both from the same rng so a test
 * can pin the whole thing with two numbers.
 */
export function rollChaosIntervention(options: ChaosRollOptions): ChaosInterventionDef | null {
  const { defs } = options;
  if (options.forced) {
    if (options.forced === 'NONE') return null;
    return defs.find((def) => def.id === options.forced) ?? null;
  }
  if (defs.length === 0) return null;
  const rng = options.rng ?? Math.random;
  const chance = options.chance ?? CHAOS_INTERVENTION_CONFIG.chance;
  if (rng() >= chance) return null;
  const index = Math.min(defs.length - 1, Math.floor(rng() * defs.length));
  return defs[index];
}

/** The four numbers a battle needs, filled in from one intervention. */
export function modifiersOf(def: ChaosInterventionDef | null): BattleModifiers {
  return {
    playerAttack: def?.modifiers.playerAttack ?? 1,
    playerDamageTaken: def?.modifiers.playerDamageTaken ?? 1,
    enemyAttack: def?.modifiers.enemyAttack ?? 1,
    enemyDamageTaken: def?.modifiers.enemyDamageTaken ?? 1,
  };
}
