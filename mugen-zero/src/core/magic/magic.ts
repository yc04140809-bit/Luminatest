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
 * Who a spell is aimed at, and — for now — what kind of thing it is.
 *
 * 'ONE_ENEMY' harms the creature. 'ALLY' mends the party.
 *
 * Two rather than a separate effect field, because with one spell of
 * each there is nothing a second field would say that this one does
 * not: nobody aims harm at their own side and nobody mends a bandit.
 * The day a spell breaks that — a drain, a curse that heals its
 * caster — is the day this grows an effect, and it will grow it in one
 * place because everything asks `isMending` below rather than reading
 * the target itself.
 */
export type MagicTarget = 'ONE_ENEMY' | 'ALLY';

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
   * How much it does.
   *
   * Damage for a spell aimed at the creature, before anything the
   * creature thinks about it. Health for one aimed at the party, and
   * there is nothing to think about it — mending is not resisted, not
   * guarded against and not elemental, so a mending spell's `type`,
   * `element`, `blockedByGuard` and `poiseCost` are written for
   * completeness and read by nothing.
   */
  power: number;
  type: DamageType;
  element: Element | null;
  target: MagicTarget;
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

/**
 * Whether this one mends the party rather than hurting the creature.
 *
 * The one question anything downstream needs to ask, asked in one
 * place: the battle branches on it, and the screen uses it to know
 * that nobody was struck.
 */
export function isMending(def: MagicDef): boolean {
  return def.target === 'ALLY';
}

/** Whether she can pay for it right now. Separate from whether she has it. */
export function canCast(def: MagicDef, mp: number): boolean {
  return mp >= def.mpCost;
}
