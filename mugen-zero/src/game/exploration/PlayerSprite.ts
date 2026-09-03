import Phaser from 'phaser';
import {
  EXPLORATION_SPRITES,
  allFrames,
  frameName,
  spriteFileList,
  type Direction,
  type ExplorationCharacterId,
  type MotionState,
  type SpriteFrame,
} from '../../content/characters/explorationSprites';
import { directionFor } from './facing';

export type { Direction, ExplorationCharacterId, MotionState };
export { directionFor };

export interface ExplorationCharacterOptions {
  /** Who to show. The frames come from the registry, not from here. */
  characterId: ExplorationCharacterId;
  x: number;
  y: number;
  /**
   * How big to draw them, in world units. What it measures — the width
   * of the figure, or its height — is the character's own
   * referencePixels, so the scene asks for one number either way.
   */
  displaySize: number;
  depth?: number;
  /** Hold every animation still, without hiding them. */
  reducedMotion?: boolean;
  /** A thin contact shadow under the feet. On by default. */
  shadow?: boolean;
}

/** How long one walk frame is held. Slow enough not to flicker. */
const WALK_FRAME_MS = 150;
/** How long one breath takes while standing. */
const BREATH_MS = 2600;

/**
 * A character walking around a field, drawn from their own sprite
 * frames.
 *
 * Two rules shape the whole class. The character is an image, never a
 * drawing made of shapes: every frame is real transparent art, shown
 * one frame at a time even when several share a file. And the
 * character's position IS the point where their feet touch the ground —
 * not the middle of the picture — so a tap on the forest floor is a
 * place they can stand, and the scene's own coordinates never have to
 * know how tall the art happens to be.
 *
 * It knows nothing about Greenwood, about encounters, or about which of
 * the characters it is drawing is the player. It takes a character id,
 * a direction and a state, so the next person to walk a field costs a
 * registry entry rather than a second copy of this file.
 */
export class ExplorationCharacter {
  private scene: Phaser.Scene;
  private set: (typeof EXPLORATION_SPRITES)[ExplorationCharacterId];
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private shadow: Phaser.GameObjects.Ellipse | null = null;
  private direction: Direction = 'back';
  private state: MotionState = 'idle';
  private frameIndex = 0;
  private frameClock = 0;
  private breathClock = 0;
  private baseScale = 1;
  private reducedMotion: boolean;
  /** The Phaser frame name for each frame that shares a file. */
  private names = new Map<SpriteFrame, string>();
  /** Where the feet are. Kept here so movement works even without art. */
  private feet: Phaser.Math.Vector2;

  /** Queue every file this character needs. Call from Scene.preload. */
  static preload(scene: Phaser.Scene, characterId: ExplorationCharacterId): void {
    for (const url of spriteFileList(characterId)) {
      if (!scene.textures.exists(url)) scene.load.image(url, url);
    }
  }

  constructor(scene: Phaser.Scene, options: ExplorationCharacterOptions) {
    this.scene = scene;
    this.set = EXPLORATION_SPRITES[options.characterId];
    this.reducedMotion = options.reducedMotion === true;
    this.feet = new Phaser.Math.Vector2(options.x, options.y);

    if (!scene.textures.exists(this.set.frames.back.idle.url)) {
      // The art did not load. Movement, facing and the encounter all
      // still work; there is simply nobody drawn. Better than a green
      // box, and loud enough to be found.
      console.warn(`[exploration] sprite frames missing for ${options.characterId}`);
      return;
    }
    this.registerFrames(options.characterId);

    const depth = options.depth ?? 20;
    if (options.shadow !== false) {
      // A thin ellipse where they meet the ground, and nothing else. No
      // glow, no halo, no pale disc — the forest floor stays the forest
      // floor.
      const width = options.displaySize * 0.4;
      this.shadow = scene.add
        .ellipse(this.feet.x, this.feet.y, width, width * 0.3, 0x000000, 0.2)
        .setDepth(depth - 0.5);
    }

    this.sprite = scene.add.sprite(this.feet.x, this.feet.y, this.set.frames.back.idle.url);
    this.sprite.setDepth(depth);
    this.baseScale = options.displaySize / this.set.referencePixels;
    this.applyFrame();
    this.sprite.setScale(this.baseScale);
  }

  /** Turn them. Does nothing if they already face that way. */
  setDirection(direction: Direction): void {
    if (direction === this.direction) return;
    this.direction = direction;
    this.frameIndex = 0;
    this.frameClock = 0;
    this.applyFrame();
  }

  /** Walking or standing. */
  setState(state: MotionState): void {
    if (state === this.state) return;
    this.state = state;
    this.frameIndex = 0;
    this.frameClock = 0;
    if (state === 'walk') this.breathClock = 0;
    this.applyFrame();
  }

  /** Put their feet here. */
  setPosition(x: number, y: number): void {
    this.feet.set(x, y);
    this.sprite?.setPosition(x, y);
    this.shadow?.setPosition(x, y);
  }

  /**
   * Who is in front of whom. Used to keep whoever is further up the
   * path behind the other, so two characters standing close together
   * still read as two people at different distances.
   */
  setDepth(depth: number): void {
    this.sprite?.setDepth(depth);
    this.shadow?.setDepth(depth - 0.5);
  }

  get x(): number {
    return this.feet.x;
  }

  get y(): number {
    return this.feet.y;
  }

  /** Advance the walk cycle, or breathe. */
  update(delta: number): void {
    const sprite = this.sprite;
    if (!sprite || this.reducedMotion) return;

    if (this.state === 'walk') {
      sprite.setScale(this.baseScale);
      const cycle = this.set.frames[this.direction].walk;
      // A character drawn standing only is carried by the movement
      // itself: a smooth walk with good art beats invented frames.
      if (cycle.length < 2) return;
      this.frameClock += delta;
      while (this.frameClock >= WALK_FRAME_MS) {
        this.frameClock -= WALK_FRAME_MS;
        this.frameIndex = (this.frameIndex + 1) % cycle.length;
        this.applyFrame();
      }
      return;
    }

    // Standing still is not the same as being a marker on a map, so
    // they keep breathing: a fraction of a percent of height, anchored
    // at the feet, so their boots never leave the ground.
    this.breathClock += delta;
    const breath = Math.sin((this.breathClock / BREATH_MS) * Math.PI * 2);
    sprite.setScale(this.baseScale, this.baseScale * (1 + breath * 0.014));
  }

  destroy(): void {
    this.sprite?.destroy();
    this.shadow?.destroy();
    this.sprite = null;
    this.shadow = null;
  }

  /**
   * Tell Phaser about the rectangles inside a shared file. A frame that
   * has a file to itself needs none of this.
   */
  private registerFrames(characterId: ExplorationCharacterId): void {
    const set = this.set;
    for (const direction of Object.keys(set.frames) as Direction[]) {
      const group = set.frames[direction];
      this.names.set(group.idle, frameName(set.id, direction, 'idle', 0));
      group.walk.forEach((frame, index) => {
        this.names.set(frame, frameName(set.id, direction, 'walk', index));
      });
    }
    for (const frame of allFrames(characterId)) {
      if (!frame.rect) continue;
      const texture = this.scene.textures.get(frame.url);
      const name = this.names.get(frame);
      if (name === undefined || texture.has(name)) continue;
      texture.add(name, 0, frame.rect.x, frame.rect.y, frame.rect.width, frame.rect.height);
    }
  }

  /** The frame to show right now. */
  private currentFrame(): SpriteFrame {
    const frames = this.set.frames[this.direction];
    if (this.state === 'walk' && frames.walk.length > 0) {
      return frames.walk[this.frameIndex % frames.walk.length];
    }
    return frames.idle;
  }

  private applyFrame(): void {
    const sprite = this.sprite;
    if (!sprite) return;
    const frame = this.currentFrame();
    if (!this.scene.textures.exists(frame.url)) return;
    const name = frame.rect ? this.names.get(frame) : undefined;
    if (name !== undefined) sprite.setTexture(frame.url, name);
    else sprite.setTexture(frame.url);
    // The anchor is the contact point of the feet, and every frame
    // states it in its own pixels, so art of any shape lands correctly.
    sprite.setOrigin(frame.anchor.x / sprite.frame.width, frame.anchor.y / sprite.frame.height);
  }

}
