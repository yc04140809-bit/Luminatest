// What can cross an unfinished memory. One thing, today.

import type { SummonAccidentDef } from '../../core/summon/summonAccident';
import { UNKNOWN_001 } from '../arcana/unknownArcana';

/**
 * The first accident, and the shape every one after it takes.
 *
 * There is still no character here. No hit points, no routes, no way
 * to obtain it, no name the player is allowed to read — and that is
 * the design rather than an omission. What is being tested is one
 * question: does a player who sees something enormous they cannot name
 * come away wanting to know what it was? Everything that would answer
 * the question for them is exactly what must not exist yet.
 *
 * The band stops well short of a finished memory. A page the player
 * has nearly rebuilt is a stable thing, and the sight belongs to the
 * ones that are still mostly gaps.
 */
export const UNKNOWN_ACCIDENT_001: SummonAccidentDef = {
  id: 'UNKNOWN_ANCIENT_DRAGON_001',
  enabled: true,

  /**
   * The ARCANA it turns out to be, once the world contains one.
   *
   * Reserved, not real: there is no such page, nothing grants it, and
   * nobody can own it — so the exclusion rule below never fires for it
   * yet, which is correct. It is an id and not a name; what this thing
   * is actually called is still not decided and is not decided here.
   */
  arcanaId: 'ancient_dragon',
  unknownLabel: 'UNKNOWN #001',
  unknownArcanaId: UNKNOWN_001.arcanaId,
  /** The piece of theatre the admin preview plays for it. */
  previewId: 'accident-ancient-dragon',

  // The band stops well short of a finished memory. A page the player
  // has nearly rebuilt is a stable thing, and the sight belongs to the
  // ones that are still mostly gaps. Unchanged this round: it is part
  // of whether an accident happens, and that rate is not being touched.
  minProgress: 1,
  maxProgress: 60,

  ability: {
    id: 'ancient_breath',
    name: 'エンシェントブレス',
    // The name is drawn into the artwork. Nothing may print it again.
    titleInArt: true,
    // Every enemy, not "the enemy". One creature is simply what
    // "every" comes to in the fights this game has today.
    //
    // The number is here, once, and nowhere else. It is not balance:
    // an accident is supposed to be disproportionate, and an early
    // creature caught by this is meant to go down. What it must not
    // become is a `999` written into the battle screen, so this is
    // the single place it can be changed.
    effect: { kind: 'STRIKE_ALL', amount: 999 },
  },
};

export const SUMMON_ACCIDENTS: readonly SummonAccidentDef[] = [UNKNOWN_ACCIDENT_001];

export function accidentDef(id: string): SummonAccidentDef | null {
  return SUMMON_ACCIDENTS.find((def) => def.id === id) ?? null;
}
