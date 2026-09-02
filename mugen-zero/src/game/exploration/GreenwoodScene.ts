import Phaser from 'phaser';
import { locationBackground } from '../../content/locations/locationVisuals';

export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 520;

// Deterministic layout so the e2e test can click the encounter marker.
const PLAYER_START = { x: 180, y: 440 };
const ENCOUNTER_POINT = { x: 180, y: 120 };
const ENCOUNTER_RADIUS = 28;
const PLAYER_SPEED = 160; // px/sec
const BACKGROUND_KEY = 'greenwood-bg';
// Big enough to read as a person on a phone, small enough to stay a
// marker rather than a character standing in front of the scenery.
const PLAYER_SCALE = 1.25;

export interface GreenwoodCallbacks {
  onEncounter: () => void;
}

export interface GreenwoodOptions {
  /**
   * False once Gald's life choice is already recorded in WORLD MEMORY:
   * the same first encounter must not happen twice in one world.
   */
  encounterEnabled: boolean;
}

/**
 * Minimal Greenwood Forest exploration scene.
 * Tap anywhere to walk; reaching the "!" marker triggers the Gald encounter.
 * The backdrop is the location's own art; everything interactive is drawn
 * on top of it by the game, never baked into the picture.
 */
export class GreenwoodScene extends Phaser.Scene {
  /**
   * The player on the map. A container, not a shape: a walking figure is
   * built out of primitives inside it now, and a real sprite can be
   * dropped in later without a single line of the movement code changing.
   */
  private player!: Phaser.GameObjects.Container;
  private playerLegs: Phaser.GameObjects.Rectangle[] = [];
  private walkPhase = 0;
  private target: Phaser.Math.Vector2 | null = null;
  private encounterFired = false;
  private callbacks: GreenwoodCallbacks;
  private options: GreenwoodOptions;

  constructor(callbacks: GreenwoodCallbacks, options: GreenwoodOptions) {
    super('greenwood');
    this.callbacks = callbacks;
    this.options = options;
  }

  preload(): void {
    // The same registry the React screens read: the forest walked through
    // and the forest fought in are one location.
    const art = locationBackground('GREENWOOD_FOREST');
    if (art) this.load.image(BACKGROUND_KEY, art);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#12241a');

    // Layer 1: the forest itself. Cover-fit so the path stays centred and
    // nothing is stretched, whatever the phone's aspect ratio.
    if (this.textures.exists(BACKGROUND_KEY)) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, BACKGROUND_KEY);
      const scale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
      bg.setScale(scale).setScrollFactor(0).setDepth(0);
    } else {
      // The art failed to load: fall back to the original shapes rather
      // than a blank screen.
      const treeSpots = [
        [60, 90], [300, 70], [80, 230], [290, 250], [50, 380], [310, 400], [200, 300],
      ];
      for (const [x, y] of treeSpots) {
        this.add.circle(x, y, 18, 0x1e3a28);
        this.add.rectangle(x, y + 20, 6, 14, 0x2c2418);
      }
    }

    // Layer 2: the event point, drawn by the game — never baked into art.
    if (this.options.encounterEnabled) {
      this.add
        .circle(ENCOUNTER_POINT.x, ENCOUNTER_POINT.y, ENCOUNTER_RADIUS, 0x120d18, 0.72)
        .setDepth(10);
      const mark = this.add
        .text(ENCOUNTER_POINT.x, ENCOUNTER_POINT.y, '!', {
          fontSize: '30px',
          color: '#e8c15a',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(11);
      mark.setShadow(0, 0, '#000000', 6, true, true);
      this.tweens.add({ targets: mark, y: ENCOUNTER_POINT.y - 6, duration: 600, yoyo: true, repeat: -1 });
    } else {
      this.add
        .text(GAME_WIDTH / 2, 120, '森は、静かだ。', {
          fontSize: '14px',
          color: '#e6efe8',
          backgroundColor: '#0b0b12cc',
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5)
        .setDepth(11);
    }

    // Layer 3: the player. Small, high-contrast against the forest floor,
    // and unmistakably a person rather than a dot on a map.
    this.player = this.createPlayerFigure(PLAYER_START.x, PLAYER_START.y);

    // Layer 4: the hint, legible against the art.
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'タップした場所へ移動', {
        fontSize: '12px',
        color: '#e6efe8',
        backgroundColor: '#0b0b12cc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
  }

  /**
   * A walking silhouette: a soft shadow, two legs, a body and a head,
   * outlined so it stays readable over both sunlit path and dark leaves.
   */
  private createPlayerFigure(x: number, y: number): Phaser.GameObjects.Container {
    const shadow = this.add.ellipse(0, 2, 20, 7, 0x000000, 0.45);
    const legLeft = this.add.rectangle(-3, -5, 3, 9, 0x1b1b26).setOrigin(0.5, 0);
    const legRight = this.add.rectangle(3, -5, 3, 9, 0x1b1b26).setOrigin(0.5, 0);
    const cloak = this.add.ellipse(0, -12, 14, 18, 0xe9eef5);
    cloak.setStrokeStyle(1.5, 0x11111a, 0.9);
    const head = this.add.circle(0, -22, 5, 0xf5f0e6);
    head.setStrokeStyle(1.5, 0x11111a, 0.9);
    const scarf = this.add.rectangle(0, -17, 12, 3, 0xe8c15a);

    this.playerLegs = [legLeft, legRight];
    return this.add
      .container(x, y, [shadow, legLeft, legRight, cloak, scarf, head])
      .setScale(PLAYER_SCALE)
      .setDepth(20);
  }

  /** Legs scissor while moving and settle when standing still. */
  private animateWalk(moving: boolean, delta: number): void {
    const [left, right] = this.playerLegs;
    if (!left || !right) return;
    if (!moving) {
      this.walkPhase = 0;
      left.setScale(1, 1);
      right.setScale(1, 1);
      return;
    }
    this.walkPhase += delta / 90;
    const swing = Math.sin(this.walkPhase) * 0.35;
    left.setScale(1, 1 + swing);
    right.setScale(1, 1 - swing);
  }

  update(_time: number, delta: number): void {
    if (this.encounterFired) return;

    const encounterActive = this.options.encounterEnabled;

    this.animateWalk(this.target !== null, delta);

    if (this.target) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y);
      const step = (PLAYER_SPEED * delta) / 1000;
      if (dist <= step) {
        this.player.setPosition(this.target.x, this.target.y);
        this.target = null;
      } else {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.target.x, this.target.y);
        this.player.x += Math.cos(angle) * step;
        this.player.y += Math.sin(angle) * step;
        // Face the way you are going.
        this.player.setScale(Math.cos(angle) < 0 ? -PLAYER_SCALE : PLAYER_SCALE, PLAYER_SCALE);
      }
    }

    if (!encounterActive) return;

    const dEnc = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, ENCOUNTER_POINT.x, ENCOUNTER_POINT.y,
    );
    if (dEnc <= ENCOUNTER_RADIUS + 10) {
      this.encounterFired = true;
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.callbacks.onEncounter();
      });
    }
  }
}

export function createGreenwoodGame(
  parent: HTMLElement,
  callbacks: GreenwoodCallbacks,
  options: GreenwoodOptions,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#12241a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: new GreenwoodScene(callbacks, options),
  });
}
