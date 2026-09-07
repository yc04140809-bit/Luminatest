// WHETHER TO CAST, and what it would be worth.
//
// Written for two readers. The first is the screen, which wants to grey
// out a spell she cannot pay for and say why. The second is the AUTO
// brain that does not exist yet: the design round asked that AUTO be
// able to decide from the enemy's weakness, the power left, resistance
// and the state of the fight — rather than casting every turn because
// casting is a button. That is a decision, and a decision belongs in a
// pure function somebody can argue with in a test.
//
// It decides nothing on its own. Nothing here is wired to AUTO in this
// build; what is here is the shape AUTO will read.

import { affinityMultiplier } from './damageType';
import type { BattleState } from './battleLogic';
import { isMending, type MagicDef } from '../../core/magic/magic';

/** Why a spell is not available to press right now. */
export type MagicBlock = 'LOCKED' | 'NO_MP' | 'OVER' | null;

export function magicBlocked(state: BattleState, magic: MagicDef): MagicBlock {
  if (state.outcome !== 'ONGOING') return 'OVER';
  if (!state.magicUnlocked) return 'LOCKED';
  if (state.playerMp < magic.mpCost) return 'NO_MP';
  return null;
}

/**
 * Roughly what a cast would do, and roughly what a swing would.
 *
 * Averages rather than rolls: this is for deciding, and a decision made
 * on one roll of a die is not a decision. The numbers are the same ones
 * the battle uses, so a change to the battle moves both.
 */
export interface MagicWeigh {
  /** Expected damage from casting this, now. */
  magicDamage: number;
  /** Expected damage from swinging instead, now. */
  swingDamage: number;
  /** True when the creature minds the spell more than it minds a sword. */
  favoursMagic: boolean;
  /** True when a swing would knock it off balance and the spell would not. */
  swingWouldBreak: boolean;
}

const AVERAGE_SWING = 10; // the player's 8–12

export function weighMagic(state: BattleState, magic: MagicDef): MagicWeigh {
  const guarded = state.enemyGuardTurns > 0 && state.enemySkill !== null;
  // A mending spell does no damage, and saying it does nought rather
  // than saying nothing is the point: whatever asks this must not be
  // able to conclude that healing is a weak attack. What it IS worth
  // is a different question, in different units, and AUTO will need to
  // ask it separately when somebody wires AUTO up.
  if (isMending(magic)) {
    return {
      magicDamage: 0,
      swingDamage: AVERAGE_SWING * (guarded ? (state.enemySkill?.damageTaken ?? 1) : 1) *
        affinityMultiplier(state.enemyAffinity, 'PHYSICAL'),
      favoursMagic: false,
      swingWouldBreak: false,
    };
  }
  const guardCut = guarded ? (state.enemySkill?.damageTaken ?? 1) : 1;
  const swingDamage = AVERAGE_SWING * guardCut * affinityMultiplier(state.enemyAffinity, 'PHYSICAL');
  const magicDamage =
    magic.power *
    (guarded && magic.blockedByGuard ? guardCut : 1) *
    affinityMultiplier(state.enemyAffinity, magic.type, magic.element);
  const footing = state.enemyPoiseSpec;
  const swingWouldBreak =
    footing !== null &&
    state.enemyStaggerTurns === 0 &&
    state.enemyPoise - (guarded ? footing.perGuardedHit : footing.perHit) <= 0 &&
    magic.poiseCost === 0;
  return {
    magicDamage,
    swingDamage,
    favoursMagic: magicDamage > swingDamage,
    swingWouldBreak,
  };
}

/**
 * What an unattended player would do with this turn.
 *
 * Deliberately not clever. Three rules, in the order a person would
 * apply them: do not spend what you cannot spare, do not throw away a
 * chance to knock somebody down, and otherwise use whichever hurts
 * more. AUTO will want more than this — it is a starting point with a
 * test, not a brain.
 */
export function suggestAction(
  state: BattleState,
  magic: MagicDef | null,
  /** Keep this much power back for later. */
  reserveMp = 0,
): 'ATTACK' | 'MAGIC' | 'GUARD' {
  // Nearly out of health and out of power: cover, and let her gather.
  const desperate = state.playerHp <= state.playerMaxHp * 0.3;
  if (magic === null || magicBlocked(state, magic) !== null) {
    return desperate && state.playerMp < state.playerMaxMp ? 'GUARD' : 'ATTACK';
  }
  // Nothing here knows what a health bar is worth against a turn of
  // damage, and guessing is worse than declining to answer: handed
  // only a mending spell, an unattended player swings.
  if (isMending(magic)) return 'ATTACK';
  if (state.playerMp - magic.mpCost < reserveMp) return 'ATTACK';
  const weigh = weighMagic(state, magic);
  // A blow that would put it on the ground is worth more than a bigger
  // number: two turns it does not get is two turns of damage nobody
  // takes.
  if (weigh.swingWouldBreak) return 'ATTACK';
  return weigh.favoursMagic ? 'MAGIC' : 'ATTACK';
}
