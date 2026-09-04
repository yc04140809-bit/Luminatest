// What can cross an unfinished memory. One thing, today.

import type { SummonAccidentDef } from '../../core/summon/summonAccident';
import { UNKNOWN_001 } from '../arcana/unknownArcana';

/**
 * The first accident.
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
  minProgress: 1,
  maxProgress: 60,

  // Common the first time, and rare forever after. Not "never again":
  // a player who was looking away when it happened would otherwise
  // have missed the strangest thing in the build for good, and
  // 「またアイツだ」 is worth having as its own moment later.
  weight: 1,
  repeatWeight: 0.08,
  repeatPolicy: 'UNTIL_ACQUIRED',
  // A month of world time between sightings. Whatever else it is, it
  // must never read as a mechanic that turns up twice in an afternoon.
  cooldownDays: 30,

  unknownArcanaId: UNKNOWN_001.arcanaId,
  // Nothing to resolve into yet. When the real page exists this names
  // it, and the same rule that reads this field takes the creature out
  // of the accident pool the moment the player owns it — no code here
  // and no `if` about dragons anywhere.
  resolvedArcanaId: null,

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
