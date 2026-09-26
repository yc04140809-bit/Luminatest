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
