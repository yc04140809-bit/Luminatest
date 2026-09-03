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
import kaosSheet from '../../assets/characters/kaos/kaos-exploration-sheet.png';

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
 * Kaos. One file, exactly as it was drawn, holding her four views —
 * so each frame names the rectangle it occupies and carries its own
 * anchor. Her wings reach further to one side than the other in the
 * turned views, which is why the anchor is nowhere near the middle of
 * the frame in those two.
 */
function kaosFrame(rect: FrameRect, anchorX: number): SpriteFrame {
  return { url: kaosSheet, rect, anchor: { x: anchorX, y: rect.height - 1 } };
}

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
  KAOS: {
    id: 'kaos',
    // Her height, from the ring above her head to the soles of her
    // boots. Her width is no use as a measure: the wings change it.
    // All four of her views are drawn within four pixels of this.
    referencePixels: 638,
    frames: {
      back: { idle: kaosFrame({ x: 661, y: 4, width: 502, height: 642 }, 243), walk: [] },
      front: { idle: kaosFrame({ x: 95, y: 4, width: 492, height: 642 }, 243), walk: [] },
      left: { idle: kaosFrame({ x: 179, y: 646, width: 337, height: 635 }, 110), walk: [] },
      right: { idle: kaosFrame({ x: 730, y: 646, width: 311, height: 637 }, 218), walk: [] },
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
