/**
 * COMBO (作者 実機 2026-10-24: 「COMBO表示もあった方がBreakして俺のターンが分かっていいよね」).
 *
 * Shown only — it changes nothing in the fight. Each blow the party lands on a creature adds to it
 * (a technique of several blows, 重撃・豪断, adds each); a creature that acts breaks it. A creature
 * BROKEN does not act — its turns pass (「BREAK中、動けない」) — so the count keeps climbing through
 * them: that is the party's moment, and the count says so. 月影's counter, on the turn a creature
 * struck, starts the next one.
 *
 * Pure: the screen keeps the last count and asks this for the next.
 */

import { isEnemyId, type PartyBeat } from '@mugen/game/battle/partyBattle';

export interface Combo {
  hits: number;
  /** Their damage together, through the count. */
  damage: number;
}

export const NO_COMBO: Combo = { hits: 0, damage: 0 };

/** From this count shown on the screen (one blow is not a combo). */
export const COMBO_SHOWN_FROM = 2;

/**
 * The count after a beat. `blows`: how many blows the beat's move strikes (1 for most; 重撃・豪断 2 —
 * the screen's own plan says, partyFx's stages + 1).
 */
export function comboAfter(prev: Combo, beat: PartyBeat, blows = 1): Combo {
  if (isEnemyId(beat.actor)) {
    // Broken, its turn passes and the count goes on; any other turn of a creature ends it.
    if (beat.kind === 'ENEMY_BROKEN') return prev;
    return beat.counter !== undefined && beat.counter > 0 ? { hits: 1, damage: beat.counter } : NO_COMBO;
  }
  if (!isEnemyId(beat.target) || beat.amount <= 0 || beat.missed) return prev;
  return { hits: prev.hits + Math.max(1, blows), damage: prev.damage + beat.amount };
}
