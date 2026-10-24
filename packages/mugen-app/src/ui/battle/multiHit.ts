/**
 * A MOVE OF SEVERAL CUTS (作者 2026-10-24, A: 「《瞬断》を3ヒット化し、総ダメージ量は現在と同じに」).
 *
 * Looks only. The fight decides one blow and one amount, as it always has (heroSkills SHUNDAN,
 * power 2.0); the screen shows that amount as three cuts, three numbers that add up to it, and
 * COMBO three more. Before TIGS nothing new is added to what a skill does — only how it looks
 * and feels.
 *
 * Pure: which moves cut more than once, how the amount is shared, when each cut lands.
 */

import type { Blow } from './blows';

/**
 * A blow that is one cut of a move of several (0, 1, 2), its number to stand a little aside from the
 * others'. Carried on the blow itself (blows.ts is the Artifact's copy and stays as it is: its list
 * keeps each blow whole, so the extra field goes through untouched).
 */
export type CutBlow = Blow & { cut?: number };
export const cutOf = (blow: Blow): number | undefined => (blow as CutBlow).cut;

/** A move's cuts: each one's share of the whole (they add up to 1). */
export const MULTI_HIT: Readonly<Record<string, readonly number[]>> = {
  // 主人公 《瞬断》: three — the last the heaviest.
  shundan: [0.3, 0.3, 0.4],
};

/** The shares of a move that cuts more than once, or null (one blow, as before). */
export function multiHitOf(skillId: string | undefined | null): readonly number[] | null {
  return (skillId && MULTI_HIT[skillId]) || null;
}

/**
 * The amount shared over the cuts: whole numbers, in order, adding up to `total` exactly (the last
 * takes what is left over). Each at least 1 while there is enough to go round; with less, the
 * early cuts show nothing (a nought draws no number) and the last carries it.
 */
export function splitDamage(total: number, shares: readonly number[]): number[] {
  const n = shares.length;
  const whole = Math.max(0, Math.round(total));
  if (n <= 1) return [whole];
  // Too little to go round: a 1 on each of the last cuts, nought before them.
  if (whole < n) return shares.map((_, i) => (i >= n - whole ? 1 : 0));
  const parts = shares.slice(0, -1).map((s) => Math.max(1, Math.floor(whole * s)));
  const last = whole - parts.reduce((s, x) => s + x, 0);
  if (last >= 1) return [...parts, last];
  // The early shares took it all (a list heavy at the front): evenly, the remainder on the last.
  const even = Math.floor(whole / n);
  return [...parts.map(() => even), whole - even * (n - 1)];
}

/**
 * The gap between cuts (ms) at the fight's speed — never closer than MULTI_HIT_GAP_FLOOR_MS, so at ×2
 * they are still three cuts and not one blur (作者: ×1 / ×2 の両方で速すぎて潰れない).
 */
export const MULTI_HIT_GAP_MS = 230;
export const MULTI_HIT_GAP_FLOOR_MS = 140;
export function multiHitGap(speedFactor: number): number {
  return Math.max(MULTI_HIT_GAP_FLOOR_MS, Math.round(MULTI_HIT_GAP_MS * speedFactor));
}
