// HOW LONG EACH PART OF KAOS'S 双極崩界 TAKES — debug preview only.
//
// The author's v19 (KAOS_ULTIMATE_V19_HANDOFF.md, 「基準時間」), after her
// cut-in:
//
//   magicEnter 180 → magicChannel 1700 → magicLock 720 → magicBlast 2800
//   → magicRecover 850
//
//   she steps in where he stood → 双極臨界: the gold-and-blue aura swells
//   round her → the working is fixed on the creature's centre and light,
//   sound and motes are drawn into one point → 界核崩壊: a moment of dark
//   and stillness, a white-gold flash, a great gold-and-blue blast from the
//   creature's centre, five shockwaves, fragments → back, the glow fading.
//
// Every step has a floor; at ×2 the blast keeps at least 1800ms, as v19
// says. (Its cut-in is the game's own CutIn part, timed there.)

import { visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';
import { stepTimes } from '../../ui/battle/scene/stepTimes';

export const KAOS_MS = {
  /** She appears where he stood. */
  ENTER: 180,
  /** 双極臨界: the gold-and-blue aura round her, growing. */
  CHANNEL: 1700,
  /** The working fixed on the creature's centre; everything drawn into one point. */
  LOCK: 720,
  /** 界核崩壊: the dark, the flash, the blast, the waves, the fragments. */
  BLAST: 2800,
  /** Back, with the last of the glow. */
  RECOVER: 850,
} as const;

export const KAOS_FLOOR_MS = {
  ENTER: 120,
  CHANNEL: 1000,
  LOCK: 420,
  BLAST: 1800,
  RECOVER: 500,
} as const;

export type KaosStep = keyof typeof KAOS_MS;

export function kaosMs(step: KaosStep, speed: BattleSpeed): number {
  return visualMs(KAOS_MS[step], speed, KAOS_FLOOR_MS[step]);
}

/** When everything happens, in ms from her stepping in. */
export interface KaosPlan {
  ms: Record<KaosStep, number>;
  channel: number;
  lock: number;
  blast: number;
  recover: number;
  end: number;
}

export function kaosPlan(speed: BattleSpeed): KaosPlan {
  const ms = stepTimes(KAOS_MS, KAOS_FLOOR_MS, speed);
  const channel = ms.ENTER;
  const lock = channel + ms.CHANNEL;
  const blast = lock + ms.LOCK;
  const recover = blast + ms.BLAST;
  return { ms, channel, lock, blast, recover, end: recover + ms.RECOVER };
}

/** Her skill's name — the author's v19: 「双極崩界」, as her cut-in says it. */
export const KAOS_SKILL_NAME = '双極崩界';

/** The names the corner chip gives each half (the motion test's phase label). */
export const KAOS_PHASE_NAMES = { channel: '双極臨界', blast: '界核崩壊' } as const;
