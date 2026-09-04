// SUMMONING — Kaos rebuilding a memory on the battlefield, for a moment.
//
// This is not a monster you caught, a card you equipped, or something a
// gacha gave you. It is an ARCANA: what the player came to know about
// something by living around it. Kaos takes that memory and puts it
// back together in the middle of a fight, and how well she manages
// depends entirely on how complete the memory is.
//
//   0%        nothing to rebuild. She cannot try.
//   1–99%     an incomplete reconstruction. It may not hold.
//   100%      a complete memory. It holds, every time, and the player
//             is the one who decides when to call it.
//
// Pure: no React, no battle state, no world. Given how complete a
// memory is and a die, it says what happens.

/**
 * How a reconstruction turned out.
 *
 * ACCIDENT is the door, and it is shut. When an unstable memory can
 * pull something else through — something the world, the year, the
 * place and what the player chose all had a hand in — it is a third
 * value here and a third branch at the two places that read this type.
 * Nothing today produces one, and nothing today should: the design
 * rule is "surprise gets its meaning afterwards", and the meaning does
 * not exist yet.
 */
export type SummonOutcome = 'SUCCESS' | 'FAILURE';

/** Which kind of calling this was. */
export type SummonKind = 'INCOMPLETE' | 'COMPLETE';

/**
 * What a summoned ARCANA does, once, when it arrives.
 *
 * Deliberately NOT the creature's own attack or skill. A moss rabbit
 * fought in the forest tackles you and hides under moss; a moss rabbit
 * rebuilt out of what you know about it does something that belongs to
 * the memory rather than to the animal. Two different data.
 */
export interface SummonAbilityDef {
  id: string;
  name: string;
  /** What the battle log says when it lands. */
  line: string;
  /** One line for the book, in the player's language. */
  description: string;
  effect: SummonEffect;
}

/**
 * One effect today. The union is the shape the next one slots into —
 * a new member here and a new branch where it is applied, and neither
 * the summoning rules nor the battle screen change.
 */
export type SummonEffect = { kind: 'HEAL_PLAYER'; amount: number };

/**
 * Every number this system has.
 *
 * Opening values, not balance. Nothing below is written anywhere else.
 */
export const SUMMON_CONFIG = {
  /**
   * Of the moments Kaos does intervene, how often she reaches for an
   * ARCANA instead of the usual blessing or curse. Only possible at all
   * when there is an unfinished memory to reach for.
   */
  arcanaShare: 0.4,
  /** How likely an incomplete reconstruction holds, at 1% and at 99%. */
  successAtNothing: 0.2,
  successAtAlmost: 0.9,
  /**
   * What an incomplete reconstruction is worth, against the same
   * ability called from a complete memory. Weaker, because it is not
   * all there.
   */
  incompletePower: 0.5,
  /** How long the summoned thing stays on the field. */
  stayMs: 1500,
  /** How many times a complete memory can be called in one fight. */
  usesPerBattle: 1,
};

export type Rng = () => number;

/** A memory nobody has started has nothing to rebuild. */
export function canSummon(progress: number): boolean {
  return progress > 0;
}

export function summonKindFor(progress: number): SummonKind | null {
  if (!canSummon(progress)) return null;
  return progress >= 100 ? 'COMPLETE' : 'INCOMPLETE';
}

/**
 * How likely an incomplete reconstruction is to hold.
 *
 * Straight line today, and the only thing that matters about it is
 * that it reads off construction: 20% is a bad bet, 80% usually works,
 * and a real curve later changes this one function and nothing else.
 * A complete memory does not come through here at all — it never
 * fails, which is the whole point of finishing one.
 */
export function summonSuccessChance(progress: number): number {
  if (!canSummon(progress)) return 0;
  if (progress >= 100) return 1;
  const { successAtNothing, successAtAlmost } = SUMMON_CONFIG;
  const span = successAtAlmost - successAtNothing;
  const chance = successAtNothing + span * (progress / 100);
  return Math.min(1, Math.max(0, chance));
}

export interface SummonRollOptions {
  progress: number;
  rng?: Rng;
  /** Development only: settle it without the dice. */
  forced?: SummonOutcome | null;
}

/**
 * Whether the memory held. Null when there was nothing to call.
 *
 * A complete memory is not rolled for. That is not a rounding of "very
 * likely" up to certain — it is the reward for finishing the page, and
 * a player who did that must never watch it fail.
 */
export function rollSummon(options: SummonRollOptions): SummonOutcome | null {
  const { progress } = options;
  if (!canSummon(progress)) return null;
  if (progress >= 100) return 'SUCCESS';
  if (options.forced) return options.forced;
  const rng = options.rng ?? Math.random;
  return rng() < summonSuccessChance(progress) ? 'SUCCESS' : 'FAILURE';
}

/**
 * What the ability is worth, called from this much of a memory.
 *
 * Floored at 1 for the same reason damage is: an effect that resolves
 * to nothing is worse than an effect that is small.
 */
export function summonEffectFor(ability: SummonAbilityDef, kind: SummonKind): SummonEffect {
  if (kind === 'COMPLETE') return { ...ability.effect };
  const scaled = Math.ceil(ability.effect.amount * SUMMON_CONFIG.incompletePower);
  return { ...ability.effect, amount: Math.max(1, scaled) };
}
