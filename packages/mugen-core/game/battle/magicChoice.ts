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
import { boostHeld } from './battleLogic';
import type { BattleState } from './battleLogic';
import { harmsEnemy, isBoosting, isMending, isWarding, type MagicDef } from '../../core/magic/magic';

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

/**
 * HOW MUCH FIGHT HAS TO BE LEFT before a support spell is worth a turn.
 *
 * A spell that does nothing this turn and something every turn after it
 * is only worth casting while there ARE turns after it. Two thirds of
 * the creature still standing is a fight with enough left in it; the
 * last third is not, and an unattended player who spends the turn
 * before the finish leaning on a multiplier has simply lost that turn.
 *
 * The power floor is the other half of the same judgement: support is
 * what she does with power she can spare, never with the last of it.
 */
export const AUTO_SUPPORT_ABOVE = 0.6;
export const AUTO_SUPPORT_MP = 0.5;

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
 * Still not a brain. Six rules, in the
 * order a person would apply them:
 *
 *   1. Hurt, and she can mend → mend. Before the last moment, not on it.
 *   2. Nothing in front of the next blow and blows are landing → shield.
 *   3. Nearly gone with nothing to spend → cover, and let her gather.
 *   4. A fight with a long way to go and power to spare → lean on it.
 *   5. The best of what hurts it, if it beats swinging → cast that.
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

  // 4. A long fight, power to spare, and nothing of hers already
  //    leaning on that number. Deliberately after the three above:
  //    being hurt, being unprotected and being nearly gone are all
  //    about this turn, and this one is about the next five.
  //
  //    Checked against the stat rather than the spell so that two
  //    spells which move the same multiplier never both go up — and so
  //    that a shield she has standing is not re-cast by a second thing
  //    that softens blows.
  if (
    // Not on the opening turn. Whether a fight is going to be long is
    // not a thing anybody knows before it has started, and an
    // unattended player who opens every single fight — including the
    // ones that end in two swings — by leaning on a multiplier has
    // turned a judgement into a tic.
    state.turnsTaken > 0 &&
    state.enemyHp > state.enemyMaxHp * AUTO_SUPPORT_ABOVE &&
    state.playerMp >= state.playerMaxMp * AUTO_SUPPORT_MP
  ) {
    const support = usable.find(
      (spell) =>
        isBoosting(spell) &&
        spell.boost !== undefined &&
        !boostHeld(state, spell.boost.stat) &&
        state.playerMp - spell.mpCost >= reserveMp,
    );
    if (support) return { action: 'MAGIC', magicId: support.id };
  }

  // 5. The best of what hurts it — best by what it would actually do,
  //    which is not the same as by its power, and not the same as by
  //    the biggest number either.
  //
  //    With one attacking spell these two clauses agree and neither is
  //    visible. With two that trade power against reach, they are the
  //    difference between an unattended player and a button held down:
  //    take the big one when it ENDS the fight, and the rest of the
  //    time take whichever gets the most out of the power she has,
  //    because her power runs out and the fight does not.
  const attacking = usable.filter(
    (spell) => harmsEnemy(spell) && state.playerMp - spell.mpCost >= reserveMp,
  );
  const weighed = attacking.map((spell) => ({ spell, ...weighMagic(state, spell) }));

  // Anything that would put it down, cheapest first: there is no
  // reason to spend the big one where the small one already finishes.
  const finisher = weighed
    .filter((w) => w.magicDamage >= state.enemyHp)
    .sort((a, b) => a.spell.mpCost - b.spell.mpCost)[0];
  if (finisher) return { action: 'MAGIC', magicId: finisher.spell.id };

  let best: MagicDef | null = null;
  let bestWorth = 0;
  for (const { spell, magicDamage } of weighed) {
    // What the power actually buys. A spell that hits twice as hard
    // for nearly three times the power is not the better spell for a
    // fight that is going to last.
    const worth = spell.mpCost > 0 ? magicDamage / spell.mpCost : magicDamage;
    if (best === null || worth > bestWorth) {
      best = spell;
      bestWorth = worth;
    }
  }
  if (best && suggestAction(state, best, reserveMp) === 'MAGIC') {
    return { action: 'MAGIC', magicId: best.id };
  }
  return SWING;
}
