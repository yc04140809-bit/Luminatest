// HOW LONG EACH PART OF ARIA'S BLUE-ROSE ARROW TAKES — debug preview only
// (STEP 7). From v18's `playAriaSkill` (BASE_MS: ariaEnter 200,
// ariaCharge 700, ariaShot 520, ariaBloom 1600, ariaBless 1550,
// ariaRecover 320), trimmed by about a fifth — v18 played it on its own,
// with nothing before or after — and kept in v18's order:
//
//   she steps in where he stood → draws her bow at the sky → the arrow
//   flies up and bursts in a star → a blue rose opens over the field → its
//   light falls on the party with the petals, he is back → the last of it
//   fades.
//
// Every step has a floor, so ×2 shortens the whole and never turns a part
// into a flicker.

import { visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';
import { stepTimes } from '../../ui/battle/scene/stepTimes';

export const ARIA_MS = {
  /** She appears where he stood. */
  ENTER: 200,
  /** Her draw: the bow bent, the light gathering at the arrow. */
  DRAW: 600,
  /** The arrow's flight up, and the star it bursts into. */
  SHOT: 480,
  /** The blue rose opening over the field. */
  BLOOM: 1200,
  /** Its light on the party, the petals, and he is back. */
  BLESS: 1240,
  /** The last petals. */
  RECOVER: 240,
} as const;

export const ARIA_FLOOR_MS = {
  ENTER: 130,
  DRAW: 380,
  SHOT: 300,
  BLOOM: 800,
  BLESS: 820,
  RECOVER: 180,
} as const;

export type AriaStep = keyof typeof ARIA_MS;

export function ariaMs(step: AriaStep, speed: BattleSpeed): number {
  return visualMs(ARIA_MS[step], speed, ARIA_FLOOR_MS[step]);
}

/** Where in the flight the arrow bursts (v18: the star at 48–68% of the shot). */
export const SHOT_LAND_AT = 0.55;
/** Where in the blessing he is back and she goes (v18 `revealAt`, 56%). */
export const BLESS_RETURN_AT = 0.56;

/** When everything happens, in ms from her stepping in. */
export interface AriaPlan {
  ms: Record<AriaStep, number>;
  draw: number;
  shot: number;
  land: number;
  bloom: number;
  bless: number;
  back: number;
  recover: number;
  end: number;
}

export function ariaPlan(speed: BattleSpeed): AriaPlan {
  const ms = stepTimes(ARIA_MS, ARIA_FLOOR_MS, speed);
  const draw = ms.ENTER;
  const shot = draw + ms.DRAW;
  const land = Math.round(shot + ms.SHOT * SHOT_LAND_AT);
  const bloom = shot + ms.SHOT;
  const bless = bloom + ms.BLOOM;
  const back = Math.round(bless + ms.BLESS * BLESS_RETURN_AT);
  const recover = bless + ms.BLESS;
  return { ms, draw, shot, land, bloom, bless, back, recover, end: recover + ms.RECOVER };
}
