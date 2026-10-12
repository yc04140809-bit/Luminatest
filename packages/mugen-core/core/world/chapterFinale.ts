// 第1章終盤 — HOW FAR THIS WORLD HAS GOT, and what that means (2026-10-12).
//
// ONE ROW, ONE WORD (`chapter1Finale`), as the first boss route keeps
// (storyArc.ts): the furthest stage reached, forward only. A save from
// before has no row, which reads as NONE. SAVE_VERSION does not move.
//
//   NONE        not begun
//   EVE         the night before has been seen (it comes at a rest once the
//               signs are at their heaviest, PHASE 3)
//   RAID        the morning has been seen to its end — the ruins, the raid,
//               the lure to the grassland: they stand before the first form
//   FORM1_WON   the first form brought down (its HP at nought — not a BREAK)
//   STOPPED     the second form brought to a stop, and what followed seen up
//               to Aria and Levi joining
//   REBUILDING  the first days of rebuilding seen
//   ENDED       the departure and CHAPTER 1 END seen
//
// WHAT EACH STAGE MEANS for the rest of the game is decided here, once
// (`finaleWorld`), so no screen works it out for itself: whether the village
// is broken, whether Kaos travels and fights, whether the road out is open,
// whether the bakery bakes.
//
// AFTER THE END (作者決定 2026-10-12): back to the title; 「つづきから」
// opens the village being rebuilt, before the departure — the village only.
// No ordinary fight, no field, nothing of chapter 2.

import type { IncidentPhase } from './aldenIncident';
import type { FinaleSceneId } from '../../content/story/chapter1Finale';

export const FINALE_STAGES = ['NONE', 'EVE', 'RAID', 'FORM1_WON', 'STOPPED', 'REBUILDING', 'ENDED'] as const;
export type FinaleStage = (typeof FINALE_STAGES)[number];

const rank = (stage: FinaleStage): number => FINALE_STAGES.indexOf(stage);

/** Whether `stage` is at least `least`. */
export function finaleReached(stage: FinaleStage, least: FinaleStage): boolean {
  return rank(stage) >= rank(least);
}

/** The stage after moving to `to`: forward only, never back. */
export function advanceFinale(from: FinaleStage, to: FinaleStage): FinaleStage {
  return rank(to) > rank(from) ? to : from;
}

/** The stage out of a save, repaired. Never fails. */
export function readFinaleStage(raw: unknown): { value: FinaleStage; health: 'ok' | 'repaired' } {
  if (raw === undefined) return { value: 'NONE', health: 'ok' };
  if (typeof raw === 'string' && (FINALE_STAGES as readonly string[]).includes(raw)) return { value: raw as FinaleStage, health: 'ok' };
  return { value: 'NONE', health: 'repaired' };
}

/**
 * WHETHER THE NIGHT BEFORE COMES AT THIS REST: the signs at their heaviest
 * (PHASE 3) and the finale not begun. The rest itself is the trigger — the
 * player has had the time between reaching PHASE 3 and lying down to be
 * ready (Kaos's 「しばらく、村から遠くへ行かない方がいいかも」 is already
 * said by then).
 */
export function eveDue(facts: { phase: IncidentPhase; stage: FinaleStage }): boolean {
  return facts.stage === 'NONE' && facts.phase >= 3;
}

/** A fight of the finale. */
export type FinaleFight = 'VALSHEEL_FORM1' | 'VALSHEEL_FORM2';

/**
 * WHAT COMES NEXT from this stage: the scenes to play in order, then a
 * fight or the end screen (or nothing), and the stage reached once they are
 * seen (for a fight: once it is won). A lost fight plays its block again
 * from the scene just before it, never the whole morning.
 */
export interface FinaleBeat {
  /**
   * What starts it: a rest in the village (the night before), straight on
   * from the beat before (AUTO — including on opening the game mid-way), or
   * the player choosing to leave from the village being rebuilt (DEPART).
   */
  trigger: 'REST' | 'AUTO' | 'DEPART';
  scenes: readonly FinaleSceneId[];
  then: FinaleFight | 'END_SCREEN' | null;
  reaches: FinaleStage;
}

export function finaleBeat(stage: FinaleStage): FinaleBeat | null {
  switch (stage) {
    case 'NONE':
      return { trigger: 'REST', scenes: ['EVE'], then: null, reaches: 'EVE' };
    case 'EVE':
      return { trigger: 'AUTO', scenes: ['RUINS_SEAL', 'MORNING', 'RAID', 'LURE'], then: null, reaches: 'RAID' };
    case 'RAID':
      // The village's first moment is told before the fight — and again
      // after a lost fight, with the grassland's few words.
      return { trigger: 'AUTO', scenes: ['VILLAGE_MIREI', 'FORM1_START'], then: 'VALSHEEL_FORM1', reaches: 'FORM1_WON' };
    case 'FORM1_WON':
      return { trigger: 'AUTO', scenes: ['VILLAGE_RIZEL', 'SHELL_BREAK'], then: 'VALSHEEL_FORM2', reaches: 'STOPPED' };
    case 'STOPPED':
      // Shown once the second form is stopped: the bakery, the stop, the
      // return, who stays, who comes. Then the first days of rebuilding.
      return { trigger: 'AUTO', scenes: ['REBUILD'], then: null, reaches: 'REBUILDING' };
    case 'REBUILDING':
      // The village being rebuilt can be walked first; leaving is the player's choice.
      return { trigger: 'DEPART', scenes: ['DEPARTURE'], then: 'END_SCREEN', reaches: 'ENDED' };
    case 'ENDED':
      return null;
  }
}

/** The scenes seen when the second form is stopped, before the stage reads STOPPED. */
export const AFTER_FORM2_SCENES: readonly FinaleSceneId[] = ['VILLAGE_BAKERY', 'STOPPED', 'RETURN', 'KAOS_STAYS', 'GRAVE_STAYS', 'ARIA_LEVI'];

/** Within the second form's fight: the finishers are let loose (Kaos's first, then the hero's). */
export const FORM2_FINISHER_SCENES: readonly FinaleSceneId[] = ['KAOS_FINISHER', 'HERO_FINISHER'];

/** What the finale's stage means for the rest of the game. */
export interface FinaleWorld {
  /** Inside the finale's own sequence: the ordinary game waits (no map, no shop, no rest). */
  inSequence: boolean;
  /** The village half broken: its words, its music, the bakery's oven. */
  villageBroken: boolean;
  /** Kaos travels with the hero and fights. */
  kaosTravels: boolean;
  /** Grave stands in the tavern (false only inside the sequence: he is out fighting). */
  graveAtTavern: boolean;
  /** The bakery bakes (false: its oven is cracked — hard bread only). */
  bakeryBakes: boolean;
  /** The road out (the region map, the forest, the ruins, ordinary fights). */
  roadOpen: boolean;
  /** The village's way out reads 「旅立つ」 (REBUILDING) — or, after the end, that chapter 2 is not yet here. */
  departure: 'NONE' | 'DEPART' | 'NOT_YET';
}

export function finaleWorld(stage: FinaleStage): FinaleWorld {
  const after = finaleReached(stage, 'STOPPED');
  return {
    inSequence: finaleReached(stage, 'EVE') && !finaleReached(stage, 'STOPPED'),
    villageBroken: after,
    kaosTravels: !after,
    graveAtTavern: !(finaleReached(stage, 'EVE') && !after),
    bakeryBakes: !after,
    roadOpen: !finaleReached(stage, 'EVE'),
    departure: stage === 'REBUILDING' ? 'DEPART' : stage === 'ENDED' ? 'NOT_YET' : 'NONE',
  };
}
