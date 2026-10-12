// WHERE EVERYONE STANDS IN THE PARTY FIGHT (PartyBattleScreen), 2026-10-12.
//
// The same picture as every fight in the game: the creature on the LEFT,
// the party on the RIGHT, the party standing in a shape rather than a row
// — a triangle for three, one at the apex further up the path and two
// nearer the camera below it (formation.ts's idea of depth: further back
// is higher and smaller).
//
// TWO STAGINGS, chosen by the creature (`battleScale` on its spec):
//
//   NORMAL  the party at fight size, the creature about their size.
//   GIANT   the creature takes the left of the screen, drawn as big as the
//           screen allows (ヴァルシール; later a dragon, a great machine, a
//           giant beast — the same table, nothing new in the screen); the
//           party drawn small and drawn together on the right, still a
//           triangle.
//
// Every number is a share of the screen (the field is the whole of it):
// `right` / `left` in from that edge, `bottom` up from the foot, `height`
// how tall the drawing is. The corners they keep clear of: the command
// cross top right, the party's health bottom right, the creature's plate
// top left, the turn order and the last line said top centre.
//
// Provisional, as staging is: tuned on 640×300 and 844×390 screenshots,
// to be moved here — and only here — after seeing it on a phone.

import type { BattleScale } from '@mugen/game/battle/partyBattle';

/** One place on the field. */
export interface StageSpot {
  /** In from the right edge (the party's side), as a share of the width. */
  right?: number;
  /** In from the left edge (the creature's side), as a share of the width. */
  left?: number;
  /** Up from the foot of the screen, as a share of its height. */
  bottom: number;
  /** How tall the drawing is, as a share of the screen's height. */
  height: number;
  /** Drawing order: higher is nearer. */
  depth: number;
}

export interface PartyStage {
  /** The creature. `maxWidth` stops a wide drawing running into the party. */
  enemy: StageSpot & { maxWidth: number };
  /**
   * The party's three places: the apex (furthest back, highest), then the
   * near left (toward the creature) and the near right.
   */
  party: readonly [StageSpot, StageSpot, StageSpot];
}

export const PARTY_STAGES: Readonly<Record<BattleScale, PartyStage>> = {
  NORMAL: {
    enemy: { left: 0.05, bottom: 0.2, height: 0.44, maxWidth: 0.36, depth: 1 },
    party: [
      { right: 0.33, bottom: 0.46, height: 0.32, depth: 1 },
      { right: 0.42, bottom: 0.12, height: 0.4, depth: 3 },
      { right: 0.29, bottom: 0.08, height: 0.42, depth: 2 },
    ],
  },
  GIANT: {
    enemy: { left: 0.0, bottom: 0.0, height: 0.97, maxWidth: 0.5, depth: 1 },
    party: [
      { right: 0.22, bottom: 0.48, height: 0.21, depth: 1 },
      { right: 0.25, bottom: 0.3, height: 0.23, depth: 3 },
      { right: 0.12, bottom: 0.32, height: 0.22, depth: 2 },
    ],
  },
};

/**
 * Who stands where: Kaos at the apex, Grave near and toward the creature
 * (the heavy blade in front), the hero near on the right. Anyone else in
 * the order they come, in what places are left.
 */
export const STAND_ORDER: readonly string[] = ['kaos', 'grave', 'hero'];

export function stageFor(scale: BattleScale | undefined): PartyStage {
  return PARTY_STAGES[scale ?? 'NORMAL'];
}

/** Each member's place, by id. */
export function partyPlaces(ids: readonly string[], stage: PartyStage): Record<string, StageSpot> {
  const out: Record<string, StageSpot> = {};
  const ordered = [...STAND_ORDER.filter((id) => ids.includes(id)), ...ids.filter((id) => !STAND_ORDER.includes(id))];
  ordered.slice(0, stage.party.length).forEach((id, i) => {
    out[id] = stage.party[i];
  });
  return out;
}

/**
 * A creature smaller than a person (the moss rabbit) is drawn smaller than
 * the NORMAL height — staging, as BATTLE_PRESENCE is.
 */
export const STAGE_ENEMY_SCALE: Partial<Record<string, number>> = {
  moss_rabbit: 0.6,
};

/** A place as the style a drawing is given. */
export function spotStyle(spot: StageSpot, scale = 1): Record<string, string | number> {
  const pct = (v: number) => `${Number((v * 100).toFixed(3))}%`;
  return {
    ...(spot.right !== undefined ? { right: pct(spot.right) } : {}),
    ...(spot.left !== undefined ? { left: pct(spot.left) } : {}),
    bottom: pct(spot.bottom),
    height: pct(spot.height * scale),
    zIndex: spot.depth,
  };
}
