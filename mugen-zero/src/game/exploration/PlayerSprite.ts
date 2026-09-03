import Phaser from 'phaser';
import {
  EXPLORATION_SPRITES,
  frameKey,
  spriteFrameList,
  type Direction,
  type ExplorationCharacterId,
  type MotionState,
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
   * How wide he should be on screen, in world units — measured across
   * the drawn figure, not across his padded frame.
   */
  displayWidth: number;
  depth?: number;
  /** Hold every animation still, without hiding him. */
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
 * drawing made of shapes: every frame is a transparent PNG cut from the
 * official sheet. And the character's position IS the point where their
 * feet touch the ground — not the middle of the picture — so a tap on
 * the forest floor is a place they can stand, and the scene's own
 * coordinates never have to know how tall the art happens to be.
 *
 * It knows nothing about Greenwood, about encounters or about who the
 * player is. It takes a character id, a direction and a state, so the
 * next person to walk a field costs a registry entry rather than a
 * second copy of this file.
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
  /** Where his feet are. Kept here so movement works even without art. */
  private feet: Phaser.Math.Vector2;

  /** Queue every frame this character needs. Call from Scene.preload. */
  static preload(scene: Phaser.Scene, characterId: ExplorationCharacterId): void {
    for (const [key, url] of spriteFrameList(characterId)) {
      if (!scene.textures.exists(key)) scene.load.image(key, url);
    }
  }

  constructor(scene: Phaser.Scene, options: ExplorationCharacterOptions) {
    this.scene = scene;
    this.set = EXPLORATION_SPRITES[options.characterId];
    this.reducedMotion = options.reducedMotion === true;
    this.feet = new Phaser.Math.Vector2(options.x, options.y);

    const first = frameKey(this.set.id, this.direction, 'idle', 0);
    if (!scene.textures.exists(first)) {
      // The frames did not load. Movement, facing and the encounter all
      // still work; there is simply nobody drawn. Better than a green
      // box, and loud enough to be found.
      console.warn(`[exploration] sprite frames missing for ${options.characterId}`);
      return;
    }

    const depth = options.depth ?? 20;
    if (options.shadow !== false) {
      // A thin ellipse where he meets the ground, and nothing else. No
      // glow, no halo, no pale disc under him — the forest floor stays
      // the forest floor.
      const width = options.displayWidth * 0.46;
      this.shadow = scene.add
        .ellipse(this.feet.x, this.feet.y, width, width * 0.3, 0x000000, 0.2)
        .setDepth(depth - 1);
    }

    this.sprite = scene.add.sprite(this.feet.x, this.feet.y, first).setDepth(depth);
    // The anchor is the contact point of his feet: horizontally the
    // middle of the frame, vertically the ground line, which sits a few
    // transparent pixels above the bottom edge of the canvas.
    const h = this.sprite.height;
    this.sprite.setOrigin(0.5, (h - this.set.footPadding) / h);
    this.baseScale = options.displayWidth / this.set.bodyWidth;
    this.sprite.setScale(this.baseScale);
  }

  /** Turn him. Does nothing if he is already facing that way. */
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

  /** Put his feet here. */
  setPosition(x: number, y: number): void {
    this.feet.set(x, y);
    this.sprite?.setPosition(x, y);
    this.shadow?.setPosition(x, y);
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
      this.frameClock += delta;
      while (this.frameClock >= WALK_FRAME_MS) {
        this.frameClock -= WALK_FRAME_MS;
        this.frameIndex = (this.frameIndex + 1) % this.set.frames[this.direction].walk.length;
        this.applyFrame();
      }
      return;
    }

    // Standing still is not the same as being a marker on a map, so he
    // keeps breathing: a fraction of a percent of height, anchored at
    // the feet, so his boots never leave the ground.
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

  private applyFrame(): void {
    const key = frameKey(this.set.id, this.direction, this.state, this.frameIndex);
    if (this.sprite && this.scene.textures.exists(key)) this.sprite.setTexture(key);
  }
}
