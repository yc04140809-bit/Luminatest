// HOW LONG EACH PART OF LEVI'S PHANTOM SPEARS TAKES — debug preview only
// (STEP 5). From v18's `playLeviSkill` (BASE_MS: leviEnter 190,
// leviCharge 540, leviRush 330, leviBind 1080, leviStab 260,
// leviStabStep 78), rearranged into the order this step asks for:
//
//   she steps in → takes her stance → six phantom spears form round the
//   creature, one after another → they strike it ONE AT A TIME → a beat
//   → she drives in herself: the finish, a little bigger than any spear.
//
// v18 fired its six spears 78ms apart, which reads as one burst. Here
// they are 120ms apart (×2: never under 80ms), so each lands on its own
// and the six are counted, not blurred. Every step has a floor, so ×2
// shortens the whole and never turns a part into a flicker.

import { visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';
import { stepTimes } from '../../ui/battle/scene/stepTimes';

export const SPEAR_COUNT = 6;

export const LEVI_MS = {
  /** She appears where he stood. */
  ENTER: 220,
  /** Her stance: crouch, and the dark gathering on her. */
  STANCE: 480,
  /** Between one spear forming and the next. (No shorter: a beat under 90ms is not held at ×2 either.) */
  FORM_STEP: 90,
  /** One spear fading into being. */
  FORM_IN: 200,
  /** Between one spear striking and the next. */
  STAB_STEP: 120,
  /** One spear's flight into the creature. */
  STAB: 240,
  /** The breath after the sixth, before she moves. */
  HOLD: 120,
  /** Her own drive at it. */
  RUSH: 300,
  /** The finish landing, and fading. */
  IMPACT: 820,
  /** She is gone and he is back. */
  LEAVE: 260,
} as const;

export const LEVI_FLOOR_MS = {
  ENTER: 150,
  STANCE: 320,
  FORM_STEP: 90,
  FORM_IN: 140,
  STAB_STEP: 80,
  STAB: 170,
  HOLD: 80,
  RUSH: 220,
  IMPACT: 600,
  LEAVE: 180,
} as const;

export type LeviStep = keyof typeof LEVI_MS;

export function leviMs(step: LeviStep, speed: BattleSpeed): number {
  return visualMs(LEVI_MS[step], speed, LEVI_FLOOR_MS[step]);
}

/** Where in a spear's flight it goes in — its tip arrives, the creature flinches. */
export const STAB_LODGE_AT = 0.6;
/** Where in her drive her lance arrives — the finish lands. */
export const RUSH_IMPACT_AT = 0.6;
/** The spears begin to form this far into her stance. */
const FORM_FROM = 0.4;

/** When everything happens, in ms from her stepping in. */
export interface LeviPlan {
  ms: Record<LeviStep, number>;
  stance: number;
  /** When each spear begins to form. */
  form: number[];
  /** When each spear sets off. */
  launch: number[];
  /** When each spear goes in. */
  lodge: number[];
  rush: number;
  impact: number;
  leave: number;
  end: number;
}

export function leviPlan(speed: BattleSpeed): LeviPlan {
  const ms = stepTimes(LEVI_MS, LEVI_FLOOR_MS, speed);
  const each = Array.from({ length: SPEAR_COUNT }, (_, i) => i);
  const stance = ms.ENTER;
  const form = each.map((i) => Math.round(stance + ms.STANCE * FORM_FROM + i * ms.FORM_STEP));
  // They strike once she has her stance AND all six are there to see.
  const firstLaunch = Math.max(stance + ms.STANCE, form[SPEAR_COUNT - 1] + ms.FORM_IN);
  const launch = each.map((i) => firstLaunch + i * ms.STAB_STEP);
  const lodge = launch.map((t) => Math.round(t + ms.STAB * STAB_LODGE_AT));
  const rush = lodge[SPEAR_COUNT - 1] + ms.HOLD;
  const impact = Math.round(rush + ms.RUSH * RUSH_IMPACT_AT);
  const leave = impact + ms.IMPACT;
  return { ms, stance, form, launch, lodge, rush, impact, leave, end: leave + ms.LEAVE };
}
