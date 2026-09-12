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
 * HOW BIG A PERSON IS ON A FIELD THAT IS NOW THE WHOLE SCREEN.
 *
 * `content/art/spriteFrames` says how tall somebody is as a share of
 * the battlefield, and that is a fact about them which must not move:
 * it is the same number on the story's battle screen, on the encounter
 * and on the life choice.
 *
 * What moved is the battlefield. It used to be the middle of three
 * bands — about two thirds of the screen's height — and it is now all
 * of it, so the same share draws a half again bigger person. This is
 * the one number that turns a share of the OLD field into a share of
 * the new one.
 *
 * It is UNDER that ratio rather than equal to it, and by a real margin:
 * at parity everybody would be exactly the size they were, and the
 * brief asks for characters a little smaller than that with real ground
 * between them — and for a field that still reads when there are four
 * of them standing on it rather than two. At 0.5 the hero is about a
 * fifth shorter on screen than he was.
 *
 * Applied by the battle screen at the point of drawing, so no other
 * screen in the game so much as notices.
 */
export const FIELD_FIGURE_SCALE = 0.5;

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
// WHAT THESE NUMBERS ARE, AND WHY THEY MOVED ONCE.
//
// They began as exactly what the stylesheet held before this table
// existed, converted from percentages to shares and not otherwise
// touched. The BATTLE SCREEN OVERHAUL moved them once, and for one
// reason: they are shares of the FIELD, and the field stopped being the
// middle band of a three-band screen and became the whole of it. A
// creature standing 38% up a 258-pixel band is standing 38% up a
// 390-pixel screen after the change, which is half again higher and
// most of the way into the panel above it.
//
// So every `bottom` here was re-derived against the screen the field is
// now, and every `inset` against the corners the reading moved into:
//
//   - nobody's head reaches the panels. The top left corner holds the
//     turn order and the creature's health and the top right the place
//     and the party; the tallest head on the field comes up to about
//     0.6 of it and both corners stop above that. e2e/battleHud.spec.ts
//     is what actually holds that apart, by measuring the boxes rather
//     than trusting the arithmetic in this comment;
//   - the two sides are far enough apart that the middle of the field
//     is empty, which is where an attack, a spell and a summon happen;
//   - the party's own spacing is wide enough to take two more people.
//     Where those two stand is PARTY_FORMATIONS above, not here.
//
// e2e/battleFormation.spec.ts holds them to these values at three
// widths, so the next thing that moves them has to mean it.

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
  enemy: { edge: 'left', inset: 0.1, bottom: 0.42 },
  /**
   * Down, and still there — it stays on the field for the whole of the
   * question the player is about to be asked. It lies lower and further
   * into the grass than it stood.
   */
  enemyDowned: { edge: 'left', inset: 0.06, bottom: 0.36 },
  /**
   * And where somebody STANDS, which is not where a small animal does.
   *
   * The two slots above were measured for a moss rabbit: sixty-odd
   * pixels of creature, well up the path, small because it is far away.
   * A person is twice that — Gald is the height the hero is — and put
   * at the creature's ground line his head goes straight through the
   * plate above him.
   *
   * So he stands NEARER: lower down the field, which is closer to the
   * camera, which is also the truth about the fight. You are at arm's
   * length from a man with a knife and half a clearing from a rabbit.
   */
  enemyNear: { edge: 'left', inset: 0.06, bottom: 0.28 },
  enemyNearDowned: { edge: 'left', inset: 0.03, bottom: 0.24 },
  /**
   * He is nearest, on the right, between her and it. Nearest means
   * largest, but only just: too much and he stops being a person
   * standing closer and becomes a giant.
   */
  hero: { edge: 'right', inset: 0.32, bottom: 0.27, depth: 2 },
  /**
   * She is a step behind him and a little further back, close enough to
   * read as one party rather than two people on the same side. Her wings
   * make her drawing wider than it is tall, so the gap to him is
   * measured from their edges and not their feet. Off the screen's own
   * edge now rather than hard against it: the party column is in that
   * corner, and a wing disappearing under a panel is the one thing this
   * layout must not do.
   */
  kaos: { edge: 'right', inset: 0.14, bottom: 0.33, depth: 1 },
  /**
   * The player's side, in front of both of them: clear of the hero's
   * shoulder on one side and — because it stands much lower down the
   * path — well clear of the creature being fought on the other.
   */
  summon: { edge: 'right', inset: 0.46, bottom: 0.28, depth: 2 },
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
