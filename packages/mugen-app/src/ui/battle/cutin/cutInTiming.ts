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
 * A party finisher's quicker cut-ins (作者 2026-10-25/26 ブラッシュアップ §4・最終 §1: 初回は魅せる、以降は
 * テンポ重視 — 初回も少しだけ短く): the same cut-in, everything in it quicker. 'brisk' its first in a fight —
 * a little shorter than the whole one; 'brief' every one after — shorter still, its name whole for over a
 * second at ×1 and never under its floor at ×2 (room left for a short spoken 「彼岸花」).
 */
export type CutInPace = 'brisk' | 'brief';
export const CUT_IN_PACE_MS: Record<CutInPace, number> = { brisk: 2200, brief: 1500 };
export const CUT_IN_PACE_FLOOR_MS: Record<CutInPace, number> = { brisk: 1650, brief: 1200 };
/** The short one's, as named before. */
export const CUT_IN_BRIEF_MS = CUT_IN_PACE_MS.brief;
export const CUT_IN_BRIEF_FLOOR_MS = CUT_IN_PACE_FLOOR_MS.brief;

/** A cut-in's length at this speed (`pace`: a party finisher's quicker one). */
export function cutInMs(tier: CutInTier, speed: BattleSpeed, pace?: CutInPace): number {
  if (pace && tier === 'FINISHER') return Math.max(CUT_IN_PACE_FLOOR_MS[pace], Math.round(CUT_IN_PACE_MS[pace] / speed));
  return Math.max(CUT_IN_FLOOR_MS[tier], Math.round(CUT_IN_MS[tier] / speed));
}

/** How long its name can be read, whole and still, at this speed. */
export function nameReadableMs(tier: CutInTier, speed: BattleSpeed, pace?: CutInPace): number {
  return Math.round(cutInMs(tier, speed, pace) * (NAME_SHOWN_UNTIL - NAME_SHOWN_FROM));
}
