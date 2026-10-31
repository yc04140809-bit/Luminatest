// HOW LONG HIS SWORD'S TRAIL AND ITS BITE ARE ON SCREEN.
//
// From v18's normal attack (BASE_MS: strike 240, hitFx 390), fitted to
// the App's own swing (battleTheatre: STRIKE 320ms, the blade arriving at
// 40% of it). The trail is drawn for the swing and a little after it —
// a trail is what the swing leaves — and the bite at the moment of
// contact. Both have floors: at ×2 the swing itself is only 160ms, and a
// trail that short is a flicker nobody reads as a sword.

import { visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';

export const SLASH_MS = { ARC: 340, BITE: 420 } as const;
export const SLASH_FLOOR_MS = { ARC: 240, BITE: 300 } as const;

export function slashMs(part: keyof typeof SLASH_MS, speed: BattleSpeed): number {
  return visualMs(SLASH_MS[part], speed, SLASH_FLOOR_MS[part]);
}

/**
 * HIS SWING, FROM WHERE HE STANDS TO THE CREATURE AND BACK — v18's
 * `playAttack` (BASE_MS: approach 430, windup 150, strike 240, impact
 * 190, recover 145, return 420), trimmed by about a fifth: v18 played one
 * swing on its own, and this is every 攻撃 of a fight. The strike keeps
 * v18's 240ms — it is the part being looked at. Each step has a floor, so
 * ×2 shortens the walk and never the swing into a blur.
 */
export const REACH_MS = {
  APPROACH: 340,
  WINDUP: 130,
  STRIKE: 240,
  HOLD: 150,
  RECOVER: 120,
  RETURN: 340,
} as const;
export const REACH_FLOOR_MS = {
  APPROACH: 190,
  WINDUP: 90,
  STRIKE: 170,
  HOLD: 100,
  RECOVER: 80,
  RETURN: 190,
} as const;
/** Where in the strike the blade arrives — v18's 43% contact pose, near enough. */
export const REACH_CONTACT_AT = 0.4;

export type ReachStep = keyof typeof REACH_MS;

export function reachMs(step: ReachStep, speed: BattleSpeed): number {
  return visualMs(REACH_MS[step], speed, REACH_FLOOR_MS[step]);
}
