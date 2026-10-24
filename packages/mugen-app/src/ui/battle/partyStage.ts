// WHERE EVERYONE STANDS IN THE PARTY FIGHT (PartyBattleScreen), 2026-10-12.
//
// THE PARTY STANDS IN A CROSS OF FOUR FIXED PLACES (作者指示 2026-10-12, 固定方針),
// on the right of the field, laid along the ground's depth rather than
// across the screen:
//
//                    MID_UPPER            (far: up the path)
//        FRONT                    BACK
//                    MID_LOWER            (near: the camera)
//   (the creature's side)          (the party's side)
//
// A CROSS ON THE GROUND, seen from above and in front: the middle column's
// two stand one behind the other (MID_UPPER further up the path, so higher
// on the glass and smaller; MID_LOWER nearest the camera, so lowest and
// largest), and FRONT and BACK stand either side of the cross's middle on
// the same ground line — FRONT toward the creature, BACK toward the party's
// own edge.
//
// Further back is further UP THE GROUND, never up in the air: every place
// is where the FEET stand (`x` the foot's place across, `bottom` the ground
// line), and a shadow is drawn there. The four places are always the same;
// who is in which is the fight's formation — now グレイヴ in front, the
// hero mid-lower, Kaos at the back and mid-upper empty; アリア, レヴィ take
// places in this same cross when they come.
//
// TWO STAGINGS, chosen by the creature (`battleScale` on its spec), and ONLY
// the drawing changes between them — the reading and the controls sit
// exactly where they sit in every fight:
//
//   NORMAL  the party at fight size; the creature about their size (its own
//           BATTLE_PRESENCE / STAGE_ENEMY_SCALE applied, as in the ordinary
//           fight).
//   GIANT   the creature drawn bigger than the screen on the left (ヴァルシール;
//           later ヌマワタリ, a dragon, a great machine); the party a little
//           smaller (about four fifths), the cross and its depth kept.
//
// Every number is a share of the screen (the field is the whole of it).
// What the party keeps clear of: the party's health top right, the command
// cross with AUTO / ×2 bottom right. Tuned on 640×300 and 844×390
// screenshots — moved here, and only here, after seeing it on a phone.

import type { BattleScale } from '@mugen/game/battle/partyBattle';
import { BATTLE_PRESENCE } from './battleArt';

/** The four places of the party's cross. */
export type CrossSlot = 'FRONT' | 'MID_UPPER' | 'MID_LOWER' | 'BACK';
export const CROSS_SLOTS: readonly CrossSlot[] = ['FRONT', 'MID_UPPER', 'MID_LOWER', 'BACK'];

/** Where someone's feet are. */
export interface FootSpot {
  /** Across, from the left edge, as a share of the width: where the feet are. */
  x: number;
  /** The ground line, up from the foot of the screen, as a share of its height. */
  bottom: number;
  /** How tall the drawing is, as a share of the screen's height. */
  height: number;
  /** Drawing order: higher is nearer. */
  depth: number;
}

/** The creature's place: its drawing's left edge, ground line and height. */
export interface EnemySpot {
  left: number;
  bottom: number;
  height: number;
  /** Stops a wide drawing running into the party. */
  maxWidth: number;
}

export interface PartyStage {
  enemy: EnemySpot;
  cross: Readonly<Record<CrossSlot, FootSpot>>;
}

export const PARTY_STAGES: Readonly<Record<BattleScale, PartyStage>> = {
  NORMAL: {
    enemy: { left: 0.05, bottom: 0.2, height: 0.44, maxWidth: 0.36 },
    cross: {
      MID_UPPER: { x: 0.575, bottom: 0.4, height: 0.33, depth: 1 },
      FRONT: { x: 0.435, bottom: 0.22, height: 0.39, depth: 2 },
      BACK: { x: 0.7, bottom: 0.22, height: 0.39, depth: 2 },
      MID_LOWER: { x: 0.575, bottom: 0.03, height: 0.44, depth: 3 },
    },
  },
  GIANT: {
    // Bigger than the screen: its feet past the bottom and its back past the
    // left edge, its head (top right of the drawing) clear of its plate and
    // of the turn order.
    enemy: { left: -0.08, bottom: -0.13, height: 1.14, maxWidth: 0.56 },
    cross: {
      MID_UPPER: { x: 0.61, bottom: 0.39, height: 0.27, depth: 1 },
      FRONT: { x: 0.495, bottom: 0.22, height: 0.315, depth: 2 },
      BACK: { x: 0.715, bottom: 0.22, height: 0.315, depth: 2 },
      MID_LOWER: { x: 0.61, bottom: 0.04, height: 0.355, depth: 3 },
    },
  },
};

/** Who is in which place when the fight does not say (2026-10-12). */
export const DEFAULT_FORMATION: Readonly<Partial<Record<CrossSlot, string>>> = {
  FRONT: 'grave',
  MID_LOWER: 'hero',
  BACK: 'kaos',
};

/**
 * WHERE THE FEET ARE IN EACH DRAWING, across it (a share of its width): the
 * drawings are not centred on the person (Grave's great sword reaches out to
 * the left of him). The shadow is drawn there and the place's `x` is there.
 */
/**
 * HOW TALL EACH ONE IS DRAWN against the place's height: the drawings are
 * not to one scale (Kaos's hair and wings fill hers to the top; the hero's
 * sword is held low), so a person's own size is set here, once.
 */
export const FIGURE_SCALE: Partial<Record<string, number>> = {
  grave: 1.0,
  hero: 1.0,
  kaos: 0.88,
};

export const FOOT_AT: Partial<Record<string, number>> = {
  grave: 0.6,
  hero: 0.5,
  kaos: 0.52,
};

export function stageFor(scale: BattleScale | undefined): PartyStage {
  return PARTY_STAGES[scale ?? 'NORMAL'];
}

/**
 * Each member's place, by id: the formation's (slot → id), then anyone not
 * in it in the empty places, in CROSS_SLOTS order. Four places; a fifth is
 * not drawn.
 */
export function partyPlaces(
  ids: readonly string[],
  stage: PartyStage,
  formation: Readonly<Partial<Record<CrossSlot, string>>> = DEFAULT_FORMATION,
): Record<string, FootSpot & { slot: CrossSlot }> {
  const out: Record<string, FootSpot & { slot: CrossSlot }> = {};
  const taken = new Set<CrossSlot>();
  for (const slot of CROSS_SLOTS) {
    const id = formation[slot];
    if (id && ids.includes(id) && !out[id]) {
      out[id] = { ...stage.cross[slot], slot };
      taken.add(slot);
    }
  }
  const free = CROSS_SLOTS.filter((s) => !taken.has(s));
  for (const id of ids.filter((i) => !out[i])) {
    const slot = free.shift();
    if (!slot) break;
    out[id] = { ...stage.cross[slot], slot };
  }
  return out;
}

/**
 * A creature smaller than a person (the moss rabbit) drawn smaller than the
 * NORMAL height — staging, as BATTLE_PRESENCE is.
 */
export const STAGE_ENEMY_SCALE: Partial<Record<string, number>> = {
  moss_rabbit: 0.6,
  kokemaru: 0.62,
  hyourei: 0.66,
  iwahoro: 0.78,
};

/**
 * TWO OR THREE CREATURES (2026-10-12, 複数敵): where each stands, by how many
 * there are — on the left and up the path (as the ordinary fight stands its
 * creature), into the ground like the party: the first nearest the camera
 * and the party (lowest, largest), the others further up the path (higher on
 * the glass, smaller), spread so no one stands in front of another's face;
 * all of them short of グレイヴ's blade, above WORLD MEMORY and AUTO, under
 * the creature's plate. `x` is the middle of the feet across
 * the screen, `bottom` the ground line, `scale` times the creature's own
 * NORMAL height. One creature stands where a fight of one has it.
 */
export interface EnemySlot {
  x: number;
  bottom: number;
  scale: number;
  depth: number;
}
export const ENEMY_SLOTS: Readonly<Record<2 | 3, readonly EnemySlot[]>> = {
  2: [
    { x: 0.22, bottom: 0.27, scale: 0.8, depth: 3 },
    { x: 0.085, bottom: 0.45, scale: 0.68, depth: 2 },
  ],
  3: [
    { x: 0.23, bottom: 0.27, scale: 0.72, depth: 4 },
    { x: 0.08, bottom: 0.4, scale: 0.62, depth: 3 },
    { x: 0.21, bottom: 0.54, scale: 0.52, depth: 2 },
  ],
};

/**
 * A CREATURE'S STAGING IN THE PARTY FIGHT ONLY, where it differs from the
 * ordinary fight's (BATTLE_PRESENCE) — same shape: `scale` times as tall,
 * `inset` added to its distance from the left edge (negative: nearer the
 * edge), `bottom` added to its ground line (positive: further up the path,
 * i.e. further back).
 *
 * セキリュウガ (作者 2026-10-12): in the ordinary fight it stands a step
 * nearer (1.2×); against three, グレイヴ's great sword reached it. So here it
 * is drawn larger and further back — up the path and toward the edge — and
 * the blade stops short of it.
 */
export const PARTY_PRESENCE: Partial<Record<string, { scale: number; inset: number; bottom: number }>> = {
  sekiryuga: { scale: 1.32, inset: -0.035, bottom: 0.05 },
};

/**
 * The creature's place with its own staging applied — the SAME table the
 * ordinary fight reads (battleArt's BATTLE_PRESENCE: `scale` times as tall,
 * `inset` further in, `bottom` further down), so a large creature (セキリュウガ,
 * ヌマワタリ…) is set up once for both kinds of fight. A GIANT's place is its
 * own and is used as it stands.
 */
export function enemySpot(stage: PartyStage, scale: BattleScale | undefined, artId: string): EnemySpot {
  if ((scale ?? 'NORMAL') === 'GIANT') return stage.enemy;
  const presence = PARTY_PRESENCE[artId] ?? BATTLE_PRESENCE[artId];
  const small = STAGE_ENEMY_SCALE[artId] ?? 1;
  return {
    ...stage.enemy,
    left: stage.enemy.left + (presence?.inset ?? 0),
    bottom: stage.enemy.bottom + (presence?.bottom ?? 0),
    height: stage.enemy.height * small * (presence?.scale ?? 1),
  };
}

const pct = (v: number) => `${Number((v * 100).toFixed(3))}%`;

/** The creature's place as the style its drawing is given. */
export function enemyStyle(spot: EnemySpot): Record<string, string | number> {
  return { left: pct(spot.left), bottom: pct(spot.bottom), height: pct(spot.height), maxWidth: pct(spot.maxWidth), zIndex: 1 };
}

/**
 * A member's place as the style their figure is given: its left edge at the
 * feet, pulled back by where the feet are in the drawing (`--pb-foot`).
 */
export function footStyle(spot: FootSpot, foot: number, scale = 1): Record<string, string | number> {
  return {
    left: pct(spot.x),
    bottom: pct(spot.bottom),
    height: pct(spot.height * scale),
    zIndex: 2 + spot.depth,
    ['--pb-foot' as string]: String(foot),
    ['--pb-h' as string]: String(spot.height * scale),
  };
}

/**
 * Every creature's place, as the style its drawing is given, in the fight's
 * order. One: its own place (enemySpot). Two or three: ENEMY_SLOTS, each at
 * its own height (its art's STAGE_ENEMY_SCALE and BATTLE_PRESENCE scale, as a
 * fight of one draws it) times the slot's.
 */
export function enemyPlaces(stage: PartyStage, scale: BattleScale | undefined, artIds: readonly string[]): { style: Record<string, string | number> }[] {
  if (artIds.length <= 1) return [{ style: enemyStyle(enemySpot(stage, scale, artIds[0] ?? '')) }];
  const slots = ENEMY_SLOTS[artIds.length >= 3 ? 3 : 2];
  return artIds.map((artId, i) => {
    const slot = slots[Math.min(i, slots.length - 1)];
    const own = enemySpot(PARTY_STAGES.NORMAL, 'NORMAL', artId).height;
    return {
      style: {
        left: pct(slot.x),
        bottom: pct(slot.bottom),
        height: pct(own * slot.scale),
        maxWidth: pct(0.24),
        zIndex: slot.depth,
        transform: 'translateX(-50%)',
      },
    };
  });
}
