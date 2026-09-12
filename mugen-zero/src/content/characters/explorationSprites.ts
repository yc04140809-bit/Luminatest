// EXPLORATION SPRITES — who can walk around a field, and with which frames.
//
// These are real image assets. Nothing here draws a person out of
// shapes, nothing generates one, and nothing pastes a whole sheet onto
// the screen: a frame names a file and, when that file holds several
// figures, the rectangle inside it that is this one. Only ever one
// rectangle is drawn.
//
// Every frame also carries the point where that character's feet meet
// the ground, in its own pixels. That is what the game anchors them by —
// not the middle of the picture — so a tap on the forest floor is a
// place they can stand, whatever size or shape their art happens to be.
//
// The registry is keyed by character id on purpose: another companion
// costs one entry here and no scene change.

import heroBackIdle from '../../assets/characters/hero/hero-back-idle.png';
import heroBackWalk1 from '../../assets/characters/hero/hero-back-walk1.png';
import heroBackWalk2 from '../../assets/characters/hero/hero-back-walk2.png';
import heroBackWalk3 from '../../assets/characters/hero/hero-back-walk3.png';
import heroFrontIdle from '../../assets/characters/hero/hero-front-idle.png';
import heroFrontWalk1 from '../../assets/characters/hero/hero-front-walk1.png';
import heroFrontWalk2 from '../../assets/characters/hero/hero-front-walk2.png';
import heroFrontWalk3 from '../../assets/characters/hero/hero-front-walk3.png';
import heroLeftIdle from '../../assets/characters/hero/hero-left-idle.png';
import heroLeftWalk1 from '../../assets/characters/hero/hero-left-walk1.png';
import heroLeftWalk2 from '../../assets/characters/hero/hero-left-walk2.png';
import heroLeftWalk3 from '../../assets/characters/hero/hero-left-walk3.png';
import heroRightIdle from '../../assets/characters/hero/hero-right-idle.png';
import heroRightWalk1 from '../../assets/characters/hero/hero-right-walk1.png';
import heroRightWalk2 from '../../assets/characters/hero/hero-right-walk2.png';
import heroRightWalk3 from '../../assets/characters/hero/hero-right-walk3.png';
import kaosBackSheet from '../../assets/characters/kaos/kaos-exploration-back.png';
import kaosFrontSheet from '../../assets/characters/kaos/kaos-exploration-front.png';
import kaosLeftSheet from '../../assets/characters/kaos/kaos-exploration-left.png';
import kaosRightSheet from '../../assets/characters/kaos/kaos-exploration-right.png';

/** Anyone who can be shown walking around a field. */
export type ExplorationCharacterId = 'HERO' | 'KAOS';

/** Which way a character is facing. Every character draws all four. */
export type Direction = 'back' | 'front' | 'left' | 'right';

/** What the character is doing. Standing or walking; nothing else yet. */
export type MotionState = 'idle' | 'walk';

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteFrame {
  /** The image file this frame lives in. */
  url: string;
  /**
   * Where this figure sits inside that file. Absent when the file holds
   * nothing but this one frame.
   */
  rect?: FrameRect;
  /**
   * Where the feet meet the ground, in pixels measured inside the frame
   * (not inside the file). x is between the boots, y is the sole line.
   */
  anchor: { x: number; y: number };
  /**
   * TEMPORARY per-frame size correction. Multiplies the character's own
   * scale; absent means one, which is what every frame should say.
   *
   * THIS IS A HOTFIX FIELD AND NOT A FEATURE. It exists because one
   * delivered sheet can be drawn at a different size from its siblings,
   * and a character who changes size when she turns is worse than a
   * number sitting here with a note on it. The correct fix is always
   * art delivered at one size; this only stops a mismatch reaching the
   * player while that is arranged.
   *
   * Anything using it must say why, and say what would let it go. Grep
   * for `scale:` in this file to find what is still waiting on art.
   */
  scale?: number;
}

export interface DirectionFrames {
  /** Standing still. */
  idle: SpriteFrame;
  /**
   * The walk cycle, in order. Empty for a character with only a
   * standing pose: they are then moved smoothly rather than animated,
   * which is better than inventing frames nobody drew.
   */
  walk: readonly SpriteFrame[];
}

export interface ExplorationSpriteSet {
  /** Prefix for this character's Phaser frame names. */
  id: string;
  frames: Record<Direction, DirectionFrames>;
  /**
   * What the size the scene asks for measures, in source pixels:
   * scale = requested size / referencePixels. Which axis it is depends
   * on how the character's art was made, and is stated where it is set.
   */
  referencePixels: number;
}

/**
 * The hero. Sixteen frames cut out of his character sheet onto one
 * prepared 120×180 canvas, so every frame shares a size and an anchor
 * and any change of height between them is his stride, not the drawing.
 */
function heroFrame(url: string): SpriteFrame {
  // 60 is the middle of the canvas; 177 is the ground line, three
  // transparent pixels above the bottom edge.
  return { url, anchor: { x: 60, y: 177 } };
}

/**
 * Kaos, on four sheets of four frames: [idle][walk1][walk2][walk3].
 *
 * One sheet a direction, cut into quarters. Every sheet has a clean
 * transparent gap where the quarters divide, so the cut lands between
 * figures rather than through one.
 *
 * THE ANCHOR IS HER HEAD'S AXIS, NOT THE MIDDLE OF THE PICTURE. Her
 * wings reach much further to one side than the other and they change
 * side with the view, so the centre of the rectangle is nowhere near
 * the centre of HER: facing right she stands 46px right of it, facing
 * left 51px left of it. Anchoring on the picture would have her slide
 * sideways every time she turned. The x below is the axis her head
 * keeps across all four frames of a sheet; the y is that frame's own
 * measured sole line, so her boots stay on the ground while she walks.
 */
function kaosFrame(url: string, rect: FrameRect, anchor: { x: number; y: number }, scale?: number): SpriteFrame {
  return scale === undefined ? { url, rect, anchor } : { url, rect, anchor, scale };
}

/**
 * TEMP — the right-facing sheet is drawn 9.6% smaller than its
 * siblings, and this is what stops her shrinking when she turns.
 *
 * Measured head-top to sole on the idle frame of each sheet: front 679,
 * back 666, left 662 — and right 614. The first three agree inside 2.5%,
 * which is drawing and is invisible. Right does not: at the size she is
 * drawn in the forest the difference is about 18 pixels, and a
 * character who loses a tenth of her height by facing the other way is
 * the first thing anybody notices.
 *
 * THIS IS A HOTFIX AWAITING ART, not a decision about anything. The
 * right sheet also arrives on a different canvas from the other three
 * (1774×887 against 2172×724), so the two belong to one fix: a right
 * sheet delivered at the siblings' size and canvas. When that lands,
 * this constant and every `KAOS_RIGHT_TEMP_SCALE` beside a frame below
 * are deleted, and nothing else changes.
 */
const KAOS_RIGHT_TEMP_SCALE = 669 / 614;

export const EXPLORATION_SPRITES: Record<ExplorationCharacterId, ExplorationSpriteSet> = {
  HERO: {
    id: 'hero',
    // The width of him inside his frame.
    referencePixels: 102,
    frames: {
      back: {
        idle: heroFrame(heroBackIdle),
        walk: [heroFrame(heroBackWalk1), heroFrame(heroBackWalk2), heroFrame(heroBackWalk3)],
      },
      front: {
        idle: heroFrame(heroFrontIdle),
        walk: [heroFrame(heroFrontWalk1), heroFrame(heroFrontWalk2), heroFrame(heroFrontWalk3)],
      },
      left: {
        idle: heroFrame(heroLeftIdle),
        walk: [heroFrame(heroLeftWalk1), heroFrame(heroLeftWalk2), heroFrame(heroLeftWalk3)],
      },
      right: {
        idle: heroFrame(heroRightIdle),
        walk: [heroFrame(heroRightWalk1), heroFrame(heroRightWalk2), heroFrame(heroRightWalk3)],
      },
    },
  },
  /**
   * Kaos, as a forest sprite of her own.
   *
   * Four sheets, four frames each, in the order [idle][walk1][walk2]
   * [walk3] — the same shape the hero has, so she walks rather than
   * slides and nothing here special-cases her.
   *
   * HER WINGS BELONG TO HER, NOT TO THE SCREEN. White on her right
   * shoulder and black on her left, always, whichever way she is
   * facing; what changes is which one the viewer can see. Facing left
   * the black one is nearest, facing right the white one is, and her
   * eyes go with them — gold is her right, blue is her left. That is
   * why there are four drawings here and not two mirrored ones. A
   * flipped sheet would put the wrong wing in front and the wrong eye
   * on the visible side, and she would stop being recognisably her.
   */
  KAOS: {
    id: 'kaos',
    // Her height, head to sole, with the hair curl above it left out:
    // the curl is a flourish rather than part of how big she is. The
    // mean of the three sheets that agree — front 679, back 666, left
    // 662. The fourth is corrected per frame; see the note above.
    referencePixels: 669,
    frames: {
      back: {
        idle: kaosFrame(kaosBackSheet, { x: 0, y: 0, width: 543, height: 724 }, { x: 265, y: 692 }),
        walk: [
          kaosFrame(kaosBackSheet, { x: 543, y: 0, width: 543, height: 724 }, { x: 265, y: 697 }),
          kaosFrame(kaosBackSheet, { x: 1086, y: 0, width: 543, height: 724 }, { x: 265, y: 692 }),
          kaosFrame(kaosBackSheet, { x: 1629, y: 0, width: 543, height: 724 }, { x: 265, y: 691 }),
        ],
      },
      front: {
        idle: kaosFrame(kaosFrontSheet, { x: 0, y: 0, width: 543, height: 724 }, { x: 267, y: 708 }),
        walk: [
          kaosFrame(kaosFrontSheet, { x: 543, y: 0, width: 543, height: 724 }, { x: 267, y: 707 }),
          kaosFrame(kaosFrontSheet, { x: 1086, y: 0, width: 543, height: 724 }, { x: 267, y: 708 }),
          kaosFrame(kaosFrontSheet, { x: 1629, y: 0, width: 543, height: 724 }, { x: 267, y: 706 }),
        ],
      },
      left: {
        idle: kaosFrame(kaosLeftSheet, { x: 0, y: 0, width: 543, height: 724 }, { x: 224, y: 681 }),
        walk: [
          kaosFrame(kaosLeftSheet, { x: 543, y: 0, width: 543, height: 724 }, { x: 224, y: 680 }),
          kaosFrame(kaosLeftSheet, { x: 1086, y: 0, width: 543, height: 724 }, { x: 224, y: 680 }),
          kaosFrame(kaosLeftSheet, { x: 1629, y: 0, width: 543, height: 724 }, { x: 224, y: 683 }),
        ],
      },
      right: {
        idle: kaosFrame(kaosRightSheet, { x: 0, y: 0, width: 444, height: 887 }, { x: 259, y: 788 }, KAOS_RIGHT_TEMP_SCALE),
        walk: [
          kaosFrame(kaosRightSheet, { x: 444, y: 0, width: 443, height: 887 }, { x: 259, y: 783 }, KAOS_RIGHT_TEMP_SCALE),
          kaosFrame(kaosRightSheet, { x: 887, y: 0, width: 443, height: 887 }, { x: 259, y: 782 }, KAOS_RIGHT_TEMP_SCALE),
          kaosFrame(kaosRightSheet, { x: 1330, y: 0, width: 444, height: 887 }, { x: 259, y: 787 }, KAOS_RIGHT_TEMP_SCALE),
        ],
      },
    },
  },
};

/** Every frame of one character, idle and walk, in one flat list. */
export function allFrames(characterId: ExplorationCharacterId): SpriteFrame[] {
  const set = EXPLORATION_SPRITES[characterId];
  const out: SpriteFrame[] = [];
  for (const direction of Object.keys(set.frames) as Direction[]) {
    out.push(set.frames[direction].idle, ...set.frames[direction].walk);
  }
  return out;
}

/**
 * The files a character needs, each one once.
 *
 * The url is the texture key. It is unique per file and it is what
 * makes a shared file load once rather than once per frame in it.
 */
export function spriteFileList(characterId: ExplorationCharacterId): string[] {
  return [...new Set(allFrames(characterId).map((frame) => frame.url))];
}

/** The Phaser frame name for one frame of one character. */
export function frameName(
  id: string,
  direction: Direction,
  state: MotionState,
  index: number,
): string {
  return `${id}-${direction}-${state}${index}`;
}
