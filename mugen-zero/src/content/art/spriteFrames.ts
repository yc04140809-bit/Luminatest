// HOW BIG SOMEBODY IS ON THE FIELD.
//
// One registry, read by every screen that draws a character standing in
// a place: both battle screens, the encounter, the life choice. The rule
// it exists to enforce is short —
//
//   a character's size on screen comes from the STAGE, never from the
//   pixel size of the file they were drawn in.
//
// A 1536px drawing and a 180px sprite of the same person are the same
// height on a phone, because the height is a share of the battlefield
// and the art layer scales the picture into it. Nothing here edits,
// re-exports or crops a delivered file; it says how tall to draw it.
//
// Adding a creature is one entry. Forgetting to add one is not a crash:
// DEFAULT_FRAME draws it as a person and the coverage test says it is
// missing.

/**
 * Roughly how big a thing is, as a share of the stage's height.
 *
 * A person is a person's height whether their drawing is 1536 pixels
 * tall or 180: that is the whole point of the bands. CHIBI is kept for
 * an entry that is standing in for battle art nobody has drawn — the
 * exploration sprites were in it until the real figures arrived, and
 * the next creature to join before its art does will be.
 */
export type SizeBand = 'HUMANOID' | 'SMALL' | 'LARGE' | 'BOSS' | 'CHIBI' | 'SUMMON';

export interface SizeBandRange {
  /** The share of the stage the whole FILE may be drawn at. */
  min: number;
  /** And the most. */
  max: number;
  /**
   * And the same question asked of the HEAD, for a band whose members
   * are drawn on canvases of different shapes.
   *
   * The min/max above measure the FILE, which is only a proxy for the
   * person in it — and the proxy holds exactly as long as everybody in
   * the band is drawn the same way up. It stopped holding the day
   * Gald's standing figure came back as a 1536x1024 lunge while the
   * hero stayed a 1024x1536 portrait: the same share of the stage drew
   * a man half again the size, and the number that fixed it was outside
   * a band written for portraits.
   *
   * So an entry that knows its own head (`headShare`) is judged on the
   * head instead, and the file share is not asked about. A head is the
   * one measure that survives both a change of canvas and a change of
   * pose: a crouching man is shorter than a standing one, and both have
   * the same head.
   */
  head?: { min: number; max: number };
}

export const SIZE_BANDS: Record<SizeBand, SizeBandRange> = {
  /* The head range is the hero's 0.0813 with room either side — far
     enough for a different build, near enough that nobody in this band
     can be somebody else's species. */
  HUMANOID: { min: 0.55, max: 0.7, head: { min: 0.068, max: 0.095 } },
  SMALL: { min: 0.25, max: 0.4 },
  LARGE: { min: 0.5, max: 0.75 },
  // Set per boss, deliberately wide: a boss whose scale is its whole
  // point should not have to fit somebody else's band.
  BOSS: { min: 0.3, max: 0.95 },
  CHIBI: { min: 0.26, max: 0.46 },
  /**
   * A called memory, and deliberately below every creature band.
   *
   * It has to read as smaller than the animal actually in the fight —
   * in a moss rabbit versus moss rabbit fight that difference is the
   * only thing telling them apart at a glance — so it cannot share the
   * SMALL band with the creature it is a copy of.
   */
  SUMMON: { min: 0.16, max: 0.3 },
};

/** Per-state tweaks. A drawing of somebody lying down is not a shorter person. */
export interface SpriteStateFrame {
  /** Overrides the standing scale for this one state. */
  scale?: number;
  /** Nudges it up or down, as a share of stage height. Positive is down. */
  offsetY?: number;
}

export interface SpriteFrame {
  band: SizeBand;
  /** Height as a share of the stage's height. */
  scale: number;
  /**
   * The head's height as a share of THIS FILE's height.
   *
   * Optional, and only worth setting for somebody whose drawing is not
   * a plain upright portrait — but once it is set it is what the band
   * is checked against, because `scale * headShare` is the head's share
   * of the STAGE and that is comparable between any two people however
   * they are drawn. Taken from the face rectangles in `partyArt.ts`:
   * face height / file height, the same two numbers the turn-order
   * diamonds crop with.
   */
  headShare?: number;
  /**
   * What the scale and the position are measured from. Only one for
   * now, and it is the one that matters: a character's feet.
   */
  anchor: 'bottom-center';
  /** Nudges, as shares of the stage. Positive x is right, positive y down. */
  offsetX?: number;
  offsetY?: number;
  /**
   * True while this entry is standing in for battle art nobody has
   * drawn. Read by the coverage test, and by the QA report.
   */
  standIn?: boolean;
  states?: Partial<Record<string, SpriteStateFrame>>;
}

/**
 * Anything not listed is drawn as a person of average height.
 *
 * A creature with no entry looks wrong rather than enormous, which is
 * the failure mode worth having.
 */
export const DEFAULT_FRAME: SpriteFrame = { band: 'HUMANOID', scale: 0.58, anchor: 'bottom-center' };

export const SPRITE_FRAMES: Record<string, SpriteFrame> = {
  /* THE PARTY. Both have real battle figures now.

     HOW THESE NUMBERS ARE SET: BY HEAD, NOT BY CANVAS.

     A scale here is a share of the stage, and what it scales is the
     FILE — so two people drawn on differently shaped canvases, or in
     differently sized poses, come out different sizes from the same
     number. Matching the canvases is what produced a bandit with a head
     half again the size of the hero's.

     So the figures are sized so their HEADS match. A head is the one
     measure that survives a change of pose: a crouching man is shorter
     than a standing one and a flying woman is neither, but all three
     have the same head. The face rectangles in content/art are what it
     is measured from — head share of canvas = face height / file
     height — and the arithmetic is in the commit that set them. */
  // 195 / 1536. Head on stage: 0.0813 — the size the other two are set to.
  hero: { band: 'HUMANOID', scale: 0.64, headShare: 195 / 1536, anchor: 'bottom-center' },
  /**
   * Was 0.55, which drew her head at four fifths of his.
   *
   * NOT ALL THE WAY TO PARITY, and this is the one place the head rule
   * is bent on purpose. Parity is 0.69, and at 0.69 she was the largest
   * figure on the field: she is drawn FLYING, with a full skirt and two
   * wings spread around her, so the same head buys her half again the
   * silhouette the hero gets from his. She was towering over the man
   * she stands behind.
   *
   * 0.62 puts her head at about nine tenths of his — near enough that
   * they read as the same species, short enough that the back rank
   * still looks like the back rank.
   */
  kaos: { band: 'HUMANOID', scale: 0.62, headShare: 180 / 1536, anchor: 'bottom-center' },

  /* GALD. */
  gald: {
    /**
     * WAS 0.66, AND THAT MADE HIM A GIANT.
     *
     * His standing figure was redrawn and the new file is LANDSCAPE —
     * 1536 by 1024, a wide lunge — where the old one was a portrait of
     * a man standing up. The same share of the stage therefore drew a
     * much bigger man: his head came out half again the size of the
     * hero's, and two humans a few feet apart looked like a boss fight.
     *
     * 0.44 is the number that puts his head at the hero's size. He is
     * shorter on screen than the hero now, which is correct and is the
     * point: he is crouched over a lunge and the hero is upright.
     *
     * The kneeling and face-down states below keep their own numbers.
     * Those are different files, they did not change, and each was set
     * against its own drawing rather than against this one.
     */
    band: 'HUMANOID',
    scale: 0.44,
    // 190 / 1024 — a landscape canvas, which is the whole story.
    headShare: 190 / 1024,
    anchor: 'bottom-center',
    states: {
      // On one knee: the same man, lower to the ground, not a smaller
      // one. Raised from 0.46 with his redesign — the old drawing was a
      // tall portrait of him kneeling and the new one is a wide one,
      // with clear margin above his head and below the blade on the
      // floor, so the same share of the stage put a much smaller man on
      // it. Still well under his standing 0.66, because kneeling does
      // cost a person height.
      battle_damage: { scale: 0.58 },
      // Face down, and his drawing is half again as wide as it is tall
      // with clear margin above and below him — so the number that puts
      // his body at the right size is much smaller than his standing
      // one. This is exactly the case the per-state override exists
      // for, and exactly the case that used to fill a screen.
      battle_down: { scale: 0.34 },
    },
  },

  /**
   * What an arcana calls up. Deliberately smaller than the creature
   * actually in the fight: a rebuilt memory should not read as the same
   * weight of thing as the animal in front of you, and in a moss
   * rabbit versus moss rabbit fight the difference in size is the first
   * thing that tells them apart.
   */
  arcana_summon: { band: 'SUMMON', scale: 0.2, anchor: 'bottom-center' },

  /* CREATURES. */
  moss_rabbit: {
    band: 'SMALL',
    scale: 0.34,
    anchor: 'bottom-center',
    states: {
      // Lying in the grass with its ears out. Its drawing is more than
      // twice as wide as it is tall, so the same body reads at a
      // smaller HEIGHT — which is the whole reason a down state gets
      // its own number rather than reusing the standing one.
      down: { scale: 0.24 },
    },
  },
};

export function frameOf(characterId: string): SpriteFrame {
  return SPRITE_FRAMES[characterId] ?? DEFAULT_FRAME;
}

/**
 * How tall to draw somebody, in real pixels.
 *
 * `state` is the art state the screen asked for — the pose — and is
 * allowed to be one nobody has a tweak for, which is the common case.
 */
export function spriteHeight(characterId: string, state: string | null, stageHeight: number): number {
  const frame = frameOf(characterId);
  const scale = (state ? frame.states?.[state]?.scale : undefined) ?? frame.scale;
  return Math.round(stageHeight * scale);
}

/** And where to nudge them from the ground line, in real pixels. */
export function spriteOffset(
  characterId: string,
  state: string | null,
  stage: { width: number; height: number },
): { x: number; y: number } {
  const frame = frameOf(characterId);
  const offsetY = (state ? frame.states?.[state]?.offsetY : undefined) ?? frame.offsetY ?? 0;
  return {
    x: Math.round(stage.width * (frame.offsetX ?? 0)),
    y: Math.round(stage.height * offsetY),
  };
}
