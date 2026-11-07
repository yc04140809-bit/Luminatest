// THINGS THAT GROW BACK (作者指示 2026-10-11: 探索の動機 — 通常素材の再出現).
//
// Most of a place's pickups are found once in a world (walkScene.ts). A few
// ordinary ones in the forest grow back: herbs, nuts, iron in the rocks —
// a couple of days after they were taken, and only some of them, never the
// whole floor at once. Rare things never come back: the mana shard in the
// rocks is the first time's only, and every pickup in the ruins (an old
// coin, the ancient shard) stays found once, as it always was.

import type { PickupRoll } from './walkScene';

export interface RegrowthRule {
  /** Days after it was taken that it is there again. */
  days: number;
  /** What it holds when it has grown back (absent: as the first time). */
  items?: readonly PickupRoll[];
}

export const PICKUP_REGROWTH: Readonly<Record<string, RegrowthRule>> = {
  // 草むら: herbs, as the first time.
  forest_pickup_001: { days: 2 },
  // 木の根元: nuts, as the first time.
  forest_pickup_002: { days: 2 },
  // 岩陰: iron only — the mana shard was the first time's alone.
  forest_pickup_003: { days: 2, items: [{ itemId: 'IRON_ORE', quantity: 1 }] },
};

export function regrowthOf(pickupId: string): RegrowthRule | null {
  return PICKUP_REGROWTH[pickupId] ?? null;
}
