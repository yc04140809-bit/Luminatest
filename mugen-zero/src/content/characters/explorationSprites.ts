// EXPLORATION SPRITES — who can walk around a field, and with which frames.
//
// These are real image assets, cut out of the official character sheet
// and saved as individual transparent PNGs. Nothing here draws a person
// out of shapes, and nothing pastes a sheet onto the screen: one file is
// one frame, with the background removed and the figure standing on the
// bottom edge of its own canvas.
//
// The registry is keyed by character id on purpose. Kaos joining the
// exploration screen costs sixteen files and one entry below — no scene
// change, no new system.

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

/** Anyone who can be shown walking around a field. */
export type ExplorationCharacterId = 'HERO';

/** Which way a character is facing. The sheet draws all four. */
export type Direction = 'back' | 'front' | 'left' | 'right';

/** What the character is doing. Standing or walking; nothing else yet. */
export type MotionState = 'idle' | 'walk';

export interface DirectionFrames {
  /** Standing still. */
  idle: string;
  /** The walk cycle, in order. */
  walk: readonly string[];
}

export interface ExplorationSpriteSet {
  /** Prefix for this character's Phaser texture keys. */
  id: string;
  frames: Record<Direction, DirectionFrames>;
  /**
   * How wide the drawn figure is inside its frame, in source pixels.
   * The canvas is padded so that every frame shares one size and one
   * anchor, so the frame's own width would over-state him; the scene
   * sizes him against this instead.
   */
  bodyWidth: number;
  /** How much transparent room sits under his feet, in source pixels. */
  footPadding: number;
}

export const EXPLORATION_SPRITES: Record<ExplorationCharacterId, ExplorationSpriteSet> = {
  HERO: {
    id: 'hero',
    bodyWidth: 102,
    footPadding: 3,
    frames: {
      back: { idle: heroBackIdle, walk: [heroBackWalk1, heroBackWalk2, heroBackWalk3] },
      front: { idle: heroFrontIdle, walk: [heroFrontWalk1, heroFrontWalk2, heroFrontWalk3] },
      left: { idle: heroLeftIdle, walk: [heroLeftWalk1, heroLeftWalk2, heroLeftWalk3] },
      right: { idle: heroRightIdle, walk: [heroRightWalk1, heroRightWalk2, heroRightWalk3] },
    },
  },
};

/** Every frame of one character, as [texture key, url] pairs to preload. */
export function spriteFrameList(characterId: ExplorationCharacterId): [string, string][] {
  const set = EXPLORATION_SPRITES[characterId];
  const out: [string, string][] = [];
  for (const direction of Object.keys(set.frames) as Direction[]) {
    const frames = set.frames[direction];
    out.push([frameKey(set.id, direction, 'idle', 0), frames.idle]);
    frames.walk.forEach((url, i) => out.push([frameKey(set.id, direction, 'walk', i), url]));
  }
  return out;
}

/** The Phaser texture key for one frame. */
export function frameKey(
  id: string,
  direction: Direction,
  state: MotionState,
  index: number,
): string {
  return `${id}-${direction}-${state}${index}`;
}
