// HOW LONG EACH PART OF 零閃・天衝 TAKES — debug preview only (STEP 9).
// From v18's `playHeroSkill` (BASE_MS: heroCharge 340, heroDash 265,
// heroHitStop 170, heroMoon 2150, heroImpactPause 160, heroBreak 1250,
// heroSkillRecover 260, heroSkillReturn 420), a little trimmed, in the
// order the roadmap gives:
//
//   his sword gathers → he dashes through, past the creature → a held
//   instant → 暗転: the field goes to black, a RED MOON rises → one cut
//   across it → the moon and the screen split in two → the halves fall →
//   back on the field: the cut lands, BLACK BLOOD sprays → he recovers
//   and walks home.
//
// The moon scene keeps v18's floor (1.4s at ×2): it is the part being
// watched, and a moon cut in half in less than that is not seen.

import { visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';

export const ZERO_MS = {
  /** His sword gathering, the red glow on him. */
  CHARGE: 340,
  /** Through and past the creature. */
  DASH: 260,
  /** The held instant after. */
  HITSTOP: 150,
  /** The red moon: black, the moon, the cut, the halves falling. */
  MOON: 1900,
  /** Back on the field, the breath before the cut lands. */
  PAUSE: 140,
  /** The cut landing: the rift, the lines, the black blood. */
  BREAK: 1100,
  /** His stance easing. */
  RECOVER: 240,
  /** The walk home. */
  RETURN: 380,
} as const;

export const ZERO_FLOOR_MS = {
  CHARGE: 230,
  DASH: 190,
  HITSTOP: 90,
  MOON: 1400,
  PAUSE: 90,
  BREAK: 900,
  RECOVER: 160,
  RETURN: 260,
} as const;

export type ZeroStep = keyof typeof ZERO_MS;

export function zeroMs(step: ZeroStep, speed: BattleSpeed): number {
  return visualMs(ZERO_MS[step], speed, ZERO_FLOOR_MS[step]);
}

/** Where in the moon scene the cut comes (v18: 30%). */
export const MOON_CUT_AT = 0.3;

/** When everything happens, in ms from the first gathering. */
export interface ZeroPlan {
  ms: Record<ZeroStep, number>;
  dash: number;
  hitstop: number;
  moon: number;
  cut: number;
  pause: number;
  break: number;
  recover: number;
  return: number;
  end: number;
}

export function zeroPlan(speed: BattleSpeed): ZeroPlan {
  const ms = Object.fromEntries(
    (Object.keys(ZERO_MS) as ZeroStep[]).map((step) => [step, zeroMs(step, speed)]),
  ) as Record<ZeroStep, number>;
  const dash = ms.CHARGE;
  const hitstop = dash + ms.DASH;
  const moon = hitstop + ms.HITSTOP;
  const cut = Math.round(moon + ms.MOON * MOON_CUT_AT);
  const pause = moon + ms.MOON;
  const brk = pause + ms.PAUSE;
  const recover = brk + ms.BREAK;
  const ret = recover + ms.RECOVER;
  return { ms, dash, hitstop, moon, cut, pause, break: brk, recover, return: ret, end: ret + ms.RETURN };
}
