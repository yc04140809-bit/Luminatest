// HOW LONG EACH STEP OF A SHOWING TAKES, AT THIS SPEED — one rule for
// every showing that is a row of steps (Levi's spears, Aria's arrow, his
// 零閃・天衝, and whatever comes next).
//
// Each step has its length at ×1 and a floor: ×2 halves it but never
// below the floor, so a quicker fight shortens the whole and never turns
// a part into a flicker (battleSpeed.visualMs). A step with no floor of
// its own would be a mistake, so both tables must name the same steps.

import { visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';

export type StepTable<K extends string> = Readonly<Record<K, number>>;

/** Every step's length at this speed. */
export function stepTimes<K extends string>(
  base: StepTable<K>,
  floor: StepTable<K>,
  speed: BattleSpeed,
): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const step of Object.keys(base) as K[]) out[step] = visualMs(base[step], speed, floor[step]);
  return out;
}
