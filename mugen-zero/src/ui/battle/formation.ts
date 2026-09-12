// WHERE THE PARTY STANDS.
//
// One table, read by the party layer and by nothing else. A slot is a
// place on the field, not a character: who occupies it comes from the
// roster, and the roster's length is what picks the row below.
//
// This is the whole of "a third member does not need new code". Adding
// somebody is adding them to the party; where they stand is already
// written down here.

/** One standing place, said in shares of the field rather than pixels. */
export interface SlotPlacement {
  /**
   * How far in from the party's own edge of the field, as a share of
   * its width. Zero is hard against the edge.
   */
  inset: number;
  /** How far off the ground line, as a share of the field's height. */
  bottom: number;
  /**
   * Drawing order. Higher is nearer the viewer.
   *
   * Optional, and the absence means something: a slot with no depth
   * gets no `z-index` at all, which is not the same as `z-index: 0`.
   * `auto` leaves an element in ordinary document order and creates no
   * stacking context; zero creates one, and anything inside it that had
   * a z-index of its own would start being measured against the new
   * context instead of the page. The prototype's creature has always
   * been `auto`, so it stays expressible.
   */
  depth?: number;
}

/** As many as a fight is drawn for. */
export const MAX_PARTY = 4;

/**
 * The formations, one row per party size.
 *
 * TWO IS THE MEASURED ONE. Its numbers are the ones the landscape pass
 * settled on — 25% in and on the ground for the front rank, hard
 * against the edge and a step up the path for the back — and they are
 * fixed by a test so this table can grow without moving anybody who is
 * already standing correctly.
 *
 * One, three and four are PROVISIONAL: the shape is right (a front rank
 * nearest the enemy, the rest stepped back and up the path) but the
 * exact numbers are for whoever draws the fight that first needs them.
 * They are here so that day is a change to this table and to nothing
 * else.
 */
export const PARTY_FORMATIONS: Readonly<Record<number, readonly SlotPlacement[]>> = {
  1: [{ inset: 0.16, bottom: 0.03, depth: 1 }],
  2: [
    { inset: 0.25, bottom: 0.03, depth: 2 },
    { inset: 0.0, bottom: 0.13, depth: 1 },
  ],
  3: [
    { inset: 0.3, bottom: 0.02, depth: 3 },
    { inset: 0.09, bottom: 0.11, depth: 2 },
    { inset: 0.0, bottom: 0.2, depth: 1 },
  ],
  4: [
    { inset: 0.34, bottom: 0.02, depth: 4 },
    { inset: 0.15, bottom: 0.09, depth: 3 },
    { inset: 0.06, bottom: 0.17, depth: 2 },
    { inset: 0.0, bottom: 0.25, depth: 1 },
  ],
};

/**
 * The places for a party of this size.
 *
 * A count outside the table is not a crash: one is the smallest fight
 * that can be drawn and four is the largest that has places, so a
 * roster longer than that stands in the four places and the layer draws
 * the ones it has room for.
 */
export function partyFormation(count: number): readonly SlotPlacement[] {
  const n = Math.min(MAX_PARTY, Math.max(1, Math.floor(count)));
  return PARTY_FORMATIONS[n];
}

// ---------------------------------------------------------------------
// THE PROTOTYPE'S CAST, which is a fixed three rather than a party of N.
//
// The table above answers "where does the Nth of a party stand". The
// forest fight asks a different question — it has one creature, one
// hero, one Kaos and sometimes a summoned memory, and their places were
// tuned as a scene rather than derived from a count. So they are a
// named record here rather than another row of PARTY_FORMATIONS, which
// would have had to pretend a creature is a party member.
//
// WHAT THESE NUMBERS ARE. Exactly what was in the stylesheet before
// this table existed, converted from percentages to the shares
// `SlotPlacement` is written in and nothing else:
//
//   .bp-enemy         left: 8%   bottom: 38%   (no z-index)
//   .bp-enemy.downed  left: 4%   bottom: 30%
//   .bp-hero          right: 25% bottom: 7%    z-index: 2
//   .bp-kaos          right: 0   bottom: 19%   z-index: 1
//   .bp-summon        right: 42% bottom: 9%    z-index: 2
//
// They are not improved, rounded or re-tuned. The whole point of moving
// them was that a position which lives in a stylesheet cannot be
// changed while a fight is running — a camera cannot lean towards
// somebody standing at a constant. Where they stand today is not in
// question and must not move; e2e/battleFormation.spec.ts holds them to
// these exact values at three widths.

/** Which edge of the field a placement's inset is measured from. */
export type FieldEdge = 'left' | 'right';

export interface PrototypePlacement extends SlotPlacement {
  edge: FieldEdge;
}

/**
 * Everybody the forest fight can put on the field.
 *
 * `enemy` and `enemyDowned` are the same creature in two states rather
 * than two characters: the stylesheet expressed the second as an
 * override on a class, and it is a second entry here for the same
 * reason it was a second rule there.
 */
export const PROTOTYPE_PLACEMENTS = {
  /**
   * It is over there, on the left, further up the path: one end of a
   * wide field, with the two of them at the other, so the ground
   * between them reads as a distance.
   */
  enemy: { edge: 'left', inset: 0.08, bottom: 0.38 },
  /**
   * Down, and still there — it stays on the field for the whole of the
   * question the player is about to be asked. It lies lower and further
   * into the grass than it stood.
   */
  enemyDowned: { edge: 'left', inset: 0.04, bottom: 0.3 },
  /**
   * He is nearest, on the right, between her and it. Nearest means
   * largest, but only just: too much and he stops being a person
   * standing closer and becomes a giant.
   */
  hero: { edge: 'right', inset: 0.25, bottom: 0.07, depth: 2 },
  /**
   * She is a step behind him and a little further back, close enough to
   * read as one party rather than two people on the same side. Her wings
   * make her drawing wider than it is tall, so she needs the whole of
   * the right edge to stand clear of him.
   */
  kaos: { edge: 'right', inset: 0.0, bottom: 0.19, depth: 1 },
  /**
   * The player's side, in front of both of them: clear of the hero's
   * shoulder on one side and — because it stands much lower down the
   * path — well clear of the creature being fought on the other.
   */
  summon: { edge: 'right', inset: 0.42, bottom: 0.09, depth: 2 },
} as const satisfies Readonly<Record<string, PrototypePlacement>>;

export type PrototypeSlot = keyof typeof PROTOTYPE_PLACEMENTS;

/**
 * A placement, as the style a screen puts on the element.
 *
 * One function so that "what a placement means in pixels" is written
 * once. `zIndex` is omitted rather than set when a slot has no depth —
 * see the note on `SlotPlacement.depth` for why that distinction is
 * load-bearing and not tidiness.
 */
export function placementStyle(placement: PrototypePlacement): {
  left?: string;
  right?: string;
  bottom: string;
  zIndex?: number;
} {
  return {
    [placement.edge]: percent(placement.inset),
    bottom: percent(placement.bottom),
    ...(placement.depth === undefined ? {} : { zIndex: placement.depth }),
  };
}

/**
 * A share, as the percentage the stylesheet would have written.
 *
 * Rounded because binary floating point does not hold sevenths of a
 * hundred: `0.07 * 100` is 7.000000000000001, and while a browser parses
 * that to the same pixel, it has no business appearing in the DOM. Four
 * decimals is far finer than a placement is ever authored to.
 */
function percent(share: number): string {
  return `${Number((share * 100).toFixed(4))}%`;
}

/** The style for one of the prototype's slots, by name. */
export function prototypeStyle(slot: PrototypeSlot): ReturnType<typeof placementStyle> {
  return placementStyle(PROTOTYPE_PLACEMENTS[slot]);
}
