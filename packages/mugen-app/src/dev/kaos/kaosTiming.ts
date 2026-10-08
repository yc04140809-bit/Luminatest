// HOW LONG EACH PART OF KAOS'S SKILL TAKES — debug preview only.
//
// The showing the author's motion test plays for her スキル (CHAOS):
// 「双極臨界」 then 「界核崩壊」 — the name its own corner chip gives each
// half. In the same order, about as long (the whole about three seconds):
//
//   she steps in where he stood, casting → 双極臨界: her circle lights and
//   a seal of gold rays and a blue ring closes round the creature, the
//   field crossed by a great arc and drifting motes → 界核崩壊: the seal
//   falls inward into a dark core with a diamond round it → it breaks in a
//   burst of light → the last of it fades, he is back.
//
// Every step has a floor, so ×2 shortens the whole and never turns a part
// into a flicker.

import { visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';
import { stepTimes } from '../../ui/battle/scene/stepTimes';

export const KAOS_MS = {
  /** She appears where he stood, already casting. */
  ENTER: 240,
  /** 双極臨界: her circle, the seal round the creature, the arc, the motes. */
  CRITICAL: 1150,
  /** 界核崩壊: the seal falls inward into a core. */
  COLLAPSE: 820,
  /** It breaks: the light, and the creature struck. */
  BURST: 520,
  /** The last of it. */
  RECOVER: 300,
} as const;

export const KAOS_FLOOR_MS = {
  ENTER: 150,
  CRITICAL: 720,
  COLLAPSE: 520,
  BURST: 340,
  RECOVER: 200,
} as const;

export type KaosStep = keyof typeof KAOS_MS;

export function kaosMs(step: KaosStep, speed: BattleSpeed): number {
  return visualMs(KAOS_MS[step], speed, KAOS_FLOOR_MS[step]);
}

/** When everything happens, in ms from her stepping in. */
export interface KaosPlan {
  ms: Record<KaosStep, number>;
  critical: number;
  collapse: number;
  burst: number;
  recover: number;
  end: number;
}

export function kaosPlan(speed: BattleSpeed): KaosPlan {
  const ms = stepTimes(KAOS_MS, KAOS_FLOOR_MS, speed);
  const critical = ms.ENTER;
  const collapse = critical + ms.CRITICAL;
  const burst = collapse + ms.COLLAPSE;
  const recover = burst + ms.BURST;
  return { ms, critical, collapse, burst, recover, end: recover + ms.RECOVER };
}

/** Her skill's name — the author's: the cut-in says it (2026-10-08). */
export const KAOS_SKILL_NAME = '双極臨界';

/** The names the corner chip gives each half, as the motion test shows them. */
export const KAOS_PHASE_NAMES = { critical: KAOS_SKILL_NAME, collapse: '界核崩壊' } as const;
