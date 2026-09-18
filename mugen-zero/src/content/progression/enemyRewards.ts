// WHAT BEATING A THING IS WORTH.
//
// Content, like a sell price and for the same reason: what a moss
// rabbit gives you is a decision about the game, and decisions about
// the game live where they can be read and argued with rather than
// inside the battle screen.
//
// THE NUMBERS ARE PROVISIONAL AND SAY SO. There is nothing to spend
// LUMI on but one shop and nothing a level does yet, so these are set
// to make the systems VISIBLE rather than balanced: a few fights should
// show a level up, and a few more should afford something. Balance is
// a later round's, and it is a change to this file and to nothing else.

import type { BattleReward } from '../../core/progression/battleReward';
import type { SpeciesId } from '../enemies/species';

/**
 * A fight's worth, per species.
 *
 * Not on `EnemySpeciesDef` on purpose. That file describes what a
 * creature IS — how hard it hits, what it is afraid of, what happens if
 * one of them turns out to have a life — and what it is worth to kill
 * is a fact about the ECONOMY, which is rebalanced on a different day
 * by somebody thinking about different things.
 */
export const ENEMY_REWARDS: Record<SpeciesId, BattleReward> = {
  /**
   * The creature a player learns the battle on, so it pays like one:
   * enough that the first fight visibly does something, little enough
   * that the tenth is not a living.
   *
   * 16 is exactly what level 2 costs, so THE FIRST VICTORY LEVELS YOU
   * UP — which is not a balance decision, it is a legibility one. A
   * player whose first fight says only 「EXP +14」 has been shown a
   * number; one whose first fight says 「Lv.1 → Lv.2」 has been shown a
   * system. Level 3 then lands at the third fight and 4 at the fifth,
   * which is the ordinary shape of a curve opening out.
   *
   * The herb is the one thing in the catalogue a shop would actually
   * want, which makes the forest and the shop the same loop.
   */
  moss_rabbit: {
    exp: 16,
    lumi: 9,
    items: [{ itemId: 'FOREST_HERB', quantity: 1 }],
  },
};

/** What this species is worth, or nothing for one nobody has priced. */
export function rewardForSpecies(speciesId: string): BattleReward | null {
  return ENEMY_REWARDS[speciesId as SpeciesId] ?? null;
}
