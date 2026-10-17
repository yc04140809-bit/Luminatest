// KAOS' MAGIC — the shape of a spell, and which of them she can reach.
//
// Data, not code. A spell is an entry; adding one is an entry, and
// nothing in the battle or in either battle screen learns its name.
// That is the whole point of the file: the story is going to keep
// giving her things, and none of them should cost a change here.
//
// What is deliberately NOT here: how much she can really do. She is
// using one spell in this build and the game says nothing about why she
// can do even that. The structure goes: first spell → new spells →
// something else → whatever she actually is. This file only knows about
// the first arrow of that.

import type { DamageType, Element } from '../../game/battle/damageType';

/**
 * Who a spell is aimed at.
 *
 * The vocabulary, not a targeting system. With one creature on the
 * field and one party health bar there is nothing for a player to
 * CHOOSE between yet, and a picker that always has one entry is a tap
 * in the way of the fight. What this buys is that every spell already
 * says who it reaches, so the day there are two creatures the picker is
 * a screen reading `needsTargetChoice` — not a pass over the spell
 * table deciding retroactively what each one meant.
 */
export type MagicTarget = 'ONE_ENEMY' | 'ALL_ENEMIES' | 'ALLY' | 'PARTY';

/**
 * What it does when it gets there.
 *
 * This used to be read off the target, on the grounds that with one
 * spell of each there was nothing a second field would say. A shield
 * is what broke that: it is aimed at your own side and it is not
 * mending. The comment then said the day a spell broke it would be the
 * day this grew an effect, and would grow it in ONE place because
 * everything asked a helper rather than reading the target. That is
 * what happened — the helpers below are unchanged from the outside.
 *
 * 'DAMAGE' hurts the creature. 'MEND' puts health back. 'WARD' takes
 * the edge off the blows that are coming. 'BUFF' and 'DEBUFF' lean on
 * one of the numbers the fight already multiplies by — hers upward,
 * the creature's downward — for a few turns.
 */
export type MagicEffect = 'DAMAGE' | 'MEND' | 'WARD' | 'BUFF' | 'DEBUFF';

/**
 * The four numbers a fight already multiplies a blow by.
 *
 * Named exactly as `BattleModifiers` names them, because a boost IS one
 * of those numbers moving — there is no second system underneath this,
 * no status register, no stack of icons with durations. The battle has
 * always multiplied damage by four things; a buff is her hand on one of
 * them for a few turns.
 */
export type BoostStat = 'playerAttack' | 'playerDamageTaken' | 'enemyAttack' | 'enemyDamageTaken';

/**
 * What she does to one of those numbers, and for how long.
 *
 * `factor` multiplies, so above one raises the number and below one
 * lowers it — and whether that HELPS depends on which number it is: a
 * factor of 1.3 on `playerAttack` is a gift and the same factor on
 * `enemyAttack` is a curse. Which is why BUFF and DEBUFF are separate
 * effects even though they run through identical code: the difference
 * is what the player is told, not what the arithmetic does.
 *
 * The battle holds the ceiling on how far the whole stack may move, the
 * same way it holds the ceiling on a ward. Content asks.
 */
export interface MagicBoost {
  stat: BoostStat;
  factor: number;
  /** How many of the player's turns it holds for. */
  turns: number;
}

/**
 * What a shield is worth, and for how long.
 *
 * Carried by the spell rather than by the battle so that tuning it is
 * editing one entry, and read only for a 'WARD'. The battle still has
 * the last word on the cut: content may ask for anything and gets what
 * the battle allows.
 */
export interface MagicWard {
  /** The share taken off each blow. */
  cut: number;
  /** How many blows it lasts. Spent by blows that land, not by turns. */
  blows: number;
}

/**
 * Why a spell is or is not available yet.
 *
 * 'FROM_START'  she has always had it
 * 'AWAKENING'   the first time she reaches past what she was doing
 *
 * The list is meant to grow — a story beat, a memory in WORLD MEMORY,
 * somebody met, something found — and everything that reads it goes
 * through `magicAvailable` below, so growing it is one case there and
 * nothing anywhere else.
 */
export type MagicUnlock = 'FROM_START' | 'AWAKENING';

export interface MagicDef {
  id: string;
  /** Provisional names are expected. Nothing keys off this. */
  name: string;
  /** One line in the log when she casts it. */
  line: string;
  mpCost: number;
  /**
   * How much it does, where that is one number.
   *
   * Damage for a spell aimed at the creature, before anything the
   * creature thinks about it. Health for one that mends, and there is
   * nothing to think about it — mending is not resisted, not guarded
   * against and not elemental, so a spell that is not 'DAMAGE' has its
   * `type`, `element`, `blockedByGuard` and `poiseCost` written for
   * completeness and read by nothing. A shield's numbers are two, so
   * they are in `ward` and this is nought.
   */
  power: number;
  type: DamageType;
  element: Element | null;
  target: MagicTarget;
  /** What it does. See `MagicEffect`. */
  effect: MagicEffect;
  /** Only for a 'WARD', and required for one. */
  ward?: MagicWard;
  /** Only for a 'BUFF' or a 'DEBUFF', and required for one. */
  boost?: MagicBoost;
  /** Which short piece of theatre the screen plays. Never a filename. */
  animation: string;
  unlock: MagicUnlock;
  /**
   * Whether a creature's guard softens it.
   *
   * False for hers, and this is the reason to ever cast one at
   * something that is not weak to magic: a bandit who has covered up
   * takes a sword at half and a star at full. What it does NOT do is
   * knock him off balance — a blow does that, and light does not — so
   * neither of the two is the answer to a guard on its own.
   */
  blockedByGuard: boolean;
  /** How much of the creature's footing it takes. Hers takes none. */
  poiseCost: number;
}

export interface MagicContext {
  /** True once she has reached past what she was doing. */
  awakened: boolean;
}

/** Whether she can reach this one yet. */
export function magicAvailable(def: MagicDef, ctx: MagicContext): boolean {
  switch (def.unlock) {
    case 'FROM_START':
      return true;
    case 'AWAKENING':
      return ctx.awakened;
    default:
      // A spell whose condition nobody has taught this function about
      // stays out of reach. Locked is the safe way to be wrong.
      return false;
  }
}

/** The ones she can reach, in the order they are written. */
export function availableMagic(defs: readonly MagicDef[], ctx: MagicContext): MagicDef[] {
  return defs.filter((def) => magicAvailable(def, ctx));
}

/** Whether this one puts health back. */
export function isMending(def: MagicDef): boolean {
  return def.effect === 'MEND';
}

/** Whether this one puts something between the party and what is coming. */
export function isWarding(def: MagicDef): boolean {
  return def.effect === 'WARD';
}

/** Whether this one leans on one of the numbers the fight multiplies by. */
export function isBoosting(def: MagicDef): boolean {
  return def.effect === 'BUFF' || def.effect === 'DEBUFF';
}

/**
 * Whether the player has a choice to make about where this one goes.
 *
 * Answered from the candidates rather than from the spell, so it is
 * false today for every spell she has — one creature, one party — and
 * becomes true on its own the day a field holds two of anything. A
 * screen that asks this and skips the picker when it says no is a
 * screen that needs no change on that day.
 */
export function needsTargetChoice(def: MagicDef, candidates: number): boolean {
  if (candidates <= 1) return false;
  return def.target === 'ONE_ENEMY' || def.target === 'ALLY';
}

/**
 * Whether anything is struck by it.
 *
 * The question the screen and the decision layer actually ask: a spell
 * that is not this one hurts nobody, so nothing flinches and nothing
 * may weigh it as a small amount of damage.
 */
export function harmsEnemy(def: MagicDef): boolean {
  return def.effect === 'DAMAGE';
}

/** Whether she can pay for it right now. Separate from whether she has it. */
export function canCast(def: MagicDef, mp: number): boolean {
  return mp >= def.mpCost;
}
