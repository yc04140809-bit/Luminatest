// ケイオスの MP 自然回復 (作者指示 2026-10-12) — how much, and when.
//
// Small: a tenth of her most each time, never past it. The night's rest still
// fills her whole (restoreParty); these only soften a long day out, so a
// spent Kaos is not stuck spent until night. Not endless magic.
//
//   HOMECOMING   coming back into the village from outside
//   STORY_STEP   each point of the chapter's end reached (the raid seen, the
//                lure, the first form down…)
//   BETWEEN_FORMS  ヴァルシール's shell breaking, between its two forms — a
//                breath, while the fight stops

export const KAOS_MP_REGEN = {
  HOMECOMING: 0.1,
  STORY_STEP: 0.1,
  BETWEEN_FORMS: 0.1,
} as const;

/** Her magic after a recovery of `share` of her most: rounded up, never past it. */
export function mpAfterRecovery(mp: number, maxMp: number, share: number): number {
  return Math.min(maxMp, mp + Math.ceil(maxMp * share));
}
