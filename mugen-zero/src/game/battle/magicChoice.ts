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
import { harmsEnemy, isMending, isWarding, type MagicDef } from '../../core/magic/magic';

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
  // A spell that strikes nobody does no damage, and saying it does
  // nought rather than saying nothing is the point: whatever asks this
  // must not be able to conclude that healing, or a shield, is a weak
  // attack. What they ARE worth is a different question in different
  // units, and `decideTurn` below is where it is asked.
  if (!harmsEnemy(magic)) {
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
/**
 * Nearly out of health: the point at which covering beats swinging.
 *
 * Named because two rules read it and they must agree — a turn spent
 * bracing when you should be mending, or the other way round, is the
 * kind of thing nobody notices for a hundred fights.
 */
export const AUTO_DESPERATE_AT = 0.3;

/**
 * Hurt enough to be worth a turn of mending.
 *
 * Above the desperate line on purpose: mending at the last moment means
 * mending on the turn a blow kills you, and the whole value of a heal
 * is that it is spent before it is needed.
 */
export const AUTO_MEND_AT = 0.45;

/**
 * Hurt enough to be worth putting something in front of the next blow.
 *
 * Higher than the mending line, because a shield is bought BEFORE it is
 * needed — that is the entire difference between it and a heal. Below
 * this the fight has not started hurting yet and a turn is better spent
 * on the creature.
 */
export const AUTO_WARD_AT = 0.8;

export function suggestAction(
  state: BattleState,
  magic: MagicDef | null,
  /** Keep this much power back for later. */
  reserveMp = 0,
): 'ATTACK' | 'MAGIC' | 'GUARD' {
  // Nearly out of health and out of power: cover, and let her gather.
  const desperate = state.playerHp <= state.playerMaxHp * AUTO_DESPERATE_AT;
  if (magic === null || magicBlocked(state, magic) !== null) {
    return desperate && state.playerMp < state.playerMaxMp ? 'GUARD' : 'ATTACK';
  }
  // Nothing here knows what a health bar is worth against a turn of
  // damage, and guessing is worse than declining to answer: handed
  // only a spell that strikes nobody, an unattended player swings.
  if (!harmsEnemy(magic)) return 'ATTACK';
  if (state.playerMp - magic.mpCost < reserveMp) return 'ATTACK';
  const weigh = weighMagic(state, magic);
  // A blow that would put it on the ground is worth more than a bigger
  // number: two turns it does not get is two turns of damage nobody
  // takes.
  if (weigh.swingWouldBreak) return 'ATTACK';
  return weigh.favoursMagic ? 'MAGIC' : 'ATTACK';
}

/**
 * What an unattended player would do with this turn, given everything
 * she can do.
 *
 * `suggestAction` above answers about ONE spell and only ever about
 * hurting the creature; this is the whole hand, and the difference is
 * the reason it exists: with two spells that are not the same kind of
 * answer, "cast or swing" has stopped being the question and "which of
 * the four things" has started.
 *
 * Still not a brain, and still wired to nothing. Four rules, in the
 * order a person would apply them:
 *
 *   1. Hurt, and she can mend → mend. Before the last moment, not on it.
 *   2. Nothing in front of the next blow and blows are landing → shield.
 *   3. Nearly gone with nothing to spend → cover, and let her gather.
 *   4. The best of what hurts it, if it beats swinging → cast that.
 *   5. Otherwise swing.
 *
 * Whoever wires AUTO up gets to argue with these in a test rather than
 * in a fight.
 */
export interface TurnPlan {
  action: 'ATTACK' | 'MAGIC' | 'GUARD';
  /** Which of hers, when the action is MAGIC. Null otherwise. */
  magicId: string | null;
}

export interface AutoOptions {
  /** Keep this much power back for later. */
  reserveMp?: number;
  /** Mend at or below this share of health. */
  mendAt?: number;
  /** Put a shield up at or below this share of health. */
  wardAt?: number;
}

const SWING: TurnPlan = { action: 'ATTACK', magicId: null };
const COVER: TurnPlan = { action: 'GUARD', magicId: null };

export function decideTurn(
  state: BattleState,
  spells: readonly MagicDef[],
  options: AutoOptions = {},
): TurnPlan {
  const reserveMp = options.reserveMp ?? 0;
  const mendAt = options.mendAt ?? AUTO_MEND_AT;
  const usable = spells.filter((spell) => magicBlocked(state, spell) === null);

  // 1. Hurt, with something to do about it. Health already at the top
  //    is not hurt, however low the bar looks: mending it does nothing
  //    and costs the turn.
  const room = state.playerMaxHp - state.playerHp;
  if (room > 0 && state.playerHp <= state.playerMaxHp * mendAt) {
    // The biggest one she can afford. With one mending spell this is
    // that one; with two it is the one that closes more of the gap.
    const mend = usable.filter(isMending).sort((a, b) => b.power - a.power)[0];
    if (mend) return { action: 'MAGIC', magicId: mend.id };
  }

  // 2. Nothing in front of the next blow, and blows have started to
  //    matter. Not while a shield is already up — a second one buys
  //    nothing, and the turn it costs is a turn the creature gets for
  //    free.
  if (
    state.wardTurns <= 0 &&
    state.playerHp <= state.playerMaxHp * (options.wardAt ?? AUTO_WARD_AT)
  ) {
    const shield = usable.filter(isWarding)[0];
    if (shield) return { action: 'MAGIC', magicId: shield.id };
  }

  // 3. Nearly gone, nothing to mend with, and power to be gathered.
  if (
    state.playerHp <= state.playerMaxHp * AUTO_DESPERATE_AT &&
    state.playerMp < state.playerMaxMp
  ) {
    return COVER;
  }

  // 4. The best of what hurts it — best by what it would actually do,
  //    which is not the same as by its power.
  let best: MagicDef | null = null;
  let bestDamage = 0;
  for (const spell of usable) {
    if (!harmsEnemy(spell)) continue;
    if (state.playerMp - spell.mpCost < reserveMp) continue;
    const { magicDamage } = weighMagic(state, spell);
    if (best === null || magicDamage > bestDamage) {
      best = spell;
      bestDamage = magicDamage;
    }
  }
  if (best && suggestAction(state, best, reserveMp) === 'MAGIC') {
    return { action: 'MAGIC', magicId: best.id };
  }
  return SWING;
}
