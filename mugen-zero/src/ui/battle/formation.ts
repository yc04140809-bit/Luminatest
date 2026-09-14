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
 * It is UNDER that ratio rather than equal to it: at parity everybody
 * would be exactly the size they were, and the brief asks for
 * characters a little smaller than that with real ground between them —
 * and for a field that still reads when there are four of them standing
 * on it rather than two.
 *
 * RAISED TWICE, and both times because the UI gave room back rather
 * than because anybody wanted bigger drawings. First when the party
 * stopped being a stack of framed cards down the right; then again when
 * the top LEFT corner emptied — the order of play and the place name
 * became one compact group in the middle, and the creature's health
 * went to the creature's feet, so the two corners the fight had been
 * playing between are field now. The ceiling is what is left above:
 * the tallest head reaches about 0.74 of the field and nothing is drawn
 * over that column until the top group, which sits above 0.86.
 *
 * Applied by the battle screen at the point of drawing, so no other
 * screen in the game so much as notices.
 */
export const FIELD_FIGURE_SCALE = 0.66;

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

// ---------------------------------------------------------------------
// DEPTH — the field is looked DOWN on, not along.
//
// The fight was reading as a side-scroller: both sides at the same
// height on the glass, a line rather than a clearing. What was missing
// was not a new axis — `bottom` has always been one, because a ground
// line further up the picture is ground further away — but the second
// half of what that means. Something further away is also SMALLER, and
// without that the picture has depth written into it and nothing on
// screen showing it.
//
// So a figure's size now follows its ground line. Nothing else changes:
// the same table, the same shares, the same left and right. A character
// nearer the camera is drawn a little larger because they are nearer,
// which is what a three-quarter view IS.
//
// THIS IS NOT A CHANGE TO HOW BIG ANYBODY IS. `content/art/spriteFrames`
// says how tall a person is, head for head, and that is a fact about
// them: Gald and the hero are the same size and were measured to be.
// What this adds is perspective on top of it — the near man is bigger
// on the glass in the way the near man in a photograph is, and the two
// of them swap sizes if they swap places.

/** The nearest ground line the camera is drawn for. */
export const NEAR_GROUND = 0.02;
/** And the furthest — past the enemy's own line, with room above it. */
export const FAR_GROUND = 0.46;
/**
 * How much of themselves somebody standing at the near line gets.
 *
 * WIDENED, because 1.10 and 0.86 were not enough to be seen. Measured
 * on the real screen, the hero and Kaos differed by four per cent —
 * which is a difference you can prove with a ruler and cannot see at
 * all. Two people four per cent apart standing twenty-seven pixels
 * apart is a ROW, whatever the numbers are called, and the screen read
 * as a flat side view for exactly that reason.
 *
 * At 1.16 and 0.78 the same two are fourteen per cent apart, and the
 * near end of the field is half again the far end. That is a camera
 * looking down a plane rather than across one.
 */
export const NEAR_SCALE = 1.16;
/** And at the far line. */
export const FAR_SCALE = 0.78;

/**
 * How big somebody standing on this ground line is drawn.
 *
 * A straight line between the two ends, clamped: a ground line outside
 * the camera's range is not an error, it is somebody standing at the
 * limit of it. The spread is deliberately small — a quarter, end to
 * end. Enough that two people a few feet apart are visibly not the same
 * distance away; little enough that nobody becomes a giant, which is
 * the failure this had the last time somebody's scale moved.
 */
export function depthScale(bottom: number): number {
  const span = FAR_GROUND - NEAR_GROUND;
  const t = Math.max(0, Math.min(1, (bottom - NEAR_GROUND) / span));
  return NEAR_SCALE + (FAR_SCALE - NEAR_SCALE) * t;
}

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
  enemy: { edge: 'left', inset: 0.1, bottom: 0.45 },
  /**
   * Down, and still there — it stays on the field for the whole of the
   * question the player is about to be asked. It lies lower and further
   * into the grass than it stood.
   */
  enemyDowned: { edge: 'left', inset: 0.06, bottom: 0.4 },
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
   *
   * Not as low as it could go, though, because his HEALTH now hangs
   * under his feet and has to stay clear of the commands along the
   * bottom. A creature's ground line is where its plate hangs from.
   */
  enemyNear: { edge: 'left', inset: 0.05, bottom: 0.42 },
  enemyNearDowned: { edge: 'left', inset: 0.03, bottom: 0.35 },
  /**
   * He is nearest, on the right, between her and it. Nearest means
   * largest, but only just: too much and he stops being a person
   * standing closer and becomes a giant.
   *
   * HOW FAR IN HE MAY STAND IS FENCED ON BOTH SIDES. The camera
   * reaches 0.14 further at the moment of contact, so a swing from much
   * past a third of the field would carry him over the middle of it and
   * through the creature he is swinging at — battleCamera.test.ts holds
   * that. And a called memory stands at 0.46, in front of him, so he
   * cannot walk forward into its place either: summon.spec.ts holds
   * that one. Between the two there is about a fiftieth of the field to
   * move in, and this is where it sits.
   */
  hero: { edge: 'right', inset: 0.33, bottom: 0.23, depth: 3 },
  /**
   * A STEP BEHIND HIM, AND NOW FAR ENOUGH BACK TO BE SEEN TO BE.
   *
   * 0.31 put her twenty-seven pixels up the path from him and four per
   * cent smaller, which is a difference a ruler finds and an eye does
   * not: the two of them read as a row. At 0.34 there is fifty pixels
   * of ground between their feet and she is drawn an eighth smaller —
   * a front rank and a rank behind it, which is what the three-quarter
   * view is FOR.
   *
   * NOT FURTHER BACK THAN THIS, AND HE COMES NO FURTHER FORWARD.
   * 0.36 for her was better depth and put the top of her head into the
   * party panel above her; 0.21 for him was better depth and left his
   * feet sixteen pixels off the command row, where the rule is
   * twenty-four. The field is fenced at both ends, so the rest of the
   * distance between them is carried by how big they are drawn rather
   * than by where they stand — which is the other half of a
   * three-quarter view and the half that was doing nothing.
   *
   * She is a step behind him and a little further back, close enough to
   * read as one party rather than two people on the same side. Her wings
   * make her drawing wider than it is tall, so the gap to him is
   * measured from their edges and not their feet. Off the screen's own
   * edge now rather than hard against it: the party column is in that
   * corner, and a wing disappearing under a panel is the one thing this
   * layout must not do.
   */
  kaos: { edge: 'right', inset: 0.15, bottom: 0.34, depth: 1 },
  /**
   * The player's side, in front of both of them: clear of the hero's
   * shoulder on one side and — because it stands much lower down the
   * path — well clear of the creature being fought on the other.
   */
  summon: { edge: 'right', inset: 0.48, bottom: 0.27, depth: 2 },
} as const satisfies Readonly<Record<string, PrototypePlacement>>;

/**
 * THE FOUR PLACES A FIGHT IS DRAWN FOR, once there is more than one of
 * anybody on either side.
 *
 * Named rather than derived, because they are a SHAPE — a front rank
 * and a rank behind it, on each side, stepped up the path and away from
 * the camera — and the shape is the thing that has to hold when the
 * cast changes. One creature and two people today; the day a second
 * enemy or a fourth ally arrives, this is where they stand and nothing
 * else moves.
 *
 * Left is the enemy's and right is the party's, always. That is fixed
 * elsewhere too, but it is worth saying here as well: these names are
 * about DEPTH, and nothing in them may be read as permission to put
 * anybody on the other side of the field.
 */
export const DEPTH_RANKS = {
  /** Furthest from the camera, and smallest for it. */
  enemyBack: { edge: 'left', inset: 0.02, bottom: 0.42, depth: 1 },
  /** The one being fought, nearer. */
  enemyFront: { edge: 'left', inset: 0.05, bottom: 0.34, depth: 2 },
  /** The party's front rank, nearest the camera of anybody. */
  playerFront: { edge: 'right', inset: 0.33, bottom: 0.22, depth: 4 },
  /** And the rank behind it. */
  playerRear: { edge: 'right', inset: 0.15, bottom: 0.34, depth: 3 },
} as const satisfies Readonly<Record<string, PrototypePlacement>>;

export type DepthRank = keyof typeof DEPTH_RANKS;

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
