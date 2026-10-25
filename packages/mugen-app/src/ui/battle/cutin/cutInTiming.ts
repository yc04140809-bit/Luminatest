// HOW LONG A CUT-IN IS ON SCREEN — at ×1, at ×2, and never shorter
// than the name on it takes to read.
//
// FROM THE v18 BATTLE-ANIMATION PROTOTYPE, WHERE THIS WAS ALREADY FIXED
// ONCE. Its cut-ins first ran BASE_MS / speed, which at ×2 put a skill's
// name on screen for well under half a second; Aria's cut-in was then
// given a floor (2500ms at ×1, never under 1800ms at ×2) and a curve that
// holds the name longer (its `aria-cutin-*-hold` keyframes). That fix is
// the rule here, for every cut-in:
//
//   - every cut-in uses v18's HOLD curve (see cutin.css): the name is
//     fully shown from 17% to 88% of the cut-in — 71% of it;
//   - a FINISHER (必殺技・大技) is v18 Aria's exactly: 2500ms, floor 1800ms;
//   - an ordinary SKILL (通常技) is 1400ms, floor 1100ms — inside the
//     1.1〜1.5s asked for, and its ×2 floor keeps the name readable for
//     ~0.8s, more than twice the 0.38s cut-in that could not be read.
//
// ×2 still shortens a cut-in — just never below its floor.

import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';

export type CutInTier = 'SKILL' | 'FINISHER';

/** A whole cut-in at ×1, fade in to fade out. */
export const CUT_IN_MS: Record<CutInTier, number> = {
  SKILL: 1400,
  FINISHER: 2500,
};

/** The shortest a cut-in may become at any speed. */
export const CUT_IN_FLOOR_MS: Record<CutInTier, number> = {
  SKILL: 1100,
  FINISHER: 1800,
};

/** The part of a cut-in the name is fully shown for (v18's hold curve: 17%→88%). */
export const NAME_SHOWN_FROM = 0.17;
export const NAME_SHOWN_UNTIL = 0.88;

/**
 * A finisher already seen in this fight (作者 2026-10-25 ブラッシュアップ §4: 初回は魅せる、以降はテンポ重視):
 * its short cut-in — the same cut-in, everything in it quicker, the name still whole for over a second
 * at ×1 and never under its floor at ×2.
 */
export const CUT_IN_BRIEF_MS = 1500;
export const CUT_IN_BRIEF_FLOOR_MS = 1200;

/** A cut-in's length at this speed (`brief`: a finisher seen already in this fight). */
export function cutInMs(tier: CutInTier, speed: BattleSpeed, brief = false): number {
  if (brief && tier === 'FINISHER') return Math.max(CUT_IN_BRIEF_FLOOR_MS, Math.round(CUT_IN_BRIEF_MS / speed));
  return Math.max(CUT_IN_FLOOR_MS[tier], Math.round(CUT_IN_MS[tier] / speed));
}

/** How long its name can be read, whole and still, at this speed. */
export function nameReadableMs(tier: CutInTier, speed: BattleSpeed, brief = false): number {
  return Math.round(cutInMs(tier, speed, brief) * (NAME_SHOWN_UNTIL - NAME_SHOWN_FROM));
}
