// WHERE EVERYONE STANDS IN THE PARTY FIGHT (PartyBattleScreen), 2026-10-12.
//
// The same picture as every fight in the game: the creature on the LEFT,
// the party on the RIGHT, standing ON THE GROUND and INTO it — a diagonal
// up the path, the way formation.ts stands the two of them in the ordinary
// fight. The front rank is lowest on the screen, nearest the creature and
// a little larger; the rank behind stands further up the path (further
// away, so higher on the glass and smaller) and further toward the party's
// own side. Further back is NEVER "higher in the air": every slot's
// `bottom` is a ground line, and the drawing's feet are on it.
//
// SLOTS, NOT PEOPLE. A slot is a place on the ground — front, middle, back
// (and a fourth, for a party of four: アリア, レヴィ…). Who stands in which
// is the fight's formation (`formation`, front to back), defaulting to
// FORMATION below. A party of one, two, three or four reads its row.
//
// TWO STAGINGS, chosen by the creature (`battleScale` on its spec), and
// ONLY the drawing changes between them — the reading, the commands and
// where they sit are the same in every fight:
//
//   NORMAL  the party at fight size, the creature about their size (its own
//           BATTLE_PRESENCE / STAGE_ENEMY_SCALE applied, as in the ordinary
//           fight).
//   GIANT   the creature drawn bigger than the screen — its head may reach
//           past the top and its feet past the bottom (ヴァルシール; later a
//           dragon, a great machine) — and the party drawn a little smaller
//           (about four fifths), in the same diagonal.
//
// Every number is a share of the screen (the field is the whole of it):
// `right` / `left` in from that edge (the drawing's box), `bottom` up from
// the foot of the screen to its feet, `height` how tall the drawing is.
// What the party keeps clear of: the command cross top right and the
// party's health under it on the right edge. Tuned on 640×300 and 844×390
// screenshots, to be moved here — and only here — after seeing it on a
// phone.

import type { BattleScale } from '@mugen/game/battle/partyBattle';
import { BATTLE_PRESENCE } from './battleArt';

/** One place on the field. */
export interface StageSpot {
  /** In from the right edge (the party's side), as a share of the width. */
  right?: number;
  /** In from the left edge (the creature's side), as a share of the width. */
  left?: number;
  /** The ground line the feet stand on, up from the foot of the screen (a share of its height). */
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
   * The party's slots, by how many there are: front first, then each rank
   * behind it (further up the path, toward the party's own side, smaller).
   */
  slots: Readonly<Record<1 | 2 | 3 | 4, readonly StageSpot[]>>;
}

/** The ranks of the ordinary staging. */
const RANKS = {
  front: { right: 0.4, bottom: 0.07, height: 0.44, depth: 4 },
  middle: { right: 0.28, bottom: 0.18, height: 0.41, depth: 3 },
  back: { right: 0.215, bottom: 0.3, height: 0.36, depth: 2 },
  /** A fourth: further toward the creature and a step up the path. */
  flank: { right: 0.47, bottom: 0.24, height: 0.37, depth: 1 },
} as const satisfies Record<string, StageSpot>;

/**
 * A GIANT's party: a little smaller (never tiny — it is the creature that is
 * made bigger), in the same diagonal, a step toward the party's side so the
 * creature has the left half.
 */
const GIANT_RANKS = {
  front: { right: 0.42, bottom: 0.06, height: 0.35, depth: 4 },
  middle: { right: 0.3, bottom: 0.17, height: 0.33, depth: 3 },
  back: { right: 0.215, bottom: 0.29, height: 0.29, depth: 2 },
  flank: { right: 0.46, bottom: 0.25, height: 0.3, depth: 1 },
} as const satisfies Record<string, StageSpot>;

type Ranks = Record<'front' | 'middle' | 'back' | 'flank', StageSpot>;
const slotsOf = (r: Ranks): PartyStage['slots'] => ({
  1: [r.middle],
  2: [r.front, r.back],
  3: [r.front, r.middle, r.back],
  4: [r.front, r.middle, r.back, r.flank],
});

export const PARTY_STAGES: Readonly<Record<BattleScale, PartyStage>> = {
  NORMAL: {
    enemy: { left: 0.05, bottom: 0.2, height: 0.44, maxWidth: 0.36, depth: 1 },
    slots: slotsOf(RANKS),
  },
  GIANT: {
    // Bigger than the screen: its feet past the bottom and its back past the
    // left edge, its head (top right of the drawing) clear of the creature's
    // plate and of the turn order.
    enemy: { left: -0.08, bottom: -0.13, height: 1.14, maxWidth: 0.56, depth: 1 },
    slots: slotsOf(GIANT_RANKS),
  },
};

/**
 * Front to back, when the fight does not say: グレイヴ in front (the heavy
 * blade), the hero in the middle, Kaos at the back (2026-10-12). Anyone
 * else after them, in the order they come.
 */
export const FORMATION: readonly string[] = ['grave', 'hero', 'kaos'];

export function stageFor(scale: BattleScale | undefined): PartyStage {
  return PARTY_STAGES[scale ?? 'NORMAL'];
}

/** Each member's slot, by id: `formation` front to back, then anyone not in it. */
export function partyPlaces(ids: readonly string[], stage: PartyStage, formation: readonly string[] = FORMATION): Record<string, StageSpot> {
  const ordered = [...formation.filter((id) => ids.includes(id)), ...ids.filter((id) => !formation.includes(id))];
  const n = Math.min(4, Math.max(1, ordered.length)) as 1 | 2 | 3 | 4;
  const slots = stage.slots[n];
  const out: Record<string, StageSpot> = {};
  ordered.slice(0, slots.length).forEach((id, i) => {
    out[id] = slots[i];
  });
  return out;
}

/**
 * A creature smaller than a person (the moss rabbit) drawn smaller than the
 * NORMAL height — staging, as BATTLE_PRESENCE is.
 */
export const STAGE_ENEMY_SCALE: Partial<Record<string, number>> = {
  moss_rabbit: 0.6,
};

/**
 * The creature's place in this staging with its own staging applied — the
 * SAME table the ordinary fight reads (battleArt's BATTLE_PRESENCE: `scale`
 * times as tall, `inset` further in, `bottom` further down), so a large
 * creature (セキリュウガ, ヌマワタリ…) is set up once for both kinds of fight.
 * A GIANT's place is its own and is used as it stands.
 */
export function enemySpot(stage: PartyStage, scale: BattleScale | undefined, artId: string): PartyStage['enemy'] {
  if ((scale ?? 'NORMAL') === 'GIANT') return stage.enemy;
  const presence = BATTLE_PRESENCE[artId];
  const small = STAGE_ENEMY_SCALE[artId] ?? 1;
  return {
    ...stage.enemy,
    left: (stage.enemy.left ?? 0) + (presence?.inset ?? 0),
    bottom: stage.enemy.bottom + (presence?.bottom ?? 0),
    height: stage.enemy.height * small * (presence?.scale ?? 1),
  };
}

/** A place as the style a drawing is given. */
export function spotStyle(spot: StageSpot): Record<string, string | number> {
  const pct = (v: number) => `${Number((v * 100).toFixed(3))}%`;
  return {
    ...(spot.right !== undefined ? { right: pct(spot.right) } : {}),
    ...(spot.left !== undefined ? { left: pct(spot.left) } : {}),
    bottom: pct(spot.bottom),
    height: pct(spot.height),
    zIndex: spot.depth,
  };
}
